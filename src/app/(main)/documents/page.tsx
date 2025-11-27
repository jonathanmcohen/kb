import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
    const session = await auth();
    if (!session?.user?.id) {
        redirect("/login");
    }

    // Send users with documents to their most recent one
    const recentDoc = await prisma.document.findFirst({
        where: {
            userId: session.user.id,
            isArchived: false,
        },
        orderBy: { updatedAt: "desc" },
    });

    if (recentDoc) {
        redirect(`/documents/${recentDoc.id}`);
    }

    // Otherwise, show a gentle CTA instead of auto-creating a document
    return (
        <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4">
                <h1 className="text-2xl font-semibold">No documents yet</h1>
                <p className="text-muted-foreground">
                    Create your first page to get started.
                </p>
                <Button asChild>
                    <Link href="/documents/new">Create a document</Link>
                </Button>
            </div>
        </div>
    );
}
