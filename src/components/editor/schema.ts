import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { codeBlockOptions } from "@blocknote/code-block";

// Create schema with code block syntax highlighting
export const schema = BlockNoteSchema.create({
    blockSpecs: {
        ...defaultBlockSpecs,
        // Override code block with one that has syntax highlighting
    },
});

export type CustomSchema = typeof schema.blockSchema;
