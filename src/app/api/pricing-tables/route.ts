import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/supabase/auth';
import { idParamSchema, createPricingTableSchema, formatZodError } from '@/lib/validations';
import { getPricingTables } from '@/lib/supabase/repository';
import { createClient } from '@/lib/supabase/server';

// GET all pricing tables
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

    const { data, error } = await getPricingTables(motorcycleId);
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch pricing tables' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch pricing tables' }, { status: 500 });
  }
}

// POST create new pricing table
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

    const validation = createPricingTableSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { motorcycle_id, table_data, image_url } = validation.data;

    const supabase = await createClient();

    // Check relationship (motorcycle_id ต้องอ้างถึงรถที่มีอยู่จริง)
    const { data: motorcycle, error: mError } = await supabase
      .from('motorcycles')
      .select('id')
      .eq('id', motorcycle_id)
      .maybeSingle();

    if (mError) {
      console.error('Error checking motorcycle existence:', mError);
      return NextResponse.json({ error: 'Failed to create pricing table' }, { status: 500 });
    }

    if (!motorcycle) {
      return NextResponse.json({ error: 'ไม่พบรถจักรยานยนต์ที่ระบุ (motorcycle_id ไม่ถูกต้อง)' }, { status: 400 });
    }

    const tableDataString = typeof table_data === 'string' ? table_data : JSON.stringify(table_data);

    const { data: table, error } = await supabase
      .from('pricing_tables')
      .insert({
        motorcycle_id,
        table_data: tableDataString,
        image_url: image_url ?? null,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating pricing table:', error);
      return NextResponse.json({ error: 'Failed to create pricing table' }, { status: 500 });
    }

    return NextResponse.json(table, { status: 201 });
  } catch (error) {
    console.error('Error creating pricing table:', error);
    return NextResponse.json({ error: 'Failed to create pricing table' }, { status: 500 });
  }
}
