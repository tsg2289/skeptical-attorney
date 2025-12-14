import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Check if this is a password reset flow
  if (next === '/reset-password') {
    return NextResponse.redirect(`${origin}/reset-password`)
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${origin}/`)
}





