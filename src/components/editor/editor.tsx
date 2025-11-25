"use client";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useTheme } from "next-themes";
import { useRef, useEffect } from "react";

interface EditorProps {
    onChange: (value: string) => void;
    initialContent?: string;
    editable?: boolean;
}

export function Editor({ onChange, initialContent, editable = true }: EditorProps) {
    const { resolvedTheme } = useTheme();
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

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

    // Cleanup timeout on unmount and flush pending changes
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                // Flush pending changes immediately on unmount
                onChange(JSON.stringify(editor.document));
            }
        };
    }, [editor, onChange]);

    return (
        <div className="prose dark:prose-invert max-w-none">
            <BlockNoteView
                editor={editor}
                editable={editable}
                theme={resolvedTheme === "dark" ? "dark" : "light"}
                onChange={() => {
                    // Debounce the onChange call
                    if (timeoutRef.current) {
                        clearTimeout(timeoutRef.current);
                    }
                    timeoutRef.current = setTimeout(() => {
                        onChange(JSON.stringify(editor.document));
                    }, 1000); // Save after 1 second of inactivity
                }}
            />
        </div>
    );
}
