// lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  // Wird nur auf dem Server geloggt
  console.error("Supabase admin config fehlt", {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!serviceRoleKey,
  });
  throw new Error("Supabase admin client is not configured");
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);