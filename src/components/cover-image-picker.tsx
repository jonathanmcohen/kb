"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageIcon, Upload, Link as LinkIcon } from "lucide-react";

interface CoverImagePickerProps {
    onCoverChange: (url: string) => void;
    children?: React.ReactNode;
}

export function CoverImagePicker({ onCoverChange, children }: CoverImagePickerProps) {
    const [open, setOpen] = useState(false);
    const [url, setUrl] = useState("");
    const [uploading, setUploading] = useState(false);

    const handleUrlSubmit = () => {
        if (url) {
            onCoverChange(url);
            setUrl("");
            setOpen(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Upload failed");
            }

            const { url } = await response.json();
            onCoverChange(url);
            setOpen(false);
        } catch (error) {
            console.error("Failed to upload:", error);
            alert("Failed to upload image");
        } finally {
            setUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="ghost" size="sm">
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Add cover
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Add Cover Image</DialogTitle>
                    <DialogDescription>
                        Upload an image or provide a URL for your cover image.
                    </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="upload" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="upload">
                            <Upload className="h-4 w-4 mr-2" />
                            Upload
                        </TabsTrigger>
                        <TabsTrigger value="url">
                            <LinkIcon className="h-4 w-4 mr-2" />
                            URL
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="upload" className="space-y-4">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="picture">Picture</Label>
                            <Input
                                id="picture"
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                disabled={uploading}
                            />
                        </div>
                        {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
                    </TabsContent>
                    <TabsContent value="url" className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="url">Image URL</Label>
                            <Input
                                id="url"
                                placeholder="https://example.com/image.jpg"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                            />
                        </div>
                        <DialogFooter>
                            <Button onClick={handleUrlSubmit} disabled={!url}>
                                Set Cover
                            </Button>
                        </DialogFooter>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
