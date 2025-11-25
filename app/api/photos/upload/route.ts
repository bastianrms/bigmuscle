// app/api/photos/upload/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;

    if (!file || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing file or userId" },
        { status: 400 }
      );
    }

    // 1) ENV VARS HIER LESEN
    const accountId = process.env.R2_ACCOUNT_ID;
    const bucketName = process.env.R2_BUCKET_NAME;
    const accessKey = process.env.R2_ACCESS_KEY_ID;
    const secretKey = process.env.R2_SECRET_ACCESS_KEY;
    const publicBase = process.env.R2_PUBLIC_BASE_URL;

    const flags = {
      accountId: !!accountId,
      bucketName: !!bucketName,
      accessKey: !!accessKey,
      secretKey: !!secretKey,
      publicBase: !!publicBase,
    };

    // 2) Wenn was fehlt → klarer Fehler + Flags zurück
    if (!accountId || !bucketName || !accessKey || !secretKey || !publicBase) {
      console.error("R2 config missing in upload route", flags);
      return NextResponse.json(
        {
          success: false,
          error: "R2 configuration is incomplete on the server",
          flags,
        },
        { status: 500 }
      );
    }

    // 3) Datei vorbereiten
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const contentType = file.type || "image/jpeg";
    const key = `${userId}/${Date.now()}.${ext}`;

    // 4) Upload mit *expliziter* Config
    const url = await uploadToR2({
      accountId,
      bucketName,
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
      publicBase,
      key,
      body: buffer,
      contentType,
    });

    return NextResponse.json({ success: true, url });
  } catch (err: unknown) {
    console.error("Upload error:", err);

    const message =
      err instanceof Error ? err.message : "Upload failed (unknown error)";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}