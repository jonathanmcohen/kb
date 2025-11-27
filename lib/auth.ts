import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { z } from "zod";
import bcrypt from "bcryptjs";

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

                    // If we have an OTP, we're doing MFA verification
                    // But we need to re-verify password or trust the flow (here we re-verify if password provided, 
                    // or rely on the fact that we're in a flow where password was just checked - simplified for now 
                    // to require password again or implement a temporary session store, 
                    // BUT for simplicity in this stateless auth:
                    // We will require password + OTP in the second step if we want to be stateless,
                    // OR we throw a specific error that the client handles.

                    // Let's use the "throw error" approach to signal client to ask for OTP

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
                            // Signal to client that MFA is required
                            throw new Error("MFA_REQUIRED");
                        }

                        // Verify OTP
                        if (!user.mfaSecret) return null;

                        const { authenticator } = await import("otplib");
                        const isValid = authenticator.verify({
                            token: otp,
                            secret: user.mfaSecret,
                        });

                        if (!isValid) return null;
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
