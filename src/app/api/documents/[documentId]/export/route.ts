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
    props?: Record<string, unknown>;
};

type PdfTextOptions = {
    width?: number;
    align?: "left" | "center" | "right" | "justify";
    lineGap?: number;
    indent?: number;
    underline?: boolean;
    link?: string;
    strike?: boolean;
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
    x: number;
    heightOfString: (text: string, options?: PdfTextOptions) => number;
    widthOfString: (text: string, options?: PdfTextOptions) => number;
    currentLineHeight: () => number;
    save: () => PDFDocument;
    restore: () => PDFDocument;
    roundedRect: (x: number, y: number, width: number, height: number, radius?: number) => PdfInternal;
    rect: (x: number, y: number, width: number, height: number) => PdfInternal;
    fillColor: (color?: string) => PDFDocument;
    fill: (color?: string) => PDFDocument;
    image: (src: Buffer | string, options?: PdfImageOptions) => PDFDocument;
    moveTo: (x: number, y: number) => PdfInternal;
    lineTo: (x: number, y: number) => PdfInternal;
    stroke: (color?: string) => PdfInternal;
    addPage: (options?: unknown) => PdfInternal;
    switchToPage: (page: number) => void;
    bufferedPageRange: () => { start: number; count: number };
    outline?: {
        addItem: (
            title: string,
            options?: Record<string, unknown>
        ) =>
            | {
                  addItem?: (title: string, options?: Record<string, unknown>) => unknown;
              }
            | unknown;
    };
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
    const content = Array.isArray(block.content) ? block.content : [];
    const children = Array.isArray(block.children) ? block.children : [];

    const text = content
        .map((c) => c?.text || "")
        .join(" ")
        .trim();
    const childText = children.map(blockToText).filter(Boolean).join("\n");
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

        // Always try the resolved URL first to avoid noisy errors
        targets.push(resolved);

        // Best-effort original lookup only if the stored URL is a webp (fallbacks tried after the primary URL)
        if (match && match[1].toLowerCase() === "webp") {
            const basePath = resolved.pathname.replace(/\.webp(?=([?#]|$))/i, "");
            const originalCandidates = ["png", "jpg", "jpeg"];
            for (const ext of originalCandidates) {
                const candidate = new URL(resolved.toString());
                candidate.pathname = `${basePath}_original.${ext}`;
                candidate.search = ""; // originals are served without query params
                candidate.hash = "";
                targets.push(candidate);
            }
        }

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
    const content = Array.isArray(block.content) ? block.content : [];
    return content
        .map((c) => c?.text || "")
        .join(" ")
        .trim();
}

type InlineFragment = {
    text: string;
    styles: Set<string>;
    href?: string;
    textColor?: string;
    backgroundColor?: string;
};

function normalizeInline(content: unknown): InlineFragment[] {
    if (!Array.isArray(content)) return [];

    const fragments: InlineFragment[] = [];
    for (const item of content) {
        if (!item || typeof item !== "object") continue;
        const piece = item as { text?: unknown; styles?: unknown; href?: unknown; url?: unknown; type?: unknown; textColor?: unknown; backgroundColor?: unknown };
        if (typeof piece.text !== "string") continue;

        const styles: string[] = [];
        if (Array.isArray(piece.styles)) {
            styles.push(...(piece.styles.filter((s): s is string => typeof s === "string")));
        } else if (piece.styles && typeof piece.styles === "object") {
            for (const [key, value] of Object.entries(piece.styles)) {
                if (value) styles.push(key);
            }
        }
        if (typeof piece.type === "string") styles.push(piece.type);

        const href = typeof piece.href === "string" ? piece.href : typeof piece.url === "string" ? piece.url : undefined;
        const textColor = typeof piece.textColor === "string" ? piece.textColor : undefined;
        const backgroundColor = typeof piece.backgroundColor === "string" ? piece.backgroundColor : undefined;

        fragments.push({ text: piece.text, styles: new Set(styles), href, textColor, backgroundColor });
    }

    return fragments;
}

function inlineText(fragments: InlineFragment[]): string {
    return fragments.map((f) => f.text).join("");
}

type HeadingRef = { text: string; level: number; pageRef?: unknown };
function getPageRef(doc: PdfInternal): unknown {
    const anyDoc = doc as unknown as { page?: { ref?: unknown } };
    return anyDoc.page?.ref;
}

type TableRowProp = { cells?: Array<{ content?: unknown }> };
type TableProps = { rows?: TableRowProp[] };

function normalizeTableCellContent(content: unknown): ParsedBlock[] {
    if (Array.isArray(content)) return content as ParsedBlock[];
    if (typeof content === "string") {
        return [{ type: "paragraph", content: [{ text: content }] }];
    }
    if (content && typeof content === "object") {
        // Attempt to coerce { text } shape
        const maybeText = (content as { text?: unknown }).text;
        if (typeof maybeText === "string") {
            return [{ type: "paragraph", content: [{ text: maybeText }] }];
        }
    }
    return [];
}

function collectTableRowsFromChildren(children: ParsedBlock[] | undefined): ParsedBlock[] {
    if (!Array.isArray(children)) return [];
    const rows: ParsedBlock[] = [];
    const stack = [...children];
    while (stack.length) {
        const node = stack.shift() as ParsedBlock;
        const t = (node.type || "").toLowerCase();
        if (t === "tablerow" || t === "table_row" || t === "row") {
            rows.push(node);
        } else if (Array.isArray((node.props as TableRowProp | undefined)?.cells)) {
            rows.push({
                type: "tableRow",
                children: (node.props as TableRowProp).cells?.map((cell) => ({
                    type: "tableCell",
                    children: normalizeTableCellContent(cell?.content),
                })),
            });
        } else if (Array.isArray(node.children) && node.children.length) {
            // Some BlockNote serializations nest rows under an extra wrapper.
            stack.push(...node.children);
        }
    }
    return rows;
}

function normalizeTableRowsFromProps(block: ParsedBlock): ParsedBlock[] {
    const rows = (block.props as TableProps | undefined)?.rows;
    if (!Array.isArray(rows)) return [];

    return rows.map((row) => {
        const cells = Array.isArray((row as unknown[])[0])
            ? ((row as unknown[]).map((c) => ({ content: c })) as Array<{ content?: unknown }>)
            : Array.isArray((row as TableRowProp).cells)
              ? ((row as TableRowProp).cells as Array<{ content?: unknown }>)
              : [];
        return {
            type: "tableRow",
            children: cells.map((cell) => ({
                type: "tableCell",
                children: normalizeTableCellContent(cell?.content),
            })),
        } as ParsedBlock;
    });
}

function normalizeTableRowsFromContent(block: ParsedBlock): ParsedBlock[] {
    const content = block.content as { type?: string; rows?: unknown[] } | undefined;
    if (!content || typeof content !== "object") return [];
    if ((content.type || "").toLowerCase() !== "tablecontent") return [];
    const rows = Array.isArray(content.rows) ? content.rows : [];
    return rows.map((row) => {
        const rawCells = (row as { cells?: unknown[] }).cells;
        const cells: unknown[] = Array.isArray(rawCells) ? rawCells : [];
        return {
            type: "tableRow",
            children: cells.map((cell) => ({
                type: "tableCell",
                children: normalizeTableCellContent((cell as { content?: unknown }).content),
            })),
        } as ParsedBlock;
    });
}

function collectHeadings(blocks: ParsedBlock[], acc: HeadingRef[] = []): HeadingRef[] {
    for (const block of blocks) {
        const type = block.type || "";
        const fragments = normalizeInline(block.content);
        const text = inlineText(fragments) || blockText(block);
        if (["heading", "heading1"].includes(type)) {
            acc.push({ text, level: 1 });
        } else if (type === "heading2") {
            acc.push({ text, level: 2 });
        } else if (type === "heading3") {
            acc.push({ text, level: 3 });
        }
        if (Array.isArray(block.children) && block.children.length) {
            collectHeadings(block.children, acc);
        }
    }
    return acc;
}

function fontForStyles(styles: Set<string>): string {
    const isBold = styles.has("bold");
    const isItalic = styles.has("italic") || styles.has("em");
    const isCode = styles.has("code");
    if (isCode) return "Courier";
    if (isBold && isItalic) return "Helvetica-BoldOblique";
    if (isBold) return "Helvetica-Bold";
    if (isItalic) return "Helvetica-Oblique";
    return "Helvetica";
}

function renderRichText(
    doc: PdfInternal,
    fragments: InlineFragment[],
    options: PdfTextOptions & { fontSize?: number } = {}
) {
    if (!fragments.length) {
        doc.text("", options);
        return;
    }

    let first = true;
    const baseFontSize = options.fontSize ?? 12;

    for (const fragment of fragments) {
        const font = fontForStyles(fragment.styles);
        const isCode = fragment.styles.has("code");
        const fontSize = isCode ? Math.max(10, baseFontSize - 1) : baseFontSize;
        const link = fragment.href;
        const underline = options.underline || fragment.styles.has("underline") || Boolean(link);
        const fillColor = fragment.textColor || (link ? "#1a0dab" : undefined);
        const backgroundColor = fragment.backgroundColor;
        const strike = options.strike || fragment.styles.has("strike") || fragment.styles.has("strikethrough");
        const availableWidth =
            options.width ??
            doc.page.width - doc.page.margins.left - doc.page.margins.right - (options.indent ?? 0);

        // Draw inline background before rendering text (approximate; does not handle wrapping)
        if (backgroundColor) {
            const height = doc.heightOfString(fragment.text, { width: availableWidth });
            const bgX = doc.x;
            const bgY = doc.y;
            doc.save();
            doc.rect(bgX, bgY, availableWidth, height).fill(backgroundColor);
            doc.restore();
        }

        doc.font(font)
            .fontSize(fontSize)
            .fillColor(fillColor || "#000")
            .text(fragment.text, {
                ...(first ? options : { continued: true }),
                underline,
                link,
                strike,
            });
        first = false;
    }

    doc.fillColor("#000").font("Helvetica").fontSize(baseFontSize);
}

const INDENT_STEP = 16;
const numberedListTypes = new Set(["numberedListItem", "numberListItem", "ordered_list"]);
const mediaIcons: Record<string, string> = { video: "🎬", audio: "🎧", file: "📄" };

function alignForBlock(block: ParsedBlock): PdfTextOptions["align"] {
    const align = block.props?.textAlignment;
    if (align === "center" || align === "right" || align === "justify") return align;
    return "left";
}

function ensureSpace(doc: PdfInternal, minHeight: number) {
    const available = doc.page.height - doc.page.margins.bottom - doc.y;
    if (minHeight > 0 && available <= minHeight) {
        doc.addPage();
    }
}

function renderFooter(doc: PdfInternal, title: string, pageNumber: number) {
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const footerY = doc.page.height - doc.page.margins.bottom - 12; // keep inside bottom margin to avoid reflow
    const prevX = doc.x;
    const prevY = doc.y;

    doc.font("Helvetica").fontSize(9).fillColor("#888");
    doc.text(`${title || "Document"} — Page ${pageNumber}`, doc.page.margins.left, footerY, {
        width,
        align: "center",
        lineBreak: false,
    });
    doc.x = prevX;
    doc.y = prevY;
    doc.fillColor("#000");
}

function setupPageFooters(doc: PdfInternal, title: string) {
    let pageNumber = 0;
    const render = () => {
        pageNumber += 1;
        renderFooter(doc, title, pageNumber);
    };
    render(); // first page
    (doc as unknown as { on: (event: string, listener: () => void) => void }).on("pageAdded", render);
}

function renderTable(doc: PdfInternal, rows: ParsedBlock[], indent: number) {
    const marginLeft = doc.page.margins.left + indent;
    const marginRight = doc.page.width - doc.page.margins.right;
    const tableWidth = marginRight - marginLeft;
    const paddingX = 6;
    const paddingY = 4;
    const stroke = "#d0d0d0";
    const textColor = "#f1f1f1";
    const headerBg = "#1f1f1f";

    rows.forEach((row, rowIdx) => {
        const cells = Array.isArray(row.children) ? row.children : [];
        const colCount = Math.max(cells.length, 1);
        const colWidth = tableWidth / colCount;

        // Measure each cell to allow wrapping and dynamic heights
        const cellHeights: number[] = [];
        for (const cell of cells) {
            const text = blockToText(cell);
            const height = doc.heightOfString(text, {
                width: colWidth - paddingX * 2,
                align: "left",
            });
            cellHeights.push(height + paddingY * 2);
        }
        const rowHeight = Math.max(...(cellHeights.length ? cellHeights : [doc.currentLineHeight() + paddingY * 2]));

        ensureSpace(doc, rowHeight + 6);

        cells.forEach((cell, idx) => {
            const x = marginLeft + idx * colWidth;
            const y = doc.y;
            const isHeader = rowIdx === 0;
            if (isHeader) {
                doc.save();
                doc.rect(x, y, colWidth, rowHeight);
                doc.fill(headerBg);
                doc.stroke(stroke);
                doc.restore();
            } else {
                doc.rect(x, y, colWidth, rowHeight).stroke(stroke);
            }
            doc.font("Helvetica").fontSize(11).fillColor(textColor).text(blockToText(cell), x + paddingX, y + paddingY, {
                width: colWidth - paddingX * 2,
                height: rowHeight - paddingY * 2,
                align: "left",
            });
        });

        doc.y += rowHeight;
        doc.moveDown(0.05);
    });
    doc.fillColor("#000");
    doc.moveDown(0.1);
}

async function renderBlocksToPdf(
    doc: PdfInternal,
    blocks: ParsedBlock[],
    origin: string,
    cookies: string | null,
    indent = 0,
    listCounters: Map<number, number> = new Map(),
    headingRefs: HeadingRef[] = []
) {
    for (const block of blocks) {
        const type = block.type || "paragraph";
        const fragments = normalizeInline(block.content);
        const text = inlineText(fragments) || blockText(block);
        const children = Array.isArray(block.children) ? block.children : [];
        const options = { indent, align: alignForBlock(block) };
        const isNumberedListItem = numberedListTypes.has(type);

        if (!isNumberedListItem) {
            listCounters.delete(indent);
        }

        switch (type) {
            case "heading":
            case "heading1":
                renderRichText(doc, fragments, { ...options, fontSize: 22 });
                headingRefs.push({ text, level: 1, pageRef: getPageRef(doc) });
                doc.moveDown(0.5);
                break;
            case "heading2":
                renderRichText(doc, fragments, { ...options, fontSize: 18 });
                headingRefs.push({ text, level: 2, pageRef: getPageRef(doc) });
                doc.moveDown(0.4);
                break;
            case "heading3":
                renderRichText(doc, fragments, { ...options, fontSize: 16 });
                headingRefs.push({ text, level: 3, pageRef: getPageRef(doc) });
                doc.moveDown(0.3);
                break;
            case "bulletListItem":
            case "bullet_list":
            case "listItem":
                renderRichText(doc, [{ text: `• ${text}`, styles: new Set() }], { ...options, fontSize: 12 });
                doc.moveDown(0.05);
                break;
            case "numberListItem":
            case "numberedListItem":
            case "ordered_list": {
                const startProp = block.props?.start;
                const startIndex = typeof startProp === "number" ? startProp : 1;
                const currentIndex = listCounters.get(indent) ?? startIndex;
                renderRichText(
                    doc,
                    [{ text: `${currentIndex}. ${text}`, styles: new Set() }],
                    { ...options, fontSize: 12 }
                );
                listCounters.set(indent, currentIndex + 1);
                doc.moveDown(0.05);
                break;
            }
            case "checkListItem": {
                const checked =
                    block.props && typeof block.props.checked === "boolean" ? (block.props.checked as boolean) : false;
                const checkbox = checked ? "[x]" : "[ ]";
                const baseFragments = fragments.length ? fragments : [{ text: text || "", styles: new Set<string>() }];
                const merged: InlineFragment[] = baseFragments.map((frag, idx) =>
                    idx === 0 ? { ...frag, text: `${checkbox} ${frag.text}` } : frag
                );
                renderRichText(doc, merged, {
                    ...options,
                    fontSize: 12,
                    strike: checked,
                });
                doc.moveDown(0.05);
                break;
            }
            case "toggleListItem": {
                const isOpen =
                    block.props && typeof block.props.open === "boolean"
                        ? (block.props.open as boolean)
                        : typeof block.props?.expanded === "boolean"
                          ? (block.props.expanded as boolean)
                          : false;
                const glyph = isOpen ? "[v]" : "[>]";
                const label = text || "Toggle";
                renderRichText(doc, [{ text: `${glyph} ${label}`, styles: new Set(["bold"]) }], { ...options, fontSize: 12 });
                doc.moveDown(0.05);
                break;
            }
            case "quote":
                doc.fillColor("#555");
                renderRichText(
                    doc,
                    fragments.length ? fragments : [{ text, styles: new Set(["italic"]) }],
                    { ...options, fontSize: 12, indent: indent + INDENT_STEP * 0.6 }
                );
                doc.fillColor("#000");
                doc.moveDown(0.2);
                break;
            case "callout": {
                const bg = (block.props?.backgroundColor as string) || "#f3f4f6";
                const stroke = (block.props?.borderColor as string) || "#d1d5db";
                const boxPadding = 8;
                const availableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right - indent;
                const textX = doc.page.margins.left + indent + boxPadding;
                const textHeight = doc.heightOfString(text || "", { width: availableWidth - boxPadding * 2 });
                const blockHeight = textHeight + boxPadding * 2;
                ensureSpace(doc, blockHeight + 6);
                const blockX = textX - boxPadding;
                const blockY = doc.y;

                doc.save();
                doc.rect(blockX, blockY, availableWidth, blockHeight).fill(bg);
                doc.stroke(stroke);
                doc.fillColor("#111");
                doc.text(text || "", textX, blockY + boxPadding, {
                    width: availableWidth - boxPadding * 2,
                });
                doc.restore();

                doc.fillColor("#000");
                doc.moveDown(blockHeight / doc.currentLineHeight());
                break;
            }
            case "divider":
                doc.moveDown(0.15);
                (() => {
                    const startX = doc.page.margins.left + indent;
                    const endX = doc.page.width - doc.page.margins.right;
                    doc.moveTo(startX, doc.y).lineTo(endX, doc.y);
                    doc.stroke("#e0e0e0");
                })();
                doc.moveDown(0.3);
                break;
            case "pageBreak":
                doc.addPage();
                continue;
            case "codeBlock":
                (() => {
                    const code = text || "";
                    const padding = 8;
                    const availableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right - indent;
                    const textX = doc.page.margins.left + indent;
                    const textHeight = doc.heightOfString(code, {
                        width: availableWidth,
                        align: "left",
                    });
                    const blockHeight = textHeight + padding * 2;

                    ensureSpace(doc, blockHeight + 10);
                    const blockX = textX - padding;
                    const blockY = doc.y;
                    const blockWidth = availableWidth + padding * 2;
                    doc.save();
                    doc.roundedRect(blockX, blockY, blockWidth, blockHeight, 6).fill("#f7f7f8");
                    doc.fillColor("#111");
                    doc.font("Courier").fontSize(10).text(code, textX, blockY + padding, {
                        lineGap: 2,
                        width: availableWidth,
                    });
                    doc.restore();

                    doc.font("Helvetica").fontSize(12).fillColor("#000");
                    doc.y = blockY + blockHeight;
                    doc.moveDown(0.9);
                })();
                break;
            case "image": {
                const props = (block as ParsedBlock & { props?: { url?: string; src?: string } }).props;
                const url = props?.url || props?.src;
                const align = typeof block.props?.alignment === "string" ? (block.props?.alignment as "left" | "center" | "right") : "left";
                const caption = typeof block.props?.caption === "string" ? (block.props?.caption as string) : "";
                if (url) {
                    const buf = await fetchImageBuffer(url, origin, cookies);
                    if (buf) {
                        const placeImage = async (input: Buffer) => {
                            const availableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right - indent;
                            const maxHeight = doc.page.height * 0.45;

                            const imageOptions: PdfImageOptions = { fit: [availableWidth, maxHeight] };
                            let metaWidth: number | undefined;
                            let metaHeight: number | undefined;

                            try {
                                const meta = await sharp(input).metadata();
                                if (meta.width && meta.height) {
                                    metaWidth = meta.width;
                                    metaHeight = meta.height;
                                    const aspect = metaWidth / metaHeight;
                                    let targetWidth = Math.min(availableWidth, metaWidth);
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

                            const imgWidth = imageOptions.width ?? availableWidth;
                            const imageX =
                                align === "center"
                                    ? doc.page.margins.left + (availableWidth - imgWidth) / 2 + indent / 2
                                    : align === "right"
                                      ? doc.page.width - doc.page.margins.right - imgWidth
                                      : doc.page.margins.left + indent;

                            const estimatedHeight = (() => {
                                if (imageOptions.height) return imageOptions.height;
                                if (imageOptions.fit) {
                                    const [fitW, fitH] = imageOptions.fit;
                                    if (metaWidth && metaHeight) {
                                        const aspect = metaWidth / metaHeight;
                                        return Math.min(fitH, fitW / aspect);
                                    }
                                    return fitH;
                                }
                                return maxHeight;
                            })();

                            const captionHeight = caption ? doc.currentLineHeight() + 6 : 0;
                            ensureSpace(doc, estimatedHeight + captionHeight + 12);

                            const startY = doc.y;
                            doc.image(input, imageX, startY, imageOptions);
                            doc.y = startY + estimatedHeight;
                            doc.moveDown(0.3);
                            if (caption) {
                                doc.font("Helvetica-Oblique").fontSize(10).fillColor("#555").text(caption, {
                                    align: "center",
                                });
                                doc.fillColor("#000");
                            }
                            doc.moveDown(0.4);
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
                doc.moveDown(0.2);
                break;
            }
            case "video":
            case "audio":
            case "file": {
                const props = (block as ParsedBlock & { props?: { url?: string; src?: string; name?: string } }).props;
                const url = props?.url || props?.src;
                const label = props?.name || text || type.toUpperCase();
                const icon = mediaIcons[type] || "🔗";
                renderRichText(doc, [{ text: `${icon} ${label}`, styles: new Set() }], {
                    ...options,
                    fontSize: 12,
                });
                if (url) {
                    doc.font("Helvetica").fontSize(10).fillColor("#1a0dab").text(url, { ...options, underline: true, link: url });
                    doc.fillColor("#000").fontSize(12);
                }
                doc.moveDown(0.2);
                break;
            }
            case "table": {
                const tableRowsFromChildren = collectTableRowsFromChildren(children);
                const tableRowsFromContent = normalizeTableRowsFromContent(block);
                const tableRows = tableRowsFromChildren.length
                    ? tableRowsFromChildren
                    : tableRowsFromContent.length
                      ? tableRowsFromContent
                      : normalizeTableRowsFromProps(block);
                if (tableRows.length) {
                    renderTable(doc, tableRows, indent);
                } else {
                    renderRichText(doc, [{ text: "[Table]", styles: new Set(["italic"]) }], { ...options, fontSize: 12 });
                }
                doc.moveDown(0.15);
                continue;
            }
            default:
                renderRichText(doc, fragments.length ? fragments : [{ text, styles: new Set() }], {
                    ...options,
                    fontSize: 12,
                });
                doc.moveDown(0.05);
        }

        const shouldRenderChildren = type !== "toggleListItem" || (block.props && (block.props.open || block.props.expanded));

        if (shouldRenderChildren && children.length) {
            await renderBlocksToPdf(doc, children, origin, cookies, indent + INDENT_STEP, new Map(), headingRefs);
        }

        if (block.type && block.type.startsWith("heading")) {
            doc.moveDown(0.2);
        }
    }
}

async function createPdf(title: string, blocks: ParsedBlock[], origin: string, cookies: string | null) {
    const pdfOptions: { margin?: number; size?: string | [number, number]; bufferPages?: boolean } = {
        margin: 50,
        size: "A4",
        bufferPages: true,
    };
    const doc = new PDFDocument(pdfOptions) as PdfInternal;
    const outlineRoot =
        doc.outline && typeof doc.outline.addItem === "function" ? (doc.outline.addItem(title || "Document") as unknown) : null;
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    setupPageFooters(doc, title);

    doc.font("Helvetica-Bold").fontSize(20).text(title || "Untitled", { underline: true });
    doc.moveDown();

    const headings = collectHeadings(blocks);
    if (headings.length) {
        doc.font("Helvetica-Bold").fontSize(14).text("Contents", { underline: true });
        doc.moveDown(0.3);
        for (const heading of headings) {
            doc.font("Helvetica").fontSize(11).text(`• ${heading.text}`, {
                indent: (heading.level - 1) * INDENT_STEP,
            });
            doc.moveDown(0.05);
        }
        doc.addPage();
    }

    const headingRefs: HeadingRef[] = [];
    await renderBlocksToPdf(doc, blocks, origin, cookies, 0, new Map(), headingRefs);
    // Outline bookmarks for headings using recorded page references
    const outlineItem = outlineRoot as { addItem?: (t: string, opts?: Record<string, unknown>) => unknown } | null;
    if (outlineItem?.addItem) {
        for (const heading of headingRefs) {
            const dest = heading.pageRef ? [heading.pageRef, "Fit"] : undefined;
            outlineItem.addItem(`${"  ".repeat(heading.level - 1)}${heading.text}`, dest ? { dest } : undefined);
        }
    }
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
