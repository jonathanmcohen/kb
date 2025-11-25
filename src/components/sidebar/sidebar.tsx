"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IconPicker } from "@/components/icon-picker";

interface Document {
    id: string;
    title: string;
    icon?: string | null;
    parentId?: string | null;
    children?: Document[];
}

export function Sidebar() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const { data: documents = [] } = useQuery<Document[]>({
        queryKey: ["documents"],
        queryFn: async () => {
            const res = await fetch("/api/documents");
            if (!res.ok) throw new Error("Failed to fetch documents");
            return res.json();
        },
    });

    const createMutation = useMutation({
        mutationFn: async (parentId?: string) => {
            const res = await fetch("/api/documents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: "Untitled", parentId }),
            });
            if (!res.ok) throw new Error("Failed to create document");
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["documents"] });
            router.push(`/documents/${data.id}`);
        },
    });

    const archiveMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/documents/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isArchived: true }),
            });
            if (!res.ok) throw new Error("Failed to archive document");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["documents"] });
        },
    });

    const updateIconMutation = useMutation({
        mutationFn: async ({ id, icon }: { id: string; icon: string }) => {
            const res = await fetch(`/api/documents/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ icon }),
            });
            if (!res.ok) throw new Error("Failed to update icon");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["documents"] });
        },
    });

    const toggleExpanded = (id: string) => {
        const newExpanded = new Set(expandedIds);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedIds(newExpanded);
    };

    const buildHierarchy = (docs: Document[], parentId: string | null = null): Document[] => {
        return docs
            .filter((doc) => doc.parentId === parentId)
            .map((doc) => ({
                ...doc,
                children: buildHierarchy(docs, doc.id),
            }));
    };

    const renderDocument = (doc: Document, level = 0) => {
        const hasChildren = doc.children && doc.children.length > 0;
        const isExpanded = expandedIds.has(doc.id);

        return (
            <div key={doc.id}>
                <div
                    className="group flex items-center gap-2 px-3 py-1.5 hover:bg-accent rounded-md cursor-pointer"
                    style={{ paddingLeft: `${level * 12 + 12}px` }}
                >
                    {hasChildren && (
                        <button onClick={() => toggleExpanded(doc.id)} className="p-0.5">
                            {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
                        </button>
                    )}
                    {!hasChildren && <div className="w-5" />}
                    <div
                        className="flex items-center gap-2 flex-1 min-w-0"
                        onClick={() => router.push(`/documents/${doc.id}`)}
                    >
                        <IconPicker
                            currentIcon={doc.icon}
                            onIconChange={(icon) => updateIconMutation.mutate({ id: doc.id, icon })}
                        >
                            <button
                                className="hover:bg-accent/50 rounded px-1"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {doc.icon ? (
                                    <span className="text-lg">{doc.icon}</span>
                                ) : (
                                    <FileText className="h-4 w-4 shrink-0" />
                                )}
                            </button>
                        </IconPicker>
                        <span className="truncate text-sm">{doc.title}</span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                                e.stopPropagation();
                                archiveMutation.mutate(doc.id);
                            }}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                                e.stopPropagation();
                                createMutation.mutate(doc.id);
                            }}
                        >
                            <Plus className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
                {hasChildren && isExpanded && doc.children?.map((child) => renderDocument(child, level + 1))}
            </div>
        );
    };

    const hierarchy = buildHierarchy(documents);

    return (
        <div className="h-full flex flex-col bg-secondary/30">
            <div className="p-4 border-b">
                <Button
                    onClick={() => createMutation.mutate(undefined)}
                    className="w-full"
                    variant="outline"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    New Page
                </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
                {hierarchy.map((doc) => renderDocument(doc))}
            </div>
        </div>
    );
}
