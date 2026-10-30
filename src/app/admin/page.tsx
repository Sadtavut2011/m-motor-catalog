'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Upload,
  Link as LinkIcon,
  Loader2,
  ExternalLink,
  Search,
  Check,
  CreditCard,
  QrCode,
  Calendar,
  DollarSign,
  Layers,
  Sparkles,
  ArrowRight,
  Info,
  LogOut,
  ChevronDown,
  User,
  ShieldCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ColorManagementSection, { MotorcycleColor } from './ColorManagementSection';

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

interface DownPaymentOption {
  id: number;
  amount: number;
}

interface InstallmentPeriod {
  id: number;
  months: number;
}

function ImageUploadSection({
  imageUrl,
  onChange,
}: {
  imageUrl?: string | null;
  onChange: (url: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [useUrlMode, setUseUrlMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WEBP ฯลฯ)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('ไฟล์มีขนาดเกิน 10MB กรุณาเลือกรูปภาพขนาดเล็กลง');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (response.ok && data.url) {
        onChange(data.url);
      } else {
        alert(data.error || 'อัปโหลดรูปภาพไม่สำเร็จ');
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="md:col-span-2">
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-semibold text-gray-700">
          รูปภาพหน้าปกหลักของรถรุ่นนี้
        </label>
        <button
          type="button"
          onClick={() => setUseUrlMode(!useUrlMode)}
          className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-medium transition-colors"
        >
          {useUrlMode ? (
            <>
              <Upload className="h-3.5 w-3.5" />
              สลับไปโหลดรูปจากเครื่อง
            </>
          ) : (
            <>
              <LinkIcon className="h-3.5 w-3.5" />
              สลับไปใส่เป็น URL
            </>
          )}
        </button>
      </div>

      {useUrlMode ? (
        <input
          type="text"
          value={imageUrl || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
        />
      ) : (
        <div>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
                e.target.value = '';
              }
            }}
          />

          {imageUrl ? (
            <div className="border border-gray-200 rounded-2xl p-4 bg-slate-50 flex flex-col sm:flex-row items-center gap-4">
              <img
                src={imageUrl}
                alt="Preview"
                className="w-36 h-24 object-contain rounded-xl border border-gray-200 shadow-sm bg-white"
              />
              <div className="flex-1 text-center sm:text-left space-y-2">
                <p className="text-xs text-gray-500 truncate max-w-xs sm:max-w-md font-mono bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                  {imageUrl}
                </p>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-3 py-1.5 text-xs bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 flex items-center gap-1.5 font-medium transition-colors disabled:opacity-50 shadow-xs"
                  >
                    {uploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-red-600" />
                    ) : (
                      <Upload className="h-3.5 w-3.5 text-gray-600" />
                    )}
                    เปลี่ยนรูปภาพจากเครื่อง
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(null)}
                    disabled={uploading}
                    className="px-3 py-1.5 text-xs bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-1.5 font-medium transition-colors disabled:opacity-50 shadow-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    ลบรูปภาพ
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all bg-white ${
                uploading
                  ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                  : 'border-gray-300 hover:border-red-500 hover:bg-red-50/40'
              }`}
            >
              {uploading ? (
                <div className="flex flex-col items-center justify-center py-2">
                  <Loader2 className="h-8 w-8 text-red-600 animate-spin mb-2" />
                  <p className="text-sm font-medium text-gray-700">กำลังอัปโหลดรูปภาพ...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-2">
                  <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-2">
                    <Upload className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    คลิกเพื่อเลือกรูปภาพจากเครื่อง หรือลากรูปมาวางที่นี่
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    รองรับไฟล์ JPG, PNG, WEBP (ขนาดไฟล์ไม่เกิน 10MB)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [selectedMotorcycle, setSelectedMotorcycle] = useState<Motorcycle | null>(null);
  const [installmentPlans, setInstallmentPlans] = useState<InstallmentPlan[]>([]);
  const [downPaymentOptions, setDownPaymentOptions] = useState<DownPaymentOption[]>([]);
  const [installmentPeriods, setInstallmentPeriods] = useState<InstallmentPeriod[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Motorcycle>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingMotorcycle, setSavingMotorcycle] = useState(false);

  // Modal States
  const [showDownPaymentModal, setShowDownPaymentModal] = useState(false);
  const [downPaymentInput, setDownPaymentInput] = useState('');
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [periodInput, setPeriodInput] = useState('');

  // Admin Profile & Dropdown States
  const [adminUser, setAdminUser] = useState<any | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  const detailsRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const motorcyclesSectionRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    if (!confirm('คุณต้องการออกจากระบบผู้ดูแลหรือไม่?')) return;
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      router.push('/admin/login');
      router.refresh();
    }
  };

  useEffect(() => {
    fetchInitialData();
    fetchAdminUser();
  }, []);

  const fetchAdminUser = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (!error && user) {
        // ตรวจสอบ role admin จาก app_metadata เท่านั้น
        if (user.app_metadata?.role === 'admin') {
          setAdminUser(user);
        }
      }
    } catch (err) {
      console.error('Failed to get admin user session:', err);
    }
  };

  // ปิด Dropdown เมื่อคลิกภายนอก หรือกด Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
      }
    };

    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileOpen]);

  const handleScrollToMotorcycles = () => {
    setIsProfileOpen(false);
    const target =
      typeof window !== 'undefined' && window.innerWidth < 1024
        ? motorcyclesSectionRef.current || detailsRef.current
        : document.getElementById('motorcycles-sidebar') || detailsRef.current;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const adminDisplayName =
    adminUser?.user_metadata?.full_name ||
    adminUser?.user_metadata?.name ||
    (adminUser?.email ? adminUser.email.split('@')[0] : 'ผู้ดูแลระบบ');

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchMotorcycles(),
        fetchDownPaymentOptions(),
        fetchInstallmentPeriods(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMotorcycles = async () => {
    try {
      const response = await fetch('/api/motorcycles');
      const data: Motorcycle[] = await response.json();
      setMotorcycles(data);
      // If no motorcycle selected yet and we have data, select the one from URL param ?id=... or the first one
      setSelectedMotorcycle((prev) => {
        if (!prev && data.length > 0) {
          let initial = data[0];
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const idParam = params.get('id');
            if (idParam) {
              const matched = data.find((m) => m.id === Number(idParam));
              if (matched) {
                initial = matched;
                setTimeout(() => {
                  detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 150);
              }
            }
          }
          fetchInstallmentPlans(initial.id);
          return initial;
        }
        // Update selected motorcycle data if already selected
        if (prev) {
          const match = data.find((m) => m.id === prev.id);
          return match || prev;
        }
        return prev;
      });
    } catch (error) {
      console.error('Failed to fetch motorcycles:', error);
    }
  };

  const fetchInstallmentPlans = async (motorcycleId: number) => {
    try {
      const response = await fetch(`/api/calculate-installment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motorcycle_id: motorcycleId }),
      });
      if (response.ok) {
        const data = await response.json();
        setInstallmentPlans(data);
      } else {
        setInstallmentPlans([]);
      }
    } catch (error) {
      console.error('Failed to calculate installment plans:', error);
      setInstallmentPlans([]);
    }
  };

  const fetchDownPaymentOptions = async () => {
    try {
      const response = await fetch('/api/down-payment-options');
      const data = await response.json();
      setDownPaymentOptions(data);
    } catch (error) {
      console.error('Failed to fetch down payment options:', error);
    }
  };

  const fetchInstallmentPeriods = async () => {
    try {
      const response = await fetch('/api/installment-periods');
      const data = await response.json();
      setInstallmentPeriods(data);
    } catch (error) {
      console.error('Failed to fetch installment periods:', error);
    }
  };

  const handleMotorcycleSelect = (motorcycle: Motorcycle) => {
    setSelectedMotorcycle(motorcycle);
    fetchInstallmentPlans(motorcycle.id);
    setIsEditing(false);
    setIsAdding(false);
    setEditForm({});

    // Smooth scroll to details on mobile screens
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleColorsUpdated = async () => {
    await fetchMotorcycles();
    if (selectedMotorcycle) {
      try {
        const res = await fetch(`/api/motorcycles/${selectedMotorcycle.id}`);
        if (res.ok) {
          const updated = await res.json();
          setSelectedMotorcycle(updated);
        }
      } catch (e) {
        console.error('Failed to refresh selected motorcycle:', e);
      }
    }
  };

  const handleAddDownPaymentSubmit = async (amount: number) => {
    if (isNaN(amount) || amount < 0) {
      alert('กรุณากรอกจำนวนเงินที่ถูกต้อง (0 ขึ้นไป)');
      return;
    }
    try {
      const response = await fetch('/api/down-payment-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      if (response.ok) {
        await fetchDownPaymentOptions();
        if (selectedMotorcycle) {
          fetchInstallmentPlans(selectedMotorcycle.id);
        }
        setShowDownPaymentModal(false);
        setDownPaymentInput('');
      } else {
        alert('เพิ่มตัวเลือกเงินดาวน์ไม่สำเร็จ');
      }
    } catch (error) {
      console.error('Failed to add down payment option:', error);
      alert('เกิดข้อผิดพลาดในการเพิ่มตัวเลือกเงินดาวน์');
    }
  };

  const handleDeleteDownPayment = async (id: number, amount: number) => {
    const label = amount === 0 ? 'ฟรีดาวน์' : `฿${amount.toLocaleString()}`;
    if (!confirm(`ต้องการลบตัวเลือกเงินดาวน์ "${label}"?`)) return;

    try {
      const response = await fetch(`/api/down-payment-options/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await fetchDownPaymentOptions();
        if (selectedMotorcycle) {
          fetchInstallmentPlans(selectedMotorcycle.id);
        }
      }
    } catch (error) {
      console.error('Failed to delete down payment option:', error);
    }
  };

  const handleAddPeriodSubmit = async (months: number) => {
    if (isNaN(months) || months <= 0) {
      alert('กรุณากรอกจำนวนเดือนที่ถูกต้อง');
      return;
    }
    try {
      const response = await fetch('/api/installment-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ months }),
      });
      if (response.ok) {
        await fetchInstallmentPeriods();
        if (selectedMotorcycle) {
          fetchInstallmentPlans(selectedMotorcycle.id);
        }
        setShowPeriodModal(false);
        setPeriodInput('');
      } else {
        alert('เพิ่มจำนวนงวดไม่สำเร็จ');
      }
    } catch (error) {
      console.error('Failed to add installment period:', error);
      alert('เกิดข้อผิดพลาดในการเพิ่มจำนวนงวด');
    }
  };

  const handleDeleteInstallmentPeriod = async (id: number, months: number) => {
    if (!confirm(`ต้องการลบจำนวนงวด "${months} เดือน"?`)) return;

    try {
      const response = await fetch(`/api/installment-periods/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await fetchInstallmentPeriods();
        if (selectedMotorcycle) {
          fetchInstallmentPlans(selectedMotorcycle.id);
        }
      }
    } catch (error) {
      console.error('Failed to delete installment period:', error);
    }
  };

  const handleAddMotorcycle = async () => {
    if (!editForm.name?.trim() || !editForm.model?.trim() || !editForm.finance_amount) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน: ชื่อรถ, รุ่น, และยอดจัด');
      return;
    }

    setSavingMotorcycle(true);
    try {
      const response = await fetch('/api/motorcycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        const created: Motorcycle = await response.json();
        await fetchMotorcycles();
        setIsAdding(false);
        setEditForm({});
        setSelectedMotorcycle(created);
        fetchInstallmentPlans(created.id);
        alert('เพิ่มรถมอเตอร์ไซค์สำเร็จ! คุณสามารถเพิ่มสีและรูปภาพตัวอย่างของแต่ละสีได้ที่ด้านล่าง');
      } else {
        const err = await response.json();
        alert(err.error || 'บันทึกข้อมูลรถไม่สำเร็จ');
      }
    } catch (error) {
      console.error('Failed to add motorcycle:', error);
      alert('เกิดข้อผิดพลาดในการเพิ่มรถมอเตอร์ไซค์');
    } finally {
      setSavingMotorcycle(false);
    }
  };

  const handleUpdateMotorcycle = async () => {
    if (!selectedMotorcycle) return;

    setSavingMotorcycle(true);
    try {
      const response = await fetch(`/api/motorcycles/${selectedMotorcycle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        await fetchMotorcycles();
        const updated = { ...selectedMotorcycle, ...editForm };
        setSelectedMotorcycle(updated);
        fetchInstallmentPlans(selectedMotorcycle.id);
        setIsEditing(false);
        setEditForm({});
        alert('อัปเดตข้อมูลรถมอเตอร์ไซค์สำเร็จ');
      } else {
        const err = await response.json();
        alert(err.error || 'อัปเดตรถไม่สำเร็จ');
      }
    } catch (error) {
      console.error('Failed to update motorcycle:', error);
      alert('เกิดข้อผิดพลาดในการอัปเดตรถมอเตอร์ไซค์');
    } finally {
      setSavingMotorcycle(false);
    }
  };

  const handleDeleteMotorcycle = async (id: number, name: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ "${name}" ออกจากระบบ?`)) return;

    try {
      const response = await fetch(`/api/motorcycles/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchMotorcycles();
        setSelectedMotorcycle(null);
        setInstallmentPlans([]);
        alert('ลบรถมอเตอร์ไซค์สำเร็จ');
      }
    } catch (error) {
      console.error('Failed to delete motorcycle:', error);
      alert('เกิดข้อผิดพลาดในการลบรถมอเตอร์ไซค์');
    }
  };

  // Filtered motorcycles for search
  const filteredMotorcycles = motorcycles.filter((m) => {
    const q = searchTerm.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.model.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-700 font-semibold">กำลังโหลดข้อมูลระบบหลังบ้าน...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex flex-col justify-between">
      <div>
        {/* Header */}
        <header className="bg-white shadow-md sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 py-2.5 sm:py-3.5">
            <div className="flex items-center justify-between gap-3">
              {/* Left: Logo & System Name */}
              <Link href="/admin" className="flex items-center gap-2.5 sm:gap-3 group">
                <Image
                  src="/logo.png"
                  alt="เอ็ม มอเตอร์"
                  width={44}
                  height={44}
                  className="rounded-full w-9 h-9 sm:w-11 sm:h-11 object-cover shadow-xs border border-red-100 group-hover:scale-105 transition-transform"
                />
                <div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <h1 className="text-sm sm:text-lg font-black text-gray-900 tracking-tight leading-tight">
                      M MOTOR <span className="text-red-600">ADMIN</span>
                    </h1>
                    <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200/60 text-[9px] sm:text-[10px] font-bold rounded-full">
                      หลังบ้าน
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-gray-500 hidden sm:block">
                    จัดการข้อมูลรถจักรยานยนต์ รูปภาพสีรถ และตารางคำนวณค่างวดผ่อน
                  </p>
                </div>
              </Link>

              {/* Right: Navigation Actions & Admin Profile Dropdown */}
              <div className="flex items-center gap-2 sm:gap-2.5">
                {/* QR Catalog Button */}
                <Link
                  href="/qr"
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs sm:text-sm font-medium transition-colors"
                >
                  <QrCode className="h-4 w-4" />
                  <span>QR แคตตาล็อก</span>
                </Link>

                {/* Customer View Preview Button */}
                <Link
                  href={selectedMotorcycle ? `/motorcycles/${selectedMotorcycle.id}` : "/"}
                  className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">ดูหน้าลูกค้า</span>
                  <span className="sm:hidden">หน้าลูกค้า</span>
                </Link>

                {/* Admin Profile Dropdown */}
                <div className="relative" ref={profileDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    aria-expanded={isProfileOpen}
                    aria-haspopup="true"
                    className="flex items-center gap-2 p-1 sm:pl-2 sm:pr-2.5 sm:py-1.5 bg-gray-50 hover:bg-red-50/70 border border-gray-200/80 hover:border-red-200 rounded-xl transition-all cursor-pointer group"
                    title="เมนูโปรไฟล์ผู้ดูแลระบบ"
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs shadow-xs group-hover:scale-105 transition-transform shrink-0">
                      {adminDisplayName ? adminDisplayName.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                    </div>
                    <div className="hidden lg:flex flex-col text-left leading-none">
                      <span className="text-xs font-bold text-gray-900 group-hover:text-red-600 transition-colors truncate max-w-[130px]">
                        {adminDisplayName}
                      </span>
                      <span className="text-[10px] text-gray-500 mt-0.5">
                        Central Admin
                      </span>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-gray-400 group-hover:text-red-600 transition-transform duration-200 ${
                        isProfileOpen ? 'rotate-180 text-red-600' : ''
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      {/* User Header Summary inside Dropdown */}
                      <div className="p-3 bg-gradient-to-br from-red-50/80 to-orange-50/50 rounded-xl border border-red-100/70 mb-1.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                            {adminDisplayName ? adminDisplayName.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                                {adminDisplayName}
                              </p>
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-red-100 text-red-700 text-[9px] font-bold rounded-md shrink-0">
                                <ShieldCheck className="h-3 w-3" />
                                ADMIN
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 truncate mt-0.5 font-mono" title={adminUser?.email || ''}>
                              {adminUser?.email || 'กำลังโหลดอีเมล...'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Dropdown Items */}
                      <div className="space-y-0.5 text-xs">
                        {/* 1. ข้อมูลบัญชีผู้ดูแลระบบ */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileOpen(false);
                            setShowAccountModal(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-700 hover:text-red-600 hover:bg-red-50/70 rounded-xl font-medium transition-colors text-left cursor-pointer group"
                        >
                          <div className="p-1.5 bg-gray-100 group-hover:bg-red-100 rounded-lg text-gray-500 group-hover:text-red-600 transition-colors">
                            <User className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 group-hover:text-red-600 transition-colors">
                              ข้อมูลบัญชีผู้ดูแลระบบ
                            </p>
                            <p className="text-[10px] text-gray-400">อีเมลและบทบาทผู้ดูแล</p>
                          </div>
                        </button>

                        {/* 2. จัดการข้อมูลรถทั้งหมด */}
                        <button
                          type="button"
                          onClick={handleScrollToMotorcycles}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-700 hover:text-red-600 hover:bg-red-50/70 rounded-xl font-medium transition-colors text-left cursor-pointer group"
                        >
                          <div className="p-1.5 bg-gray-100 group-hover:bg-red-100 rounded-lg text-gray-500 group-hover:text-red-600 transition-colors">
                            <Layers className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 group-hover:text-red-600 transition-colors">
                              จัดการข้อมูลรถทั้งหมด
                            </p>
                            <p className="text-[10px] text-gray-400">เลื่อนไปยังส่วนจัดการรถ</p>
                          </div>
                        </button>

                        <div className="border-t border-gray-100 my-1" />

                        {/* 3. ออกจากระบบ */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileOpen(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors text-left cursor-pointer group"
                        >
                          <div className="p-1.5 bg-red-100/70 rounded-lg text-red-600 transition-colors">
                            <LogOut className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-red-600">ออกจากระบบ</p>
                            <p className="text-[10px] text-red-400">สิ้นสุด Session และกลับหน้า Login</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Quick Motorcycle Selector Carousel (Visible on mobile/tablet) */}
        <div ref={motorcyclesSectionRef} className="lg:hidden max-w-7xl mx-auto px-4 pt-4 pb-2">
          <div className="bg-white rounded-2xl shadow-sm p-3.5 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-red-600" />
                เลือกรุ่นรถที่ต้องการแก้ไข ({motorcycles.length} รุ่น)
              </span>
              <button
                onClick={() => {
                  setIsAdding(true);
                  setIsEditing(false);
                  setEditForm({});
                  setSelectedMotorcycle(null);
                  detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                เพิ่มรถใหม่
              </button>
            </div>

            {/* Horizontal Scroll of Mini Cards */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {motorcycles.map((m) => {
                const isSelected = selectedMotorcycle?.id === m.id && !isAdding;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleMotorcycleSelect(m)}
                    className={`flex-shrink-0 p-2 rounded-xl border-2 transition-all flex items-center gap-2 text-left max-w-[170px] ${
                      isSelected
                        ? 'border-red-600 bg-red-50/70 shadow-sm ring-1 ring-red-400'
                        : 'border-gray-200 bg-gray-50/60 hover:bg-white'
                    }`}
                  >
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1 border border-gray-100 flex-shrink-0">
                      {m.image_url ? (
                        <img src={m.image_url} alt={m.name} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-[9px] text-gray-400">ไม่มีรูป</span>
                      )}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-gray-900 truncate leading-tight">{m.name}</p>
                      <p className="text-[10px] text-red-600 font-semibold">
                        {m.cash_price ? `฿${m.cash_price.toLocaleString()}` : m.model}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content Layout */}
        <main className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
          <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 items-start">
            
            {/* Desktop Left Sidebar: Motorcycle Directory (Hidden on mobile) */}
            <div id="motorcycles-sidebar" className="hidden lg:block lg:col-span-4 sticky top-24">
              <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
                {/* List Header */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">รายการรถมอเตอร์ไซค์</h2>
                    <p className="text-xs text-gray-500">เลือกเพื่อดูข้อมูลและแก้ไข</p>
                  </div>
                  <button
                    onClick={() => {
                      setIsAdding(true);
                      setIsEditing(false);
                      setEditForm({});
                      setSelectedMotorcycle(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    เพิ่มรถใหม่
                  </button>
                </div>

                {/* Search Box */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อ หรือรุ่นรถ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Motorcycle Directory Cards */}
                <div className="space-y-2.5 max-h-[calc(100vh-270px)] overflow-y-auto pr-1 scrollbar-thin">
                  {filteredMotorcycles.map((m) => {
                    const isSelected = selectedMotorcycle?.id === m.id && !isAdding;
                    return (
                      <div
                        key={m.id}
                        onClick={() => handleMotorcycleSelect(m)}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'border-red-600 bg-red-50/70 shadow-sm ring-1 ring-red-400/50'
                            : 'border-gray-200 hover:border-red-300 hover:bg-slate-50/80 bg-white'
                        }`}
                      >
                        {/* Mini Image */}
                        <div className="w-14 h-14 bg-slate-50 rounded-lg flex items-center justify-center p-1 border border-gray-100 flex-shrink-0">
                          {m.image_url ? (
                            <img
                              src={m.image_url}
                              alt={m.name}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <span className="text-[10px] text-gray-400">ไม่มีรูป</span>
                          )}
                        </div>

                        {/* Text Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold text-red-600 uppercase">
                              {m.model}
                            </span>
                            {m.cc_size && (
                              <span className="text-[10px] text-gray-400 font-medium">
                                {m.cc_size} CC
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-sm text-gray-900 truncate">{m.name}</p>

                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            {m.cash_price ? (
                              <span className="text-xs font-bold text-red-600">
                                ฿{m.cash_price.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-400">ไม่ระบุราคาสด</span>
                            )}
                            {m.colors && m.colors.length > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-gray-500 font-medium">
                                  {m.colors.length} สี
                                </span>
                                <div className="flex -space-x-1 items-center">
                                  {m.colors.slice(0, 3).map((c) => (
                                    <span
                                      key={c.id}
                                      className="w-2.5 h-2.5 rounded-full border border-white shadow-xs inline-block"
                                      style={{ backgroundColor: c.color_code || '#cbd5e1' }}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {filteredMotorcycles.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-xs">
                      ไม่พบรถมอเตอร์ไซค์ที่ค้นหา
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Main Column: Workspace (Details, Form, Colors, Installment) */}
            <div ref={detailsRef} className="lg:col-span-8 space-y-6 sm:space-y-8">
              
              {/* 1. Add / Edit Motorcycle Form */}
              {(isAdding || isEditing) && (
                <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-8 border border-gray-100 animate-fadeIn">
                  <div className="flex items-center justify-between pb-4 mb-5 border-b border-gray-100">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-red-600" />
                        {isAdding ? 'เพิ่มรถมอเตอร์ไซค์ใหม่' : `แก้ไขข้อมูล: ${selectedMotorcycle?.name}`}
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                        {isAdding
                          ? 'กรอกข้อมูลพื้นฐาน ราคาขายสด และยอดจัดไฟแนนซ์เพื่อสร้างรถรุ่นใหม่'
                          : 'ปรับปรุงรายละเอียดของรถมอเตอร์ไซค์รุ่นนี้'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setIsAdding(false);
                        setIsEditing(false);
                        setEditForm({});
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-5">
                    {/* Basic Info Group */}
                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                        ข้อมูลทั่วไปของรถ
                      </h3>
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            ชื่อรถมอเตอร์ไซค์ <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={editForm.name || ''}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            placeholder="เช่น Honda PCX 160"
                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            รุ่น (Model) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={editForm.model || ''}
                            onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                            placeholder="เช่น PCX 160"
                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Financial & Engine Specs Group */}
                    <div className="pt-2 border-t border-gray-100">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                        ราคาและสเปกเครื่องยนต์
                      </h3>
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            ราคาขายสด (บาท) <span className="text-red-500 font-normal">(แสดงหน้าลูกค้า)</span>
                          </label>
                          <input
                            type="number"
                            value={editForm.cash_price ?? ''}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                cash_price: e.target.value ? parseFloat(e.target.value) : null,
                              })
                            }
                            placeholder="เช่น 110900"
                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm font-bold text-red-600"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            ยอดจัดไฟแนนซ์ (บาท) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={editForm.finance_amount ?? ''}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                finance_amount: e.target.value ? parseFloat(e.target.value) : null,
                              })
                            }
                            placeholder="เช่น 110900"
                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm font-bold text-gray-800"
                          />
                          <p className="text-[10px] text-gray-400 mt-1">ใช้คำนวณค่างวดในตารางผ่อน</p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            ขนาดกระบอกสูบ (CC)
                          </label>
                          <input
                            type="number"
                            value={editForm.cc_size ?? ''}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                cc_size: e.target.value ? parseInt(e.target.value) : null,
                              })
                            }
                            placeholder="เช่น 160"
                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Image Upload */}
                    <div className="pt-2 border-t border-gray-100">
                      <ImageUploadSection
                        imageUrl={editForm.image_url}
                        onChange={(url) => setEditForm({ ...editForm, image_url: url })}
                      />
                    </div>

                    {/* Description */}
                    <div className="pt-2 border-t border-gray-100">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        รายละเอียดและจุดเด่นของรถ
                      </label>
                      <textarea
                        value={editForm.description || ''}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        rows={3}
                        placeholder="ระบุจุดเด่น เช่น ประหยัดน้ำมัน ดีไซน์หรู ระบบเบรก ABS..."
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={isAdding ? handleAddMotorcycle : handleUpdateMotorcycle}
                        disabled={savingMotorcycle}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 shadow-md"
                      >
                        {savingMotorcycle ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {isAdding ? 'บันทึกรถใหม่' : 'บันทึกการแก้ไข'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAdding(false);
                          setIsEditing(false);
                          setEditForm({});
                        }}
                        disabled={savingMotorcycle}
                        className="px-5 py-2.5 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold transition-colors"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Motorcycle Showcase Preview Card (Consistent with customer view) */}
              {selectedMotorcycle && !isAdding && !isEditing && (
                <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-8 border border-gray-100">
                  <div className="grid md:grid-cols-2 gap-6 sm:gap-8 items-center">
                    
                    {/* Left: Image Showcase */}
                    <div className="bg-gradient-to-b from-slate-50 to-gray-100 rounded-2xl p-4 sm:p-6 flex items-center justify-center min-h-[220px] sm:min-h-[260px] shadow-inner border border-gray-100 relative">
                      {selectedMotorcycle.image_url ? (
                        <img
                          src={selectedMotorcycle.image_url}
                          alt={selectedMotorcycle.name}
                          className="w-full h-52 sm:h-64 object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-52 sm:h-64 rounded-lg flex items-center justify-center text-gray-400 font-medium">
                          ไม่มีรูปภาพ
                        </div>
                      )}

                      {/* Model & CC Badges */}
                      <div className="absolute top-3 left-3 flex gap-1.5">
                        <span className="px-2.5 py-1 bg-red-600 text-white text-[11px] font-bold rounded-lg shadow-xs">
                          {selectedMotorcycle.model}
                        </span>
                        {selectedMotorcycle.cc_size && (
                          <span className="px-2 py-1 bg-gray-900/80 text-white text-[11px] font-semibold rounded-lg backdrop-blur-sm">
                            {selectedMotorcycle.cc_size} CC
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Info & Pricing Metrics */}
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-bold text-red-600 uppercase tracking-wide">
                            {selectedMotorcycle.model}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">
                            ID: #{selectedMotorcycle.id}
                          </span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                          {selectedMotorcycle.name}
                        </h2>
                      </div>

                      {/* Pricing Cards Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Cash Price */}
                        <div className="p-3.5 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border border-red-100">
                          <p className="text-[11px] text-gray-600 font-semibold">ราคาขายสด (หน้าลูกค้า)</p>
                          <p className="text-xl sm:text-2xl font-black text-red-600 mt-0.5">
                            {selectedMotorcycle.cash_price
                              ? `฿${selectedMotorcycle.cash_price.toLocaleString()}`
                              : '-'}
                          </p>
                        </div>

                        {/* Finance Amount */}
                        <div className="p-3.5 bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl border border-gray-200">
                          <p className="text-[11px] text-gray-600 font-semibold">ยอดจัดไฟแนนซ์ (หลังบ้าน)</p>
                          <p className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">
                            {selectedMotorcycle.finance_amount
                              ? `฿${selectedMotorcycle.finance_amount.toLocaleString()}`
                              : '-'}
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      {selectedMotorcycle.description && (
                        <div className="pt-2 border-t border-gray-100">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                            รายละเอียด
                          </p>
                          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed line-clamp-3">
                            {selectedMotorcycle.description}
                          </p>
                        </div>
                      )}

                      {/* Action Buttons Toolbar */}
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <a
                          href={`/motorcycles/${selectedMotorcycle.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>ดูหน้าลูกค้า</span>
                        </a>

                        <button
                          onClick={() => {
                            setIsEditing(true);
                            setEditForm(selectedMotorcycle);
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-sm"
                        >
                          <Edit className="h-4 w-4" />
                          <span>แก้ไขข้อมูลรถ</span>
                        </button>

                        <button
                          onClick={() =>
                            handleDeleteMotorcycle(selectedMotorcycle.id, selectedMotorcycle.name)
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl text-xs sm:text-sm font-semibold transition-colors ml-auto"
                          title="ลบรถคันนี้"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden sm:inline">ลบรถ</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Color Variants & Gallery Management */}
              {selectedMotorcycle && !isAdding && (
                <ColorManagementSection
                  motorcycleId={selectedMotorcycle.id}
                  motorcycleName={selectedMotorcycle.name}
                  onColorsUpdated={handleColorsUpdated}
                />
              )}

              {/* 4. Down Payment & Installment Period Configuration */}
              {selectedMotorcycle && !isAdding && (
                <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-8 border border-gray-100">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                    <div className="p-2.5 bg-red-100 text-red-600 rounded-xl">
                      <CreditCard className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                        ตั้งค่าตารางผ่อนชำระ
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-500">
                        กำหนดตัวเลือกเงินดาวน์และจำนวนงวดที่ต้องการให้แสดงในตารางคำนวณ
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
                    {/* Down Payment Options Card */}
                    <div className="bg-gray-50 rounded-2xl p-4 sm:p-5 border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="h-4 w-4 text-red-600" />
                          <h3 className="text-sm font-bold text-gray-900">ตัวเลือกเงินดาวน์</h3>
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[11px] font-bold">
                            {downPaymentOptions.length}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setDownPaymentInput('');
                            setShowDownPaymentModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          เพิ่มเงินดาวน์
                        </button>
                      </div>

                      {/* Chips */}
                      <div className="flex flex-wrap gap-2">
                        {downPaymentOptions.map((opt) => (
                          <div
                            key={opt.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl shadow-xs text-xs font-bold text-gray-800"
                          >
                            {opt.amount === 0 ? (
                              <span className="text-green-600 font-extrabold">ฟรีดาวน์ (฿0)</span>
                            ) : (
                              <span>฿{opt.amount.toLocaleString()}</span>
                            )}
                            <button
                              onClick={() => handleDeleteDownPayment(opt.id, opt.amount)}
                              className="text-gray-400 hover:text-red-600 p-0.5 rounded transition-colors"
                              title="ลบตัวเลือกนี้"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Installment Periods Card */}
                    <div className="bg-gray-50 rounded-2xl p-4 sm:p-5 border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-red-600" />
                          <h3 className="text-sm font-bold text-gray-900">จำนวนงวดผ่อน</h3>
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[11px] font-bold">
                            {installmentPeriods.length}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setPeriodInput('');
                            setShowPeriodModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          เพิ่มงวด
                        </button>
                      </div>

                      {/* Chips */}
                      <div className="flex flex-wrap gap-2">
                        {installmentPeriods.map((period) => (
                          <div
                            key={period.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl shadow-xs text-xs font-bold text-gray-800"
                          >
                            <span>{period.months} เดือน</span>
                            <button
                              onClick={() =>
                                handleDeleteInstallmentPeriod(period.id, period.months)
                              }
                              className="text-gray-400 hover:text-red-600 p-0.5 rounded transition-colors"
                              title="ลบจำนวนงวดนี้"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Live Installment Pivot Table Preview (Matching Customer Side) */}
              {selectedMotorcycle && !isAdding && installmentPlans.length > 0 && (() => {
                const seen = new Set<string>();
                const unique = installmentPlans.filter((p) => {
                  const key = `${p.down_payment}|${p.months}`;
                  if (seen.has(key)) return false;
                  seen.add(key);
                  return true;
                });

                const months = [...new Set(unique.map((p) => p.months))].sort((a, b) => a - b);
                const downPayments = [...new Set(unique.map((p) => p.down_payment))].sort(
                  (a, b) => a - b
                );
                const lookup = new Map(
                  unique.map((p) => [`${p.down_payment}|${p.months}`, p.monthly_payment])
                );

                return (
                  <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-8 border border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-6">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                            ตัวอย่างตารางผ่อนชำระจริง (หน้าลูกค้า)
                          </h3>
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                            คำนวณอัตโนมัติ
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500">
                          ตารางนี้จะแสดงผลแบบเดียวกับที่ลูกค้าเห็นบนหน้าเว็บไซต์
                        </p>
                      </div>

                      <span className="sm:hidden text-xs text-gray-400 font-medium">
                        👉 ปัดซ้าย-ขวา เพื่อดูงวดเพิ่มเติม
                      </span>
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
                                className="bg-red-600 text-white px-4 sm:px-6 py-3 sm:py-3.5 text-center last:rounded-tr-lg min-w-[85px] sm:min-w-[110px]"
                              >
                                <div className="font-black text-base sm:text-lg">{m}</div>
                                <div className="text-[10px] sm:text-xs font-normal opacity-90">
                                  เดือน
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {downPayments.map((dp, i) => (
                            <tr
                              key={dp}
                              className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-red-50/30'}
                            >
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

              {/* No Motorcycle Selected Empty State */}
              {!selectedMotorcycle && !isAdding && (
                <div className="bg-white rounded-2xl shadow-lg p-12 border border-gray-100 text-center">
                  <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Layers className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">กรุณาเลือกรถมอเตอร์ไซค์</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    เลือกรถมอเตอร์ไซค์จากรายการด้านซ้ายเพื่อดูรายละเอียดและจัดการสี หรือกดปุ่มเพิ่มรถใหม่
                  </p>
                  <button
                    onClick={() => {
                      setIsAdding(true);
                      setEditForm({});
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors shadow-md"
                  >
                    <Plus className="h-4 w-4" />
                    เพิ่มรถมอเตอร์ไซค์ใหม่
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h3 className="text-lg font-bold mb-1">บริษัท เอ็ม มอเตอร์ จำกัด</h3>
          <p className="text-gray-400 text-sm mb-4">ระบบจัดการหลังบ้าน (Admin Console)</p>
          <div className="flex justify-center gap-4 mb-4 text-sm">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors">
              หน้าแคตตาล็อกลูกค้า
            </Link>
            <span className="text-gray-600">|</span>
            <Link href="/qr" className="text-gray-400 hover:text-white transition-colors">
              QR Code หน้ารวมรถ
            </Link>
          </div>
          <p className="text-gray-500 text-xs">© 2026 บริษัท เอ็ม มอเตอร์ จำกัด. สงวนลิขสิทธิ์</p>
        </div>
      </footer>

      {/* Modal: เพิ่มตัวเลือกเงินดาวน์ */}
      {showDownPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scaleUp">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-red-600" />
                เพิ่มตัวเลือกเงินดาวน์
              </h3>
              <button
                onClick={() => setShowDownPaymentModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Presets */}
            <p className="text-xs text-gray-500 font-medium mb-2">ตัวเลือกด่วน:</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {[0, 5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setDownPaymentInput(amt.toString())}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    downPaymentInput === amt.toString()
                      ? 'bg-red-600 text-white border-red-600 shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {amt === 0 ? 'ฟรีดาวน์' : `฿${amt.toLocaleString()}`}
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              จำนวนเงินดาวน์ (บาท)
            </label>
            <input
              type="number"
              value={downPaymentInput}
              onChange={(e) => setDownPaymentInput(e.target.value)}
              placeholder="กรอก 0 สำหรับฟรีดาวน์"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm mb-4 font-bold"
              autoFocus
            />

            {/* Modal Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => handleAddDownPaymentSubmit(parseFloat(downPaymentInput))}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
              >
                บันทึกตัวเลือก
              </button>
              <button
                onClick={() => setShowDownPaymentModal(false)}
                className="px-4 py-2.5 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold transition-colors"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: เพิ่มจำนวนงวดผ่อน */}
      {showPeriodModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scaleUp">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-red-600" />
                เพิ่มระยะเวลาผ่อน (งวด)
              </h3>
              <button
                onClick={() => setShowPeriodModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Presets */}
            <p className="text-xs text-gray-500 font-medium mb-2">จำนวนงวดด่วน:</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {[12, 18, 24, 30, 36, 42, 48].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPeriodInput(m.toString())}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    periodInput === m.toString()
                      ? 'bg-red-600 text-white border-red-600 shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {m} เดือน
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              จำนวนงวด (เดือน)
            </label>
            <input
              type="number"
              value={periodInput}
              onChange={(e) => setPeriodInput(e.target.value)}
              placeholder="เช่น 24, 36, 48"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm mb-4 font-bold"
              autoFocus
            />

            {/* Modal Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => handleAddPeriodSubmit(parseInt(periodInput))}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
              >
                บันทึกจำนวนงวด
              </button>
              <button
                onClick={() => setShowPeriodModal(false)}
                className="px-4 py-2.5 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold transition-colors"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Account Information Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-red-50 text-red-600 rounded-2xl border border-red-100">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">ข้อมูลบัญชีผู้ดูแลระบบ</h3>
                  <p className="text-xs text-gray-500">M Motor Catalog Management</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAccountModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  อีเมลบัญชีผู้ดูแล (Email)
                </p>
                <p className="text-sm font-bold text-gray-900 font-mono break-all">
                  {adminUser?.email || '-'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    บทบาทในระบบ (Role)
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-bold text-gray-900">
                      {adminUser?.app_metadata?.role === 'admin' ? 'Central Admin' : 'Admin'}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    ระบบยืนยันตัวตน
                  </p>
                  <p className="text-xs font-bold text-gray-900 mt-0.5">
                    Supabase Auth
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  สถานะ Session (Authentication)
                </p>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-md">
                    <Check className="h-3 w-3" />
                    Authenticated
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Server Verified
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAccountModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
