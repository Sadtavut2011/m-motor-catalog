import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/supabase/auth';
import { idParamSchema, updateMotorcycleColorSchema, formatZodError } from '@/lib/validations';
import { createClient } from '@/lib/supabase/server';
import { mapColorToFrontend } from '@/lib/supabase/formatters';

// PUT update motorcycle color
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; colorId: string }> }
) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id, colorId } = await params;
    const idValidation = idParamSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(formatZodError(idValidation.error, 'id'), { status: 400 });
    }
    const motorcycleId = idValidation.data;

    const colorIdValidation = idParamSchema.safeParse(colorId);
    if (!colorIdValidation.success) {
      return NextResponse.json(formatZodError(colorIdValidation.error, 'colorId'), { status: 400 });
    }
    const validColorId = colorIdValidation.data;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'ข้อมูล Request Body ไม่ถูกต้อง หรือไม่ได้ส่งมา' }, { status: 400 });
    }

    const validation = updateMotorcycleColorSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { color_name, color_code, image_url, is_default } = validation.data;
    const supabase = await createClient();

    // 1. Try invoking PostgreSQL RPC (handles row lock FOR UPDATE and atomic default color swap)
    const { data: rpcColor, error: rpcError } = await supabase.rpc('rpc_update_motorcycle_color', {
      p_motorcycle_id: motorcycleId,
      p_color_id: validColorId,
      p_color_name: color_name !== undefined ? color_name : null,
      p_color_code: color_code !== undefined ? (color_code ?? null) : null,
      p_image_url: image_url !== undefined ? image_url : null,
      p_is_default: is_default !== undefined ? Boolean(is_default) : null,
    });

    if (!rpcError && rpcColor) {
      return NextResponse.json(mapColorToFrontend(rpcColor));
    }

    // Handle RPC specific errors
    if (rpcError && rpcError.code === 'P0002') {
      return NextResponse.json({ error: 'ไม่พบข้อมูลสีที่ต้องการแก้ไข' }, { status: 404 });
    }
    if (rpcError && rpcError.code === '42501') {
      return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });
    }

    // 2. Fallback: If RPC is not found in schema cache (PGRST202 or 42883), execute via Supabase Server Client
    if (rpcError && (rpcError.code === 'PGRST202' || rpcError.code === '42883')) {
      const { data: existingColor, error: fetchError } = await supabase
        .from('motorcycle_colors')
        .select('*')
        .eq('id', validColorId)
        .eq('motorcycle_id', motorcycleId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching color for update:', fetchError);
        return NextResponse.json({ error: 'Failed to update motorcycle color' }, { status: 500 });
      }

      if (!existingColor) {
        return NextResponse.json({ error: 'ไม่พบข้อมูลสีที่ต้องการแก้ไข' }, { status: 404 });
      }

      const updatedName = color_name !== undefined ? color_name : existingColor.color_name;
      const updatedCode = color_code !== undefined ? (color_code ?? null) : existingColor.color_code;
      const updatedImage = image_url !== undefined ? image_url : existingColor.image_url;
      const updatedDefault = is_default !== undefined ? Boolean(is_default) : Boolean(existingColor.is_default);

      if (updatedDefault) {
        // Clear previous default from other colors
        await supabase
          .from('motorcycle_colors')
          .update({ is_default: false })
          .eq('motorcycle_id', motorcycleId)
          .neq('id', validColorId);

        // Sync motorcycle main image
        await supabase
          .from('motorcycles')
          .update({
            image_url: updatedImage,
            updated_at: new Date().toISOString(),
          })
          .eq('id', motorcycleId);
      }

      const { data: updated, error: updateError } = await supabase
        .from('motorcycle_colors')
        .update({
          color_name: updatedName,
          color_code: updatedCode,
          image_url: updatedImage,
          is_default: updatedDefault,
        })
        .eq('id', validColorId)
        .eq('motorcycle_id', motorcycleId)
        .select('*')
        .single();

      if (updateError) {
        console.error('Error updating motorcycle color fallback:', updateError);
        return NextResponse.json({ error: 'Failed to update motorcycle color' }, { status: 500 });
      }

      return NextResponse.json(mapColorToFrontend(updated));
    }

    console.error('Failed to update motorcycle color RPC:', rpcError);
    return NextResponse.json({ error: 'Failed to update motorcycle color' }, { status: 500 });
  } catch (error) {
    console.error('Failed to update motorcycle color:', error);
    return NextResponse.json({ error: 'Failed to update motorcycle color' }, { status: 500 });
  }
}

