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
import { disableMFA } from "@/app/actions/profile";
import { toast } from "sonner";
import { Loader2, ShieldOff } from "lucide-react";

export function MFADisableDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        const result = await disableMFA(formData);
        setIsLoading(false);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Two-factor authentication disabled");
            setIsOpen(false);
            // Reset form
            (document.getElementById("mfa-disable-form") as HTMLFormElement)?.reset();
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="destructive">
                    <ShieldOff className="mr-2 h-4 w-4" />
                    Disable 2FA
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
                    <DialogDescription>
                        Enter your password to confirm disabling 2FA.
                    </DialogDescription>
                </DialogHeader>
                <form id="mfa-disable-form" action={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                            ⚠️ Warning: Disabling two-factor authentication will make your account less secure.
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Confirm Password</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            required
                            disabled={isLoading}
                            placeholder="Enter your password"
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsOpen(false)}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" variant="destructive" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Disable 2FA
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
