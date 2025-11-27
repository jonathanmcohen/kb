import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchRow = {
    id: string;
    title: string;
    updatedAt: Date;
    snippet: string | null;
    rank: number;
};

// GET search documents using Postgres full-text search
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q")?.trim() || "";

        if (!query) {
            return NextResponse.json([]);
        }

        // Use Postgres full-text search with ranking and snippets.
        // We search across title (high weight) and content JSON (lower weight).
        const results = await prisma.$queryRaw<SearchRow[]>`
            WITH ts_query AS (
                SELECT COALESCE(
                    nullif(websearch_to_tsquery('english', ${query}), ''::tsquery),
                    plainto_tsquery('english', ${query})
                ) AS query
            )
            SELECT
                d."id",
                d."title",
                d."updatedAt",
                ts_rank(
                    setweight(to_tsvector('english', coalesce(d."title", '')), 'A') ||
                    setweight(to_tsvector('english', coalesce((d."content"::text), '')), 'B'),
                    tsq.query
                ) AS rank,
                ts_headline(
                    'english',
                    coalesce((d."content"::text), ''),
                    tsq.query,
                    'MaxFragments=2, MinWords=5, MaxWords=18, StartSel=<b>, StopSel=</b>'
                ) AS snippet
            FROM "Document" d
            CROSS JOIN ts_query tsq
            WHERE d."userId" = ${session.user.id}
              AND d."isArchived" = false
              AND (
                  setweight(to_tsvector('english', coalesce(d."title", '')), 'A') ||
                  setweight(to_tsvector('english', coalesce((d."content"::text), '')), 'B')
              ) @@ tsq.query
            ORDER BY rank DESC, d."updatedAt" DESC
            LIMIT 15;
        `;

        return NextResponse.json(results);
    } catch (error) {
        console.error("Search error:", error);
        return NextResponse.json(
            { error: "Failed to search documents" },
            { status: 500 }
        );
    }
}
