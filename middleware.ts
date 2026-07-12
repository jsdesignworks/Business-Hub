import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Set them in Vercel env and rebuild."
    )
  }
  return { supabaseUrl, anonKey }
}

export async function middleware(request: NextRequest) {
  // DEV BYPASS: if cookie dev_bypass=1, skip auth entirely
  const devBypass = request.cookies.get("dev_bypass")?.value === "1"
  if (devBypass) return NextResponse.next()

  const { supabaseUrl, anonKey } = getSupabaseEnv()
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    supabaseUrl,
    anonKey,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl
  const isLoginPage = pathname.startsWith("/login") || pathname.startsWith("/onboarding")
  const isResetPassword = pathname.startsWith("/reset-password")
  const isPublicPath = pathname === "/" || pathname.startsWith("/pay") || isResetPassword
  if (!user && !isLoginPage && !isPublicPath) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/login"
    return NextResponse.redirect(redirectUrl)
  }
  // Allow authenticated users on /reset-password (recovery session must stay)
  if (user && isLoginPage) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = profile?.role === "admin" ? "/admin" : "/account"
    return NextResponse.redirect(redirectUrl)
  }
  return supabaseResponse
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"] }
