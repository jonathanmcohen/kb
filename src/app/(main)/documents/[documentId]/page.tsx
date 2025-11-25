"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Editor } from "@/components/editor/editor";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, Smile } from "lucide-react";

interface Document {
    id: string;
    title: string;
    content: unknown;
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

    const [title, setTitle] = useState(document?.title ?? "");

    const updateMutation = useMutation({
        mutationFn: async (data: Partial<Document>) => {
            const res = await fetch(`/api/documents/${documentId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to update document");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["document", documentId] });
            queryClient.invalidateQueries({ queryKey: ["documents"] });
        },
    });

    const handleTitleChange = (value: string) => {
        setTitle(value);
        updateMutation.mutate({ title: value });
    };

    const handleContentChange = (content: string) => {
        updateMutation.mutate({ content });
    };

    const handleAddIcon = () => {
        const emoji = prompt('Enter an emoji for this page:');
        if (emoji) {
            updateMutation.mutate({ icon: emoji });
        }
    };

    const handleAddCover = async () => {
        const url = prompt('Enter image URL for cover:');
        if (url) {
            updateMutation.mutate({ coverImage: url });
        }
    };

    const handleContentChangeWrapper = (content: string) => {
        updateMutation.mutate({ content });
    };

    if (!document) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {document.coverImage && (
                <div className="h-48 w-full relative bg-muted">
                    {/* Cover image would go here */}
                </div>
            )}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-12 py-8">
                    <div className="group flex items-center gap-2 mb-4">
                        {document.icon && <span className="text-5xl">{document.icon}</span>}
                        {!document.icon && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100"
                                onClick={handleAddIcon}
                            >
                                <Smile className="h-4 w-4 mr-2" />
                                Add icon
                            </Button>
                        )}
                        {!document.coverImage && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100"
                                onClick={handleAddCover}
                            >
                                <ImageIcon className="h-4 w-4 mr-2" />
                                Add cover
                            </Button>
                        )}
                    </div>
                    <Input
                        value={title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        className="text-4xl font-bold border-none focus-visible:ring-0 px-0 mb-4"
                        placeholder="Untitled"
                    />
                    <Editor
                        onChange={handleContentChangeWrapper}
                        initialContent={document.content ? JSON.stringify(document.content) : undefined}
                    />
                </div>
            </div>
        </div>
    );
}
