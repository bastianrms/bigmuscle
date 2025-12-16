import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Define the route that contains your login page
const loginPage = '/'

// Add any public (non-login protected) routes here
// All other routes will be login protected
// Important: plasmic-host and your login page must always be public
const publicRoutes = [
  '/',
  '/signup',
  '/plasmic-host',
  '/confirmemail',
  '/signup-confirmed',
  '/request-passwordreset',
  '/passwordreset'       // ← NEU: Passwort-Reset-Seite muss auch ohne Login erreichbar sein
];

// Middleware function
// This will run on every request to your app that matches the pattern at the bottom of this file
// Adapted from @supabase/ssr docs https://supabase.com/docs/guides/auth/server-side/nextjs?queryGroups=router&router=app
export async function middleware(request: NextRequest) {

  let supabaseResponse = NextResponse.next({
    request,
  })

  //Create a new supabase client
  //Refresh expired auth tokens and set new cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // Get details of the logged in user if present
  const {
    data: { user },
  } = await supabase.auth.getUser()
  
  // Decide whether to redirect to the /login page or not
  // You can adapt this logic to suit your needs

  if (publicRoutes.includes(request.nextUrl.pathname) !== true && !user) {
    // It's a login protected route but there's no logged in user. 
    // Respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = loginPage;
    return NextResponse.redirect(url)

  } else {
    // It's a public route, or it's a login protected route and there is a logged in user. 
    // Proceed as normal
    return supabaseResponse
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

}

//Only run middleware on requests that match this pattern
export const config = {
  matcher: [
    /*
    * Match all request paths except for the ones starting with:
    * - _next/static (static files)
    * - _next/image (image optimization files)
    * - favicon.ico (favicon file)
    * Feel free to modify this pattern to include more paths.
    */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}