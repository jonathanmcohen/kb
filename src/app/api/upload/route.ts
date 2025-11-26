import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true", // Default to false for standard S3, true for MinIO
    tls: process.env.S3_DISABLE_TLS !== "true", // Default to true (HTTPS), set S3_DISABLE_TLS=true for HTTP
});

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

        // Generate unique key
        const key = `${session.user.id}/${Date.now()}-${file.name}`;
        const bucket = process.env.S3_BUCKET || "kb-uploads";

        // Convert File to Buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to S3/MinIO
        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: file.type,
        });

        await s3Client.send(command);

        // Return public URL
        // If S3_PUBLIC_URL is set, use it as the base.
        // Otherwise, construct from endpoint (common for MinIO or some S3 compatible providers).
        // Note: For standard AWS S3, you might want https://<bucket>.s3.<region>.amazonaws.com/<key>
        // But for many compatible providers, it's <endpoint>/<bucket>/<key> or <bucket>.<endpoint>/<key>

        let publicUrl;
        if (process.env.S3_PUBLIC_URL) {
            // Ensure no trailing slash on base and no leading slash on key if we join them
            const baseUrl = process.env.S3_PUBLIC_URL.replace(/\/$/, "");
            publicUrl = `${baseUrl}/${key}`;
        } else {
            // Fallback to endpoint-based URL construction (often works for MinIO/IDrive)
            // This assumes path-style access if forcePathStyle is true, or just a simple concatenation
            const endpoint = process.env.S3_ENDPOINT?.replace(/\/$/, "");
            publicUrl = `${endpoint}/${bucket}/${key}`;
        }

        return NextResponse.json({
            url: publicUrl,
            key,
        });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: "Failed to upload file" },
            { status: 500 }
        );
    }
}
