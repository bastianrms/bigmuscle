import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Route für die Login-Seite
const loginPage = "/login";

// Öffentliche Routen (ohne Login erreichbar)
const publicRoutes = ["/", "/login", "/signup", "/plasmic-host"];

export async function middleware(request: NextRequest) {
  // Basis-Response vorbereiten
  let response = NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Failsafe: Wenn Env Vars in Prod fehlen, lieber keine Auth erzwingen als 500 werfen
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Wichtig: NICHT request.cookies mutieren, nur die Response-Cookies setzen
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // User aus der Supabase Session holen
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isPublic = publicRoutes.includes(pathname);

  // Wenn Route geschützt ist und kein User → Redirect auf /login
  if (!isPublic && !user) {
    const url = request.nextUrl.clone();
    url.pathname = loginPage;
    return NextResponse.redirect(url);
  }

  // Ansonsten normal weitermachen
  return response;
}

// Nur auf diese Pfade anwenden
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};