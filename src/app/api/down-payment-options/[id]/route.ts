import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/supabase/auth';
import { idParamSchema, formatZodError } from '@/lib/validations';
import { createClient } from '@/lib/supabase/server';

// DELETE down payment option
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
      .from('down_payment_options')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) {
      console.error('Error deleting down payment option:', error);
      return NextResponse.json({ error: 'Failed to delete down payment option' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลเงินดาวน์ที่ต้องการลบ' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, message: 'ลบข้อมูลเงินดาวน์เรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Error deleting down payment option:', error);
    return NextResponse.json({ error: 'Failed to delete down payment option' }, { status: 500 });
  }
}
