import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="max-w-md w-full px-6 py-8 text-center space-y-6">
                <div className="flex justify-center">
                    <FileQuestion className="h-24 w-24 text-muted-foreground" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-4xl font-bold">404</h1>
                    <h2 className="text-2xl font-semibold text-muted-foreground">
                        Page Not Found
                    </h2>
                    <p className="text-muted-foreground">
                        The page you're looking for doesn't exist or has been moved.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href="/">
                        <Button>
                            <Home className="h-4 w-4 mr-2" />
                            Go Home
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
