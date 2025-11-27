import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addSubscriber } from "@/lib/sse";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ documentId: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId } = await params;

    // Basic validation
    if (!documentId) {
        return NextResponse.json({ error: "Missing documentId" }, { status: 400 });
    }

    const document = await prisma.document.findUnique({
        where: { id: documentId },
        select: { userId: true },
    });

    if (!document || document.userId !== session.user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stream = new ReadableStream({
        start(controller) {
            const send = (data: unknown) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            // Keep-alive ping every 25s to avoid idle timeouts
            const keepAlive = setInterval(() => {
                controller.enqueue(encoder.encode(":keep-alive\n\n"));
            }, 25_000);

            const unsubscribe = addSubscriber(documentId, send);

            // Clean up on close
            const close = () => {
                clearInterval(keepAlive);
                unsubscribe();
                controller.close();
            };

            // Handle client disconnect
            const abortSignal: AbortSignal | undefined = req.signal;
            abortSignal?.addEventListener("abort", close);
        },
    });

    return new NextResponse(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        },
    });
}
