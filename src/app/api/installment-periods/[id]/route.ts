import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/supabase/auth';
import { idParamSchema, formatZodError } from '@/lib/validations';
import { createClient } from '@/lib/supabase/server';

// DELETE installment period
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id: rawId } = await params;
    const idValidation = idParamSchema.safeParse(rawId);
    if (!idValidation.success) {
      return NextResponse.json(formatZodError(idValidation.error, 'id'), { status: 400 });
    }
    const id = idValidation.data;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('installment_periods')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) {
      console.error('Error deleting installment period:', error);
      return NextResponse.json({ error: 'Failed to delete installment period' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลงวดที่ต้องการลบ' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, message: 'ลบข้อมูลงวดผ่อนเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Error deleting installment period:', error);
    return NextResponse.json({ error: 'Failed to delete installment period' }, { status: 500 });
  }
}
