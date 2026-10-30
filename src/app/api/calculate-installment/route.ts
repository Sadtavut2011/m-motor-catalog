import { NextRequest, NextResponse } from 'next/server';
import { calculateInstallmentSchema, formatZodError } from '@/lib/validations';
import { getCalculationData } from '@/lib/supabase/repository';

// Calculate installment payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'ข้อมูล Request Body ไม่ถูกต้อง หรือไม่ได้ส่งมา' }, { status: 400 });
    }

    const validation = calculateInstallmentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { motorcycle_id } = validation.data;

    // Get calculation data from Supabase
    const { motorcycle, downPaymentOptions, installmentPeriods, error, notFound } = await getCalculationData(motorcycle_id);
    
    if (error) {
      console.error('Error fetching calculation data from Supabase:', error);
      return NextResponse.json({ error: 'Failed to calculate installment' }, { status: 500 });
    }

    if (notFound || !motorcycle) {
      return NextResponse.json({ error: 'ไม่พบรถจักรยานยนต์ที่ระบุ (motorcycle_id ไม่ถูกต้อง)' }, { status: 404 });
    }

    // Validate finance_amount — ต้องกรอกยอดจัดก่อนคำนวณ
    if (!motorcycle.finance_amount) {
      return NextResponse.json(
        { error: 'กรุณาตั้งค่ายอดจัด (finance_amount) ในหลังบ้านก่อนคำนวณ' },
        { status: 400 }
      );
    }

    // Calculate for each combination
    const calculations = [];

    for (const downPayment of downPaymentOptions) {
      for (const period of installmentPeriods) {
        const monthlyPayment = calculateMonthlyPayment(
          motorcycle.finance_amount,
          downPayment.amount,
          period.months,
          motorcycle.cc_size
        );

        calculations.push({
          down_payment: downPayment.amount,
          months: period.months,
          monthly_payment: monthlyPayment,
          interest_rate: getInterestRate(period.months, motorcycle.cc_size)
        });
      }
    }

    return NextResponse.json(calculations);
  } catch (error) {
    console.error('Error calculating installment:', error);
    return NextResponse.json({ error: 'Failed to calculate installment' }, { status: 500 });
  }
}

function calculateMonthlyPayment(
  financeAmount: number,
  downPayment: number,
  months: number,
  ccSize: number | null
): number {
  const principal = financeAmount - downPayment;

  if (ccSize && ccSize >= 300) {
    // 300-350CC: 4.5% ต่อปี flat rate (ไฮเวย์)
    // สูตร: [(ยอดจัด-ดาวน์) x 4.5% x จำนวนปี + (ยอดจัด-ดาวน์)] / จำนวนงวด
    const years = months / 12;
    const totalInterest = principal * 0.045 * years;
    const monthlyPayment = (totalInterest + principal) / months;
    return Math.round(monthlyPayment);
  } else {
    // 110-160CC (SM 110-125cc / MB 150-160cc) — ไฮเวย์ Finance
    // สูตร: (ยอดจัด-ดาวน์) x ดอกเบี้ยต่องวด + (ยอดจัด-ดาวน์) / จำนวนงวด
    const interestRate = getInterestRate(months, ccSize);
    const monthlyPayment = (principal * interestRate) + (principal / months);
    return Math.round(monthlyPayment);
  }
}

function getInterestRate(months: number, ccSize: number | null): number {
  if (ccSize && ccSize >= 300) {
    return 0.045; // 4.5% ต่อปี สำหรับ 300-350CC (ไฮเวย์)
  }

  // ไฮเวย์ Finance — SM 110-125cc, MB 150-160cc
  // อัตราดอกเบี้ยต่องวด (% ต่อเดือน) — สูงสุด 42 งวด
  if (months <= 18) {
    return 0.0105; // 1.05% (12, 18 เดือน)
  } else if (months <= 30) {
    return 0.0107; // 1.07% (24, 30 เดือน)
  } else if (months <= 42) {
    return 0.0109; // 1.09% (36, 42 เดือน)
  }

  return 0.0109; // default fallback (ไม่เกิน 42 งวด)
}
