"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    updateUserProfile,
    resetUserPassword,
    toggleUserAdmin,
    toggleUserDisabled,
} from "@/app/actions/admin";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface User {
    id: string;
    name: string | null;
    email: string | null;
    isAdmin: boolean;
    isDisabled: boolean;
}

export function EditUserForm({ user }: { user: User }) {
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        const result = await updateUserProfile(user.id, formData);
        setIsLoading(false);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("User profile updated");
        }
    }

    return (
        <form action={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                    id="name"
                    name="name"
                    defaultValue={user.name || ""}
                    placeholder="User Name"
                    required
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={user.email || ""}
                    placeholder="user@example.com"
                    required
                />
            </div>
            <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Profile
            </Button>
        </form>
    );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        const result = await resetUserPassword(userId, formData);
        setIsLoading(false);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Password reset successfully");
            // Optional: clear the input
            (document.getElementById("password") as HTMLInputElement).value = "";
        }
    }

    return (
        <form action={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter new password"
                    required
                    minLength={6}
                />
            </div>
            <Button type="submit" variant="secondary" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset Password
            </Button>
        </form>
    );
}

export function ToggleAdminButton({
    userId,
    isAdmin,
}: {
    userId: string;
    isAdmin: boolean;
}) {
    const [isLoading, setIsLoading] = useState(false);

    async function handleToggle() {
        setIsLoading(true);
        const result = await toggleUserAdmin(userId);
        setIsLoading(false);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(isAdmin ? "Admin access revoked" : "Admin access granted");
        }
    }

    return (
        <Button
            variant="outline"
            onClick={handleToggle}
            disabled={isLoading}
            className={isAdmin ? "text-destructive hover:text-destructive" : ""}
        >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isAdmin ? "Revoke Admin" : "Make Admin"}
        </Button>
    );
}

export function ToggleDisabledButton({
    userId,
    isDisabled,
}: {
    userId: string;
    isDisabled: boolean;
}) {
    const [isLoading, setIsLoading] = useState(false);

    async function handleToggle() {
        setIsLoading(true);
        const result = await toggleUserDisabled(userId);
        setIsLoading(false);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(isDisabled ? "Account enabled" : "Account disabled");
        }
    }

    return (
        <Button
            variant={isDisabled ? "default" : "destructive"}
            onClick={handleToggle}
            disabled={isLoading}
        >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDisabled ? "Enable Account" : "Disable Account"}
        </Button>
    );
}
