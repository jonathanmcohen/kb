"use client";

import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Global error:", error);
    }, [error]);

    return (
        <html>
            <body>
                <div style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    padding: "2rem"
                }}>
                    <div style={{
                        maxWidth: "28rem",
                        width: "100%",
                        textAlign: "center",
                        display: "flex",
                        flexDirection: "column",
                        gap: "1.5rem"
                    }}>
                        <div style={{ fontSize: "3rem" }}>⚠️</div>

                        <div>
                            <h1 style={{ fontSize: "2.25rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                                Critical Error
                            </h1>
                            <p style={{ color: "#666", marginBottom: "0.5rem" }}>
                                A critical error occurred. Please refresh the page.
                            </p>
                            {error.digest && (
                                <p style={{ fontSize: "0.75rem", color: "#999", fontFamily: "monospace" }}>
                                    Error ID: {error.digest}
                                </p>
                            )}
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            <button
                                onClick={reset}
                                style={{
                                    padding: "0.5rem 1rem",
                                    backgroundColor: "#000",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "0.375rem",
                                    cursor: "pointer",
                                    fontSize: "0.875rem",
                                    fontWeight: "500"
                                }}
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.href = "/"}
                                style={{
                                    padding: "0.5rem 1rem",
                                    backgroundColor: "#fff",
                                    color: "#000",
                                    border: "1px solid #ddd",
                                    borderRadius: "0.375rem",
                                    cursor: "pointer",
                                    fontSize: "0.875rem",
                                    fontWeight: "500"
                                }}
                            >
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
