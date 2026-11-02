'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Printer,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  CreditCard,
} from 'lucide-react';
import QRCode from 'react-qr-code';
import './single-print.css';

/* ============================================================
   Interfaces
   ============================================================ */
interface MotorcycleColor {
  id: number;
  motorcycle_id: number;
  color_name: string;
  color_code?: string | null;
  image_url: string;
  is_default?: number;
}

interface Motorcycle {
  id: number;
  name: string;
  model: string;
  cash_price: number | null;
  finance_amount: number | null;
  cc_size: number | null;
  description: string | null;
  image_url: string | null;
  colors?: MotorcycleColor[];
}

interface InstallmentPlan {
  down_payment: number;
  months: number;
  monthly_payment: number;
  interest_rate: number;
}

/* ============================================================
   Helper: CSS class for color grid
   ============================================================ */
function getColorsGridClass(count: number): string {
  if (count <= 1) return 'sp-colors-1';
  if (count === 2) return 'sp-colors-2';
  if (count === 3) return 'sp-colors-3';
  if (count === 4) return 'sp-colors-4';
  return 'sp-colors-5-plus';
}

/* ============================================================
   Client Component: SingleMotorcyclePrintView
   ============================================================ */
export default function SingleMotorcyclePrintView({ id }: { id: string }) {
  const [motorcycle, setMotorcycle] = useState<Motorcycle | null>(null);
  const [installmentPlans, setInstallmentPlans] = useState<InstallmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [imagesReady, setImagesReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printTime, setPrintTime] = useState('');
  const [loadedCount, setLoadedCount] = useState(0);
  const [totalImages, setTotalImages] = useState(0);

  const pageUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/motorcycles/${id}`
      : `https://m-motor-catalog.vercel.app/motorcycles/${id}`;

  /* ----------------------------------------------------------
     Image Preloader for this single motorcycle
     ---------------------------------------------------------- */
  const preloadImages = useCallback(async (moto: Motorcycle) => {
    const urls: string[] = [];
    if (moto.image_url) urls.push(moto.image_url);
    moto.colors?.forEach((c) => {
      if (c.image_url) urls.push(c.image_url);
    });

    const uniqueUrls = [...new Set(urls)];
    setTotalImages(uniqueUrls.length);

    if (uniqueUrls.length === 0) {
      setImagesReady(true);
      return;
    }

    let loaded = 0;
    const loadImage = (url: string): Promise<void> =>
      new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () => {
          loaded++;
          setLoadedCount(loaded);
          resolve();
        };
        img.onerror = () => {
          loaded++;
          setLoadedCount(loaded);
          resolve();
        };
        img.src = url;
      });

    const promises = Promise.all(uniqueUrls.map(loadImage));
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 8000));
    await Promise.race([promises, timeout]);

    setImagesReady(true);
  }, []);

  /* ----------------------------------------------------------
     Fetch single motorcycle data and installment plans
     ---------------------------------------------------------- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setImagesReady(false);
    setError(null);
    setLoadedCount(0);
    setTotalImages(0);

    try {
      // 1. Fetch motorcycle details
      const res = await fetch(`/api/motorcycles/${id}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('ไม่พบข้อมูลรถจักรยานยนต์รุ่นนี้ในระบบ');
        }
        throw new Error(`โหลดข้อมูลไม่สำเร็จ (HTTP ${res.status})`);
      }

      const motoData: Motorcycle = await res.json();

      // 2. Fetch installment plans
      try {
        const planRes = await fetch(`/api/calculate-installment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ motorcycle_id: motoData.id }),
        });
        if (planRes.ok) {
          const plans = await planRes.json();
          if (Array.isArray(plans)) {
            setInstallmentPlans(plans);
          }
        }
      } catch (planErr) {
        console.warn('Installment plan not available:', planErr);
      }

      // 3. Format Date/Time
      const now = new Date();
      setPrintTime(
        now.toLocaleString('th-TH', {
          timeZone: 'Asia/Bangkok',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      );

      setMotorcycle(motoData);
      setLoading(false);

      // 4. Preload images
      await preloadImages(motoData);
    } catch (err: unknown) {
      console.error('[PrintSingleMotorcycle] Fetch error:', err);
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
      setError(msg);
      setLoading(false);
    }
  }, [id, preloadImages]);

  /* ----------------------------------------------------------
     Mount Effect: Fonts & Initial Fetch
     ---------------------------------------------------------- */
  useEffect(() => {
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href =
      'https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700;800;900&display=swap';
    document.head.appendChild(fontLink);

    fetchData();

    return () => {
      if (document.head.contains(fontLink)) {
        document.head.removeChild(fontLink);
      }
    };
  }, [id, fetchData]);

  /* ----------------------------------------------------------
     Print Action
     ---------------------------------------------------------- */
  const handlePrint = () => {
    if (!imagesReady) {
      alert(`กำลังเตรียมรูปภาพ (${loadedCount}/${totalImages} ภาพ)\nกรุณารอสักครู่`);
      return;
    }
    window.print();
  };

  /* ----------------------------------------------------------
     Loading State
     ---------------------------------------------------------- */
  if (loading) {
    return (
      <div className="no-print min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-sm w-full">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-red-600 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-900 font-bold text-lg mb-1">กำลังโหลดข้อมูลรถ</p>
          <p className="text-gray-500 text-sm">ดึงข้อมูลล่าสุดจากระบบ...</p>
        </div>
      </div>
    );
  }

  /* ----------------------------------------------------------
     Error State
     ---------------------------------------------------------- */
  if (error || !motorcycle) {
    return (
      <div className="no-print min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-md w-full">
          <AlertCircle className="h-14 w-14 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-bold text-lg mb-2">ไม่สามารถเปิดหน้าพิมพ์ได้</p>
          <p className="text-gray-500 text-sm mb-6">{error || 'ไม่พบข้อมูลรถ'}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={fetchData}
              className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors shadow-sm"
            >
              ลองใหม่อีกครั้ง
            </button>
            <Link
              href={motorcycle ? `/motorcycles/${id}` : '/'}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              {motorcycle ? 'กลับไปหน้ารถ' : 'กลับสู่หน้าหลัก'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ----------------------------------------------------------
     Compute Pivot Table Data for Installment Plans
     ---------------------------------------------------------- */
  const uniquePlans = (() => {
    const seen = new Set<string>();
    return installmentPlans.filter((p) => {
      const key = `${p.down_payment}|${p.months}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  const months = [...new Set(uniquePlans.map((p) => p.months))].sort((a, b) => a - b);
  const downPayments = [...new Set(uniquePlans.map((p) => p.down_payment))].sort(
    (a, b) => a - b
  );
  const lookup = new Map(
    uniquePlans.map((p) => [`${p.down_payment}|${p.months}`, p.monthly_payment])
  );

  const colorsList = motorcycle.colors && motorcycle.colors.length > 0 ? motorcycle.colors : [];

  return (
    <>
      {/* ================================================================
          Control Bar (Screen Only — Hidden on Print)
          ================================================================ */}
      <div className="no-print sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          {/* Left Buttons */}
          <div className="flex items-center gap-2">
            <Link
              href={`/motorcycles/${id}`}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>กลับไปหน้ารถ</span>
            </Link>
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              title="รีเฟรชข้อมูลจากระบบ"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">รีเฟรช</span>
            </button>
          </div>

          {/* Right Status & Print Button */}
          <div className="flex items-center gap-3">
            {!imagesReady ? (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                <div className="animate-spin h-3.5 w-3.5 border-2 border-red-500 border-t-transparent rounded-full" />
                <span>
                  โหลดรูป {loadedCount}/{totalImages}
                </span>
              </div>
            ) : (
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                รูปพร้อมพิมพ์
              </span>
            )}

            <button
              id="btn-print-single"
              onClick={handlePrint}
              disabled={!imagesReady}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                imagesReady
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md cursor-pointer'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Printer className="h-4 w-4" />
              <span>พิมพ์ / บันทึก PDF (A4)</span>
            </button>
          </div>
        </div>

        {/* Progress bar while preloading */}
        {!imagesReady && totalImages > 0 && (
          <div className="h-0.5 bg-gray-100">
            <div
              className="h-full bg-red-500 transition-all duration-300"
              style={{ width: `${Math.min((loadedCount / totalImages) * 100, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* ================================================================
          Printable Document (A4)
          ================================================================ */}
      <div className="single-print-bg">
        <div className="single-print-document">
          {/* Header */}
          <header className="sp-header">
            <div className="sp-header-inner">
              <div className="sp-brand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="เอ็ม มอเตอร์" className="sp-logo" />
                <div>
                  <h1 className="sp-company-name">บริษัท เอ็ม มอเตอร์ จำกัด</h1>
                  <p className="sp-company-sub">ผู้จำหน่ายรถจักรยานยนต์ Honda มือ 1</p>
                </div>
              </div>
              <div className="sp-header-right">
                <p className="sp-doc-title">ใบเสนอราคา & ตารางผ่อนชำระ</p>
                <p className="sp-doc-date">ข้อมูล ณ วันที่ {printTime}</p>
              </div>
            </div>
            <div className="sp-divider" />
          </header>

          {/* Motorcycle Overview Card */}
          <section className="sp-overview-card">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="sp-model-badge" style={{ marginBottom: 0 }}>{motorcycle.model}</span>
                {motorcycle.cc_size && (
                  <span className="sp-moto-specs" style={{ marginTop: 0 }}>
                    ขนาดเครื่องยนต์: <strong>{motorcycle.cc_size} CC</strong>
                  </span>
                )}
              </div>
              <h2 className="sp-moto-title">{motorcycle.name}</h2>
              {motorcycle.description && (
                <p className="sp-moto-desc">{motorcycle.description}</p>
              )}
            </div>
          </section>

          {/* All Colors Showcase */}
          {colorsList.length > 0 ? (
            <section className="sp-colors-container">
              <h3 className="sp-section-heading">
                <span>สีตัวถังที่มีให้เลือก</span>
                <span className="sp-badge-count">{colorsList.length} สี</span>
              </h3>

              <div className={`sp-colors-grid ${getColorsGridClass(colorsList.length)}`}>
                {colorsList.map((color) => (
                  <div key={color.id} className="sp-color-card">
                    <div className="sp-color-img-wrapper">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={color.image_url}
                        alt={`${motorcycle.name} - ${color.color_name}`}
                        className="sp-color-img"
                        loading="eager"
                      />
                    </div>
                    <div className="sp-color-info">
                      <span
                        className="sp-color-dot"
                        style={{ backgroundColor: color.color_code || '#94a3b8' }}
                      />
                      <span className="sp-color-name">{color.color_name}</span>
                      {color.is_default === 1 && (
                        <span className="sp-default-tag">สีแนะนำ</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : motorcycle.image_url ? (
            <section className="sp-colors-container">
              <div className="sp-color-card" style={{ maxWidth: '280px', margin: '0 auto' }}>
                <div className="sp-color-img-wrapper" style={{ aspectRatio: '16/11' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={motorcycle.image_url}
                    alt={motorcycle.name}
                    className="sp-color-img"
                    loading="eager"
                  />
                </div>
                <p className="sp-color-name" style={{ marginTop: '4px' }}>
                  {motorcycle.name}
                </p>
              </div>
            </section>
          ) : null}

          {/* Installment Plans Table */}
          {uniquePlans.length > 0 && (
            <section className="sp-installment-container">
              <h3 className="sp-section-heading">
                <CreditCard className="w-3.5 h-3.5 text-red-600 inline mr-1" />
                <span>ตารางผ่อนชำระค่างวด (บาท/เดือน)</span>
              </h3>

              <div className="sp-table-wrapper">
                <table className="sp-table">
                  <thead>
                    <tr>
                      <th className="sp-table-th-corner">เงินดาวน์</th>
                      {months.map((m) => (
                        <th key={m} className="sp-table-th-month">
                          <div>{m} งวด</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {downPayments.map((dp) => (
                      <tr key={dp}>
                        <td className="sp-table-td-dp">
                          {dp === 0 ? (
                            <span className="sp-free-down-badge">ฟรีดาวน์</span>
                          ) : (
                            `฿${dp.toLocaleString('th-TH')}`
                          )}
                        </td>
                        {months.map((m) => {
                          const val = lookup.get(`${dp}|${m}`);
                          return (
                            <td key={m} className="sp-table-td-payment">
                              {val !== undefined ? `฿${val.toLocaleString('th-TH')}` : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Bottom Store Info & QR Code */}
          <section className="sp-bottom-box">
            <div className="sp-contact-info">
              <p className="sp-contact-title">บริษัท เอ็ม มอเตอร์ จำกัด</p>
              <p>ผู้จำหน่ายรถจักรยานยนต์ Honda มือ 1 พร้อมศูนย์บริการมาตรฐาน</p>
              <p>
                Facebook: <strong>M Motor Company</strong> &nbsp;|&nbsp; Linktree: <strong>linktr.ee/mmotorcompany</strong>
              </p>
              <p className="sp-disclaimer">
                * ตารางผ่อนชำระเป็นการคำนวณเบื้องต้น เงื่อนไข ดอกเบี้ย และค่างวดจริงเป็นไปตามที่สถาบันการเงินและบริษัทกำหนด
              </p>
            </div>

            {pageUrl && (
              <div className="sp-qr-box">
                <QRCode value={pageUrl} size={64} level="M" />
                <span className="sp-qr-label">สแกนดูออนไลน์</span>
              </div>
            )}
          </section>

          {/* Document Footer */}
          <footer className="sp-footer">
            <p>© {new Date().getFullYear()} บริษัท เอ็ม มอเตอร์ จำกัด. เอกสารนี้สร้างจากระบบแคตตาล็อกออนไลน์ m-motor-catalog.vercel.app</p>
          </footer>
        </div>
      </div>
    </>
  );
}
