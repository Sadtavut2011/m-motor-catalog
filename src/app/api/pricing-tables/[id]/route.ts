import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/supabase/auth';
import { idParamSchema, updatePricingTableSchema, formatZodError } from '@/lib/validations';
import { createClient } from '@/lib/supabase/server';

// PUT update pricing table
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
    const tableId = idValidation.data;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'ข้อมูล Request Body ไม่ถูกต้อง หรือไม่ได้ส่งมา' }, { status: 400 });
    }

    const validation = updatePricingTableSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { table_data, image_url } = validation.data;
    const tableDataString = typeof table_data === 'string' ? table_data : JSON.stringify(table_data);

    const supabase = await createClient();
    const { data: updatedTable, error } = await supabase
      .from('pricing_tables')
      .update({
        table_data: tableDataString,
        image_url: image_url ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tableId)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Error updating pricing table:', error);
      return NextResponse.json({ error: 'Failed to update pricing table' }, { status: 500 });
    }

    if (!updatedTable) {
      return NextResponse.json({ error: 'Pricing table not found' }, { status: 404 });
    }

    return NextResponse.json(updatedTable);
  } catch (error) {
    console.error('Error updating pricing table:', error);
    return NextResponse.json({ error: 'Failed to update pricing table' }, { status: 500 });
  }
}

// DELETE pricing table
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
    const tableId = idValidation.data;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('pricing_tables')
      .delete()
      .eq('id', tableId)
      .select('id');

    if (error) {
      console.error('Error deleting pricing table:', error);
      return NextResponse.json({ error: 'Failed to delete pricing table' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Pricing table not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Pricing table deleted successfully' });
  } catch (error) {
    console.error('Error deleting pricing table:', error);
    return NextResponse.json({ error: 'Failed to delete pricing table' }, { status: 500 });
  }
}
