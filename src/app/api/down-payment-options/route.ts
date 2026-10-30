import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/supabase/auth';
import { createDownPaymentOptionSchema, formatZodError } from '@/lib/validations';
import { getDownPaymentOptions } from '@/lib/supabase/repository';
import { createClient } from '@/lib/supabase/server';

// GET all down payment options
export async function GET() {
  try {
    const { data, error } = await getDownPaymentOptions();
    if (error) {
      console.error('Error fetching down payment options:', error);
      return NextResponse.json({ error: 'Failed to fetch down payment options' }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching down payment options:', error);
    return NextResponse.json({ error: 'Failed to fetch down payment options' }, { status: 500 });
  }
}

// POST new down payment option
export async function POST(request: Request) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'ข้อมูล Request Body ไม่ถูกต้อง หรือไม่ได้ส่งมา' }, { status: 400 });
    }

    const validation = createDownPaymentOptionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { amount } = validation.data;

    const supabase = await createClient();
    const { data: newOption, error } = await supabase
      .from('down_payment_options')
      .insert({ amount })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating down payment option:', error);
      return NextResponse.json({ error: 'Failed to create down payment option' }, { status: 500 });
    }

    const formatted = {
      ...newOption,
      amount: Number(newOption.amount),
    };

    return NextResponse.json(formatted, { status: 201 });
  } catch (error) {
    console.error('Error creating down payment option:', error);
    return NextResponse.json({ error: 'Failed to create down payment option' }, { status: 500 });
  }
}
