import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
    title: z.string().optional(),
    content: z.any().optional(),
    coverImage: z.string().optional(),
    icon: z.string().optional(),
    isPublished: z.boolean().optional(),
    isArchived: z.boolean().optional(),
});

// GET single document
export async function GET(
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
        });

        if (!document) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        if (document.userId !== session.user.id && !document.isPublished) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        return NextResponse.json(document);
    } catch {
        return NextResponse.json(
            { error: "Failed to fetch document" },
            { status: 500 }
        );
    }
}

// PATCH update document
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ documentId: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const data = updateSchema.parse(body);

        const { documentId } = await params;
        const document = await prisma.document.findUnique({
            where: { id: documentId },
        });

        if (!document || document.userId !== session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const updated = await prisma.document.update({
            where: { id: documentId },
            data,
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Document update error:", error);
        return NextResponse.json(
            { error: "Failed to update document" },
            { status: 500 }
        );
    }
}

// DELETE document
export async function DELETE(
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
        });

        if (!document || document.userId !== session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await prisma.document.delete({
            where: { id: documentId },
        });

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json(
            { error: "Failed to delete document" },
            { status: 500 }
        );
    }
}
