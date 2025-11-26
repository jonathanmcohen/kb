"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { SearchDialog } from "@/components/search-dialog";
import { Search, Settings, LogOut, User, Shield } from "lucide-react";
import { useState } from "react";

export function Navbar() {
    const { data: session } = useSession();
    const router = useRouter();
    const [searchOpen, setSearchOpen] = useState(false);

    const userInitials = session?.user?.name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "U";

    return (
        <div className="h-14 border-b px-4 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold">Knowledge Base</h1>
                <Button variant="ghost" size="sm" onClick={() => setSearchOpen(true)}>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                </Button>
            </div>

            <div className="flex items-center gap-2">
                <ThemeToggle />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || ""} />
                                <AvatarFallback>{userInitials}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{session?.user?.name}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {session?.user?.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => router.push("/profile")}>
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push("/settings")}>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push("/admin")}>
                            <Shield className="mr-2 h-4 w-4" />
                            <span>Admin Portal</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="text-destructive focus:text-destructive"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
        </div>
    );
}
