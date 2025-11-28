import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { s3Client, getS3PublicUrl } from "@/lib/s3";
import sharp from "sharp";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const ALLOWED_FILE_TYPES = [
    ...ALLOWED_IMAGE_TYPES,
    "application/pdf",
    "text/plain",
];

// POST - Upload file (proxy to S3/MinIO)
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse FormData
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const isImage = file.type.startsWith("image/");
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
        }

        if ((isImage && file.size > MAX_IMAGE_BYTES) || (!isImage && file.size > MAX_FILE_BYTES)) {
            return NextResponse.json({ error: "File too large" }, { status: 400 });
        }

        const bucket = process.env.S3_BUCKET || "kb-uploads";
        const bytes = await file.arrayBuffer() as ArrayBuffer;
        const buffer = Buffer.from(bytes);

        let key = `${session.user.id}/${Date.now()}-${file.name}`;
        let finalBuffer: Buffer = buffer;
        let contentType = file.type;
        let originalKey: string | null = null;

        // Check if it's an image
        if (isImage) {
            try {
                // 1. Upload Original
                originalKey = key.replace(/(\.[\w\d_-]+)$/i, '_original$1');
                const originalCommand = new PutObjectCommand({
                    Bucket: bucket,
                    Key: originalKey,
                    Body: buffer,
                    ContentType: file.type,
                });
                await s3Client.send(originalCommand);

                // 2. Compress
                // Resize to max 1920px width/height, convert to WebP, 80% quality
                finalBuffer = await sharp(buffer)
                    .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
                    .webp({ quality: 80 })
                    .toBuffer();

                // Update key and content type for the compressed version
                // Replace extension with .webp
                key = key.replace(/\.[^/.]+$/, "") + ".webp";
                contentType = "image/webp";

            } catch (imageError) {
                console.error("Image compression failed, falling back to original:", imageError);
                // Fallback to uploading original as the main file if compression fails
                originalKey = null;
            }
        }

        // Upload to S3/MinIO (Compressed or Original if not image/failed)
        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: finalBuffer,
            ContentType: contentType,
        });

        await s3Client.send(command);

        // Return public URL
        const publicUrl = getS3PublicUrl(bucket, key);
        const response: { url: string; key: string; originalUrl?: string } = {
            url: publicUrl,
            key,
        };

        if (originalKey) {
            response.originalUrl = getS3PublicUrl(bucket, originalKey);
        }

        return NextResponse.json(response);
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: "Failed to upload file" },
            { status: 500 }
        );
    }
}
