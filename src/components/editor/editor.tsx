"use client";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useTheme } from "next-themes";

interface EditorProps {
    onChange: (value: string) => void;
    initialContent?: string;
    editable?: boolean;
}

export function Editor({ onChange, initialContent, editable = true }: EditorProps) {
    const { resolvedTheme } = useTheme();

    const editor = useCreateBlockNote({
        initialContent: initialContent ? JSON.parse(initialContent) : undefined,
    });

    return (
        <div className="prose dark:prose-invert max-w-none">
            <BlockNoteView
                editor={editor}
                editable={editable}
                theme={resolvedTheme === "dark" ? "dark" : "light"}
                onChange={() => {
                    onChange(JSON.stringify(editor.document));
                }}
            />
        </div>
    );
}
