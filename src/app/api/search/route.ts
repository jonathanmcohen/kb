import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Helper function to extract text from BlockNote JSON content
function extractTextFromContent(content: unknown): string {
    if (!content || typeof content !== 'string') return '';

    try {
        const blocks = JSON.parse(content);
        if (!Array.isArray(blocks)) return '';

        return blocks
            .map((block: { content?: Array<{ text?: string }> }) => {
                // Extract text from block content
                if (block.content && Array.isArray(block.content)) {
                    return block.content
                        .map((item: { text?: string }) => item.text || '')
                        .join(' ');
                }
                return '';
            })
            .join(' ')
            .trim();
    } catch {
        return '';
    }
}

// GET search documents
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q") || "";

        if (!query) {
            return NextResponse.json([]);
        }

        // Fetch all user documents
        const documents = await prisma.document.findMany({
            where: {
                userId: session.user.id,
                isArchived: false,
            },
            orderBy: { updatedAt: "desc" },
        });

        // Filter by title OR content
        const filteredDocuments = documents.filter((doc) => {
            const titleMatch = doc.title.toLowerCase().includes(query.toLowerCase());
            const contentText = extractTextFromContent(doc.content);
            const contentMatch = contentText.toLowerCase().includes(query.toLowerCase());

            return titleMatch || contentMatch;
        });

        // Return top 10 results
        return NextResponse.json(filteredDocuments.slice(0, 10));
    } catch (error) {
        console.error("Search error:", error);
        return NextResponse.json(
            { error: "Failed to search documents" },
            { status: 500 }
        );
    }
}
