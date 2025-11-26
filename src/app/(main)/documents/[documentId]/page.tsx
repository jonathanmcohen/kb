"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Editor } from "@/components/editor/editor";
import { IconPicker } from "@/components/icon-picker";
import { CoverImagePicker } from "@/components/cover-image-picker";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Document {
    id: string;
    title: string;
    content: string;
    icon?: string | null;
    coverImage?: string | null;
}

export default function DocumentPage() {
    const params = useParams();
    const documentId = params.documentId as string;
    const queryClient = useQueryClient();
    const { data: document } = useQuery<Document>({
        queryKey: ["document", documentId],
        queryFn: async () => {
            const res = await fetch(`/api/documents/${documentId}`);
            if (!res.ok) throw new Error("Failed to fetch document");
            return res.json();
        },
        enabled: !!documentId,
    });

    const [title, setTitle] = useState("");

    // Update title when document loads
    if (document?.title && title === "") {
        setTitle(document.title);
    }

    const { mutate: updateDocument } = useMutation({
        mutationFn: async (data: Partial<Document>) => {
            const res = await fetch(`/api/documents/${documentId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to update");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["document", documentId] });
        },
    });

    // Debounce title updates
    useEffect(() => {
        if (!document || title === "" || title === document.title) return;

        const timeout = setTimeout(() => {
            updateDocument({ title });
        }, 500);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title, document?.title]); // Only depend on title and document.title

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
    };

    // Content save handler - no debounce here, it's in the editor
    const handleContentChange = useCallback((content: string) => {
        updateDocument({ content });
    }, [updateDocument]);

    const handleIconChange = (icon: string) => {
        updateDocument({ icon });
    };

    const handleCoverChange = (coverImage: string) => {
        updateDocument({ coverImage });
    };

    const handleRemoveCover = () => {
        updateDocument({ coverImage: null });
    };

    const handleRemoveIcon = () => {
        updateDocument({ icon: null });
    };

    // Track which document ID we've initialized to prevent re-initialization on save
    const initializedDocId = useRef<string | null>(null);

    // Set initial content only once per document
    const initialEditorContent = useMemo(() => {
        if (!document?.content) {
            return undefined;
        }
        // If this is a new document (different ID), reset and initialize
        if (initializedDocId.current !== document.id) {
            initializedDocId.current = document.id;
            return JSON.stringify(document.content);
        }
        // Same document, don't re-initialize
        return undefined;
    }, [document?.id, document?.content]);

    if (!document) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto">
            {/* Cover Image */}
            {document.coverImage && (
                <div className="h-[40vh] w-full relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={document.coverImage}
                        alt="Cover"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleRemoveCover}
                        >
                            <X className="h-4 w-4 mr-2" />
                            Remove cover
                        </Button>
                    </div>
                </div>
            )}

            <div className="max-w-3xl mx-auto px-12 py-8">
                {/* Icon and Cover Controls */}
                <div className="flex items-center gap-2 mb-8">
                    <IconPicker currentIcon={document.icon} onIconChange={handleIconChange}>
                        <Button variant="ghost" size="sm">
                            {document.icon ? (
                                <span className="text-5xl">{document.icon}</span>
                            ) : (
                                <span className="text-muted-foreground text-sm">🙂 Add icon</span>
                            )}
                        </Button>
                    </IconPicker>

                    {document.icon && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveIcon}
                            className="text-muted-foreground hover:text-destructive"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}

                    {!document.coverImage && (
                        <CoverImagePicker onCoverChange={handleCoverChange} />
                    )}
                </div>

                {/* Title */}
                <Input
                    value={title}
                    onChange={handleTitleChange}
                    className="text-5xl font-bold border-none px-0 focus-visible:ring-0 mb-4"
                    placeholder="Untitled"
                />

                {/* Editor */}
                <Editor
                    onChange={handleContentChange}
                    initialContent={initialEditorContent}
                />
            </div>
        </div>
    );
}
