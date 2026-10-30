import { z } from 'zod';

/**
 * รูปแบบข้อความแสดงข้อผิดพลาดของ Zod ให้เข้าใจง่ายและไม่เปิดเผยข้อมูลความลับภายในระบบ
 */
export function formatZodError(
  error: z.ZodError,
  defaultFieldName = 'body'
): {
  error: string;
  details: Array<{ field: string; message: string }>;
} {
  const details = error.issues.map((issue) => ({
    field: issue.path.join('.') || defaultFieldName,
    message: issue.message,
  }));
  const firstMessage = details[0]?.message || 'ข้อมูลที่ส่งมาไม่ถูกต้องตามรูปแบบที่กำหนด';
  return {
    error: firstMessage,
    details,
  };
}

/**
 * Schema สำหรับตรวจสอบ ID ใน Route Parameters (เช่น /api/.../[id])
 * รับได้ทั้งตัวเลขหรือสตริงตัวเลข ต้องเป็นจำนวนเต็มบวก > 0 เท่านั้น
 * ป้องกัน NaN, Infinity, ทศนิยม, ค่าติดลบ, และสตริงที่ไม่ใช่ตัวเลข
 */
export const idParamSchema = z.preprocess(
  (val) => {
    if (typeof val === 'string' && /^\d+$/.test(val.trim())) {
      const parsed = parseInt(val.trim(), 10);
      return parsed > 0 ? parsed : NaN;
    }
    if (typeof val === 'number' && Number.isInteger(val) && Number.isFinite(val) && val > 0) {
      return val;
    }
    return NaN;
  },
  z
    .number('รหัส ID ต้องเป็นตัวเลขจำนวนเต็มบวก')
    .int('รหัส ID ต้องเป็นจำนวนเต็ม')
    .positive('รหัส ID ต้องมากกว่า 0')
    .finite('รหัส ID ต้องเป็นตัวเลขที่ถูกต้อง')
);

/**
 * Helper ตรวจสอบตัวเลขจำนวนเต็มบวกทั่วไป (เช่น motorcycle_id, months)
 */
export const positiveIntegerSchema = (fieldName = 'ข้อมูล') =>
  z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === '') return NaN;
      if (typeof val === 'string' && /^\d+$/.test(val.trim())) {
        return parseInt(val.trim(), 10);
      }
      if (typeof val === 'number' && Number.isInteger(val) && Number.isFinite(val)) {
        return val;
      }
      return NaN;
    },
    z
      .number(`${fieldName} ต้องเป็นตัวเลขจำนวนเต็ม`)
      .int(`${fieldName} ต้องเป็นจำนวนเต็ม`)
      .positive(`${fieldName} ต้องมากกว่า 0`)
      .finite()
  );

/**
 * Helper ตรวจสอบตัวเลขไม่ติดลบ (>= 0) และไม่เป็น NaN / Infinity (เช่น ราคา, เงินดาวน์)
 */
export const nonNegativeNumberSchema = (fieldName = 'จำนวนเงิน') =>
  z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === '') return null;
      if (typeof val === 'string') {
        const num = Number(val.trim());
        return Number.isFinite(num) ? num : NaN;
      }
      if (typeof val === 'number' && Number.isFinite(val)) {
        return val;
      }
      return NaN;
    },
    z
      .number(`${fieldName} ต้องเป็นตัวเลขที่ถูกต้อง`)
      .min(0, `${fieldName} ต้องเป็นตัวเลขที่ไม่ติดลบ`)
      .finite(`${fieldName} ต้องเป็นตัวเลขที่มีค่าแน่นอน (ห้าม Infinity หรือ NaN)`)
  );

/**
 * Helper ตรวจสอบตัวเลขไม่ติดลบแบบบังคับระบุ (Required Non-negative)
 */
export const requiredNonNegativeNumberSchema = (fieldName = 'จำนวนเงิน') =>
  z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === '') return NaN;
      if (typeof val === 'string') {
        const num = Number(val.trim());
        return Number.isFinite(num) ? num : NaN;
      }
      if (typeof val === 'number' && Number.isFinite(val)) {
        return val;
      }
      return NaN;
    },
    z
      .number(`${fieldName} ต้องเป็นตัวเลขที่ถูกต้อง`)
      .min(0, `${fieldName} ต้องเป็นตัวเลขที่ไม่ติดลบ`)
      .finite(`${fieldName} ต้องเป็นตัวเลขที่มีค่าแน่นอน (ห้าม Infinity หรือ NaN)`)
  );
