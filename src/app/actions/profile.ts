"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import QRCode from "qrcode";

// Password Change
const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export async function changePassword(formData: FormData) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { error: "Unauthorized" };
        }

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { password: true },
        });

        if (!user?.password) {
            return { error: "Cannot change password for OAuth accounts" };
        }

        const rawData = {
            currentPassword: formData.get("currentPassword"),
            newPassword: formData.get("newPassword"),
            confirmPassword: formData.get("confirmPassword"),
        };

        const validatedData = changePasswordSchema.parse(rawData);

        // Verify current password
        const isValidPassword = await bcrypt.compare(
            validatedData.currentPassword,
            user.password
        );

        if (!isValidPassword) {
            return { error: "Current password is incorrect" };
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(validatedData.newPassword, 10);

        // Update password
        await prisma.user.update({
            where: { id: session.user.id },
            data: { password: hashedPassword },
        });

        return { success: true };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { error: error.issues[0].message };
        }
        console.error("Failed to change password:", error);
        return { error: "Failed to change password" };
    }
}

// MFA Setup
export async function setupMFA() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { error: "Unauthorized" };
        }

        // Check if user already has MFA enabled
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { mfaEnabled: true, email: true },
        });

        if (user?.mfaEnabled) {
            return { error: "MFA is already enabled" };
        }

        // Generate a new secret
        const secret = authenticator.generateSecret();

        // Create the otpauth URL
        const otpauthUrl = authenticator.keyuri(
            user?.email || session.user.email || "user",
            "KB App",
            secret
        );

        // Generate QR code data URL
        const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

        // Store secret temporarily (user will verify it before enabling)
        await prisma.user.update({
            where: { id: session.user.id },
            data: { mfaSecret: secret },
        });

        return {
            success: true,
            data: {
                qrCode: qrCodeDataUrl,
                secret,
            }
        };
    } catch (error) {
        console.error("Failed to setup MFA:", error);
        return { error: "Failed to setup MFA" };
    }
}

// Verify and Enable MFA
export async function verifyAndEnableMFA(token: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { error: "Unauthorized" };
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { mfaSecret: true, mfaEnabled: true },
        });

        if (!user?.mfaSecret) {
            return { error: "MFA setup not started" };
        }

        if (user.mfaEnabled) {
            return { error: "MFA is already enabled" };
        }

        // Verify the token
        const isValid = authenticator.verify({
            token,
            secret: user.mfaSecret,
        });

        if (!isValid) {
            return { error: "Invalid verification code" };
        }

        // Enable MFA
        await prisma.user.update({
            where: { id: session.user.id },
            data: { mfaEnabled: true },
        });

        return { success: true };
    } catch (error) {
        console.error("Failed to verify MFA:", error);
        return { error: "Failed to verify MFA" };
    }
}

// Disable MFA
const disableMFASchema = z.object({
    password: z.string().min(1, "Password is required"),
});

export async function disableMFA(formData: FormData) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { error: "Unauthorized" };
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { mfaEnabled: true, password: true },
        });

        if (!user?.mfaEnabled) {
            return { error: "MFA is not enabled" };
        }

        if (!user.password) {
            return { error: "Cannot disable MFA for OAuth accounts" };
        }

        const rawData = {
            password: formData.get("password"),
        };

        const validatedData = disableMFASchema.parse(rawData);

        // Verify password
        const isValidPassword = await bcrypt.compare(
            validatedData.password,
            user.password
        );

        if (!isValidPassword) {
            return { error: "Incorrect password" };
        }

        // Disable MFA
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                mfaEnabled: false,
                mfaSecret: null,
            },
        });

        return { success: true };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { error: error.issues[0].message };
        }
        console.error("Failed to disable MFA:", error);
        return { error: "Failed to disable MFA" };
    }
}
