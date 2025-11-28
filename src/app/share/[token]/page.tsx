import { notFound } from "next/navigation";
import { Editor } from "@/components/editor/editor";

interface SharedDoc {
    id: string;
    title: string;
    content: string;
    coverImage?: string | null;
    icon?: string | null;
}

async function fetchSharedDoc(token: string): Promise<SharedDoc | null> {
    const base =
        process.env.NEXT_PUBLIC_BASE_URL ||
        process.env.NEXTAUTH_URL ||
        "http://localhost:3000";

    const res = await fetch(`${base}/api/public/documents/${token}`, {
        cache: "no-store",
    });

    if (!res.ok) return null;
    return res.json();
}

export default async function SharedPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;
    const doc = await fetchSharedDoc(token);

    if (!doc) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            {doc.coverImage && (
                <div className="h-[30vh] w-full relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={doc.coverImage}
                        alt="Cover"
                        className="w-full h-full object-cover"
                    />
                </div>
            )}

            <div className="max-w-4xl mx-auto px-6 py-10">
                <div className="flex items-center gap-3 mb-8">
                    {doc.icon && <span className="text-4xl">{doc.icon}</span>}
                    <h1 className="text-4xl font-bold">{doc.title}</h1>
                </div>

                <Editor
                    key={doc.id}
                    initialContent={doc.content as string}
                    onChange={() => { }}
                    editable={false}
                />
            </div>
        </div>
    );
}
