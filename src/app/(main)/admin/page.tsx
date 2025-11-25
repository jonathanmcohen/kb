import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Database } from "lucide-react";

export default async function AdminPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    // In a real app, you'd check if user has admin role
    // For now, we'll just show the page to any authenticated user

    const stats = await getStats();

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalUsers}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalDocuments}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Documents</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeDocuments}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Users</CardTitle>
                    <CardDescription>Most recently registered users</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {stats.recentUsers.map((user) => (
                            <div key={user.id} className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">{user.name || "Unknown"}</p>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

async function getStats() {
    const [totalUsers, totalDocuments, activeDocuments, recentUsers] = await Promise.all([
        prisma.user.count(),
        prisma.document.count(),
        prisma.document.count({ where: { isArchived: false } }),
        prisma.user.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            select: { id: true, name: true, email: true, createdAt: true },
        }),
    ]);

    return { totalUsers, totalDocuments, activeDocuments, recentUsers };
}
