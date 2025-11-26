"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";

const updateUserSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
});

const resetPasswordSchema = z.object({
    password: z.string().min(6, "Password must be at least 6 characters"),
});

// Helper to check admin status
async function checkAdmin() {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
        throw new Error("Forbidden");
    }

    return session.user.id;
}

export async function updateUserProfile(userId: string, formData: FormData) {
    try {
        await checkAdmin();

        const rawData = {
            name: formData.get("name"),
            email: formData.get("email"),
        };

        const validatedData = updateUserSchema.parse(rawData);

        await prisma.user.update({
            where: { id: userId },
            data: validatedData,
        });

        revalidatePath(`/admin/users/${userId}`);
        revalidatePath("/admin/users");
        return { success: true };
    } catch (error) {
        console.error("Failed to update user:", error);
        return { error: "Failed to update user" };
    }
}

export async function resetUserPassword(userId: string, formData: FormData) {
    try {
        await checkAdmin();

        const rawData = {
            password: formData.get("password"),
        };

        const validatedData = resetPasswordSchema.parse(rawData);
        const hashedPassword = await bcrypt.hash(validatedData.password, 10);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        return { success: true };
    } catch (error) {
        console.error("Failed to reset password:", error);
        return { error: "Failed to reset password" };
    }
}

export async function toggleUserAdmin(userId: string) {
    try {
        const currentAdminId = await checkAdmin();

        if (userId === currentAdminId) {
            return { error: "Cannot change your own admin status" };
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { isAdmin: true },
        });

        if (!user) {
            return { error: "User not found" };
        }

        await prisma.user.update({
            where: { id: userId },
            data: { isAdmin: !user.isAdmin },
        });

        revalidatePath(`/admin/users/${userId}`);
        revalidatePath("/admin/users");
        return { success: true };
    } catch (error) {
        console.error("Failed to toggle admin status:", error);
        return { error: "Failed to toggle admin status" };
    }
}

export async function toggleUserDisabled(userId: string) {
    try {
        const currentAdminId = await checkAdmin();

        if (userId === currentAdminId) {
            return { error: "Cannot disable your own account" };
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { isDisabled: true },
        });

        if (!user) {
            return { error: "User not found" };
        }

        await prisma.user.update({
            where: { id: userId },
            data: { isDisabled: !user.isDisabled },
        });

        revalidatePath(`/admin/users/${userId}`);
        revalidatePath("/admin/users");
        return { success: true };
    } catch (error) {
        console.error("Failed to toggle disabled status:", error);
        return { error: "Failed to toggle disabled status" };
    }
}
