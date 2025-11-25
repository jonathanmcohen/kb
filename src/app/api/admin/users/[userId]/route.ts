import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateAdminSchema = z.object({
    isAdmin: z.boolean(),
});

// PATCH - Update user admin status
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if current user is admin
        const currentUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { isAdmin: true },
        });

        if (!currentUser?.isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { isAdmin } = updateAdminSchema.parse(body);

        // Prevent removing admin from yourself
        if (userId === session.user.id && !isAdmin) {
            return NextResponse.json(
                { error: "Cannot remove admin role from yourself" },
                { status: 400 }
            );
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { isAdmin },
            select: {
                id: true,
                name: true,
                email: true,
                isAdmin: true,
            },
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        }
        return NextResponse.json(
            { error: "Failed to update user" },
            { status: 500 }
        );
    }
}
