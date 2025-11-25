import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function verifyApiKey(req: NextRequest) {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey || apiKey !== process.env.API_KEY) {
        return null;
    }
    return process.env.API_USER_ID;
}

const updateSchema = z.object({
    title: z.string().optional(),
    content: z.any().optional(),
    isPublished: z.boolean().optional(),
    isArchived: z.boolean().optional(),
});

// GET /api/v1/documents/[id]
export async function GET(
    req: NextRequest,
    { params }: { params: { documentId: string } }
) {
    const userId = await verifyApiKey(req);
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const document = await prisma.document.findUnique({
            where: { id: params.documentId },
        });

        if (!document || (document.userId !== userId && !document.isPublished)) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        return NextResponse.json(document);
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to fetch document" },
            { status: 500 }
        );
    }
}

// PATCH /api/v1/documents/[id]
export async function PATCH(
    req: NextRequest,
    { params }: { params: { documentId: string } }
) {
    const userId = await verifyApiKey(req);
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const data = updateSchema.parse(body);

        const document = await prisma.document.findUnique({
            where: { id: params.documentId },
        });

        if (!document || document.userId !== userId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const updated = await prisma.document.update({
            where: { id: params.documentId },
            data,
        });

        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to update document" },
            { status: 500 }
        );
    }
}

// DELETE /api/v1/documents/[id]
export async function DELETE(
    req: NextRequest,
    { params }: { params: { documentId: string } }
) {
    const userId = await verifyApiKey(req);
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const document = await prisma.document.findUnique({
            where: { id: params.documentId },
        });

        if (!document || document.userId !== userId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        await prisma.document.delete({
            where: { id: params.documentId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to delete document" },
            { status: 500 }
        );
    }
}
