export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
  // Wir loggen nur Booleans, keine Secrets!
  const flags = {
    R2_ACCOUNT_ID: !!process.env.R2_ACCOUNT_ID,
    R2_BUCKET_NAME: !!process.env.R2_BUCKET_NAME,
    R2_ACCESS_KEY_ID: !!process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: !!process.env.R2_SECRET_ACCESS_KEY,
    R2_PUBLIC_BASE_URL: !!process.env.R2_PUBLIC_BASE_URL,
    // zum Vergleich: sind Supabase-Variablen da?
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  console.log("DEBUG ENV FLAGS", flags);

  return NextResponse.json(flags);
}