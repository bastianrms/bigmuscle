import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const bucketName = process.env.R2_BUCKET_NAME?.trim();
  const accessKey = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const publicBase = process.env.R2_PUBLIC_BASE_URL?.trim();

  const flags = {
    accountId: !!accountId,
    bucketName: !!bucketName,
    accessKey: !!accessKey,
    secretKey: !!secretKey,
    publicBase: !!publicBase,
  };

  console.log("R2 ENV CHECK (runtime)", flags);

  if (!flags.accountId || !flags.bucketName || !flags.accessKey || !flags.secretKey || !flags.publicBase) {
    throw new Error(
      `R2 configuration is incomplete on the server: ${JSON.stringify(flags)}`
    );
  }

  return {
    accountId: accountId as string,
    bucketName: bucketName as string,
    accessKey: accessKey as string,
    secretKey: secretKey as string,
    publicBase: publicBase as string,
  };
}

export async function uploadToR2(params: {
  key: string;
  body: Buffer;
  contentType: string;
}) {
  const { accountId, bucketName, accessKey, secretKey, publicBase } = getR2Config();

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