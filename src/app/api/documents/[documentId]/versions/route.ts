import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET list of versions for a document (latest first)
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
            select: { userId: true },
        });

        if (!document || document.userId !== session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const versions = await prisma.documentVersion.findMany({
            where: { documentId },
            orderBy: { createdAt: "desc" },
            take: 50,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return NextResponse.json(versions);
    } catch (error) {
        console.error("List versions error:", error);
        return NextResponse.json(
            { error: "Failed to list versions" },
            { status: 500 }
        );
    }
}
