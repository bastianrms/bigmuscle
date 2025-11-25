// lib/r2.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

type UploadParams = {
  key: string;
  body: Buffer;
  contentType: string;
};

export async function uploadToR2(params: UploadParams) {
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucketName = process.env.R2_BUCKET_NAME;
  const accessKey = process.env.R2_ACCESS_KEY_ID;
  const secretKey = process.env.R2_SECRET_ACCESS_KEY;
  const publicBase = process.env.R2_PUBLIC_BASE_URL;

  if (!accountId || !bucketName || !accessKey || !secretKey || !publicBase) {
    console.error("R2 config missing on server", {
      hasAccountId: !!accountId,
      hasBucketName: !!bucketName,
      hasAccessKey: !!accessKey,
      hasSecretKey: !!secretKey,
      hasPublicBase: !!publicBase,
    });
    throw new Error("R2 configuration is incomplete on the server");
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
    forcePathStyle: true,
  });

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: params.key,
    Body: params.body,
    ContentType: params.contentType,
  });

  await client.send(command);

  return `${publicBase}/${params.key}`;
}