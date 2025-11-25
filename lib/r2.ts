import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const rawAccountId = process.env.R2_ACCOUNT_ID;
const rawBucketName = process.env.R2_BUCKET_NAME;
const rawAccessKey = process.env.R2_ACCESS_KEY_ID;
const rawSecretKey = process.env.R2_SECRET_ACCESS_KEY;
const rawPublicBase = process.env.R2_PUBLIC_BASE_URL;

const accountId = rawAccountId?.trim();
const bucketName = rawBucketName?.trim();
const accessKey = rawAccessKey?.trim();
const secretKey = rawSecretKey?.trim();
const publicBase = rawPublicBase?.trim();

function ensureR2Config() {
  const flags = {
    accountId: !!accountId,
    bucketName: !!bucketName,
    accessKey: !!accessKey,
    secretKey: !!secretKey,
    publicBase: !!publicBase,
  };

  console.log("R2 ENV CHECK", flags);

  if (!flags.accountId || !flags.bucketName || !flags.accessKey || !flags.secretKey || !flags.publicBase) {
    // wir werfen jetzt mit Detail-Info, welche Variable fehlt
    throw new Error(
      `R2 configuration is incomplete on the server: ${JSON.stringify(flags)}`
    );
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
      accessKeyId: accessKey!,
      secretAccessKey: secretKey!,
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