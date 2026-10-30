import { z } from 'zod';
import { nonNegativeNumberSchema, positiveIntegerSchema } from './common';

/**
 * Schema สำหรับสร้างรถจักรยานยนต์คันใหม่ (POST /api/motorcycles)
 */
export const createMotorcycleSchema = z.object({
  name: z
    .string('กรุณาระบุชื่อรถจักรยานยนต์ (name)')
    .trim()
    .min(1, 'ชื่อรถจักรยานยนต์ต้องไม่เป็นค่าว่าง')
    .max(100, 'ชื่อรถจักรยานยนต์ต้องมีความยาวไม่เกิน 100 ตัวอักษร'),
  model: z
    .string('กรุณาระบุรหัสรุ่นรถ (model)')
    .trim()
    .min(1, 'รหัสรุ่นรถต้องไม่เป็นค่าว่าง')
    .max(100, 'รหัสรุ่นรถต้องมีความยาวไม่เกิน 100 ตัวอักษร'),
  price: nonNegativeNumberSchema('ราคา').nullable().optional(),
  cash_price: nonNegativeNumberSchema('ราคาเงินสด').nullable().optional(),
  finance_amount: nonNegativeNumberSchema('ยอดจัดไฟแนนซ์').nullable().optional(),
  cc_size: positiveIntegerSchema('ขนาดเครื่องยนต์ (CC)').nullable().optional(),
  description: z
    .string('คำอธิบายต้องเป็นข้อความ')
    .trim()
    .max(2000, 'คำอธิบายต้องมีความยาวไม่เกิน 2,000 ตัวอักษร')
    .nullable()
    .optional(),
  image_url: z
    .string('URL รูปภาพต้องเป็นข้อความ')
    .trim()
    .max(500, 'URL รูปภาพต้องมีความยาวไม่เกิน 500 ตัวอักษร')
    .nullable()
    .optional(),
});

/**
 * Schema สำหรับแก้ไขข้อมูลรถจักรยานยนต์ (PUT /api/motorcycles/[id])
 */
export const updateMotorcycleSchema = z.object({
  name: z
    .string('กรุณาระบุชื่อรถจักรยานยนต์ (name)')
    .trim()
    .min(1, 'ชื่อรถจักรยานยนต์ต้องไม่เป็นค่าว่าง')
    .max(100, 'ชื่อรถจักรยานยนต์ต้องมีความยาวไม่เกิน 100 ตัวอักษร'),
  model: z
    .string('กรุณาระบุรหัสรุ่นรถ (model)')
    .trim()
    .min(1, 'รหัสรุ่นรถต้องไม่เป็นค่าว่าง')
    .max(100, 'รหัสรุ่นรถต้องมีความยาวไม่เกิน 100 ตัวอักษร'),
  cash_price: nonNegativeNumberSchema('ราคาเงินสด').nullable().optional(),
  finance_amount: nonNegativeNumberSchema('ยอดจัดไฟแนนซ์').nullable().optional(),
  cc_size: positiveIntegerSchema('ขนาดเครื่องยนต์ (CC)').nullable().optional(),
  description: z
    .string('คำอธิบายต้องเป็นข้อความ')
    .trim()
    .max(2000, 'คำอธิบายต้องมีความยาวไม่เกิน 2,000 ตัวอักษร')
    .nullable()
    .optional(),
  image_url: z
    .string('URL รูปภาพต้องเป็นข้อความ')
    .trim()
    .max(500, 'URL รูปภาพต้องมีความยาวไม่เกิน 500 ตัวอักษร')
    .nullable()
    .optional(),
});

/**
 * Schema สำหรับเพิ่มสีรถใหม่ (POST /api/motorcycles/[id]/colors)
 */
export const createMotorcycleColorSchema = z.object({
  color_name: z
    .string('กรุณาระบุชื่อสี (color_name)')
    .trim()
    .min(1, 'ชื่อสีต้องไม่เป็นค่าว่าง')
    .max(50, 'ชื่อสีต้องมีความยาวไม่เกิน 50 ตัวอักษร'),
  color_code: z
    .string('รหัสสีต้องเป็นข้อความ')
    .trim()
    .max(30, 'รหัสสีต้องมีความยาวไม่เกิน 30 ตัวอักษร')
    .nullable()
    .optional(),
  image_url: z
    .string('กรุณาระบุ URL รูปภาพของสีนี้ (image_url)')
    .trim()
    .min(1, 'URL รูปภาพต้องไม่เป็นค่าว่าง')
    .max(500, 'URL รูปภาพต้องมีความยาวไม่เกิน 500 ตัวอักษร'),
  is_default: z
    .union([z.boolean(), z.number().int().min(0).max(1)])
    .nullable()
    .optional(),
});

/**
 * Schema สำหรับแก้ไขข้อมูลสีรถ (PUT /api/motorcycles/[id]/colors/[colorId])
 */
export const updateMotorcycleColorSchema = z.object({
  color_name: z
    .string('ชื่อสีต้องเป็นข้อความ')
    .trim()
    .min(1, 'ชื่อสีต้องไม่เป็นค่าว่าง')
    .max(50, 'ชื่อสีต้องมีความยาวไม่เกิน 50 ตัวอักษร')
    .optional(),
  color_code: z
    .string('รหัสสีต้องเป็นข้อความ')
    .trim()
    .max(30, 'รหัสสีต้องมีความยาวไม่เกิน 30 ตัวอักษร')
    .nullable()
    .optional(),
  image_url: z
    .string('URL รูปภาพต้องเป็นข้อความ')
    .trim()
    .min(1, 'URL รูปภาพต้องไม่เป็นค่าว่าง')
    .max(500, 'URL รูปภาพต้องมีความยาวไม่เกิน 500 ตัวอักษร')
    .optional(),
  is_default: z
    .union([z.boolean(), z.number().int().min(0).max(1)])
    .nullable()
    .optional(),
});
