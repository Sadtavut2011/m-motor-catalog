'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, CreditCard, ChevronRight, Share2, Check, QrCode } from 'lucide-react';
import AdminPreviewHeader from '@/components/AdminPreviewHeader';

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

export default function MotorcycleDetailView({ id }: { id: string }) {
  const [motorcycle, setMotorcycle] = useState<Motorcycle | null>(null);
  const [selectedColor, setSelectedColor] = useState<MotorcycleColor | null>(null);
  const [otherMotorcycles, setOtherMotorcycles] = useState<Motorcycle[]>([]);
  const [installmentPlans, setInstallmentPlans] = useState<InstallmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchMotorcycleData();
    fetchAllMotorcycles();
  }, [id]);

  const fetchMotorcycleData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/motorcycles/${id}`);
      if (!res.ok) {
        setMotorcycle(null);
        setSelectedColor(null);
        setLoading(false);
        return;
      }
      const data: Motorcycle = await res.json();
      setMotorcycle(data);
      if (data.colors && data.colors.length > 0) {
        const def = data.colors.find((c) => c.is_default === 1) || data.colors[0];
        setSelectedColor(def);
      } else {
        setSelectedColor(null);
      }

      // Fetch calculated installment plans
      const planRes = await fetch(`/api/calculate-installment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motorcycle_id: data.id }),
      });
      if (planRes.ok) {
        const planData = await planRes.json();
        setInstallmentPlans(planData);
      }
    } catch (error) {
      console.error('Failed to load motorcycle:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllMotorcycles = async () => {
    try {
      const res = await fetch('/api/motorcycles');
      if (res.ok) {
        const data: Motorcycle[] = await res.json();
        setOtherMotorcycles(data.filter((m) => m.id !== parseInt(id)));
      }
    } catch (error) {
      console.error('Failed to load other motorcycles:', error);
    }
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      if (navigator.share) {
        navigator.share({
          title: motorcycle?.name || 'เอ็ม มอเตอร์',
          text: `ดูตารางผ่อน ${motorcycle?.name} ${motorcycle?.model} - เอ็ม มอเตอร์`,
          url: window.location.href,
        }).catch(() => {});
      } else {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">กำลังโหลดข้อมูลรถ...</p>
        </div>
      </div>
    );
  }

  if (!motorcycle) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <p className="text-xl font-bold text-gray-900 mb-2">ไม่พบข้อมูลรถมอเตอร์ไซค์</p>
          <p className="text-gray-500 mb-6">รถมอเตอร์ไซค์รุ่นนี้อาจถูกลบหรือไม่มีอยู่ในระบบ</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium shadow-md"
          >
            <ArrowLeft className="h-5 w-5" />
            กลับสู่หน้ารวมรถ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex flex-col justify-between">
      <div>
        {/* Header */}
        <header className="bg-white shadow-md sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group min-w-0">
                <Image
                  src="/logo.png"
                  alt="เอ็ม มอเตอร์"
                  width={44}
                  height={44}
                  className="rounded-full w-9 h-9 sm:w-11 sm:h-11 object-cover shrink-0"
                />
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-xl font-bold text-gray-900 group-hover:text-red-600 transition-colors leading-tight truncate sm:overflow-visible">
                    บริษัท เอ็ม มอเตอร์ จำกัด
                  </h1>
                  <p className="text-xs text-gray-500 hidden sm:block">ผู้จำหน่ายรถจักรยานยนต์ Honda มือ 1</p>
                </div>
              </Link>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <AdminPreviewHeader motorcycleId={id} />
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                  title="แชร์หน้านี้"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">คัดลอกลิงก์แล้ว</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4" />
                      <span className="hidden sm:inline">แชร์</span>
                    </>
                  )}
                </button>
                <Link
                  href="/qr"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                >
                  <QrCode className="h-4 w-4" />
                  <span className="hidden sm:inline">QR แคตตาล็อก</span>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
          {/* Back button & Breadcrumb */}
          <div className="mb-4 sm:mb-6 flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white rounded-xl shadow-sm border border-gray-200 text-gray-700 hover:text-red-600 hover:border-red-300 transition-all font-medium text-xs sm:text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>กลับไปหน้ารวมรถ</span>
            </Link>
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
              <Link href="/" className="hover:underline">หน้าแรก</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-gray-800 font-medium">{motorcycle.name}</span>
            </div>
          </div>

          {/* Motorcycle Details Showcase Card */}
          <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-8 mb-6 sm:mb-8 border border-gray-100">
            <div className="grid md:grid-cols-2 gap-6 sm:gap-10 items-center">
              {/* Left: Image Container & Gallery */}
              <div className="flex flex-col">
                <div className="bg-gradient-to-b from-slate-50 to-gray-100 rounded-2xl p-4 sm:p-6 flex items-center justify-center min-h-[220px] sm:min-h-[320px] shadow-inner border border-gray-100 relative">
                  {(selectedColor?.image_url || motorcycle.image_url) ? (
                    <img
                      key={selectedColor?.image_url || motorcycle.image_url}
                      src={selectedColor?.image_url || motorcycle.image_url || ''}
                      alt={selectedColor?.color_name ? `${motorcycle.name} - ${selectedColor.color_name}` : motorcycle.name}
                      className="w-full h-56 sm:h-72 object-contain drop-shadow-md hover:scale-105 transition-all duration-300"
                    />
                  ) : (
                    <div className="w-full h-56 sm:h-72 rounded-lg flex items-center justify-center">
                      <span className="text-gray-400 font-medium">ไม่มีรูปภาพ</span>
                    </div>
                  )}

                  {selectedColor && (
                    <div className="absolute bottom-3 left-3 px-3 py-1 bg-gray-900/80 text-white rounded-lg text-xs font-medium backdrop-blur-sm flex items-center gap-1.5 shadow-sm">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-white/60 shadow-xs inline-block"
                        style={{ backgroundColor: selectedColor.color_code || '#cbd5e1' }}
                      />
                      <span>{selectedColor.color_name}</span>
                    </div>
                  )}
                </div>

                {/* Color Thumbnails Strip */}
                {motorcycle.colors && motorcycle.colors.length > 1 && (
                  <div className="mt-3">
                    <p className="text-[11px] text-gray-500 font-medium mb-1.5">
                      คลิกดูรูปรถแต่ละสี ({motorcycle.colors.length} สี):
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
                      {motorcycle.colors.map((c) => {
                        const isSelected = selectedColor?.id === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedColor(c)}
                            className={`flex-shrink-0 p-1.5 rounded-xl border-2 transition-all bg-white flex flex-col items-center gap-1 ${
                              isSelected
                                ? 'border-red-600 ring-2 ring-red-400 shadow-sm scale-105'
                                : 'border-gray-200 hover:border-gray-300 opacity-75 hover:opacity-100'
                            }`}
                            title={`ดูสี ${c.color_name}`}
                          >
                            <img
                              src={c.image_url}
                              alt={c.color_name}
                              className="w-14 h-10 object-contain rounded"
                            />
                            <div className="flex items-center gap-1">
                              <span
                                className="w-2 h-2 rounded-full border border-gray-300 shadow-xs"
                                style={{ backgroundColor: c.color_code || '#cbd5e1' }}
                              />
                              <span className="text-[10px] font-medium text-gray-700 max-w-[55px] truncate">
                                {c.color_name}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Info */}
              <div className="space-y-4">
                <div>
                  <div className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold mb-2">
                    {motorcycle.model}
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                    {motorcycle.name}
                  </h1>
                  {motorcycle.cc_size && (
                    <p className="text-sm sm:text-base text-gray-500 mt-1">
                      ขนาดกระบอกสูบ: <strong className="text-gray-800">{motorcycle.cc_size} CC</strong>
                    </p>
                  )}
                </div>

                {/* Color Swatches Selector */}
                {motorcycle.colors && motorcycle.colors.length > 0 && (
                  <div className="p-3.5 sm:p-4 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                          สีตัวถังที่มีให้เลือก
                        </span>
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[11px] font-bold">
                          {motorcycle.colors.length} สี
                        </span>
                      </div>
                      {selectedColor && (
                        <span className="text-xs text-gray-600">
                          สีที่เลือก: <strong className="text-red-600 font-bold">{selectedColor.color_name}</strong>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {motorcycle.colors.map((c) => {
                        const isSelected = selectedColor?.id === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedColor(c)}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                              isSelected
                                ? 'bg-red-600 text-white shadow-md ring-2 ring-red-400 scale-[1.02]'
                                : 'bg-white text-gray-800 border border-gray-200 hover:border-red-300 hover:bg-red-50/40'
                            }`}
                          >
                            <span
                              className={`w-3.5 h-3.5 rounded-full border shadow-xs ${
                                isSelected ? 'border-white' : 'border-gray-300'
                              }`}
                              style={{ backgroundColor: c.color_code || '#cbd5e1' }}
                            />
                            <span>{c.color_name}</span>
                            {isSelected && <Check className="h-3.5 w-3.5 ml-0.5 text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {motorcycle.cash_price && (
                  <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-100">
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">ราคาขายสด</p>
                    <p className="text-3xl sm:text-4xl font-black text-red-600 mt-0.5">
                      ฿{motorcycle.cash_price.toLocaleString()}
                    </p>
                  </div>
                )}

                {motorcycle.description && (
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      รายละเอียดและจุดเด่น
                    </p>
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-line">
                      {motorcycle.description}
                    </p>
                  </div>
                )}

                <div className="pt-2 flex flex-wrap gap-3">
                  <a
                    href="https://linktr.ee/mmotorcompany"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[140px] text-center px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all"
                  >
                    ติดต่อสอบถาม / จองรถ
                  </a>
                  <a
                    href="https://www.facebook.com/profile.php?id=61590568614695"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-sm font-semibold transition-colors"
                  >
                    Facebook เพจ
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Installment Plans — Pivot Table */}
          {installmentPlans.length > 0 && (() => {
            const seen = new Set<string>();
            const unique = installmentPlans.filter((p) => {
              const key = `${p.down_payment}|${p.months}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });

            const months = [...new Set(unique.map((p) => p.months))].sort((a, b) => a - b);
            const downPayments = [...new Set(unique.map((p) => p.down_payment))].sort((a, b) => a - b);
            const lookup = new Map(unique.map((p) => [`${p.down_payment}|${p.months}`, p.monthly_payment]));

            return (
              <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-8 mb-8 border border-gray-100">
                <div className="flex items-center gap-2.5 mb-4 sm:mb-6">
                  <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">ตารางผ่อนชำระค่างวด</h2>
                    <p className="text-xs sm:text-sm text-gray-500">เลือกจำนวนเงินดาวน์และระยะเวลาผ่อนที่ต้องการ</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500 mb-3">
                  <span className="font-medium text-gray-700">ค่างวดผ่อน (บาท/เดือน)</span>
                  <span className="sm:hidden text-gray-400 font-medium">👉 ปัดซ้าย-ขวา เพื่อดูงวดเพิ่มเติม</span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-20 bg-gray-900 text-white px-4 sm:px-6 py-3 sm:py-3.5 text-left rounded-tl-lg whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">
                          เงินดาวน์
                        </th>
                        {months.map((m) => (
                          <th
                            key={m}
                            className="bg-red-600 text-white px-4 sm:px-6 py-3 sm:py-3.5 text-center last:rounded-tr-lg min-w-[80px] sm:min-w-[110px]"
                          >
                            <div className="font-black text-base sm:text-lg">{m}</div>
                            <div className="text-[10px] sm:text-xs font-normal opacity-90">เดือน</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {downPayments.map((dp, i) => (
                        <tr key={dp} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-red-50/30'}>
                          <td
                            className={`sticky left-0 z-10 px-4 sm:px-6 py-3.5 sm:py-4 font-bold text-xs sm:text-sm text-gray-800 border-b border-gray-100 whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${
                              i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            }`}
                          >
                            {dp === 0 ? (
                              <span className="text-green-600 font-extrabold bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                                ฟรีดาวน์
                              </span>
                            ) : (
                              `฿${dp.toLocaleString()}`
                            )}
                          </td>
                          {months.map((m) => {
                            const val = lookup.get(`${dp}|${m}`);
                            return (
                              <td
                                key={m}
                                className="px-4 sm:px-6 py-3.5 sm:py-4 text-center text-red-600 font-extrabold border-b border-gray-100 text-xs sm:text-base whitespace-nowrap"
                              >
                                {val !== undefined ? `฿${val.toLocaleString()}` : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Other Motorcycles */}
          {otherMotorcycles.length > 0 && (
            <div className="mt-8 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">ดูรถมอเตอร์ไซค์รุ่นอื่นๆ</h3>
                <Link
                  href="/"
                  className="text-xs sm:text-sm text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
                >
                  ดูทั้งหมด <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {otherMotorcycles.slice(0, 4).map((other) => (
                  <Link
                    key={other.id}
                    href={`/motorcycles/${other.id}`}
                    className="p-3 sm:p-4 rounded-xl border border-gray-200 bg-white hover:border-red-400 hover:shadow-md transition-all group"
                  >
                    {other.image_url ? (
                      <img
                        src={other.image_url}
                        alt={other.name}
                        className="w-full h-24 object-contain rounded mb-2 bg-slate-50 group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-24 bg-gray-100 rounded mb-2 flex items-center justify-center">
                        <span className="text-gray-400 text-xs">ไม่มีรูปภาพ</span>
                      </div>
                    )}
                    <p className="font-semibold text-xs sm:text-sm text-gray-900 truncate group-hover:text-red-600">
                      {other.name}
                    </p>
                    <p className="text-[11px] sm:text-xs text-gray-500 truncate">{other.model}</p>
                    {other.cash_price && (
                      <p className="text-xs sm:text-sm font-bold text-red-600 mt-1">
                        ฿{other.cash_price.toLocaleString()}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h3 className="text-lg font-bold mb-1">บริษัท เอ็ม มอเตอร์ จำกัด</h3>
          <p className="text-gray-400 text-sm mb-4">ผู้จำหน่ายรถจักรยานยนต์ Honda มือ 1</p>
          <div className="flex justify-center gap-4 mb-4 text-sm">
            <a
              href="https://www.facebook.com/profile.php?id=61590568614695"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Facebook
            </a>
            <span className="text-gray-600">|</span>
            <a
              href="https://linktr.ee/mmotorcompany"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Linktree
            </a>
          </div>
          <p className="text-gray-500 text-xs">© 2026 บริษัท เอ็ม มอเตอร์ จำกัด. สงวนลิขสิทธิ์</p>
        </div>
      </footer>
    </div>
  );
}
