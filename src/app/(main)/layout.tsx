import { Sidebar } from "@/components/sidebar/sidebar";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

export default async function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    return (
        <div className="h-screen flex">
            <aside className="w-64 border-r flex flex-col">
                <div className="p-4 border-b flex items-center justify-between">
                    <h2 className="font-semibold">Knowledge Base</h2>
                    <ThemeToggle />
                </div>
                <Sidebar />
                <div className="p-4 border-t">
                    <form action={async () => {
                        "use server";
                        await signOut();
                    }}>
                        <Button variant="outline" className="w-full" type="submit">
                            <LogOut className="h-4 w-4 mr-2" />
                            Sign out
                        </Button>
                    </form>
                </div>
            </aside>
            <main className="flex-1 overflow-hidden">{children}</main>
        </div>
    );
}
