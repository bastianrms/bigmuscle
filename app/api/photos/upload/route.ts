// app/api/photos/upload/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import sharp from "sharp";
import { uploadToR2 } from "@/lib/r2";
import { createClient } from "@supabase/supabase-js";

// Supabase Server-Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase env vars are missing on the server");
}

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

type Visibility = "private" | "hidden";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;
    const visibilityRaw = formData.get("visibility") as string | null;

    if (!file || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing file or userId" },
        { status: 400 }
      );
    }

    // visibility normalisieren
    let visibility: Visibility = "private";
    if (visibilityRaw === "hidden") {
      visibility = "hidden";
    }

    if (!supabase) {
      return NextResponse.json(
        {
          success: false,
          error: "Supabase configuration is missing on the server",
        },
        { status: 500 }
      );
    }

    // Datei in Buffer
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const image = sharp(inputBuffer).rotate();

    // 1) XL – max 1400px Breite, webp, Ziel ~100 kb
    const xlBuffer = await image
      .clone()
      .resize({
        width: 1400,
        withoutEnlargement: true,
      })
      .webp({
        quality: 80,
      })
      .toBuffer();

    // 2) Medium – max 800px Breite, webp, Ziel ~50 kb (Quality runter)
    const mediumBuffer = await image
      .clone()
      .resize({
        width: 800,
        withoutEnlargement: true,
      })
      .webp({
        quality: 60, // vorher 75, jetzt aggressiver für ~50kb
      })
      .toBuffer();

    // 3) Thumbnail – max 400px Breite, webp, Ziel ~30 kb
    const thumbBuffer = await image
      .clone()
      .resize({
        width: 400,
        withoutEnlargement: true,
      })
      .webp({
        quality: 70,
      })
      .toBuffer();

    const timestamp = Date.now();
    const baseKey = `${userId}/${timestamp}`;

    const xlKey = `${baseKey}_xl.webp`;
    const mediumKey = `${baseKey}_medium.webp`;
    const thumbKey = `${baseKey}_thumb.webp`;

    // Upload zu R2
    const [xlUrl, mediumUrl, thumbUrl] = await Promise.all([
      uploadToR2({
        key: xlKey,
        body: xlBuffer,
        contentType: "image/webp",
      }),
      uploadToR2({
        key: mediumKey,
        body: mediumBuffer,
        contentType: "image/webp",
      }),
      uploadToR2({
        key: thumbKey,
        body: thumbBuffer,
        contentType: "image/webp",
      }),
    ]);

    // file_size_kb = Größe der XL-Version
    const fileSizeKb = Math.round(xlBuffer.length / 1024);

    // Supabase: Tabelle heißt user_photos
    const { data, error } = await supabase
      .from("user_photos")
      .insert({
        user_id: userId,
        xl_url: xlUrl,
        medium_url: mediumUrl,
        thumb_url: thumbUrl,
        file_size_kb: fileSizeKb,        // XL-Size in KB
        moderation_status: "pending",    // Default-Status
        visibility: visibility,          // "private" oder "hidden"
        // created_at: via Default in DB
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to save photo metadata in Supabase",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      xl_url: xlUrl,
      medium_url: mediumUrl,
      thumb_url: thumbUrl,
      file_size_kb: fileSizeKb,
      photo: data,
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