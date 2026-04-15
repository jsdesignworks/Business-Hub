import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // DEV BYPASS: if cookie dev_bypass=1, skip auth entirely
  const devBypass = request.cookies.get("dev_bypass")?.value === "1"
  if (devBypass) return NextResponse.next()

  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/onboarding")
  const isPublicPath = pathname === "/" || pathname.startsWith("/pay")
  if (!user && !isAuthPage && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }
  if (user && isAuthPage) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    const url = request.nextUrl.clone()
    url.pathname = profile?.role === "admin" ? "/admin" : "/account"
    return NextResponse.redirect(url)
  }
  return supabaseResponse
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"] }
