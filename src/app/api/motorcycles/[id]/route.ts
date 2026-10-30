import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/supabase/auth';
import { idParamSchema, updateMotorcycleSchema, formatZodError } from '@/lib/validations';
import { getMotorcycleById } from '@/lib/supabase/repository';
import { createClient } from '@/lib/supabase/server';

// GET single motorcycle
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

    const { data, error, notFound } = await getMotorcycleById(motorcycleId);
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch motorcycle' }, { status: 500 });
    }
    if (notFound || !data) {
      return NextResponse.json({ error: 'Motorcycle not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch motorcycle' }, { status: 500 });
  }
}

// PUT update motorcycle
export async function PUT(
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

    const validation = updateMotorcycleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { name, model, cash_price, finance_amount, cc_size, description, image_url } = validation.data;

    const supabase = await createClient();
    const { data: motorcycle, error } = await supabase
      .from('motorcycles')
      .update({
        name,
        model,
        cash_price: cash_price ?? null,
        finance_amount: finance_amount ?? null,
        cc_size: cc_size ?? null,
        description: description ?? null,
        image_url: image_url ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', motorcycleId)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Error updating motorcycle:', error);
      return NextResponse.json({ error: 'Failed to update motorcycle' }, { status: 500 });
    }

    if (!motorcycle) {
      return NextResponse.json({ error: 'Motorcycle not found' }, { status: 404 });
    }

    const formatted = {
      ...motorcycle,
      price: Number(motorcycle.price),
      cash_price: motorcycle.cash_price !== null ? Number(motorcycle.cash_price) : null,
      finance_amount: motorcycle.finance_amount !== null ? Number(motorcycle.finance_amount) : null,
      cc_size: motorcycle.cc_size !== null ? Number(motorcycle.cc_size) : null,
    };

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error updating motorcycle:', error);
    return NextResponse.json({ error: 'Failed to update motorcycle' }, { status: 500 });
  }
}

// DELETE motorcycle
export async function DELETE(
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

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('motorcycles')
      .delete()
      .eq('id', motorcycleId)
      .select('id');

    if (error) {
      console.error('Error deleting motorcycle:', error);
      return NextResponse.json({ error: 'Failed to delete motorcycle' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Motorcycle not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Motorcycle deleted successfully' });
  } catch (error) {
    console.error('Error deleting motorcycle:', error);
    return NextResponse.json({ error: 'Failed to delete motorcycle' }, { status: 500 });
  }
}
