'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Palette,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Upload,
  Link as LinkIcon,
  Loader2,
  Star,
  Check,
  Sparkles,
} from 'lucide-react';

export interface MotorcycleColor {
  id: number;
  motorcycle_id: number;
  color_name: string;
  color_code?: string | null;
  image_url: string;
  is_default?: number;
  created_at?: string;
}

const PRESET_COLORS = [
  { label: 'แดง', hex: '#EF4444' },
  { label: 'น้ำเงิน', hex: '#2563EB' },
  { label: 'ดำ', hex: '#1E293B' },
  { label: 'ขาว', hex: '#F8FAFC' },
  { label: 'เทา', hex: '#64748B' },
  { label: 'ส้ม', hex: '#F97316' },
  { label: 'เหลือง', hex: '#EAB308' },
  { label: 'เขียว', hex: '#10B981' },
];

export default function ColorManagementSection({
  motorcycleId,
  motorcycleName,
  onColorsUpdated,
}: {
  motorcycleId: number;
  motorcycleName: string;
  onColorsUpdated?: () => void;
}) {
  const [colors, setColors] = useState<MotorcycleColor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('#EF4444');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [useUrlMode, setUseUrlMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchColors();
    resetForm();
  }, [motorcycleId]);

  const fetchColors = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/motorcycles/${motorcycleId}/colors`);
      if (res.ok) {
        const data = await res.json();
        setColors(data);
      }
    } catch (err) {
      console.error('Failed to fetch colors:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormCode('#EF4444');
    setFormImageUrl('');
    setFormIsDefault(false);
    setIsAdding(false);
    setEditingId(null);
    setUseUrlMode(false);
  };

  const startEdit = (color: MotorcycleColor) => {
    setEditingId(color.id);
    setIsAdding(false);
    setFormName(color.color_name);
    setFormCode(color.color_code || '#EF4444');
    setFormImageUrl(color.image_url);
    setFormIsDefault(color.is_default === 1);
    setUseUrlMode(false);
  };

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
        setFormImageUrl(data.url);
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

  const handleSaveColor = async () => {
    if (!formName.trim()) {
      alert('กรุณากรอกชื่อสี (เช่น สีแดง-ดำ, สีน้ำเงิน, สีขาว)');
      return;
    }
    if (!formImageUrl.trim()) {
      alert('กรุณาอัปโหลดรูปภาพ หรือใส่ URL รูปภาพของรถสีนี้');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        // Update existing
        const res = await fetch(`/api/motorcycles/${motorcycleId}/colors/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            color_name: formName.trim(),
            color_code: formCode.trim() || null,
            image_url: formImageUrl.trim(),
            is_default: formIsDefault ? 1 : 0,
          }),
        });

        if (res.ok) {
          await fetchColors();
          resetForm();
          onColorsUpdated?.();
        } else {
          const err = await res.json();
          alert(err.error || 'บันทึกสีไม่สำเร็จ');
        }
      } else {
        // Add new
        const res = await fetch(`/api/motorcycles/${motorcycleId}/colors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            color_name: formName.trim(),
            color_code: formCode.trim() || null,
            image_url: formImageUrl.trim(),
            is_default: formIsDefault ? 1 : 0,
          }),
        });

        if (res.ok) {
          await fetchColors();
          resetForm();
          onColorsUpdated?.();
        } else {
          const err = await res.json();
          alert(err.error || 'เพิ่มสีไม่สำเร็จ');
        }
      }
    } catch (error) {
      console.error('Failed to save color:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลสี');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteColor = async (colorId: number, name: string) => {
    if (!confirm(`ต้องการลบ "${name}" ออกจากรถคันนี้หรือไม่?`)) return;

    try {
      const res = await fetch(`/api/motorcycles/${motorcycleId}/colors/${colorId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchColors();
        onColorsUpdated?.();
      } else {
        const err = await res.json();
        alert(err.error || 'ลบข้อมูลสีไม่สำเร็จ');
      }
    } catch (error) {
      console.error('Failed to delete color:', error);
      alert('เกิดข้อผิดพลาดในการลบข้อมูลสี');
    }
  };

  const handleSetDefault = async (colorId: number) => {
    try {
      const res = await fetch(`/api/motorcycles/${motorcycleId}/colors/${colorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: 1 }),
      });
      if (res.ok) {
        await fetchColors();
        onColorsUpdated?.();
      }
    } catch (error) {
      console.error('Failed to set default color:', error);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-8 mb-6 sm:mb-8 border border-gray-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-100 text-red-600 rounded-xl">
            <Palette className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                จัดการสีและรูปภาพตัวอย่างรถ
              </h3>
              <span className="px-2.5 py-0.5 bg-red-100 text-red-700 font-bold text-xs rounded-full">
                {colors.length} สี
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500">
              เพิ่มรูปตัวอย่างรถแต่ละสี เพื่อให้ลูกค้ากดเลือกดูสีจริงในหน้าแคตตาล็อก
            </p>
          </div>
        </div>

        {!isAdding && !editingId && (
          <button
            onClick={() => {
              resetForm();
              setIsAdding(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            เพิ่มสีและรูปภาพ
          </button>
        )}
      </div>

      {/* Add / Edit Form Card */}
      {(isAdding || editingId) && (
        <div className="bg-gradient-to-br from-red-50/60 to-orange-50/60 rounded-2xl p-5 mb-6 border border-red-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-red-600" />
              {editingId ? 'แก้ไขข้อมูลสีและรูปภาพ' : 'เพิ่มสีใหม่สำหรับ ' + motorcycleName}
            </h4>
            <button
              onClick={resetForm}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/80 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Color Name & Code */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  ชื่อสีรถ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="เช่น สีแดง-ดำ, สีน้ำเงิน, สีขาวมุก"
                  className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  โค้ดสี (แสดงเป็นจุดสีให้ลูกค้ากดเลือก)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formCode.startsWith('#') && formCode.length === 7 ? formCode : '#EF4444'}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-10 h-10 rounded-xl border border-gray-300 cursor-pointer p-0.5 bg-white"
                    title="เลือกสีจากจานสี"
                  />
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="#EF4444"
                    className="flex-1 px-3.5 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Quick Preset Colors */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5 font-medium">สีด่วนที่พบบ่อย:</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => {
                      setFormCode(preset.hex);
                      if (!formName) setFormName(`สี${preset.label}`);
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      formCode.toLowerCase() === preset.hex.toLowerCase()
                        ? 'border-red-600 bg-red-100/50 text-red-700 ring-2 ring-red-400'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-gray-300 shadow-xs"
                      style={{ backgroundColor: preset.hex }}
                    />
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Image Upload for this Color */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  รูปภาพตัวอย่างรถสีนี้ <span className="text-red-500">*</span>
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
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="https://example.com/red-bike.jpg"
                  className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
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

                  {formImageUrl ? (
                    <div className="border border-gray-200 rounded-xl p-3 bg-white flex flex-col sm:flex-row items-center gap-4 shadow-xs">
                      <img
                        src={formImageUrl}
                        alt="Preview"
                        className="w-32 h-24 object-contain rounded-lg border border-gray-100 bg-slate-50"
                      />
                      <div className="flex-1 text-center sm:text-left space-y-2">
                        <p className="text-xs text-gray-500 truncate max-w-xs sm:max-w-md font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200">
                          {formImageUrl}
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="px-3 py-1.5 text-xs bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 flex items-center gap-1.5 font-medium transition-colors disabled:opacity-50"
                          >
                            {uploading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-red-600" />
                            ) : (
                              <Upload className="h-3.5 w-3.5 text-gray-600" />
                            )}
                            เปลี่ยนรูปจากเครื่อง
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormImageUrl('')}
                            disabled={uploading}
                            className="px-3 py-1.5 text-xs bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-1.5 font-medium transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            ลบรูป
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
                      className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all bg-white ${
                        uploading
                          ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                          : 'border-gray-300 hover:border-red-500 hover:bg-red-50/30'
                      }`}
                    >
                      {uploading ? (
                        <div className="flex flex-col items-center justify-center py-2">
                          <Loader2 className="h-6 w-6 text-red-600 animate-spin mb-1" />
                          <p className="text-xs font-medium text-gray-700">กำลังอัปโหลดรูปภาพ...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-1">
                          <Upload className="h-5 w-5 text-red-600 mb-1" />
                          <p className="text-xs font-semibold text-gray-800">
                            คลิกเพื่อเลือกรูปภาพจากเครื่อง หรือลากรูปมาวาง
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            รองรับไฟล์ JPG, PNG, WEBP
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Default Cover Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="formIsDefault"
                checked={formIsDefault}
                onChange={(e) => setFormIsDefault(e.target.checked)}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <label htmlFor="formIsDefault" className="text-xs font-medium text-gray-700 cursor-pointer">
                ตั้งเป็นรูปภาพหลัก (ภาพหน้าปกของรถรุ่นนี้)
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-red-100">
              <button
                type="button"
                onClick={handleSaveColor}
                disabled={saving || uploading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 shadow-sm"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {editingId ? 'บันทึกการแก้ไข' : 'เพิ่มสีนี้'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="px-4 py-2 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Colors List Display */}
      {loading ? (
        <div className="text-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-red-600 mx-auto mb-2" />
          <p className="text-xs text-gray-500">กำลังโหลดรายการสี...</p>
        </div>
      ) : colors.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
          <Palette className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-700">ยังไม่มีการเพิ่มสีรถ</p>
          <p className="text-xs text-gray-500 mt-0.5 mb-3">
            กดปุ่ม "เพิ่มสีและรูปภาพ" ด้านบน เพื่อเพิ่มสีและรูปรถตัวอย่าง
          </p>
          <button
            onClick={() => {
              resetForm();
              setIsAdding(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            เพิ่มสีแรก
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {colors.map((color) => {
            const isDef = color.is_default === 1;
            return (
              <div
                key={color.id}
                className={`relative bg-white rounded-xl border-2 overflow-hidden transition-all group flex flex-col justify-between ${
                  isDef
                    ? 'border-red-500 shadow-sm ring-1 ring-red-400'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-xs'
                }`}
              >
                {/* Default badge */}
                {isDef && (
                  <div className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center gap-1 shadow-sm">
                    <Star className="h-3 w-3 fill-white" />
                    รูปหลัก
                  </div>
                )}

                {/* Image Container */}
                <div className="bg-gradient-to-b from-slate-50 to-gray-100 p-3 flex items-center justify-center min-h-[140px] border-b border-gray-100">
                  <img
                    src={color.image_url}
                    alt={color.color_name}
                    className="w-full h-28 object-contain group-hover:scale-105 transition-transform duration-200"
                  />
                </div>

                {/* Details */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-4 h-4 rounded-full border border-gray-300 shadow-xs flex-shrink-0"
                        style={{ backgroundColor: color.color_code || '#cbd5e1' }}
                      />
                      <span className="font-bold text-xs sm:text-sm text-gray-900 truncate">
                        {color.color_name}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-1 pt-2 border-t border-gray-100">
                    {!isDef ? (
                      <button
                        onClick={() => handleSetDefault(color.id)}
                        className="text-[11px] text-gray-600 hover:text-red-600 font-medium flex items-center gap-1 hover:underline"
                        title="ตั้งเป็นภาพหลัก"
                      >
                        <Star className="h-3 w-3" />
                        ตั้งเป็นรูปหลัก
                      </button>
                    ) : (
                      <span className="text-[11px] text-green-600 font-semibold flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        รูปหลักปัจจุบัน
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(color)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="แก้ไขสีนี้"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteColor(color.id, color.color_name)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="ลบสีนี้"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
