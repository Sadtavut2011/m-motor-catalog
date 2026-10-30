import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/supabase/auth';
import { idParamSchema, updateInstallmentPlanSchema, formatZodError } from '@/lib/validations';
import { createClient } from '@/lib/supabase/server';

// PUT update installment plan
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
    const planId = idValidation.data;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'ข้อมูล Request Body ไม่ถูกต้อง หรือไม่ได้ส่งมา' }, { status: 400 });
    }

    const validation = updateInstallmentPlanSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { months, monthly_payment, down_payment, interest_rate } = validation.data;

    const supabase = await createClient();
    const { data: updatedPlan, error } = await supabase
      .from('installment_plans')
      .update({
        months,
        monthly_payment,
        down_payment,
        interest_rate,
      })
      .eq('id', planId)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Error updating installment plan:', error);
      return NextResponse.json({ error: 'Failed to update installment plan' }, { status: 500 });
    }

    if (!updatedPlan) {
      return NextResponse.json({ error: 'Installment plan not found' }, { status: 404 });
    }

    const formatted = {
      ...updatedPlan,
      months: Number(updatedPlan.months),
      monthly_payment: Number(updatedPlan.monthly_payment),
      down_payment: Number(updatedPlan.down_payment),
      interest_rate: Number(updatedPlan.interest_rate),
    };

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error updating installment plan:', error);
    return NextResponse.json({ error: 'Failed to update installment plan' }, { status: 500 });
  }
}

// DELETE installment plan
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
    const planId = idValidation.data;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('installment_plans')
      .delete()
      .eq('id', planId)
      .select('id');

    if (error) {
      console.error('Error deleting installment plan:', error);
      return NextResponse.json({ error: 'Failed to delete installment plan' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Installment plan not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Installment plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting installment plan:', error);
    return NextResponse.json({ error: 'Failed to delete installment plan' }, { status: 500 });
  }
}
