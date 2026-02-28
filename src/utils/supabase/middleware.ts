
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type AppRole = 'admin_carpi' | 'gestor_financiero' | 'encargado_ventas' | 'fabricante' | 'usuario'

const staffRoles: AppRole[] = ['admin_carpi', 'gestor_financiero', 'encargado_ventas']

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

    let role: AppRole | null = null

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        role = (profile?.role as AppRole | undefined) ?? null
    }

    if (request.nextUrl.pathname.startsWith('/admin')) {
        if (!user || !role || !staffRoles.includes(role)) {
            return NextResponse.redirect(new URL('/', request.url))
        }
    }

    if (request.nextUrl.pathname.startsWith('/dashboard')) {
        if (!user) {
            return NextResponse.redirect(new URL('/login?next=/dashboard', request.url))
        }

        if (role !== 'fabricante') {
            return NextResponse.redirect(new URL('/', request.url))
        }
    }

    if (request.nextUrl.pathname.startsWith('/mi-cuenta')) {
        if (!user) {
            return NextResponse.redirect(new URL('/login?next=/mi-cuenta', request.url))
        }

        if (role && role !== 'usuario') {
            return NextResponse.redirect(new URL('/', request.url))
        }
    }

    // Redirect logged in users away from login
    if (request.nextUrl.pathname === '/login' && user) {
        if (role === 'fabricante') {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }

        if (role && staffRoles.includes(role)) {
            return NextResponse.redirect(new URL('/admin', request.url))
        }

        return NextResponse.redirect(new URL('/mi-cuenta', request.url))
    }

    return response
}
