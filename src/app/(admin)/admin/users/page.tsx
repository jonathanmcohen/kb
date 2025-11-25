import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
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

    const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            name: true,
            email: true,
            isAdmin: true,
            createdAt: true,
            _count: {
                select: { documents: true },
            },
        },
    });

    return (
        <div className="h-full overflow-y-auto">
            <div className="max-w-7xl mx-auto p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">User Management</h1>
                    <p className="text-muted-foreground">
                        View and manage all users
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>All Users ({users.length})</CardTitle>
                        <CardDescription>
                            Complete list of registered users
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {users.map((user) => (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-medium">{user.name || "Unnamed User"}</p>
                                            {user.isAdmin && (
                                                <Badge variant="default">Admin</Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">{user.email}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-sm font-medium">
                                                {user._count.documents} docs
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={`/admin/users/${user.id}`}>View</Link>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
