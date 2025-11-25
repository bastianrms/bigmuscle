import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID!;
const bucketName = process.env.R2_BUCKET_NAME!;
const accessKey = process.env.R2_ACCESS_KEY_ID!;
const secretKey = process.env.R2_SECRET_ACCESS_KEY!;
const publicBase = process.env.R2_PUBLIC_BASE_URL!;

export async function uploadToR2(params: {
  key: string;
  body: Buffer;
  contentType: string;
}) {

  // Der Client MUSS in der Funktion erstellt werden (nicht exportieren!)
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

  // Public URL über deine R2 public domain
  return `${publicBase}/${params.key}`;
}