"use client";

import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { updateProfilePicture } from "@/app/actions/profile";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

interface AvatarUploadProps {
    currentImage?: string | null;
    name?: string | null;
}

export function AvatarUpload({ currentImage, name }: AvatarUploadProps) {
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const userInitials = name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "U";

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file type
        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }

        // Check file size (client-side check)
        if (file.size > 2 * 1024 * 1024) { // 2MB limit before compression
            toast.error("Image too large. Please select an image under 2MB.");
            return;
        }

        setIsLoading(true);

        try {
            // Convert to base64 and resize if needed
            const base64 = await resizeImage(file);

            const formData = new FormData();
            formData.append("image", base64);

            const result = await updateProfilePicture(formData);

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Profile picture updated");
                // Force a reload to show new image since we're using server components
                window.location.reload();
            }
        } catch (error) {
            console.error("Upload failed:", error);
            toast.error("Failed to process image");
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const resizeImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const MAX_WIDTH = 400;
                    const MAX_HEIGHT = 400;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    ctx?.drawImage(img, 0, 0, width, height);

                    // Compress to JPEG with 0.7 quality
                    resolve(canvas.toDataURL("image/jpeg", 0.7));
                };
                img.onerror = (error) => reject(error);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    return (
        <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
                <AvatarImage src={currentImage || ""} alt={name || ""} />
                <AvatarFallback className="text-2xl">{userInitials}</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Upload className="mr-2 h-4 w-4" />
                        )}
                        Upload New Picture
                    </Button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileSelect}
                    />
                </div>
                <p className="text-sm text-muted-foreground">
                    JPG, GIF or PNG. Max size of 500KB.
                </p>
            </div>
        </div>
    );
}
