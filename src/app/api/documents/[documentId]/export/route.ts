import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";

export const dynamic = "force-dynamic";

type ParsedBlock = {
    type?: string;
    content?: Array<{ text?: string }>;
    children?: ParsedBlock[];
};

function parseBlocks(content: unknown): ParsedBlock[] {
    if (!content) return [];
    if (typeof content === "string") {
        try {
            const parsed = JSON.parse(content);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    if (Array.isArray(content)) return content as ParsedBlock[];
    return [];
}

function blockToText(block: ParsedBlock): string {
    const text = (block.content || [])
        .map((c) => c.text || "")
        .join(" ")
        .trim();
    const childText = (block.children || []).map(blockToText).filter(Boolean).join("\n");
    return [text, childText].filter(Boolean).join("\n");
}

function blocksToPlainText(blocks: ParsedBlock[]): string {
    return blocks.map(blockToText).filter(Boolean).join("\n\n");
}

function blockToMarkdown(block: ParsedBlock): string {
    const rawText = (block.content || [])
        .map((c) => c.text || "")
        .join(" ")
        .trim();

    const childrenMd = (block.children || []).map(blockToMarkdown).filter(Boolean).join("\n");

    switch (block.type) {
        case "heading":
        case "heading1":
            return `# ${rawText}\n${childrenMd}`;
        case "heading2":
            return `## ${rawText}\n${childrenMd}`;
        case "heading3":
            return `### ${rawText}\n${childrenMd}`;
        case "bulletListItem":
        case "bullet_list":
        case "listItem":
            return `- ${rawText}${childrenMd ? `\n${childrenMd}` : ""}`;
        case "numberListItem":
        case "ordered_list":
            return `1. ${rawText}${childrenMd ? `\n${childrenMd}` : ""}`;
        case "quote":
            return rawText ? `> ${rawText}` : "";
        case "codeBlock":
            return `\n\`\`\`\n${rawText}\n\`\`\`\n`;
        default:
            return rawText || childrenMd;
    }
}

function blocksToMarkdown(blocks: ParsedBlock[]): string {
    return blocks.map(blockToMarkdown).filter(Boolean).join("\n\n");
}

function createPdf(title: string, body: string) {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Uint8Array[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));

    doc.fontSize(20).text(title || "Untitled", { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(body || "", { lineGap: 4 });
    doc.end();

    return new Promise<Buffer>((resolve) => {
        doc.on("end", () => {
            resolve(Buffer.concat(chunks));
        });
    });
}

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
        const { searchParams } = new URL(req.url);
        const format = searchParams.get("format") || "markdown";

        const document = await prisma.document.findUnique({
            where: { id: documentId },
        });

        if (!document || document.userId !== session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const blocks = parseBlocks(document.content);
        const plainText = blocksToPlainText(blocks);
        const markdownBody = blocksToMarkdown(blocks) || plainText;

        if (format === "pdf") {
            const pdfBuffer = await createPdf(document.title, plainText);
            return new NextResponse(pdfBuffer, {
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="${document.title || "document"}.pdf"`,
                },
            });
        }

        // default markdown
        const markdown = `# ${document.title}\n\n${markdownBody}`;
        return new NextResponse(markdown, {
            headers: {
                "Content-Type": "text/markdown",
                "Content-Disposition": `attachment; filename="${document.title || "document"}.md"`,
            },
        });
    } catch (error) {
        console.error("Export error:", error);
        return NextResponse.json(
            { error: "Failed to export document" },
            { status: 500 }
        );
    }
}
