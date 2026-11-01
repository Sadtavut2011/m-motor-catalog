import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/supabase/auth';
import { createDownPaymentOptionSchema, formatZodError, idParamSchema } from '@/lib/validations';
import { getDownPaymentOptions } from '@/lib/supabase/repository';
import { createClient } from '@/lib/supabase/server';

// GET down payment options for a specific motorcycle
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawMotorcycleId = searchParams.get('motorcycle_id');

    if (!rawMotorcycleId) {
      return NextResponse.json(
        { error: 'กรุณาระบุ motorcycle_id ใน Query Parameter (ห้ามใช้ค่าส่วนกลาง)' },
        { status: 400 }
      );
    }

    const idValidation = idParamSchema.safeParse(rawMotorcycleId);
    if (!idValidation.success) {
      return NextResponse.json(formatZodError(idValidation.error, 'motorcycle_id'), { status: 400 });
    }

    const motorcycleId = idValidation.data;
    const { data, error } = await getDownPaymentOptions(motorcycleId);
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

// POST new down payment option for a specific motorcycle
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

    const { motorcycle_id, amount } = validation.data;

    const supabase = await createClient();
    const { data: newOption, error } = await supabase
      .from('down_payment_options')
      .insert({ motorcycle_id, amount })
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
