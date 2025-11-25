"use client";

import { useState } from "react";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";

interface IconPickerProps {
    currentIcon?: string | null;
    onIconChange: (icon: string) => void;
    children?: React.ReactNode;
}

export function IconPicker({ currentIcon, onIconChange, children }: IconPickerProps) {
    const [open, setOpen] = useState(false);

    const handleEmojiClick = (emojiData: EmojiClickData) => {
        onIconChange(emojiData.emoji);
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {children || (
                    <Button variant="ghost" size="sm">
                        {currentIcon || <Smile className="h-4 w-4" />}
                        {!currentIcon && <span className="ml-2">Add icon</span>}
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
                <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    width="100%"
                    height={400}
                />
            </PopoverContent>
        </Popover>
    );
}
