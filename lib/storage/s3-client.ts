/**
 * Shared S3-compatible client (Minio local, S3 in production).
 * Credentials: S3_ACCESS_KEY + S3_SECRET_KEY (must match `.env.local` / `.env.example`).
 */

import { S3Client } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true,
});

export const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME!;
