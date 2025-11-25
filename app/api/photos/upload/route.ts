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

    // Datei in Buffer umwandeln
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const contentType = file.type || "image/jpeg";
    const key = `${userId}/${Date.now()}.${ext}`;

    // Upload – Env wird in lib/r2.ts geprüft
    const url = await uploadToR2({
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