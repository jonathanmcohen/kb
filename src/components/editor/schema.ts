import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { createCodeBlockSpec, codeBlockOptions } from "@blocknote/code-block";

// Create a custom code block with syntax highlighting
const customCodeBlock = createCodeBlockSpec(codeBlockOptions);

// Create schema with custom code block
export const schema = BlockNoteSchema.create({
    blockSpecs: {
        ...defaultBlockSpecs,
        codeBlock: customCodeBlock,
    },
});

export type CustomSchema = typeof schema.BlockSchema;
