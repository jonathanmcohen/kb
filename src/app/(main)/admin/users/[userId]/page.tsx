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

export const dynamic = "force-dynamic";

export default async function AdminUserPage({
    params,
}: {
    params: { userId: string };
}) {
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
        where: { id: params.userId },
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
                            <div className="grid gap-2">
                                <Label>Name</Label>
                                <Input value={user.name || "N/A"} disabled />
                            </div>
                            <div className="grid gap-2">
                                <Label>Email</Label>
                                <Input value={user.email || "N/A"} disabled />
                            </div>
                            <div className="grid gap-2">
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
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">Administrator Role</p>
                                    <p className="text-sm text-muted-foreground">
                                        {user.isAdmin
                                            ? "This user has admin privileges"
                                            : "Grant admin access to this user"}
                                    </p>
                                </div>
                                <Button variant="outline" disabled>
                                    {user.isAdmin ? "Revoke Admin" : "Make Admin"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
