import { Sidebar } from "@/components/sidebar/sidebar";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";

export default async function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session) {
        redirect("/login");
    }

    return (
        <div className="h-screen flex flex-col">
            <Navbar />
            <div className="flex-1 flex overflow-hidden">
                <div className="w-64 border-r">
                    <Sidebar />
                </div>
                <main className="flex-1 overflow-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
}
