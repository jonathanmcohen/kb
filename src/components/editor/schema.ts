import {
    BlockNoteSchema,
    defaultBlockSpecs,
    defaultInlineContentSpecs,
    defaultStyleSpecs
} from "@blocknote/core";
import { getHighlighter, bundledLanguages } from "shiki";

// Create a Shiki highlighter
let highlighter: any = null;

async function getShikiHighlighter() {
    if (!highlighter) {
        highlighter = await getHighlighter({
            themes: ['github-dark', 'github-light'],
            langs: Object.keys(bundledLanguages)
        });
    }
    return highlighter;
}

// Create BlockNote schema with Shiki code block
export const schema = BlockNoteSchema.create({
    blockSpecs: {
        ...defaultBlockSpecs,
    },
    inlineContentSpecs: defaultInlineContentSpecs,
    styleSpecs: defaultStyleSpecs,
});

export { getShikiHighlighter };
export type SchemaType = typeof schema.schema;
