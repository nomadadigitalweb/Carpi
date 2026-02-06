
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (request.nextUrl.pathname.startsWith('/admin')) {
        if (!user) {
            return NextResponse.redirect(new URL('/login', request.url))
        }

        // Check role from profiles
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        const role = profile?.role

        if (request.nextUrl.pathname.startsWith('/admin/stock') && role !== 'gerente' && role !== 'admin') {
            return NextResponse.redirect(new URL('/admin', request.url))
        }

        if (request.nextUrl.pathname.startsWith('/admin/pedidos') && role !== 'gerente' && role !== 'logistica' && role !== 'admin') {
            return NextResponse.redirect(new URL('/admin', request.url))
        }

        // Explicit protection for base /admin if needed, or allow all authenticated users
        // Assuming /admin base is allowed for anyone with a profile who passed the login
        // but maybe we want to restrict it to admin/gerente/logistica only?
        if (role !== 'admin' && role !== 'gerente' && role !== 'logistica') {
            return NextResponse.redirect(new URL('/', request.url))
        }
    }

    // Redirect logged in users away from login
    if (request.nextUrl.pathname === '/login' && user) {
        return NextResponse.redirect(new URL('/admin', request.url))
    }

    return response
}
