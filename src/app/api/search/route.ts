import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

        const documents = await prisma.document.findMany({
            where: {
                userId: session.user.id,
                isArchived: false,
                OR: [
                    { title: { contains: query, mode: "insensitive" } },
                    // Note: For full-text search on JSON content, you'd need to set up
                    // PostgreSQL full-text search or use a dedicated search engine
                ],
            },
            take: 10,
            orderBy: { updatedAt: "desc" },
        });

        return NextResponse.json(documents);
    } catch {
        return NextResponse.json(
            { error: "Failed to search documents" },
            { status: 500 }
        );
    }
}
