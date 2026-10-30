/**
 * M Motor Catalog: Supabase Read-Only Data Access Layer (Repository)
 * 
 * หน้าที่:
 * รวมฟังก์ชันสำหรับอ่านข้อมูลจาก Supabase แทนที่คำสั่ง SQLite (SELECT) เดิม
 * โดยใช้ createClient() จาก @/lib/supabase/server (ไม่ใช้ Service Role Key)
 * และส่งผ่าน formatters เพื่อรับประกันว่า Response Format ตรงกับที่ UI เดิมคาดหวัง 100%
 */

import { createClient } from './server';
import {
  mapMotorcycleToFrontend,
  mapColorsToFrontend,
  MotorcycleRow,
  MotorcycleWithColors,
  MotorcycleColorRow,
  DownPaymentOptionRow,
  InstallmentPeriodRow,
  InstallmentPlanRow,
  PricingTableRow,
} from './formatters';

/**
 * ดึงรายการรถจักรยานยนต์ทั้งหมด พร้อมสีของรถแต่ละคัน (แทนที่ GET /api/motorcycles เดิม)
 * ยุบคำสั่ง N+1 queries ของ SQLite เดิมให้เหลือคำสั่งเดียวผ่าน Resource Embedding
 */
export async function getMotorcycles(): Promise<{ data: MotorcycleWithColors[] | null; error: any }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('motorcycles')
      .select('*, colors:motorcycle_colors(*)')
      .order('created_at', { ascending: false })
      .order('is_default', { foreignTable: 'motorcycle_colors', ascending: false })
      .order('id', { foreignTable: 'motorcycle_colors', ascending: true });

    if (error) {
      console.error('getMotorcycles error:', error);
      return { data: null, error };
    }

    const formatted = (data || []).map(mapMotorcycleToFrontend).filter(Boolean) as MotorcycleWithColors[];
    return { data: formatted, error: null };
  } catch (err: any) {
    console.error('getMotorcycles exception:', err);
    return { data: null, error: err };
  }
}

/**
 * ดึงข้อมูลรถจักรยานยนต์รายคันตาม ID พร้อมสี (แทนที่ GET /api/motorcycles/[id] เดิม)
 */
export async function getMotorcycleById(
  id: number
): Promise<{ data: MotorcycleWithColors | null; error: any; notFound?: boolean }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('motorcycles')
      .select('*, colors:motorcycle_colors(*)')
      .eq('id', id)
      .order('is_default', { foreignTable: 'motorcycle_colors', ascending: false })
      .order('id', { foreignTable: 'motorcycle_colors', ascending: true })
      .maybeSingle();

    if (error) {
      console.error('getMotorcycleById error:', error);
      return { data: null, error };
    }

    if (!data) {
      return { data: null, error: null, notFound: true };
    }

    return { data: mapMotorcycleToFrontend(data), error: null };
  } catch (err: any) {
    console.error('getMotorcycleById exception:', err);
    return { data: null, error: err };
  }
}

/**
 * ดึงรายการสีของรถตาม motorcycle_id (แทนที่ GET /api/motorcycles/[id]/colors เดิม)
 */
export async function getMotorcycleColors(
  motorcycleId: number
): Promise<{ data: Array<MotorcycleColorRow & { is_default: number }> | null; error: any }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('motorcycle_colors')
      .select('*')
      .eq('motorcycle_id', motorcycleId)
      .order('is_default', { ascending: false })
      .order('id', { ascending: true });

    if (error) {
      console.error('getMotorcycleColors error:', error);
      return { data: null, error };
    }

    return { data: mapColorsToFrontend(data), error: null };
  } catch (err: any) {
    console.error('getMotorcycleColors exception:', err);
    return { data: null, error: err };
  }
}

/**
 * ดึงตัวเลือกเงินดาวน์ทั้งหมด (แทนที่ GET /api/down-payment-options เดิม)
 */
export async function getDownPaymentOptions(): Promise<{
  data: DownPaymentOptionRow[] | null;
  error: any;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('down_payment_options')
      .select('*')
      .order('amount', { ascending: true });

    if (error) {
      console.error('getDownPaymentOptions error:', error);
      return { data: null, error };
    }

    const formatted = (data || []).map((row) => ({
      ...row,
      amount: Number(row.amount),
    }));

    return { data: formatted, error: null };
  } catch (err: any) {
    console.error('getDownPaymentOptions exception:', err);
    return { data: null, error: err };
  }
}

/**
 * ดึงตัวเลือกระยะเวลางวดผ่อนทั้งหมด (แทนที่ GET /api/installment-periods เดิม)
 */
