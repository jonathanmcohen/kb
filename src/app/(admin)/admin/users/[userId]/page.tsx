import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
    EditUserForm,
    ResetPasswordForm,
    ToggleAdminButton,
    ToggleDisabledButton,
} from "@/components/admin/user-management";

export const dynamic = "force-dynamic";

export default async function AdminUserPage({
    params,
}: {
    params: Promise<{ userId: string }>;
}) {
    const { userId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    // Check if current user is admin
    const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isAdmin: true },
    });

    if (!currentUser?.isAdmin) {
        redirect("/");
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            _count: {
                select: {
                    documents: true,
                    comments: true,
                },
            },
        },
    });

    if (!user) {
        redirect("/admin");
    }

    return (
        <div className="h-full overflow-y-auto">
            <div className="max-w-4xl mx-auto p-8">
                <div className="mb-6">
                    <Link href="/admin">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Admin
                        </Button>
                    </Link>
                </div>

                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-2">
                        <h1 className="text-3xl font-bold">User Details</h1>
                        {user.isAdmin && (
                            <Badge variant="default">Admin</Badge>
                        )}
                        {"isDisabled" in user && user.isDisabled && (
                            <Badge variant="destructive">Disabled</Badge>
                        )}
                    </div>
                    <p className="text-muted-foreground">
                        View and manage user information
                    </p>
                </div>

                <div className="space-y-6">
                    {/* User Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Account Information</CardTitle>
                            <CardDescription>
                                User profile and contact details
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <EditUserForm user={user as { id: string; name: string | null; email: string | null; isAdmin: boolean; isDisabled: boolean }} />
                            <div className="grid gap-2 pt-4 border-t">
                                <Label>User ID</Label>
                                <Input value={user.id} disabled className="font-mono text-xs" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Joined</Label>
                                <Input
                                    value={new Date(user.createdAt).toLocaleDateString()}
                                    disabled
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Security */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Security</CardTitle>
                            <CardDescription>
                                Manage password and access
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResetPasswordForm userId={user.id} />
                        </CardContent>
                    </Card>

                    {/* Activity Stats */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Activity</CardTitle>
                            <CardDescription>
                                User contributions and engagement
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Documents</p>
                                    <p className="text-2xl font-semibold">{user._count.documents}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Comments</p>
                                    <p className="text-2xl font-semibold">{user._count.comments}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Admin Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Admin Actions</CardTitle>
                            <CardDescription>
                                Manage user permissions and status
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">Administrator Role</p>
                                    <p className="text-sm text-muted-foreground">
                                        {user.isAdmin
                                            ? "This user has admin privileges"
                                            : "Grant admin access to this user"}
                                    </p>
                                </div>
                                <ToggleAdminButton userId={user.id} isAdmin={user.isAdmin} />
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t">
                                <div>
                                    <p className="font-medium">Account Status</p>
                                    <p className="text-sm text-muted-foreground">
                                        {"isDisabled" in user && user.isDisabled
                                            ? "This account is currently disabled"
                                            : "Disable this account to prevent access"}
                                    </p>
                                </div>
                                <ToggleDisabledButton
                                    userId={user.id}
                                    isDisabled={"isDisabled" in user ? (user.isDisabled as boolean) : false}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
