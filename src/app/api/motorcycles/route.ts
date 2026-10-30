import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/supabase/auth';
import { createMotorcycleSchema, formatZodError } from '@/lib/validations';
import { getMotorcycles } from '@/lib/supabase/repository';
import { createClient } from '@/lib/supabase/server';

// GET all motorcycles
export async function GET() {
  try {
    const { data, error } = await getMotorcycles();
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch motorcycles' }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch motorcycles' }, { status: 500 });
  }
}

// POST create new motorcycle
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'ข้อมูล Request Body ไม่ถูกต้อง หรือไม่ได้ส่งมา' }, { status: 400 });
    }

    const validation = createMotorcycleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { name, model, price, cash_price, finance_amount, cc_size, description, image_url } = validation.data;
    const effectivePrice = price ?? finance_amount ?? cash_price ?? 0;

    const supabase = await createClient();
    const { data: motorcycle, error } = await supabase
      .from('motorcycles')
      .insert({
        name,
        model,
        price: effectivePrice,
        cash_price: cash_price ?? null,
        finance_amount: finance_amount ?? null,
        cc_size: cc_size ?? null,
        description: description ?? null,
        image_url: image_url ?? null,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating motorcycle:', error);
      return NextResponse.json({ error: 'Failed to create motorcycle' }, { status: 500 });
    }

    const formatted = {
      ...motorcycle,
      price: Number(motorcycle.price),
      cash_price: motorcycle.cash_price !== null ? Number(motorcycle.cash_price) : null,
      finance_amount: motorcycle.finance_amount !== null ? Number(motorcycle.finance_amount) : null,
      cc_size: motorcycle.cc_size !== null ? Number(motorcycle.cc_size) : null,
    };

    return NextResponse.json(formatted, { status: 201 });
  } catch (error) {
    console.error('Failed to create motorcycle:', error);
    return NextResponse.json({ error: 'Failed to create motorcycle' }, { status: 500 });
  }
}
