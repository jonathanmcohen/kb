import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;

        const document = await prisma.document.findFirst({
            where: {
                shareToken: token,
                isArchived: false,
                shareExpiresAt: {
                    gt: new Date(),
                },
            },
            select: {
                id: true,
                title: true,
                content: true,
                coverImage: true,
                icon: true,
            },
        });

        if (!document) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        return NextResponse.json(document);
    } catch (error) {
        console.error("Public doc error:", error);
        return NextResponse.json(
            { error: "Failed to fetch document" },
            { status: 500 }
        );
    }
}
