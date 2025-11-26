"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function VerifyMFAPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [token, setToken] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const email = searchParams.get("email");

    useEffect(() => {
        if (!email) {
            router.push("/login");
        }
    }, [email, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !token) return;

        setIsLoading(true);

        try {
            // Attempt sign in with credentials + OTP
            const result = await signIn("credentials", {
                email,
                otp: token,
                redirect: false,
            });

            if (result?.error) {
                toast.error("Invalid verification code");
                setToken("");
            } else {
                router.push("/documents");
                router.refresh();
            }
        } catch (error) {
            console.error("MFA verification error:", error);
            toast.error("An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <ShieldCheck className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-center">Two-Factor Authentication</CardTitle>
                    <CardDescription className="text-center">
                        Enter the 6-digit code from your authenticator app
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="token" className="sr-only">Verification Code</Label>
                            <Input
                                id="token"
                                name="token"
                                placeholder="000000"
                                value={token}
                                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="text-center text-2xl tracking-widest font-mono h-14"
                                required
                                maxLength={6}
                                pattern="[0-9]{6}"
                                autoFocus
                                disabled={isLoading}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading || token.length !== 6}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Button variant="link" size="sm" onClick={() => router.push("/login")} className="text-muted-foreground">
                        Back to Login
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
