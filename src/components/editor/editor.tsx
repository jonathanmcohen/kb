"use client";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { SuggestionMenuController } from "@blocknote/react";
import { getDefaultReactSlashMenuItems } from "@blocknote/react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
// Import Prism for syntax highlighting
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
// Import common languages
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-css";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-yaml";
import { useTheme } from "next-themes";
import { useRef, useEffect, useMemo } from "react";

// Make Prism available globally for BlockNote
if (typeof window !== "undefined") {
    (window as Window & { Prism: typeof Prism }).Prism = Prism;
}

interface EditorProps {
    onChange: (value: string) => void;
    initialContent?: string;
    editable?: boolean;
}

export function Editor({ onChange, initialContent, editable = true }: EditorProps) {
    const { resolvedTheme } = useTheme();
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    // Safely parse initial content
    const parsedContent = useMemo(() => {
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
    }, [initialContent]);

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

    const onChangeRef = useRef(onChange);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    // Cleanup timeout on unmount and flush pending changes
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                // Flush pending changes immediately on unmount using the latest callback
                onChangeRef.current(JSON.stringify(editor.document));
            }
        };
    }, [editor]); // Remove onChange from dependencies

    return (
        <div className="prose dark:prose-invert max-w-none">
            <BlockNoteView
                editor={editor}
                editable={editable}
                theme={resolvedTheme === "dark" ? "dark" : "light"}
                slashMenu={false} // Disable default slash menu to use controller
                onChange={() => {
                    // Debounce the onChange call
                    if (timeoutRef.current) {
                        clearTimeout(timeoutRef.current);
                    }
                    timeoutRef.current = setTimeout(() => {
                        onChange(JSON.stringify(editor.document));
                    }, 1000); // Save after 1 second of inactivity
                }}
            >
                {/* Slash Menu for commands like /heading, /bullet-list, etc. */}
                <SuggestionMenuController
                    triggerCharacter={"/"}
                    getItems={async (query) =>
                        getDefaultReactSlashMenuItems(editor).filter((item) =>
                            item.title.toLowerCase().includes(query.toLowerCase())
                        )
                    }
                />
            </BlockNoteView>
        </div>
    );
}
