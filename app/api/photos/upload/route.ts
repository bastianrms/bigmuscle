// app/api/photos/upload/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type UploadResult = {
  url: string;
  bytes: number;
};

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;
    const visibility =
      (formData.get("visibility") as "public" | "private" | null) ?? "private";

    if (!file || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing file or userId" },
        { status: 400 }
      );
    }

    // Original-Datei einlesen
    const originalArrayBuffer = await file.arrayBuffer();
    const originalBuffer = Buffer.from(originalArrayBuffer);

    // Helper für R2-Upload (du hast ja schon uploadToR2, wir nutzen das)
    async function uploadVariant(
      buf: Buffer,
      suffix: "xl" | "medium" | "thumb",
      mime: string
    ): Promise<UploadResult> {
      const ext = "webp"; // wir speichern ja alles als webp
      const key = `${userId}/${Date.now()}-${suffix}.${ext}`;

      const url = await uploadToR2({
        key,
        body: buf,
        contentType: mime,
      });

      return { url, bytes: buf.length };
    }

    // Aktuell: alle drei Varianten noch identisch → später durch sharp-Resizes ersetzen
    const xlBuffer = originalBuffer;
    const mediumBuffer = originalBuffer;
    const thumbBuffer = originalBuffer;

    const mimeType = "image/webp";

    const [xl, medium, thumb] = await Promise.all([
      uploadVariant(xlBuffer, "xl", mimeType),
      uploadVariant(mediumBuffer, "medium", mimeType),
      uploadVariant(thumbBuffer, "thumb", mimeType),
    ]);

    const fileSizeKb = Math.round(xl.bytes / 1024);

    // ----- Supabase-Insert -----
    const { data, error } = await supabaseAdmin
      .from("user_photos")
      .insert({
        user_id: userId,
        xl_url: xl.url,
        medium_url: medium.url,
        thumb_url: thumb.url,
        visibility,
        file_size_kb: fileSizeKb,
        // moderation_status bleibt default 'pending'
        // created_at wird von Supabase automatisch gesetzt
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to save photo metadata in Supabase",
          supabaseError: error.message,
          supabaseCode: (error as any).code ?? null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      xl_url: xl.url,
      medium_url: medium.url,
      thumb_url: thumb.url,
      file_size_kb: fileSizeKb,
      row: data,
    });
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