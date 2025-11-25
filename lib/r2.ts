// lib/r2.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// ENV nur hier lesen – Next lädt .env.production auf Amplify
const accountId = process.env.R2_ACCOUNT_ID;
const bucketName = process.env.R2_BUCKET_NAME;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const publicBase = process.env.R2_PUBLIC_BASE_URL;

function ensureR2Config() {
  const flags = {
    accountId: !!accountId,
    bucketName: !!bucketName,
    accessKeyId: !!accessKeyId,
    secretAccessKey: !!secretAccessKey,
    publicBase: !!publicBase,
  };

  if (
    !flags.accountId ||
    !flags.bucketName ||
    !flags.accessKeyId ||
    !flags.secretAccessKey ||
    !flags.publicBase
  ) {
    console.error("R2 config missing in r2.ts", flags);
    throw new Error("R2 configuration is incomplete on the server");
  }
}

export async function uploadToR2(params: {
  key: string;
  body: Buffer;
  contentType: string;
}) {
  ensureR2Config();

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
    },
    forcePathStyle: true,
  });

  const command = new PutObjectCommand({
    Bucket: bucketName!,
    Key: params.key,
    Body: params.body,
    ContentType: params.contentType,
  });

  await client.send(command);

  return `${publicBase}/${params.key}`;
}