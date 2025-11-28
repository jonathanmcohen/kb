import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET single version
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ documentId: string; versionId: string }> }
) {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { documentId, versionId } = await params;

        const document = await prisma.document.findUnique({
            where: { id: documentId },
            select: { userId: true },
        });

        if (!document || document.userId !== userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const version = await prisma.documentVersion.findFirst({
            where: { id: versionId, documentId },
            include: {
                user: { select: { id: true, name: true, email: true } },
            },
        });

        if (!version) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        return NextResponse.json(version);
    } catch (error) {
        console.error("Get version error:", error);
        return NextResponse.json(
            { error: "Failed to fetch version" },
            { status: 500 }
        );
    }
}

// POST restore to this version
export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ documentId: string; versionId: string }> }
) {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { documentId, versionId } = await params;

        const document = await prisma.document.findUnique({
            where: { id: documentId },
        });

        if (!document || document.userId !== userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const version = await prisma.documentVersion.findFirst({
            where: { id: versionId, documentId },
        });

        if (!version) {
            return NextResponse.json({ error: "Version not found" }, { status: 404 });
        }

        const restored = await prisma.$transaction(async (tx) => {
            // Snapshot current before restoring
            await tx.documentVersion.create({
                data: {
                    documentId,
                    userId,
                    title: document.title,
                    content: document.content ?? Prisma.JsonNull,
                    label: "Before restore",
                },
            });

            return tx.document.update({
                where: { id: documentId },
                data: {
                    title: version.title,
                    content: version.content ?? Prisma.JsonNull,
                },
            });
        });

        broadcast(documentId, {
            type: "document:update",
            payload: restored,
            editedBy: userId,
        });

        return NextResponse.json(restored);
    } catch (error) {
        console.error("Restore version error:", error);
        return NextResponse.json(
            { error: "Failed to restore version" },
            { status: 500 }
        );
    }
}
