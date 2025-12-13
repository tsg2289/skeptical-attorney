import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Check if Supabase is properly configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey || 
      supabaseUrl.includes('placeholder') || 
      supabaseAnonKey.includes('placeholder') ||
      supabaseUrl.includes('your-project-id')) {
    // Return early if Supabase is not configured
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Allow access to public routes and auth callback
  const isPublicRoute = 
    request.nextUrl.pathname.startsWith('/services/deposition/login') ||
    request.nextUrl.pathname.startsWith('/services/deposition/auth/callback') ||
    request.nextUrl.pathname.startsWith('/services/deposition/reset-password') ||
    request.nextUrl.pathname.startsWith('/api/auth/reset-password') ||
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/get-started') ||
    request.nextUrl.pathname.startsWith('/auth/callback') ||
    request.nextUrl.pathname.startsWith('/forgot-password') ||
    request.nextUrl.pathname.startsWith('/about') ||
    request.nextUrl.pathname.startsWith('/contact') ||
    request.nextUrl.pathname.startsWith('/blog') ||
    request.nextUrl.pathname.startsWith('/careers') ||
    request.nextUrl.pathname.startsWith('/privacy') ||
    request.nextUrl.pathname.startsWith('/terms') ||
    request.nextUrl.pathname.startsWith('/cookies')

  // Check for dev bypass mode - only enabled in development
  const isDevBypassEnabled = process.env.NODE_ENV === 'development' && 
    process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true'

  // If user is not authenticated and trying to access protected route, redirect to login
  // Skip this check if dev bypass is enabled or if it's a public route
  if (!user && !isPublicRoute && !isDevBypassEnabled) {
    // Only redirect deposition routes, not other services
    if (request.nextUrl.pathname.startsWith('/services/deposition')) {
      const url = request.nextUrl.clone()
      url.pathname = '/services/deposition/login'
      return NextResponse.redirect(url)
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object instead of the supabaseResponse object

  return supabaseResponse
}
