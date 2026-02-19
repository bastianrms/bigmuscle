// pages/api/users/accountDelete.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { parse, serialize } from "cookie";
import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<typeof serialize>[2];
};

function getSupabaseServerClient(req: NextApiRequest, res: NextApiResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return Object.entries(parse(req.headers.cookie || "")).map(([name, value]) => ({
            name,
            value,
          }));
        },
        setAll(cookies: CookieToSet[]) {
          const prev = res.getHeader("Set-Cookie");
          const prevArr = Array.isArray(prev) ? prev : prev ? [String(prev)] : [];
          const nextArr = cookies.map(({ name, value, options }) =>
            serialize(name, value, { ...options, path: "/" })
          );
          res.setHeader("Set-Cookie", [...prevArr, ...nextArr]);
        },
      },
    }
  );
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID!;
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });
}

function urlToR2Key(url: string): string | null {
  try {
    const u = new URL(url);
    return decodeURIComponent(u.pathname.replace(/^\/+/, ""));
  } catch {
    return null;
  }
}

type ErrorMeta = {
  details: string | null;
  hint: string | null;
  code: string | null;
};

function pickErrorMeta(err: unknown): ErrorMeta {
  const o = err as Record<string, unknown> | null;

  const details = typeof o?.details === "string" ? o.details : null;
  const hint = typeof o?.hint === "string" ? o.hint : null;
  const code = typeof o?.code === "string" ? o.code : null;

  return { details, hint, code };
}

type PhotoRow = {
  xl_url: string | null;
  medium_url: string | null;
  thumb_url: string | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // 0) eingeloggten User via Cookie-Session holen
    const supabase = getSupabaseServerClient(req, res);
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user?.id) {
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    const userId = user.id;

    // 1) URLs aus user_photos holen
    const { data: photos, error: photosErr } = await supabaseAdmin
      .from("user_photos")
      .select("xl_url, medium_url, thumb_url")
      .eq("user_id", userId);

    if (photosErr) {
      console.error("user_photos query failed", photosErr);
      const meta = pickErrorMeta(photosErr);
      return res.status(500).json({
        ok: false,
        error: `user_photos query failed: ${photosErr.message}`,
        ...meta,
      });
    }

    const photoRows = (photos ?? []) as PhotoRow[];

    // 2) R2 Keys dedupen
    const keys: string[] = [];
    const seen: Record<string, true> = {};

    for (const p of photoRows) {
      const urls = [p.xl_url, p.medium_url, p.thumb_url];
      for (const url of urls) {
        if (!url) continue;
        const key = urlToR2Key(url);
        if (!key) continue;
        if (seen[key]) continue;
        seen[key] = true;
        keys.push(key);
      }
    }

    // 3) R2 löschen (batch)
    if (keys.length > 0) {
      const Bucket = process.env.R2_BUCKET_NAME!;
      if (!Bucket) {
        return res.status(500).json({ ok: false, error: "Missing env R2_BUCKET_NAME" });
      }

      const r2 = getR2Client();
      const objects = keys.map((Key) => ({ Key }));

      for (let i = 0; i < objects.length; i += 1000) {
        const chunk = objects.slice(i, i + 1000);
        const out = await r2.send(
          new DeleteObjectsCommand({
            Bucket,
            Delete: { Objects: chunk, Quiet: true },
          })
        );

        if (out.Errors && out.Errors.length > 0) {
          console.error("R2 delete returned errors", out.Errors);
          return res.status(500).json({
            ok: false,
            error: `R2 delete errors: ${out.Errors
              .map((e) => `${e.Key ?? "?"}:${e.Code ?? "?"}`)
              .join(", ")}`,
          });
        }
      }
    }

    // 4) Erst public Tabellen löschen (damit auth delete nicht an Trigger/Cascade scheitert)
    const { error: delUserPhotosErr } = await supabaseAdmin
      .from("user_photos")
      .delete()
      .eq("user_id", userId);

    if (delUserPhotosErr) {
      console.error("user_photos delete failed", delUserPhotosErr);
      const meta = pickErrorMeta(delUserPhotosErr);
      return res.status(500).json({
        ok: false,
        error: `user_photos delete failed: ${delUserPhotosErr.message}`,
        ...meta,
      });
    }

    const { error: delUserRowErr } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("user_id", userId);

    if (delUserRowErr) {
      console.error("users delete failed", delUserRowErr);
      const meta = pickErrorMeta(delUserRowErr);
      return res.status(500).json({
        ok: false,
        error: `users delete failed: ${delUserRowErr.message}`,
        ...meta,
      });
    }

    // 5) Jetzt Auth User löschen + Debug
    const { error: delAuthErr } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (delAuthErr) {
      console.error("Auth delete failed", delAuthErr);
      const meta = pickErrorMeta(delAuthErr);
      return res.status(500).json({
        ok: false,
        error: `Auth delete failed: ${delAuthErr.message}`,
        ...meta,
      });
    }

    // Auth cookies hart löschen (supabase cookie name basiert auf project ref)
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL!.match(
      /https:\/\/([^.]+)\.supabase\.co/
    )?.[1];
    const cookieName = projectRef ? `sb-${projectRef}-auth-token` : null;

    if (cookieName) {
      res.setHeader("Set-Cookie", serialize(cookieName, "", { path: "/", maxAge: 0 }));
    }

    return res.status(200).json({ ok: true });
  } catch (e: unknown) {
    console.error("accountDelete fatal", e);
    return res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}