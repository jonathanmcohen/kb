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
    // Return URL through our authenticated proxy API
    // This allows us to keep the S3 bucket private while serving images to authenticated users
    return `/api/images/${key}`;
}
