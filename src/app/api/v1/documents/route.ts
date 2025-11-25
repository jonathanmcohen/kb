import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Middleware to check API key
async function verifyApiKey(req: NextRequest) {
    const apiKey = req.headers.get("x-api-key");

    if (!apiKey) {
        return null;
    }

    // In a real app, you'd store API keys in the database
    // For now, we'll just check against an environment variable
    const validKey = process.env.API_KEY;

    if (apiKey !== validKey) {
        return null;
    }

    // Return user ID associated with API key
    // In production, you'd look this up in the database
    return process.env.API_USER_ID;
}

const documentSchema = z.object({
    title: z.string().min(1),
    content: z.any().optional(),
    parentId: z.string().optional(),
});

// GET /api/v1/documents
export async function GET(req: NextRequest) {
    const userId = await verifyApiKey(req);
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const documents = await prisma.document.findMany({
            where: {
                userId,
                isArchived: false,
            },
            orderBy: { updatedAt: "desc" },
        });

        return NextResponse.json(documents);
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to fetch documents" },
            { status: 500 }
        );
    }
}

// POST /api/v1/documents
export async function POST(req: NextRequest) {
    const userId = await verifyApiKey(req);
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { title, content, parentId } = documentSchema.parse(body);

        const document = await prisma.document.create({
            data: {
                title,
                content,
                userId,
                parentId,
            },
        });

        return NextResponse.json(document);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        }
        return NextResponse.json(
            { error: "Failed to create document" },
            { status: 500 }
        );
    }
}
