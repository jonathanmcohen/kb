import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT, // For MinIO
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "minioadmin",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "minioadmin",
    },
    forcePathStyle: true, // Required for MinIO
});

const uploadSchema = z.object({
    filename: z.string(),
    contentType: z.string(),
});

// POST - Generate presigned URL for upload
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { filename, contentType } = uploadSchema.parse(body);

        const key = `${session.user.id}/${Date.now()}-${filename}`;
        const bucket = process.env.S3_BUCKET || "kb-uploads";

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: contentType,
        });

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        return NextResponse.json({
            uploadUrl: signedUrl,
            key,
            url: `${process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT}/${bucket}/${key}`,
        });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: "Failed to generate upload URL" },
            { status: 500 }
        );
    }
}
