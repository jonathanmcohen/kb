import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import sharp from "sharp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ParsedBlock = {
    type?: string;
    content?: Array<{ text?: string }>;
    children?: ParsedBlock[];
};

type PdfTextOptions = {
    width?: number;
    align?: "left" | "center" | "right" | "justify";
    lineGap?: number;
    indent?: number;
};

type PdfImageOptions = {
    width?: number;
    height?: number;
    align?: "left" | "center" | "right";
    valign?: "top" | "center" | "bottom";
    x?: number;
    y?: number;
    scale?: number;
    fit?: [number, number];
};

type PdfInternal = PDFDocument & {
    y: number;
    heightOfString: (text: string, options?: PdfTextOptions) => number;
    save: () => PDFDocument;
    restore: () => PDFDocument;
    roundedRect: (x: number, y: number, width: number, height: number, radius?: number) => PdfInternal;
    fillColor: (color?: string) => PDFDocument;
    fill: (color?: string) => PDFDocument;
    image: (src: Buffer | string, options?: PdfImageOptions) => PDFDocument;
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

async function fetchImageBuffer(url: string, origin: string, cookies: string | null): Promise<Buffer | null> {
    const isTlsPacketLengthError = (err: unknown) => {
        if (!err || typeof err !== "object") return false;
        const error = err as { message?: string; code?: string; cause?: unknown };
        const cause = error.cause as { message?: string; code?: string } | undefined;
        const messages = [error.message, error.code, cause?.message, cause?.code]
            .filter((v): v is string => typeof v === "string");
        return messages.some((msg) =>
            msg.includes("ERR_SSL_PACKET_LENGTH_TOO_LONG") || msg.includes("packet length too long")
        );
    };

    const tryFetch = async (target: URL) => {
        const res = await fetch(target, {
            headers: cookies ? { cookie: cookies } : undefined,
            cache: "no-store",
        });
        if (!res.ok) return null;
        const arr = await res.arrayBuffer();
        return Buffer.from(arr);
    };

    const buildTargets = (resolved: URL) => {
        const targets: URL[] = [];
        const match = resolved.pathname.match(/\.([^.\/?#]+)(?=([?#]|$))/);

        // Prefer the original upload if the stored URL is the compressed .webp variant
        if (match && match[1].toLowerCase() === "webp") {
            const basePath = resolved.pathname.replace(/\.webp(?=([?#]|$))/i, "");
            const originalCandidates = ["jpg", "jpeg", "png", "gif", "webp"];
            for (const ext of originalCandidates) {
                const candidate = new URL(resolved.toString());
                candidate.pathname = `${basePath}_original.${ext}`;
                candidate.search = ""; // originals are served without query params
                candidate.hash = "";
                targets.push(candidate);
            }
        }

        targets.push(resolved);
        return targets;
    };

    try {
        if (url.startsWith("data:")) {
            const [, meta, data] = url.match(/^data:(.+?);base64,(.+)$/) || [];
            if (meta && data) {
                return Buffer.from(data, "base64");
            }
        }
        const resolved = new URL(url, origin);
        const targets = buildTargets(resolved);

        for (const target of targets) {
            try {
                const buf = await tryFetch(target);
                if (buf) return buf;
            } catch (err) {
                if (target.protocol === "https:" && isTlsPacketLengthError(err)) {
                    const httpUrl = new URL(target.toString());
                    httpUrl.protocol = "http:";
                    console.warn("Image fetch TLS issue, retrying over HTTP for PDF export", target.toString());
                    try {
                        const buf = await tryFetch(httpUrl);
                        if (buf) return buf;
                    } catch (retryErr) {
                        console.error("Image fetch retry failed for PDF export", retryErr);
                    }
                }
                // Continue trying next target
            }
        }

        return null;
    } catch (err) {
        console.error("Image fetch failed for PDF export", err);
        return null;
    }
}

function blockText(block: ParsedBlock): string {
    return (block.content || [])
        .map((c) => c.text || "")
        .join(" ")
        .trim();
}

async function renderBlocksToPdf(
    doc: PDFDocument,
    blocks: ParsedBlock[],
    origin: string,
    cookies: string | null,
    indent = 0
) {
    const pdf = doc as PdfInternal;

    for (const block of blocks) {
        const text = blockText(block);
        const children = block.children || [];
        const options = { indent };

        switch (block.type) {
            case "heading":
            case "heading1":
                doc.font("Helvetica-Bold").fontSize(22).text(text || "", options);
                doc.moveDown(0.5);
                break;
            case "heading2":
                doc.font("Helvetica-Bold").fontSize(18).text(text || "", options);
                doc.moveDown(0.4);
                break;
            case "heading3":
                doc.font("Helvetica-Bold").fontSize(16).text(text || "", options);
                doc.moveDown(0.3);
                break;
            case "bulletListItem":
            case "bullet_list":
            case "listItem":
                doc.font("Helvetica").fontSize(12).text(`• ${text}`, options);
                break;
            case "numberListItem":
            case "ordered_list":
                doc.font("Helvetica").fontSize(12).text(`1. ${text}`, options);
                break;
            case "quote":
                doc.font("Helvetica-Oblique").fontSize(12).text(text || "", { indent: indent + 12 });
                break;
            case "codeBlock":
                (() => {
                    const code = text || "";
                    const padding = 8;
                    const availableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right - indent;
                    const textX = doc.page.margins.left + indent;
                    const blockX = textX - padding;
                    const blockY = pdf.y;
                    const blockWidth = availableWidth + padding * 2;
                    const textHeight = pdf.heightOfString(code, {
                        width: availableWidth,
                        align: "left",
                    });
                    const blockHeight = textHeight + padding * 2;

                    pdf.save();
                    pdf.roundedRect(blockX, blockY, blockWidth, blockHeight, 6).fill("#f7f7f8");
                    pdf.fillColor("#111");
                    pdf.font("Courier").fontSize(10).text(code, textX, blockY + padding, {
                        lineGap: 2,
                        width: availableWidth,
                    });
                    pdf.restore();

                    pdf.font("Helvetica").fontSize(12).fillColor("#000");
                    doc.moveDown(0.8);
                })();
                break;
            case "image": {
                const props = (block as ParsedBlock & { props?: { url?: string; src?: string } }).props;
                const url = props?.url || props?.src;
                if (url) {
                    const buf = await fetchImageBuffer(url, origin, cookies);
                    if (buf) {
                        const placeImage = async (input: Buffer) => {
                            const availableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right - indent;
                            const imageX = doc.page.margins.left + indent;
                            const maxHeight = doc.page.height * 0.45;

                            const imageOptions: PdfImageOptions = {
                                align: "left",
                                x: imageX,
                                fit: [availableWidth, maxHeight],
                            };

                            try {
                                const meta = await sharp(input).metadata();
                                if (meta.width && meta.height) {
                                    const aspect = meta.width / meta.height;
                                    let targetWidth = Math.min(availableWidth, meta.width);
                                    let targetHeight = targetWidth / aspect;

                                    if (targetHeight > maxHeight) {
                                        targetHeight = maxHeight;
                                        targetWidth = targetHeight * aspect;
                                    }

                                    imageOptions.width = targetWidth;
                                    imageOptions.height = targetHeight;
                                    delete imageOptions.fit;
                                }
                            } catch {
                                // metadata lookup failed; fall back to fit sizing
                            }

                            pdf.image(input, imageX, pdf.y, imageOptions);
                            doc.moveDown(0.5);
                        };

                        try {
                            await placeImage(buf);
                            break;
                        } catch (err) {
                            const looksLikeWebp = /\.webp(\?|$)/i.test(url);
                            if (looksLikeWebp) {
                                try {
                                    const pngBuffer = await sharp(buf).png().toBuffer();
                                    await placeImage(pngBuffer);
                                    break;
                                } catch (convErr) {
                                    console.error("Image conversion failed for PDF export", convErr);
                                }
                            }
                            console.error("Image render failed for PDF export", err);
                        }
                    }
                }
                doc.font("Helvetica").fontSize(12).text(text || "", options);
                break;
            }
            default:
                doc.font("Helvetica").fontSize(12).text(text || "", options);
        }

        if (children.length) {
            await renderBlocksToPdf(doc, children, origin, cookies, indent + 12);
        }

        if (block.type && block.type.startsWith("heading")) {
            doc.moveDown(0.2);
        }
    }
}

async function createPdf(title: string, blocks: ParsedBlock[], origin: string, cookies: string | null) {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    doc.font("Helvetica-Bold").fontSize(20).text(title || "Untitled", { underline: true });
    doc.moveDown();
    await renderBlocksToPdf(doc, blocks, origin, cookies);
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
        const cookies = req.headers.get("cookie");

        const document = await prisma.document.findUnique({
            where: { id: documentId },
        });

        if (!document || document.userId !== session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const blocks = parseBlocks(document.content);
        const origin = new URL(req.url).origin;
        const markdownBody = blockToText({ content: [{ text: document.title || "" }], children: blocks });

        if (format === "pdf") {
            const pdfBuffer = await createPdf(document.title, blocks, origin, cookies);
            const pdfBytes = new Uint8Array(pdfBuffer);
            return new NextResponse(pdfBytes, {
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
