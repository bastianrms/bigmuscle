// lib/r2.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

type UploadParams = {
  key: string;
  body: Buffer;
  contentType: string;
};

function getR2Config() {
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

  return { accountId, bucketName, accessKey, secretKey, publicBase };
}

let _client: S3Client | null = null;

function getR2Client() {
  if (_client) return _client;

  const { accountId, accessKey, secretKey } = getR2Config();

  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
    forcePathStyle: true,
  });

  return _client;
}

export async function uploadToR2(params: UploadParams) {
  const { bucketName, publicBase } = getR2Config();
  const client = getR2Client();

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: params.key,
    Body: params.body,
    ContentType: params.contentType,
  });

  await client.send(command);

  return `${publicBase}/${params.key}`;
}

/**
 * Converts a public URL (R2_PUBLIC_BASE_URL/...) to the object key.
 * Returns null if it cannot be parsed safely.
 */
export function r2KeyFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  const { publicBase } = getR2Config();
  const base = publicBase.replace(/\/+$/, "");

  // Case 1: exact publicBase prefix
  if (url.startsWith(base + "/")) {
    const key = url.slice((base + "/").length);
    return key ? key : null;
  }

  // Case 2: parse as URL and take pathname
  try {
    const u = new URL(url);
    const path = (u.pathname || "").replace(/^\/+/, "");
    return path ? path : null;
  } catch {
    return null;
  }
}

export async function deleteFromR2(key: string) {
  if (!key) return;

  const { bucketName } = getR2Config();
  const client = getR2Client();

  const cmd = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await client.send(cmd);
}

export async function deleteManyFromR2(keys: Array<string | null | undefined>) {
  const valid = keys.filter((k): k is string => typeof k === "string" && k.length > 0);
  if (valid.length === 0) return;

  // Delete one-by-one is fine for 3 variants.
  await Promise.all(valid.map((k) => deleteFromR2(k)));
}