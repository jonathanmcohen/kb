declare module "pdfkit" {
    import type { Readable } from "stream";

    interface PDFDocumentOptions {
        margin?: number;
        size?: string | [number, number];
    }

    interface PDFPage {
        width: number;
        height: number;
        margins: {
            left: number;
            right: number;
            top: number;
            bottom: number;
        };
    }

    interface ImageOptions {
        fit?: [number, number];
        align?: "left" | "center" | "right";
        width?: number;
        height?: number;
        x?: number;
        y?: number;
        valign?: "top" | "center" | "bottom";
        scale?: number;
    }

    class PDFDocument extends Readable {
        constructor(options?: PDFDocumentOptions);
        page: PDFPage;
        font(name: string | Buffer, size?: number): this;
        fontSize(size: number): this;
        text(text: string, options?: Record<string, unknown>): this;
        text(text: string, x?: number, y?: number, options?: Record<string, unknown>): this;
        image(src: Buffer | string, x?: number, y?: number, options?: ImageOptions): this;
        moveDown(lines?: number): this;
        end(): this;
        on(event: "data", listener: (chunk: Buffer) => void): this;
        on(event: "end", listener: () => void): this;
    }

    export default PDFDocument;
}
