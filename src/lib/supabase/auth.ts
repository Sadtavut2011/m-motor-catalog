import { createClient } from './server';

export interface AdminAuthResult {
  authorized: boolean;
  user: any | null;
  error: string | null;
  status: number;
}

/**
 * Helper function to verify admin privileges on server-side (Server Components, Route Handlers, Server Actions).
 * 
 * CRITICAL RULES:
 * 1. Checks `user.app_metadata.role === 'admin'` ONLY.
 * 2. NEVER trust or use `user_metadata` for authorization.
 * 3. Uses `supabase.auth.getUser()` to guarantee JWT validation with Supabase Auth server.
 */
export async function verifyAdmin(): Promise<AdminAuthResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      authorized: false,
      user: null,
      error: 'ระบบยังไม่ได้กำหนด Supabase Environment Variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)',
      status: 500,
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        authorized: false,
        user: null,
        error: 'Unauthorized: จำเป็นต้องเข้าสู่ระบบก่อนดำเนินการ',
        status: 401,
      };
    }

    // Role MUST be checked via app_metadata, never user_metadata
    if (user.app_metadata?.role !== 'admin') {
      return {
        authorized: false,
        user,
        error: 'Forbidden: บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ (Admin Role Required)',
        status: 403,
      };
    }

    return {
      authorized: true,
      user,
      error: null,
      status: 200,
    };
  } catch (err: any) {
    return {
      authorized: false,
      user: null,
      error: err?.message || 'Authentication error',
      status: 500,
    };
  }
}
