"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Editor } from "@/components/editor/editor";
import { IconPicker } from "@/components/icon-picker";
import { CoverImagePicker } from "@/components/cover-image-picker";
import { X, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSession } from "next-auth/react";

interface Document {
    id: string;
    title: string;
    content: string;
    icon?: string | null;
    coverImage?: string | null;
    updatedAt?: string;
}

interface DocumentVersion {
    id: string;
    createdAt: string;
    title: string;
    label?: string | null;
    user?: {
        id: string;
        name?: string | null;
        email?: string | null;
    };
}

export default function DocumentPage() {
    const { data: session } = useSession();
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
    const [isTitleDirty, setIsTitleDirty] = useState(false);
    const [contentVersion, setContentVersion] = useState(0);
    const [historyOpen, setHistoryOpen] = useState(false);

    const { data: versions, isLoading: versionsLoading } = useQuery<DocumentVersion[]>({
        queryKey: ["versions", documentId],
        queryFn: async () => {
            const res = await fetch(`/api/documents/${documentId}/versions`);
            if (!res.ok) throw new Error("Failed to fetch versions");
            return res.json();
        },
        enabled: historyOpen && !!documentId,
    });

    // Update title when document changes and user isn't actively editing
    useEffect(() => {
        if (document?.title && !isTitleDirty) {
            setTitle(document.title);
        }
        if (document?.title === title) {
            setIsTitleDirty(false);
        }
    }, [document?.title, isTitleDirty, title]);

    // Reset content version when switching documents
    useEffect(() => {
        setContentVersion(0);
        setIsTitleDirty(false);
    }, [documentId]);

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
        setIsTitleDirty(true);
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

    const { mutate: restoreVersion, isPending: restoringVersion } = useMutation({
        mutationFn: async (versionId: string) => {
            const res = await fetch(`/api/documents/${documentId}/versions/${versionId}`, {
                method: "POST",
            });
            if (!res.ok) throw new Error("Failed to restore version");
            return res.json();
        },
        onSuccess: (updatedDoc: Document) => {
            queryClient.setQueryData(["document", documentId], updatedDoc);
            setContentVersion((v) => v + 1);
            setTitle(updatedDoc.title);
            setIsTitleDirty(false);
            setHistoryOpen(false);
        },
    });

    // Listen for server-sent document updates (basic real-time sync)
    useEffect(() => {
        if (!documentId) return;

        const eventSource = new EventSource(`/api/documents/${documentId}/stream`);

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data?.type === "document:update") {
                    if (data.editedBy && data.editedBy === session?.user?.id) {
                        return;
                    }
                    const updatedDoc: Document = data.payload;

                    const current = queryClient.getQueryData<Document>(["document", documentId]);
                    queryClient.setQueryData(["document", documentId], () => updatedDoc);
                    setTitle(updatedDoc.title);
                    setIsTitleDirty(false);
                    if (current?.content !== updatedDoc.content) {
                        setContentVersion((v) => v + 1); // Remount editor to reflect remote content
                    }
                }
            } catch (error) {
                console.error("Failed to parse SSE message", error);
            }
        };

        eventSource.onerror = () => {
            eventSource.close();
        };

        return () => eventSource.close();
    }, [documentId, queryClient, session?.user?.id]);

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
                <div className="flex justify-end mb-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryOpen(true)}
                        className="gap-2"
                    >
                        <History className="h-4 w-4" />
                        History
                    </Button>
                </div>

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
                    key={`${document.id}-${contentVersion}`} // Remount on remote content updates
                    onChange={handleContentChange}
                    initialContent={document.content as string | undefined}
                />
            </div>

            <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
                <DialogContent className="sm:max-w-[640px]">
                    <DialogHeader>
                        <DialogTitle>Version history</DialogTitle>
                        <DialogDescription>
                            Restore a previous snapshot of this document.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[420px] overflow-y-auto space-y-3">
                        {versionsLoading && (
                            <p className="text-sm text-muted-foreground">Loading versions...</p>
                        )}

                        {!versionsLoading && (!versions || versions.length === 0) && (
                            <p className="text-sm text-muted-foreground">
                                No versions yet. Edits will create snapshots automatically.
                            </p>
                        )}

                        {versions && versions.length > 0 && versions.map((version) => (
                            <div
                                key={version.id}
                                className="flex items-center justify-between rounded-lg border p-3"
                            >
                                <div className="space-y-1">
                                    <p className="font-medium">
                                        {version.label || "Snapshot"}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {new Date(version.createdAt).toLocaleString()}
                                        {version.user?.name ? ` · ${version.user.name}` : ""}
                                    </p>
                                    <p className="text-sm truncate text-muted-foreground">
                                        Title: {version.title}
                                    </p>
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    disabled={restoringVersion}
                                    onClick={() => restoreVersion(version.id)}
                                >
                                    Restore
                                </Button>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
