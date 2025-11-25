import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const rawAccountId = process.env.R2_ACCOUNT_ID;
const rawBucketName = process.env.R2_BUCKET_NAME;
const rawAccessKey = process.env.R2_ACCESS_KEY_ID;
const rawSecretKey = process.env.R2_SECRET_ACCESS_KEY;
const rawPublicBase = process.env.R2_PUBLIC_BASE_URL;

// kleine Sicherheit: Whitespace wegtrimmen
const accountId = rawAccountId?.trim() ?? "";
const bucketName = rawBucketName?.trim() ?? "";
const accessKey = rawAccessKey?.trim() ?? "";
const secretKey = rawSecretKey?.trim() ?? "";
const publicBase = rawPublicBase?.trim() ?? "";

// Debug-Ausgabe (nur Booleans, keine Secrets!)
console.log("R2 ENV CHECK", {
  accountId: !!accountId,
  bucketName: !!bucketName,
  accessKey: !!accessKey,
  secretKey: !!secretKey,
  publicBase: !!publicBase,
});

if (!accountId || !bucketName || !accessKey || !secretKey || !publicBase) {
  throw new Error("R2 configuration is incomplete on the server");
}

export async function uploadToR2(params: {
  key: string;
  body: Buffer;
  contentType: string;
}) {
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