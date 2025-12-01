// app/api/photos/upload/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import sharp from "sharp";
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

    // 🔹 Neues Flag aus dem Formular
    const isProfilePhoto =
      (formData.get("isProfilePhoto") as string | null) === "true";

    if (!file || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing file or userId" },
        { status: 400 }
      );
    }

    // Original-Datei einlesen
    const originalArrayBuffer = await file.arrayBuffer();
    const originalBuffer = Buffer.from(originalArrayBuffer);

    const baseName = `${userId}/${Date.now()}`;

    const VARIANTS = {
      xl: {
        width: 1400,
        quality: 80,
        maxKb: 100,
      },
      medium: {
        width: 800,
        quality: 70,
        maxKb: 50,
      },
      thumb: {
        width: 400,
        quality: 60,
        maxKb: 30,
      },
    } as const;

    async function processAndUploadVariant(
      variant: "xl" | "medium" | "thumb"
    ): Promise<UploadResult> {
      const { width, quality } = VARIANTS[variant];

      const processed = await sharp(originalBuffer)
        .resize({
          width,
          withoutEnlargement: true,
        })
        .webp({
          quality,
          effort: 4,
        })
        .toBuffer();

      const key = `${baseName}-${variant}.webp`;

      const url = await uploadToR2({
        key,
        body: processed,
        contentType: "image/webp",
      });

      return { url, bytes: processed.length };
    }

    const [xl, medium, thumb] = await Promise.all([
      processAndUploadVariant("xl"),
      processAndUploadVariant("medium"),
      processAndUploadVariant("thumb"),
    ]);

    const fileSizeKb = Math.round(xl.bytes / 1024);

    // 🔹 Wenn Profilfoto: alle bisherigen Profilfotos dieses Users auf false setzen
    if (isProfilePhoto) {
      const { error: clearError } = await supabaseAdmin
        .from("user_photos")
        .update({ is_profilephoto: false })
        .eq("user_id", userId)
        .eq("is_profilephoto", true);

      if (clearError) {
        console.error("Failed to clear old profile photos:", clearError);
        // wir brechen hier nicht ab – worst case gibt es einen Konflikt durch den Unique Index
      }
    }

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
        is_profilephoto: isProfilePhoto, // 🔹 neu
        // moderation_status = default 'pending'
        // created_at automatisch
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