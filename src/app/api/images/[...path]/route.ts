import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { s3Client } from "@/lib/s3";

export const dynamic = "force-dynamic";

// GET - Fetch image from S3 (authenticated)
export async function GET(
    req: NextRequest,
    { params }: { params: { path: string[] } }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const bucket = process.env.S3_BUCKET || "kb-uploads";
        const key = params.path.join('/');

        // Fetch from S3
        const command = new GetObjectCommand({
            Bucket: bucket,
            Key: key,
        });

        const response = await s3Client.send(command);

        // Convert stream to buffer
        const stream = response.Body;
        if (!stream) {
            return NextResponse.json({ error: "No content" }, { status: 404 });
        }

        // Convert stream to buffer
        const chunks: Uint8Array[] = [];
        for await (const chunk of stream as AsyncIterable<Uint8Array>) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        // Return image with proper headers
        return new NextResponse(buffer, {
            headers: {
                "Content-Type": response.ContentType || "application/octet-stream",
                "Cache-Control": "public, max-age=31536000, immutable",
                "Content-Length": buffer.length.toString(),
            },
        });
    } catch (error: unknown) {
        console.error("Image fetch error:", error);

        if (error && typeof error === 'object' && ('name' in error && error.name === "NoSuchKey" || 'Code' in error && (error as { Code: string }).Code === "NoSuchKey")) {
            return NextResponse.json({ error: "Image not found" }, { status: 404 });
        }

        return NextResponse.json(
            { error: "Failed to fetch image" },
            { status: 500 }
        );
    }
}
