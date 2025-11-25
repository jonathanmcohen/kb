import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Activity, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    // Fetch statistics
    const [totalUsers, totalDocuments, activeDocuments, recentUsers] = await Promise.all([
        prisma.user.count(),
        prisma.document.count(),
        prisma.document.count({ where: { isArchived: false, isPublished: true } }),
        prisma.user.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                _count: {
                    select: { documents: true }
                }
            },
        }),
    ]);

    const stats = [
        {
            title: "Total Users",
            value: totalUsers,
            description: "Registered users",
            icon: Users,
            color: "text-blue-600",
        },
        {
            title: "Total Documents",
            value: totalDocuments,
            description: "All documents created",
            icon: FileText,
            color: "text-green-600",
        },
        {
            title: "Active Documents",
            value: activeDocuments,
            description: "Published & not archived",
            icon: Activity,
            color: "text-purple-600",
        },
        {
            title: "Recent Signups",
            value: recentUsers.length,
            description: "Last 5 registrations",
            icon: UserCheck,
            color: "text-orange-600",
        },
    ];

    return (
        <div className="h-full overflow-y-auto">
            <div className="max-w-7xl mx-auto p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
                    <p className="text-muted-foreground">
                        Monitor system statistics and manage users
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    {stats.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <Card key={stat.title}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        {stat.title}
                                    </CardTitle>
                                    <Icon className={`h-4 w-4 ${stat.color}`} />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stat.value}</div>
                                    <p className="text-xs text-muted-foreground">
                                        {stat.description}
                                    </p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Recent Users */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent User Registrations</CardTitle>
                        <CardDescription>
                            Latest users who joined the platform
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentUsers.map((user) => (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                                >
                                    <div className="flex-1">
                                        <p className="font-medium">{user.name || "Unnamed User"}</p>
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
