// lib/r2.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

type UploadParams = {
  accountId: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBase: string;
  key: string;
  body: Buffer;
  contentType: string;
};

export async function uploadToR2({
  accountId,
  bucketName,
  accessKeyId,
  secretAccessKey,
  publicBase,
  key,
  body,
  contentType,
}: UploadParams) {
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await client.send(command);

  // Public URL
  return `${publicBase}/${key}`;
}