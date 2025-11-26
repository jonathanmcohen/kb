import { S3Client } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true", // Default to false for standard S3, true for MinIO
    tls: process.env.S3_DISABLE_TLS !== "true", // Default to true (HTTPS), set S3_DISABLE_TLS=true for HTTP
});

export function getS3PublicUrl(bucket: string, key: string): string {
    if (process.env.S3_PUBLIC_URL) {
        // Ensure no trailing slash on base and no leading slash on key if we join them
        const baseUrl = process.env.S3_PUBLIC_URL.replace(/\/$/, "");
        return `${baseUrl}/${key}`;
    } else {
        // Fallback to endpoint-based URL construction
        const endpoint = process.env.S3_ENDPOINT?.replace(/\/$/, "");
        return `${endpoint}/${bucket}/${key}`;
    }
}
