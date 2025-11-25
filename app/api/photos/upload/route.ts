export const runtime = "nodejs"; // wichtig: API läuft auf Node, nicht Edge

import { NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;
    // visibility lassen wir erstmal weg, weil wir es noch nicht benutzen

    if (!file || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing file or userId" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const key = `${userId}/${Date.now()}.${ext}`;

    const contentType = file.type || "image/jpeg";

    const url = await uploadToR2({
      key,
      body: buffer,
      contentType,
    });

    return NextResponse.json({
      success: true,
      url,
    });
  } catch (err: unknown) {
    console.error("Upload error:", err);
    const message =
      err instanceof Error ? err.message : "Upload failed (unknown error)";

    // aktuell geben wir dir die Fehlermeldung direkt zurück, damit du sie im Network-Tab sehen kannst
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}