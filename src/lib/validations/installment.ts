import { z } from 'zod';
import { positiveIntegerSchema, requiredNonNegativeNumberSchema } from './common';

/**
 * Schema สำหรับคำนวณค่างวดผ่อนชำระ (POST /api/calculate-installment)
 */
export const calculateInstallmentSchema = z.object({
  motorcycle_id: positiveIntegerSchema('รหัสรถจักรยานยนต์ (motorcycle_id)'),
});

/**
 * Schema สำหรับสร้างแผนค่างวดผ่อนชำระใหม่ (POST /api/installment-plans)
 */
export const createInstallmentPlanSchema = z.object({
  motorcycle_id: positiveIntegerSchema('รหัสรถจักรยานยนต์ (motorcycle_id)'),
  months: positiveIntegerSchema('จำนวนงวด (months)').refine(
    (val) => val <= 120,
    'จำนวนงวดผ่อนชำระต้องไม่เกิน 120 เดือน'
  ),
  monthly_payment: requiredNonNegativeNumberSchema('ค่างวดต่อเดือน (monthly_payment)'),
  down_payment: requiredNonNegativeNumberSchema('เงินดาวน์ (down_payment)'),
  interest_rate: requiredNonNegativeNumberSchema('อัตราดอกเบี้ย (interest_rate)').refine(
    (val) => val <= 100,
    'อัตราดอกเบี้ยต้องไม่เกิน 100%'
  ),
});

/**
 * Schema สำหรับแก้ไขแผนค่างวดผ่อนชำระ (PUT /api/installment-plans/[id])
 */
export const updateInstallmentPlanSchema = z.object({
  months: positiveIntegerSchema('จำนวนงวด (months)').refine(
    (val) => val <= 120,
    'จำนวนงวดผ่อนชำระต้องไม่เกิน 120 เดือน'
  ),
  monthly_payment: requiredNonNegativeNumberSchema('ค่างวดต่อเดือน (monthly_payment)'),
  down_payment: requiredNonNegativeNumberSchema('เงินดาวน์ (down_payment)'),
  interest_rate: requiredNonNegativeNumberSchema('อัตราดอกเบี้ย (interest_rate)').refine(
    (val) => val <= 100,
    'อัตราดอกเบี้ยต้องไม่เกิน 100%'
  ),
});

/**
 * Schema สำหรับเพิ่มตัวเลือกจำนวนงวด (POST /api/installment-periods)
 */
export const createInstallmentPeriodSchema = z.object({
  months: positiveIntegerSchema('จำนวนงวด (months)').refine(
    (val) => val <= 120,
    'จำนวนงวดต้องไม่เกิน 120 เดือน'
  ),
});

/**
 * Schema สำหรับเพิ่มตัวเลือกเงินดาวน์ (POST /api/down-payment-options)
 */
export const createDownPaymentOptionSchema = z.object({
  amount: requiredNonNegativeNumberSchema('จำนวนเงินดาวน์ (amount)'),
});
