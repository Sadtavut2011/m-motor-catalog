import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/supabase/auth';
import { createInstallmentPeriodSchema, formatZodError } from '@/lib/validations';
import { getInstallmentPeriods } from '@/lib/supabase/repository';
import { createClient } from '@/lib/supabase/server';

// GET all installment periods
export async function GET() {
  try {
    const { data, error } = await getInstallmentPeriods();
    if (error) {
      console.error('Error fetching installment periods:', error);
      return NextResponse.json({ error: 'Failed to fetch installment periods' }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching installment periods:', error);
    return NextResponse.json({ error: 'Failed to fetch installment periods' }, { status: 500 });
  }
}

// POST new installment period
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

    const validation = createInstallmentPeriodSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { months } = validation.data;

    const supabase = await createClient();
    const { data: newPeriod, error } = await supabase
      .from('installment_periods')
      .insert({ months })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating installment period:', error);
      return NextResponse.json({ error: 'Failed to create installment period' }, { status: 500 });
    }

    const formatted = {
      ...newPeriod,
      months: Number(newPeriod.months),
    };

    return NextResponse.json(formatted, { status: 201 });
  } catch (error) {
    console.error('Error creating installment period:', error);
    return NextResponse.json({ error: 'Failed to create installment period' }, { status: 500 });
  }
}
