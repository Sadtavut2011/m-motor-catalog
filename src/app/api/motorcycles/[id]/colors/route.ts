import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/supabase/auth';
import { idParamSchema, createMotorcycleColorSchema, formatZodError } from '@/lib/validations';
import { getMotorcycleColors } from '@/lib/supabase/repository';
import { createClient } from '@/lib/supabase/server';
import { mapColorToFrontend } from '@/lib/supabase/formatters';

// GET all colors for a motorcycle
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idValidation = idParamSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(formatZodError(idValidation.error, 'id'), { status: 400 });
    }
    const motorcycleId = idValidation.data;

    const { data, error } = await getMotorcycleColors(motorcycleId);
    if (error) {
      console.error('Failed to fetch motorcycle colors:', error);
      return NextResponse.json({ error: 'Failed to fetch motorcycle colors' }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch motorcycle colors:', error);
    return NextResponse.json({ error: 'Failed to fetch motorcycle colors' }, { status: 500 });
  }
}

// POST add a new color for a motorcycle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const idValidation = idParamSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(formatZodError(idValidation.error, 'id'), { status: 400 });
    }
    const motorcycleId = idValidation.data;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'ข้อมูล Request Body ไม่ถูกต้อง หรือไม่ได้ส่งมา' }, { status: 400 });
    }

    const validation = createMotorcycleColorSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { color_name, color_code, image_url, is_default } = validation.data;
    const supabase = await createClient();

    // 1. Try invoking PostgreSQL RPC (handles row lock FOR UPDATE and atomic default color swap)
    const { data: rpcColor, error: rpcError } = await supabase.rpc('rpc_add_motorcycle_color', {
      p_motorcycle_id: motorcycleId,
      p_color_name: color_name,
      p_color_code: color_code ?? null,
      p_image_url: image_url,
      p_is_default: !!is_default,
    });

    if (!rpcError && rpcColor) {
      return NextResponse.json(mapColorToFrontend(rpcColor), { status: 201 });
    }

    // Handle RPC specific errors
    if (rpcError && rpcError.code === 'P0002') {
      return NextResponse.json({ error: 'ไม่พบรถมอเตอร์ไซค์ที่ระบุ' }, { status: 404 });
    }
    if (rpcError && rpcError.code === '42501') {
      return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });
    }

    // 2. Fallback: If RPC is not found in schema cache (PGRST202 or 42883), execute via Supabase Server Client
    if (rpcError && (rpcError.code === 'PGRST202' || rpcError.code === '42883')) {
      // Check if motorcycle exists
      const { data: motorcycle, error: mError } = await supabase
        .from('motorcycles')
        .select('id, image_url')
        .eq('id', motorcycleId)
        .maybeSingle();

      if (mError) {
        console.error('Error checking motorcycle existence:', mError);
        return NextResponse.json({ error: 'Failed to create motorcycle color' }, { status: 500 });
      }
      if (!motorcycle) {
        return NextResponse.json({ error: 'ไม่พบรถมอเตอร์ไซค์ที่ระบุ' }, { status: 404 });
      }

      // Check existing color count
      const { count, error: countError } = await supabase
        .from('motorcycle_colors')
        .select('id', { count: 'exact', head: true })
        .eq('motorcycle_id', motorcycleId);

      if (countError) {
        console.error('Error counting motorcycle colors:', countError);
        return NextResponse.json({ error: 'Failed to create motorcycle color' }, { status: 500 });
      }

      const makeDefault = Boolean(is_default || count === 0);

      if (makeDefault) {
        // Clear previous default
        await supabase
          .from('motorcycle_colors')
          .update({ is_default: false })
          .eq('motorcycle_id', motorcycleId);

        // Update motorcycle primary image
        await supabase
          .from('motorcycles')
          .update({
            image_url: image_url,
            updated_at: new Date().toISOString(),
          })
          .eq('id', motorcycleId);
      }

      const { data: newColor, error: insertError } = await supabase
        .from('motorcycle_colors')
        .insert({
          motorcycle_id: motorcycleId,
          color_name,
          color_code: color_code ?? null,
          image_url,
          is_default: makeDefault,
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('Error inserting motorcycle color fallback:', insertError);
        return NextResponse.json({ error: 'Failed to create motorcycle color' }, { status: 500 });
      }

      return NextResponse.json(mapColorToFrontend(newColor), { status: 201 });
    }

    console.error('Failed to create motorcycle color RPC:', rpcError);
    return NextResponse.json({ error: 'Failed to create motorcycle color' }, { status: 500 });
  } catch (error) {
    console.error('Failed to create motorcycle color:', error);
    return NextResponse.json({ error: 'Failed to create motorcycle color' }, { status: 500 });
  }
}
