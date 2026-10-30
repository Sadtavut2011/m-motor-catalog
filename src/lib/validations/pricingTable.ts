import { z } from 'zod';
import { positiveIntegerSchema } from './common';

/**
 * Schema สำหรับตรวจสอบ table_data
 * รองรับทั้ง JSON Object/Array และ JSON String หรือข้อความที่มีโครงสร้างถูกต้อง
 * ป้องกัน Malformed JSON และค่าว่าง
 */
export const tableDataSchema = z.union([
  z
    .string('กรุณาระบุข้อมูลตารางราคา (table_data)')
    .trim()
    .min(1, 'ข้อมูลตารางราคา (table_data) ต้องไม่เป็นค่าว่าง')
    .refine((val) => {
      const trimmed = val.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          JSON.parse(trimmed);
          return true;
        } catch {
          return false;
        }
      }
      return true;
    }, 'โครงสร้างข้อมูลตารางราคา (table_data) ในรูปแบบ JSON ไม่ถูกต้อง'),
  z.record(z.string(), z.unknown()),
  z.array(z.unknown()).min(1, 'ตารางราคาต้องมีข้อมูลอย่างน้อย 1 แถว'),
]);

/**
 * Schema สำหรับสร้างตารางราคาใหม่ (POST /api/pricing-tables)
 */
export const createPricingTableSchema = z.object({
  motorcycle_id: positiveIntegerSchema('รหัสรถจักรยานยนต์ (motorcycle_id)'),
  table_data: tableDataSchema,
  image_url: z
    .string('URL รูปภาพต้องเป็นข้อความ')
    .trim()
    .max(500, 'URL รูปภาพต้องมีความยาวไม่เกิน 500 ตัวอักษร')
    .nullable()
    .optional(),
});

/**
 * Schema สำหรับแก้ไขตารางราคา (PUT /api/pricing-tables/[id])
 */
export const updatePricingTableSchema = z.object({
  table_data: tableDataSchema,
  image_url: z
    .string('URL รูปภาพต้องเป็นข้อความ')
    .trim()
    .max(500, 'URL รูปภาพต้องมีความยาวไม่เกิน 500 ตัวอักษร')
    .nullable()
    .optional(),
});
