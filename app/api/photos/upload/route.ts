// app/api/photos/upload/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import sharp from "sharp";
import { uploadToR2 } from "@/lib/r2";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// ✅ Typ für Supabase SSR setAll()
type CookieToSet = {
  name: string;
  value: string;
  options?: {
    domain?: string;
    path?: string;
    expires?: Date;
    httpOnly?: boolean;
    maxAge?: number;
    sameSite?: "lax" | "strict" | "none";
    secure?: boolean;
  };
};

// ✅ fehlte bei dir -> Fix für "Cannot find name 'UploadResult'"
type UploadResult = {
  url: string;
  bytes: number;
};

function getSupabaseAuthedClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll().map((c) => ({
            name: c.name,
            value: c.value,
          }));
        },
        setAll(newCookies: CookieToSet[]) {
          newCookies.forEach(({ name, value, options }) => {
            cookieStore.set({
              name,
              value,
              ...(options ?? {}),
            });
          });
        },
      },
    }
  );
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    // 👇 userId optional (fallback/debug)
    const userIdFromForm = (formData.get("userId") as string | null)?.trim() ?? "";

    const visibility =
      (formData.get("visibility") as "public" | "private" | null) ?? "private";

    const caption = (formData.get("caption") as string | null) ?? "";

    const isProfilePhoto = (formData.get("isProfilePhoto") as string | null) === "true";

    if (!file) {
      return NextResponse.json({ success: false, error: "Missing file" }, { status: 400 });
    }

    // ✅ Auth-User serverseitig holen
    const supabase = getSupabaseAuthedClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user?.id) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const userId = user.id;

    // 🔐 Supabase Admin muss vorhanden sein (auch für TypeScript Narrowing)
    if (!supabaseAdmin) {
      console.error("Supabase admin client not configured in /api/photos/upload");
      return NextResponse.json(
        {
          success: false,
          error: "Server misconfigured: Supabase admin client not available",
        },
        { status: 500 }
      );
    }

    // (optional) Debug-Check: falls jemand versucht, fremde userId zu schicken
    if (userIdFromForm && userIdFromForm !== userId) {
      console.warn("[upload] userId mismatch; ignoring form userId", userIdFromForm, "auth:", userId);
    }

    // Original-Datei einlesen
    const originalArrayBuffer = await file.arrayBuffer();
    const originalBuffer = Buffer.from(originalArrayBuffer);

    const baseName = `${userId}/${Date.now()}`;

    const VARIANTS = {
      xl: { width: 1400, quality: 80, maxKb: 100 },
      medium: { width: 800, quality: 70, maxKb: 50 },
      thumb: { width: 400, quality: 60, maxKb: 30 },
    } as const;

    const processAndUploadVariant = async (
      variant: "xl" | "medium" | "thumb"
    ): Promise<UploadResult> => {
      const { width, quality } = VARIANTS[variant];

      const processed = await sharp(originalBuffer)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality, effort: 4 })
        .toBuffer();

      const key = `${baseName}-${variant}.webp`;

      const url = await uploadToR2({
        key,
        body: processed,
        contentType: "image/webp",
      });

      return { url, bytes: processed.length };
    };

    const [xl, medium, thumb] = await Promise.all([
      processAndUploadVariant("xl"),
      processAndUploadVariant("medium"),
      processAndUploadVariant("thumb"),
    ]);

    const fileSizeKb = Math.round(xl.bytes / 1024);

    // 🔹 Wenn Profilfoto: alte Profilfotos auf false setzen
    if (isProfilePhoto) {
      const { error: clearError } = await supabaseAdmin
        .from("user_photos")
        .update({ is_profilephoto: false })
        .eq("user_id", userId)
        .eq("is_profilephoto", true);

      if (clearError) {
        console.error("Failed to clear old profile photos:", clearError);
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
        caption,
        file_size_kb: fileSizeKb,
        is_profilephoto: isProfilePhoto,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);

      const supabaseCode =
        typeof error === "object" && error !== null && "code" in error
          ? (error as { code: string }).code
          : null;

      return NextResponse.json(
        {
          success: false,
          error: "Failed to save photo metadata in Supabase",
          supabaseError: error.message,
          supabaseCode,
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
    const message = err instanceof Error ? err.message : "Upload failed (unknown error)";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}