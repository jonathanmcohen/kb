import NextAuth, { CredentialsSignin } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { z } from "zod";
import bcrypt from "bcryptjs";

class MfaRequiredError extends CredentialsSignin {
    constructor() {
        super("MFA_REQUIRED");
        this.code = "MFA_REQUIRED";
    }
}

class InvalidOtpError extends CredentialsSignin {
    constructor() {
        super("INVALID_OTP");
        this.code = "INVALID_OTP";
    }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
    },
    providers: [
        ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
            ? [Google]
            : []),
        ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
            ? [GitHub]
            : []),
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                otp: { label: "One-time code", type: "text" },
            },
            authorize: async (credentials) => {
                const parsedCredentials = z
                    .object({
                        email: z.string().email(),
                        password: z.string().optional(),
                        otp: z.string().optional()
                    })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password, otp } = parsedCredentials.data;

                    const user = await prisma.user.findUnique({ where: { email } });
                    if (!user || !user.password) return null;

                    // Verify password first
                    if (password) {
                        const passwordsMatch = await bcrypt.compare(password, user.password);
                        if (!passwordsMatch) return null;
                    } else {
                        return null;
                    }

                    // Check MFA
                    if (user.mfaEnabled) {
                        if (!otp) {
                            throw new MfaRequiredError();
                        }

                        if (!user.mfaSecret) {
                            throw new InvalidOtpError();
                        }

                        const { authenticator } = await import("otplib");
                        const isValid = authenticator.verify({
                            token: otp,
                            secret: user.mfaSecret,
                            window: 1, // allow slight clock skew
                        });

                        if (!isValid) {
                            throw new InvalidOtpError();
                        }
                    }

                    return user;
                }
                return null;
            },
        }),
    ],
    callbacks: {
        async session({ session, token }) {
            if (token.sub && session.user) {
                session.user.id = token.sub;

                // Fetch latest image from DB to ensure it's up to date
                try {
                    const user = await prisma.user.findUnique({
                        where: { id: token.sub },
                        select: { image: true },
                    });

                    if (user) {
                        session.user.image = user.image;
                    }
                } catch (error) {
                    console.error("Failed to fetch user image in session:", error);
                }
            }
            return session;
        },
        async signIn({ user }) {
            if (user && "isDisabled" in user && user.isDisabled) {
                return false;
            }
            return true;
        },
        ...authConfig.callbacks,
    },
});
