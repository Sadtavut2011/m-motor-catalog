import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const pathname = request.nextUrl.pathname;
  const method = request.method;

  // 1. Guard against missing environment variables
  if (!supabaseUrl || !supabaseAnonKey) {
    if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('error', 'config_missing');
      return NextResponse.redirect(url);
    }

    if (
      pathname.startsWith('/api/') &&
      pathname !== '/api/calculate-installment' &&
      ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)
    ) {
      return NextResponse.json(
        { error: 'Unauthorized: Supabase credentials not configured' },
        { status: 500 }
      );
    }

    return supabaseResponse;
  }

  // 2. Initialize Supabase SSR client for middleware session refresh
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Use getUser() to securely validate the JWT token with Supabase Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Role validation: Strictly check app_metadata.role === 'admin'
  const isAdmin = user?.app_metadata?.role === 'admin';

  // 3. Admin routes protection
  if (pathname.startsWith('/admin')) {
    // Allow /admin/login
    if (pathname === '/admin/login') {
      // If already logged in as admin, redirect to dashboard
      if (isAdmin) {
        const url = request.nextUrl.clone();
        url.pathname = '/admin';
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    // Protected /admin routes: Require active user and role === 'admin'
    if (!user || !isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(url);
    }
  }

  // 4. API routes protection
  if (pathname.startsWith('/api/')) {
    // Safe read-only HTTP methods are accessible to public
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return supabaseResponse;
    }

    // Public calculation API: POST /api/calculate-installment is customer-facing
    if (pathname === '/api/calculate-installment' && method === 'POST') {
      return supabaseResponse;
    }

    // All other mutating API routes (POST, PUT, DELETE, PATCH) require Admin
    if (!user || !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: สิทธิ์ผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถดำเนินการนี้ได้' },
        { status: 401 }
      );
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - uploads (static uploaded images)
     * - static assets (.svg, .png, .jpg, .jpeg, .gif, .webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|uploads/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
