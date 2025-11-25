"use client";

import { useEffect } from "react";

export default function NewDocumentPage() {
    useEffect(() => {
        // Create new document and redirect
        const createDocument = async () => {
            try {
                const response = await fetch('/api/documents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: 'Untitled' }),
                });

                if (response.ok) {
                    const document = await response.json();
                    window.location.href = `/documents/${document.id}`;
                } else {
                    // Fallback: just redirect to documents list
                    window.location.href = '/documents';
                }
            } catch (error) {
                console.error('Failed to create document:', error);
                window.location.href = '/documents';
            }
        };

        createDocument();
    }, []);

    return (
        <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Creating new document...</p>
        </div>
    );
}
