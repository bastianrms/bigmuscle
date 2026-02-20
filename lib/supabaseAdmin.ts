// lib/supabaseAdmin.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;

export const supabaseAdmin: SupabaseClient | null =
  url && serviceRoleKey
    ? createClient(url, serviceRoleKey, {
        auth: { persistSession: false },
      })
    : null;

if (!supabaseAdmin) {
  console.error("Supabase admin client is not configured", {
    hasUrl: !!url,
    hasServiceRoleKey: !!serviceRoleKey,
    nodeEnv: process.env.NODE_ENV,
  });
}