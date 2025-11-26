"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Application error:", error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="max-w-md w-full px-6 py-8 text-center space-y-6">
                <div className="flex justify-center">
                    <AlertTriangle className="h-24 w-24 text-destructive" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-4xl font-bold">Oops!</h1>
                    <h2 className="text-2xl font-semibold text-muted-foreground">
                        Something went wrong
                    </h2>
                    <p className="text-muted-foreground">
                        We encountered an unexpected error. Please try again.
                    </p>
                    {error.digest && (
                        <p className="text-xs text-muted-foreground font-mono">
                            Error ID: {error.digest}
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-3">
                    <Button onClick={reset} className="w-full">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                    </Button>
                    <Button variant="outline" onClick={() => window.location.href = "/"} className="w-full">
                        Go Home
                    </Button>
                </div>
            </div>
        </div>
    );
}
