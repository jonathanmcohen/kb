"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, FileText, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";

interface SearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface SearchResult {
    id: string;
    title: string;
    updatedAt: string;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounce(query, 300);

    const { data: results, isLoading } = useQuery<SearchResult[]>({
        queryKey: ["search", debouncedQuery],
        queryFn: async () => {
            if (!debouncedQuery) return [];
            const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
            if (!res.ok) throw new Error("Search failed");
            return res.json();
        },
        enabled: debouncedQuery.length > 0,
    });

    const handleSelect = useCallback((documentId: string) => {
        onOpenChange(false);
        setQuery("");
        router.push(`/documents/${documentId}`);
    }, [router, onOpenChange]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                onOpenChange(true);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, [onOpenChange]);

    // Reset query when dialog closes
    useEffect(() => {
        if (!open) {
            setQuery("");
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Search Documents</DialogTitle>
                </DialogHeader>

                <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by title... (Cmd/Ctrl+K)"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="pl-10"
                        autoFocus
                    />
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                    {isLoading && (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    )}

                    {!isLoading && results && results.length === 0 && query && (
                        <div className="text-center py-8 text-muted-foreground">
                            No documents found for &quot;{query}&quot;
                        </div>
                    )}

                    {!isLoading && !query && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            Start typing to search documents
                        </div>
                    )}

                    {results && results.length > 0 && (
                        <div className="space-y-1">
                            {results.map((doc) => (
                                <button
                                    key={doc.id}
                                    onClick={() => handleSelect(doc.id)}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent rounded-lg transition-colors"
                                >
                                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{doc.title}</p>
                                        <p className="text-sm text-muted-foreground">
                                            Updated {new Date(doc.updatedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
