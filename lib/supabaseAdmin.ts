// lib/supabaseAdmin.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;

if (!url || !serviceRoleKey) {
  // WICHTIG: kein throw mehr – nur loggen
  console.error("Supabase admin client is not configured", {
    hasUrl: !!url,
    hasServiceRoleKey: !!serviceRoleKey,
  });
}

export const supabaseAdmin: SupabaseClient | null =
  url && serviceRoleKey
    ? createClient(url, serviceRoleKey, {
        auth: {
          persistSession: false,
        },
      })
    : null;