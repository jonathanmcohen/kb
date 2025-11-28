declare module "pdfkit" {
    import type { Readable } from "stream";

    interface PDFDocumentOptions {
        margin?: number;
        size?: string | [number, number];
    }

    class PDFDocument extends Readable {
        constructor(options?: PDFDocumentOptions);
        fontSize(size: number): this;
        text(text: string, options?: Record<string, unknown>): this;
        moveDown(lines?: number): this;
        end(): this;
        on(event: "data", listener: (chunk: Buffer) => void): this;
        on(event: "end", listener: () => void): this;
    }

    export default PDFDocument;
}
