import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const documentSchema = z.object({
    title: z.string().min(1),
    parentId: z.string().optional(),
});

// GET all documents for the authenticated user
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const documents = await prisma.document.findMany({
            where: {
                userId: session.user.id,
                isArchived: false,
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(documents);
    } catch {
        return NextResponse.json(
            { error: "Failed to fetch documents" },
            { status: 500 }
        );
    }
}

// POST create a new document
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { title, parentId } = documentSchema.parse(body);

        const document = await prisma.document.create({
            data: {
                title,
                userId: session.user.id,
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
