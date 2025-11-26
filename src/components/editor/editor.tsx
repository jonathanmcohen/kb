"use client";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteSchema, createCodeBlockSpec } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { SuggestionMenuController } from "@blocknote/react";
import { getDefaultReactSlashMenuItems } from "@blocknote/react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { codeBlockOptions } from "@blocknote/code-block";
import { useTheme } from "next-themes";
import { useRef, useEffect, useMemo } from "react";

interface EditorProps {
    onChange: (value: string) => void;
    initialContent?: string;
    editable?: boolean;
}

const originalUrlMap = new Map<string, string>();

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
        schema: BlockNoteSchema.create().extend({
            blockSpecs: {
                codeBlock: createCodeBlockSpec(codeBlockOptions),
            },
        }),
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

            const data = await response.json();

            // Store the originalUrl if it exists
            if (data.originalUrl) {
                originalUrlMap.set(data.url, data.originalUrl);
            }

            return data.url;
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

    // Add download original buttons to images
    useEffect(() => {
        const addDownloadButtons = () => {
            const editorElement = document.querySelector('.bn-container');
            if (!editorElement) return;

            const images = editorElement.querySelectorAll('img[data-content-type^="image"]');

            images.forEach((img) => {
                // Skip if button already added
                if (img.parentElement?.querySelector('.download-original-btn')) return;

                const imgSrc = img.getAttribute('src');
                if (!imgSrc || !imgSrc.includes('.webp')) return;

                // Try to get original URL from map, otherwise compute it
                let originalUrl = originalUrlMap.get(imgSrc);

                if (!originalUrl) {
                    // Fallback: try to guess by trying common extensions
                    // The pattern is: filename.webp -> filename_original.ext
                    // We'll try .jpg, .png, .jpeg in that order
                    const baseUrl = imgSrc.replace(/\.webp$/, '');
                    originalUrl = `${baseUrl}_original.jpg`; // Default to jpg
                }

                // Create download button
                const button = document.createElement('a');
                button.href = originalUrl;
                button.download = '';
                button.className = 'download-original-btn';
                button.innerHTML = '↓ Original';
                button.style.cssText = `
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: rgba(0, 0, 0, 0.7);
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    text-decoration: none;
                    cursor: pointer;
                    z-index: 10;
                    opacity: 0;
                    transition: opacity 0.2s;
                `;

                // Wrap image in a container if not already wrapped
                const parent = img.parentElement;
                if (parent && !parent.classList.contains('image-wrapper')) {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'image-wrapper';
                    wrapper.style.cssText = 'position: relative; display: inline-block;';
                    parent.insertBefore(wrapper, img);
                    wrapper.appendChild(img);
                    wrapper.appendChild(button);

                    // Show button on hover
                    wrapper.addEventListener('mouseenter', () => {
                        button.style.opacity = '1';
                    });
                    wrapper.addEventListener('mouseleave', () => {
                        button.style.opacity = '0';
                    });
                }
            });
        };

        // Run initially and on editor changes
        addDownloadButtons();
        const interval = setInterval(addDownloadButtons, 1000);

        return () => clearInterval(interval);
    }, [editor]);

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