// DELETE motorcycle color
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; colorId: string }> }
) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id, colorId } = await params;
    const idValidation = idParamSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(formatZodError(idValidation.error, 'id'), { status: 400 });
    }
    const motorcycleId = idValidation.data;

    const colorIdValidation = idParamSchema.safeParse(colorId);
    if (!colorIdValidation.success) {
      return NextResponse.json(formatZodError(colorIdValidation.error, 'colorId'), { status: 400 });
    }
    const validColorId = colorIdValidation.data;

    const supabase = await createClient();

    // 1. Try invoking PostgreSQL RPC (handles row lock FOR UPDATE and atomic default re-election)
    const { data: rpcRes, error: rpcError } = await supabase.rpc('rpc_delete_motorcycle_color', {
      p_motorcycle_id: motorcycleId,
      p_color_id: validColorId,
    });

    if (!rpcError) {
      return NextResponse.json({ message: 'ลบข้อมูลสีเรียบร้อยแล้ว' });
    }

    // Handle RPC specific errors
    if (rpcError && rpcError.code === 'P0002') {
      return NextResponse.json({ error: 'ไม่พบข้อมูลสีที่ต้องการลบ' }, { status: 404 });
    }
    if (rpcError && rpcError.code === '42501') {
      return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });
    }

    // 2. Fallback: If RPC is not found in schema cache (PGRST202 or 42883), execute via Supabase Server Client
    if (rpcError && (rpcError.code === 'PGRST202' || rpcError.code === '42883')) {
      const { data: existing, error: existError } = await supabase
        .from('motorcycle_colors')
        .select('*')
        .eq('id', validColorId)
        .eq('motorcycle_id', motorcycleId)
        .maybeSingle();

      if (existError) {
        console.error('Error fetching color for deletion:', existError);
        return NextResponse.json({ error: 'Failed to delete motorcycle color' }, { status: 500 });
      }

      if (!existing) {
        return NextResponse.json({ error: 'ไม่พบข้อมูลสีที่ต้องการลบ' }, { status: 404 });
      }

      const { error: delError } = await supabase
        .from('motorcycle_colors')
        .delete()
        .eq('id', validColorId)
        .eq('motorcycle_id', motorcycleId);

      if (delError) {
        console.error('Error deleting motorcycle color fallback:', delError);
        return NextResponse.json({ error: 'Failed to delete motorcycle color' }, { status: 500 });
      }

      // If deleted color was default, assign default to another remaining color if any
      if (existing.is_default) {
        const { data: remaining } = await supabase
          .from('motorcycle_colors')
          .select('id, image_url')
          .eq('motorcycle_id', motorcycleId)
          .order('id', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (remaining) {
          await supabase
            .from('motorcycle_colors')
            .update({ is_default: true })
            .eq('id', remaining.id);

          await supabase
            .from('motorcycles')
            .update({
              image_url: remaining.image_url,
              updated_at: new Date().toISOString(),
            })
            .eq('id', motorcycleId);
        } else {
          // If no remaining colors, clear image_url to null
          await supabase
            .from('motorcycles')
            .update({
              image_url: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', motorcycleId);
        }
      }

      return NextResponse.json({ message: 'ลบข้อมูลสีเรียบร้อยแล้ว' });
    }

    console.error('Failed to delete motorcycle color RPC:', rpcError);
    return NextResponse.json({ error: 'Failed to delete motorcycle color' }, { status: 500 });
  } catch (error) {
    console.error('Failed to delete motorcycle color:', error);
    return NextResponse.json({ error: 'Failed to delete motorcycle color' }, { status: 500 });
  }
}
