import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
    expiresInHours: z.number().min(1).max(24 * 30).optional(), // up to 30 days
});

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ documentId: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { documentId } = await params;
        const document = await prisma.document.findUnique({
            where: { id: documentId },
            select: { userId: true },
        });

        if (!document || document.userId !== session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const json = await req.json().catch(() => ({}));
        const { expiresInHours = 24 * 7 } = bodySchema.parse(json);

        const shareToken = randomBytes(16).toString("hex");
        const shareExpiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

        const updated = await prisma.document.update({
            where: { id: documentId },
            data: {
                shareToken,
                shareExpiresAt,
            },
            select: {
                shareToken: true,
                shareExpiresAt: true,
                id: true,
                title: true,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Share link error:", error);
        return NextResponse.json(
            { error: "Failed to create share link" },
            { status: 500 }
        );
    }
}