export async function getInstallmentPeriods(): Promise<{
  data: InstallmentPeriodRow[] | null;
  error: any;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('installment_periods')
      .select('*')
      .order('months', { ascending: true });

    if (error) {
      console.error('getInstallmentPeriods error:', error);
      return { data: null, error };
    }

    const formatted = (data || []).map((row) => ({
      ...row,
      months: Number(row.months),
    }));

    return { data: formatted, error: null };
  } catch (err: any) {
    console.error('getInstallmentPeriods exception:', err);
    return { data: null, error: err };
  }
}

/**
 * ดึงรายการแผนการผ่อนชำระ (แทนที่ GET /api/installment-plans เดิม)
 */
export async function getInstallmentPlans(
  motorcycleId?: number
): Promise<{ data: InstallmentPlanRow[] | null; error: any }> {
  try {
    const supabase = await createClient();
    let query = supabase.from('installment_plans').select('*').order('id', { ascending: true });

    if (motorcycleId !== undefined && motorcycleId !== null) {
      query = query.eq('motorcycle_id', motorcycleId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('getInstallmentPlans error:', error);
      return { data: null, error };
    }

    const formatted = (data || []).map((row) => ({
      ...row,
      months: Number(row.months),
      monthly_payment: Number(row.monthly_payment),
      down_payment: Number(row.down_payment),
      interest_rate: Number(row.interest_rate),
    }));

    return { data: formatted, error: null };
  } catch (err: any) {
    console.error('getInstallmentPlans exception:', err);
    return { data: null, error: err };
  }
}

/**
 * ดึงข้อมูลตารางราคา (แทนที่ GET /api/pricing-tables เดิม)
 */
export async function getPricingTables(
  motorcycleId?: number
): Promise<{ data: PricingTableRow[] | null; error: any }> {
  try {
    const supabase = await createClient();
    let query = supabase.from('pricing_tables').select('*').order('id', { ascending: true });

    if (motorcycleId !== undefined && motorcycleId !== null) {
      query = query.eq('motorcycle_id', motorcycleId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('getPricingTables error:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (err: any) {
    console.error('getPricingTables exception:', err);
    return { data: null, error: err };
  }
}

/**
 * ดึงข้อมูลที่จำเป็นสำหรับการคำนวณค่างวดผ่อนชำระ (แทนที่ Queries ใน POST /api/calculate-installment)
 * ดึงข้อมูลรถ, เงินดาวน์, และจำนวนงวด แบบคู่ขนาน (Parallel) เพื่อประสิทธิภาพสูงสุด
 */
export async function getCalculationData(motorcycleId: number): Promise<{
  motorcycle: MotorcycleRow | null;
  downPaymentOptions: DownPaymentOptionRow[];
  installmentPeriods: InstallmentPeriodRow[];
  error: any;
  notFound?: boolean;
}> {
  try {
    const supabase = await createClient();

    const [motorcycleRes, downPaymentRes, periodsRes] = await Promise.all([
      supabase.from('motorcycles').select('*').eq('id', motorcycleId).maybeSingle(),
      supabase.from('down_payment_options').select('*').order('amount', { ascending: true }),
      supabase.from('installment_periods').select('*').order('months', { ascending: true }),
    ]);

    if (motorcycleRes.error) {
      return { motorcycle: null, downPaymentOptions: [], installmentPeriods: [], error: motorcycleRes.error };
    }
    if (downPaymentRes.error) {
      return { motorcycle: null, downPaymentOptions: [], installmentPeriods: [], error: downPaymentRes.error };
    }
    if (periodsRes.error) {
      return { motorcycle: null, downPaymentOptions: [], installmentPeriods: [], error: periodsRes.error };
    }

    if (!motorcycleRes.data) {
      return { motorcycle: null, downPaymentOptions: [], installmentPeriods: [], error: null, notFound: true };
    }

    const motorcycle: MotorcycleRow = {
      ...motorcycleRes.data,
      price: Number(motorcycleRes.data.price),
      cash_price: motorcycleRes.data.cash_price !== null ? Number(motorcycleRes.data.cash_price) : null,
      finance_amount: motorcycleRes.data.finance_amount !== null ? Number(motorcycleRes.data.finance_amount) : null,
      cc_size: motorcycleRes.data.cc_size !== null ? Number(motorcycleRes.data.cc_size) : null,
    };

    const downPaymentOptions: DownPaymentOptionRow[] = (downPaymentRes.data || []).map((row) => ({
      ...row,
      amount: Number(row.amount),
    }));

    const installmentPeriods: InstallmentPeriodRow[] = (periodsRes.data || []).map((row) => ({
      ...row,
      months: Number(row.months),
    }));

    return {
      motorcycle,
      downPaymentOptions,
      installmentPeriods,
      error: null,
    };
  } catch (err: any) {
    console.error('getCalculationData exception:', err);
    return { motorcycle: null, downPaymentOptions: [], installmentPeriods: [], error: err };
  }
}
