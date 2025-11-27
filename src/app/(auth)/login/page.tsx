"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showMFA, setShowMFA] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const result = await signIn("credentials", {
                email,
                password,
                otp: showMFA ? otp : undefined,
                redirect: false,
            });

            if (result?.error) {
                console.log("Login error result:", result);
                // Check for MFA_REQUIRED in various places it might appear
                if (
                    !showMFA &&
                    (
                        result.error === "MFA_REQUIRED" ||
                        result.code === "MFA_REQUIRED" ||
                        (result.error === "CredentialsSignin" && result.code === "MFA_REQUIRED") ||
                        result.error?.includes("MFA") ||
                        result.code?.includes("MFA")
                    )
                ) {
                    setShowMFA(true);
                    setLoading(false);
                    return;
                }

                setError("Invalid credentials or verification code");
                setLoading(false);
            } else {
                router.push("/documents");
                router.refresh();
            }
        } catch (err) {
            console.error("Login error:", err);
            setError("An error occurred");
            setLoading(false);
        }
    };

    if (showMFA) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold">Two-Factor Authentication</CardTitle>
                        <CardDescription>Enter the code from your authenticator app</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="otp">Verification Code</Label>
                                <Input
                                    id="otp"
                                    type="text"
                                    placeholder="000000"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="text-center text-2xl tracking-widest font-mono"
                                    maxLength={6}
                                    autoFocus
                                    required
                                />
                            </div>
                            {error && <p className="text-sm text-red-500">{error}</p>}
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? "Verifying..." : "Verify"}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                className="w-full"
                                onClick={() => {
                                    setShowMFA(false);
                                    setOtp("");
                                    setError("");
                                }}
                            >
                                Back to Login
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
                    <CardDescription>Sign in to your knowledge base</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Signing in..." : "Sign in"}
                        </Button>
                    </form>
                    <div className="mt-4">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                            </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <Button variant="outline" onClick={() => signIn("google")} type="button">
                                Google
                            </Button>
                            <Button variant="outline" onClick={() => signIn("github")} type="button">
                                GitHub
                            </Button>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <p className="text-sm text-muted-foreground">
                        Don&apos;t have an account?{" "}
                        <Link href="/signup" className="text-primary hover:underline">
                            Sign up
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
