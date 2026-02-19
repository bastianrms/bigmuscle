// scripts/migrate-legacy-photos.ts
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import { supabaseAdmin } from "../lib/supabaseAdmin";
import { uploadToR2 } from "../lib/r2";

const LOCAL_DIR =
  "/Users/bastianramoser/Library/CloudStorage/SynologyDrive-BR/BigMuscle/LegacyDatabase/02_PHOTOS/Test1802";

const VARIANTS = {
  xl: { width: 1400, quality: 80 },
  medium: { width: 800, quality: 70 },
  thumb: { width: 400, quality: 60 },
} as const;

function parseLegacyIdFromFilename(filename: string) {
  const m = filename.match(/BM(\d+)\.jpg$/i);
  return m ? m[1] : null;
}

async function main() {
  if (!supabaseAdmin) {
    throw new Error("supabaseAdmin is null. Check SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  const files = await fs.readdir(LOCAL_DIR);
  const jpgs = files.filter((f) => /^BM\d+\.jpg$/i.test(f));

  console.log(`Found ${jpgs.length} legacy JPGs in ${LOCAL_DIR}`);

  for (const file of jpgs) {
    const legacyId = parseLegacyIdFromFilename(file);
    if (!legacyId) continue;

    const fullPath = path.join(LOCAL_DIR, file);

    // Fetch DB row by legacy id
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("user_photos")
      .select("id, user_id, photoid_legacy, xl_url, medium_url, thumb_url")
      .eq("photoid_legacy", legacyId)
      .maybeSingle();

    if (fetchErr) {
      console.error(`[${legacyId}] DB fetch error: ${fetchErr.message}`);
      continue;
    }
    if (!row) {
      console.warn(`[${legacyId}] No user_photos row found. Skipping.`);
      continue;
    }
    if (!row.user_id) {
      console.warn(`[${legacyId}] Row has no user_id yet. Skipping.`);
      continue;
    }

    // Resume: skip if already done
    if (row.xl_url && row.medium_url && row.thumb_url) {
      console.log(`[${legacyId}] Already has URLs. Skipping.`);
      continue;
    }

    console.log(`[${legacyId}] Processing -> user_id=${row.user_id}`);

    const originalBuffer = await fs.readFile(fullPath);

    // Deterministic naming (best for resume)
    const baseName = `${row.user_id}/legacy-${legacyId}`;

    const processAndUpload = async (variant: "xl" | "medium" | "thumb") => {
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
      processAndUpload("xl"),
      processAndUpload("medium"),
      processAndUpload("thumb"),
    ]);

    const fileSizeKb = Math.round(xl.bytes / 1024);

    const { error: updErr } = await supabaseAdmin
      .from("user_photos")
      .update({
        xl_url: xl.url,
        medium_url: medium.url,
        thumb_url: thumb.url,
        file_size_kb: fileSizeKb,
      })
      .eq("id", row.id);

    if (updErr) {
      console.error(`[${legacyId}] DB update error: ${updErr.message}`);
      continue;
    }

    console.log(`[${legacyId}] Done.`);
  }

  console.log("All done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});