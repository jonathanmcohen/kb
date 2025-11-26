"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { setupMFA, verifyAndEnableMFA } from "@/app/actions/profile";
import { toast } from "sonner";
import { Loader2, Shield, Check } from "lucide-react";
import Image from "next/image";

export function MFASetupDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<"generate" | "verify">("generate");
    const [qrCode, setQrCode] = useState<string>("");
    const [secret, setSecret] = useState<string>("");

    async function handleSetup() {
        setIsLoading(true);
        const result = await setupMFA();
        setIsLoading(false);

        if (result.error) {
            toast.error(result.error);
        } else if (result.data) {
            setQrCode(result.data.qrCode);
            setSecret(result.data.secret);
            setStep("verify");
        }
    }

    async function handleVerify(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const token = formData.get("token") as string;

        setIsLoading(true);
        const result = await verifyAndEnableMFA(token);
        setIsLoading(false);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Two-factor authentication enabled!");
            setIsOpen(false);
            setStep("generate");
            setQrCode("");
            setSecret("");
        }
    }

    function handleOpenChange(open: boolean) {
        setIsOpen(open);
        if (!open) {
            setStep("generate");
            setQrCode("");
            setSecret("");
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Shield className="mr-2 h-4 w-4" />
                    Enable 2FA
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                {step === "generate" ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
                            <DialogDescription>
                                Add an extra layer of security to your account with 2FA.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <p className="text-sm text-muted-foreground">
                                Two-factor authentication adds an additional layer of security by requiring
                                both your password and a verification code from your phone.
                            </p>
                            <div className="bg-muted p-4 rounded-lg">
                                <p className="text-sm font-medium mb-2">You&apos;ll need:</p>
                                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                    <li>An authenticator app (Google Authenticator, Authy, etc.)</li>
                                    <li>Your phone to scan the QR code</li>
                                </ul>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSetup} disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Continue
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>Scan QR Code</DialogTitle>
                            <DialogDescription>
                                Use your authenticator app to scan this QR code.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleVerify}>
                            <div className="space-y-4 py-4">
                                {qrCode && (
                                    <div className="flex justify-center">
                                        <div className="bg-white p-4 rounded-lg">
                                            <Image
                                                src={qrCode}
                                                alt="QR Code"
                                                width={200}
                                                height={200}
                                            />
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">
                                        Or enter this code manually:
                                    </Label>
                                    <Input
                                        value={secret}
                                        readOnly
                                        className="font-mono text-xs"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="token">Verification Code</Label>
                                    <Input
                                        id="token"
                                        name="token"
                                        placeholder="Enter 6-digit code"
                                        required
                                        maxLength={6}
                                        pattern="[0-9]{6}"
                                        disabled={isLoading}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Enter the 6-digit code from your authenticator app
                                    </p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleOpenChange(false)}
                                    disabled={isLoading}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Check className="mr-2 h-4 w-4" />
                                    )}
                                    Verify &amp; Enable
                                </Button>
                            </DialogFooter>
                        </form>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
