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

    // Safely parse initial content
    const parsedContent = (() => {
        if (!initialContent) return undefined;
        try {
            const parsed = JSON.parse(initialContent);
            // Validate it's an array
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        } catch (e) {
            console.error('Failed to parse editor content:', e);
        }
        return undefined;
    })();

    const editor = useCreateBlockNote({
        initialContent: parsedContent,
        uploadFile: async (file: File) => {
            // Use FormData to upload file to proxy endpoint
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to upload file');
            }

            const { url } = await response.json();
            return url;
        },
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
