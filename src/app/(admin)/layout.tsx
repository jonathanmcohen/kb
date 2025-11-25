import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Users, FileText, Settings, Home } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
        redirect("/");
    }

    return (
        <div className="h-screen flex flex-col">
            {/* Admin Header */}
            <div className="h-14 border-b px-4 flex items-center justify-between bg-background">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold">Admin Portal</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/">
                        <Button variant="ghost" size="sm">
                            <Home className="h-4 w-4 mr-2" />
                            Back to App
                        </Button>
                    </Link>
                    <ThemeToggle />
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Admin Sidebar */}
                <div className="w-64 border-r bg-secondary/30">
                    <div className="p-4 space-y-2">
                        <Link href="/admin">
                            <Button variant="ghost" className="w-full justify-start">
                                <FileText className="h-4 w-4 mr-2" />
                                Dashboard
                            </Button>
                        </Link>
                        <Link href="/admin/users">
                            <Button variant="ghost" className="w-full justify-start">
                                <Users className="h-4 w-4 mr-2" />
                                User Management
                            </Button>
                        </Link>
                        <Link href="/admin/settings">
                            <Button variant="ghost" className="w-full justify-start">
                                <Settings className="h-4 w-4 mr-2" />
                                Settings
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Admin Content */}
                <main className="flex-1 overflow-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
}
