import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/supabase/auth';
import { idParamSchema, createInstallmentPlanSchema, formatZodError } from '@/lib/validations';
import { getInstallmentPlans } from '@/lib/supabase/repository';
import { createClient } from '@/lib/supabase/server';

// GET all installment plans
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawMotorcycleId = searchParams.get('motorcycle_id');

    let motorcycleId: number | undefined = undefined;
    if (rawMotorcycleId !== null) {
      const idValidation = idParamSchema.safeParse(rawMotorcycleId);
      if (!idValidation.success) {
        return NextResponse.json(formatZodError(idValidation.error, 'motorcycle_id'), { status: 400 });
      }
      motorcycleId = idValidation.data;
    }

    const { data, error } = await getInstallmentPlans(motorcycleId);
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch installment plans' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch installment plans' }, { status: 500 });
  }
}

// POST create new installment plan
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

    const validation = createInstallmentPlanSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { motorcycle_id, months, monthly_payment, down_payment, interest_rate } = validation.data;

    const supabase = await createClient();

    // Check relationship (motorcycle_id ต้องอ้างถึงรถที่มีอยู่จริง)
    const { data: motorcycle, error: mError } = await supabase
      .from('motorcycles')
      .select('id')
      .eq('id', motorcycle_id)
      .maybeSingle();

    if (mError) {
      console.error('Error checking motorcycle existence:', mError);
      return NextResponse.json({ error: 'Failed to create installment plan' }, { status: 500 });
    }

    if (!motorcycle) {
      return NextResponse.json({ error: 'ไม่พบรถจักรยานยนต์ที่ระบุ (motorcycle_id ไม่ถูกต้อง)' }, { status: 400 });
    }

    const { data: plan, error } = await supabase
      .from('installment_plans')
      .insert({
        motorcycle_id,
        months,
        monthly_payment,
        down_payment,
        interest_rate,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating installment plan:', error);
      return NextResponse.json({ error: 'Failed to create installment plan' }, { status: 500 });
    }

    const formatted = {
      ...plan,
      months: Number(plan.months),
      monthly_payment: Number(plan.monthly_payment),
      down_payment: Number(plan.down_payment),
      interest_rate: Number(plan.interest_rate),
    };

    return NextResponse.json(formatted, { status: 201 });
  } catch (error) {
    console.error('Error creating installment plan:', error);
    return NextResponse.json({ error: 'Failed to create installment plan' }, { status: 500 });
  }
}
