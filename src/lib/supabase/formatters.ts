/**
 * M Motor Catalog: Supabase Data Formatters & Validation Helpers
 * 
 * หน้าที่:
 * 1. แปลงค่า is_default ระหว่าง Supabase Boolean (true/false) กับ Frontend Integer (1/0) อย่างปลอดภัย
 * 2. ตรวจสอบชนิดข้อมูล Input (ID, Number, Boolean) อย่างรัดกุม ป้องกัน Type Coercion Bugs (เช่น Boolean("0") === true)
 * 3. จัดรูปแบบ Response ให้ตรงตามที่ UI เดิมคาดหวัง 100% โดยไม่ต้องแก้ไข Frontend
 */

export interface MotorcycleColorRow {
  id: number;
  motorcycle_id: number;
  color_name: string;
  color_code: string | null;
  image_url: string;
  is_default: boolean | number;
  created_at?: string;
}

export interface MotorcycleRow {
  id: number;
  name: string;
  model: string;
  price: number;
  cash_price: number | null;
  finance_amount: number | null;
  cc_size: number | null;
  description: string | null;
  image_url: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MotorcycleWithColors extends MotorcycleRow {
  colors: Array<MotorcycleColorRow & { is_default: number }>;
}

export interface DownPaymentOptionRow {
  id: number;
  motorcycle_id?: number;
  amount: number;
  created_at?: string;
}

export interface InstallmentPeriodRow {
  id: number;
  motorcycle_id?: number;
  months: number;
  created_at?: string;
}

export interface InstallmentPlanRow {
  id: number;
  motorcycle_id: number;
  months: number;
  monthly_payment: number;
  down_payment: number;
  interest_rate: number;
  created_at?: string;
}

export interface PricingTableRow {
  id: number;
  motorcycle_id: number;
  table_data: string | any;
  image_url: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * ตรวจสอบและแปลงค่า Input ใด ๆ ให้เป็น Boolean อย่างเคร่งครัด
 * 
 * คำเตือน: ห้ามใช้ Boolean(value) เด็ดขาด เพราะใน JavaScript:
 * - Boolean("0") === true
 * - Boolean("false") === true
 */
export function parseStrictBoolean(value: unknown, fallback: boolean = false): boolean {
  if (value === true || value === 1) {
    return true;
  }
  if (value === false || value === 0) {
    return false;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === 'true' || trimmed === '1') {
      return true;
    }
    if (trimmed === 'false' || trimmed === '0') {
      return false;
    }
  }
  return fallback;
}

/**
 * ตรวจสอบและแปลงค่า is_default สำหรับการบันทึกลง Supabase (เป็น boolean)
 */
export function parseIsDefaultInput(value: unknown, fallback: boolean = false): boolean {
  return parseStrictBoolean(value, fallback);
}

/**
 * แปลงข้อมูล Color 1 แถวจาก Supabase เป็นโครงสร้างที่ Frontend คาดหวัง
 * โดยรับประกันว่าคอลัมน์ is_default จะเป็น 1 หรือ 0 เท่านั้น (เพื่อรองรับ color.is_default === 1 ใน UI)
 */
export function mapColorToFrontend<T extends { is_default?: boolean | number | null }>(
  color: T
): T & { is_default: number } {
  const isDefaultBool =
    color.is_default === true ||
    color.is_default === 1 ||
    String(color.is_default).trim().toLowerCase() === 'true' ||
    String(color.is_default).trim() === '1';

  return {
    ...color,
    is_default: isDefaultBool ? 1 : 0,
  };
}

/**
 * แปลงข้อมูล Array ของ Colors ให้มี is_default เป็น 1 หรือ 0 ทุกตัว
 */
export function mapColorsToFrontend<T extends { is_default?: boolean | number | null }>(
  colors: T[] | null | undefined
): Array<T & { is_default: number }> {
  if (!Array.isArray(colors)) {
    return [];
  }
  return colors.map(mapColorToFrontend);
}

/**
 * จัดรูปแบบ Motorcycle พร้อมสี ให้มีโครงสร้างตรงตาม Response ของ SQLite เดิม
 */
export function mapMotorcycleToFrontend(motorcycle: any): MotorcycleWithColors | null {
  if (!motorcycle) return null;

  const rawColors = motorcycle.colors || [];
  return {
    ...motorcycle,
    price: Number(motorcycle.price),
    cash_price: motorcycle.cash_price !== null && motorcycle.cash_price !== undefined ? Number(motorcycle.cash_price) : null,
    finance_amount: motorcycle.finance_amount !== null && motorcycle.finance_amount !== undefined ? Number(motorcycle.finance_amount) : null,
    cc_size: motorcycle.cc_size !== null && motorcycle.cc_size !== undefined ? Number(motorcycle.cc_size) : null,
    colors: mapColorsToFrontend(rawColors),
  };
}

/**
 * ตรวจสอบและแปลง ID ให้เป็นตัวเลขจำนวนเต็มบวก (> 0)
 * หากไม่ถูกต้องจะคืนค่า null
 */
export function parsePositiveId(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) && Number.isFinite(value) && value > 0 ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      const parsed = parseInt(trimmed, 10);
      return parsed > 0 ? parsed : null;
    }
  }
  return null;
}

/**
 * ตรวจสอบและแปลงตัวเลขทั่วไป (เช่น ราคา, เงินดาวน์) ป้องกัน NaN และ Infinity
 */
export function parseSafeNumber(value: unknown, fallback: number | null = null): number | null {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const num = Number(value);
  if (Number.isFinite(num)) {
    return num;
  }
  return fallback;
}
