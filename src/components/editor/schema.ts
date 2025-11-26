import { BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs, defaultStyleSpecs } from "@blocknote/core";
import { codeBlockOptions } from "@blocknote/code-block";

// Create schema with code block that has syntax highlighting
export const schema = BlockNoteSchema.create({
    blockSpecs: {
        ...defaultBlockSpecs,
        // Replace code block with one that supports syntax highlighting
        codeBlock: {
            ...defaultBlockSpecs.codeBlock,
            config: {
                ...defaultBlockSpecs.codeBlock.config,
                ...codeBlockOptions,
            },
        },
    },
    inlineContentSpecs: defaultInlineContentSpecs,
    styleSpecs: defaultStyleSpecs,
});

export type CustomSchema = typeof schema.blockSchema;
