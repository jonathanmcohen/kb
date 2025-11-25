import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    const userInitials = session.user.name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "U";

    return (
        <div className="h-full overflow-y-auto">
            <div className="max-w-4xl mx-auto p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
                    <p className="text-muted-foreground">
                        Manage your account information and preferences
                    </p>
                </div>

                <div className="space-y-6">
                    {/* Profile Picture */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile Picture</CardTitle>
                            <CardDescription>
                                Your avatar is displayed across the application
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center gap-6">
                            <Avatar className="h-24 w-24">
                                <AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
                                <AvatarFallback className="text-2xl">{userInitials}</AvatarFallback>
                            </Avatar>
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                    {session.user.image
                                        ? "Profile picture from your connected account"
                                        : "Using default avatar based on your initials"
                                    }
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Account Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Account Information</CardTitle>
                            <CardDescription>
                                Your personal details and contact information
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    defaultValue={session.user.name || ""}
                                    disabled
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    defaultValue={session.user.email || ""}
                                    disabled
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="userId">User ID</Label>
                                <Input
                                    id="userId"
                                    defaultValue={session.user.id || ""}
                                    disabled
                                    className="font-mono text-xs"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Account Stats */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Account Activity</CardTitle>
                            <CardDescription>
                                Your usage statistics
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Member Since</p>
                                    <p className="text-2xl font-semibold">
                                        {new Date().getFullYear()}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Account Type</p>
                                    <p className="text-2xl font-semibold">
                                        {session.user.email?.includes("@") ? "Email" : "OAuth"}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Security */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Security</CardTitle>
                            <CardDescription>
                                Manage your account security settings
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">Password</p>
                                    <p className="text-sm text-muted-foreground">
                                        {session.user.email ? "Change your password" : "OAuth account - password not applicable"}
                                    </p>
                                </div>
                                {session.user.email && (
                                    <Button variant="outline" disabled>
                                        Change Password
                                    </Button>
                                )}
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">Two-Factor Authentication</p>
                                    <p className="text-sm text-muted-foreground">
                                        Add an extra layer of security
                                    </p>
                                </div>
                                <Button variant="outline" disabled>
                                    Enable 2FA
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Danger Zone */}
                    <Card className="border-destructive">
                        <CardHeader>
                            <CardTitle className="text-destructive">Danger Zone</CardTitle>
                            <CardDescription>
                                Irreversible actions for your account
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">Delete Account</p>
                                    <p className="text-sm text-muted-foreground">
                                        Permanently delete your account and all data
                                    </p>
                                </div>
                                <Button variant="destructive" disabled>
                                    Delete Account
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
