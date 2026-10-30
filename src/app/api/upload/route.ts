import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { verifyAdmin } from '@/lib/supabase/auth';

// รายการนามสกุลไฟล์และ MIME Type ที่อนุญาตอย่างเคร่งครัด (อนุญาตเฉพาะ JPG, JPEG, PNG, WebP)
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

type AllowedImageType = 'jpeg' | 'png' | 'webp';

/**
 * ตรวจสอบลายเซ็นไบนารีของไฟล์ (Magic Bytes / File Signature) ฝั่ง Server
 * เพื่อป้องกันการปลอมแปลง Content-Type หรือการเปลี่ยนนามสกุลไฟล์
 */
function detectImageMagicBytes(buffer: Buffer): AllowedImageType | null {
  if (buffer.length < 12) {
    return null;
  }

  // 1. JPEG / JPG: ขึ้นต้นด้วย FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  // 2. PNG: ขึ้นต้นด้วย 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  // 3. WebP: ขึ้นต้นด้วย 'RIFF' (offset 0-3) และ 'WEBP' (offset 8-11)
  if (
    buffer[0] === 0x52 && // 'R'
    buffer[1] === 0x49 && // 'I'
    buffer[2] === 0x46 && // 'F'
    buffer[3] === 0x46 && // 'F'
    buffer[8] === 0x57 && // 'W'
    buffer[9] === 0x45 && // 'E'
    buffer[10] === 0x42 && // 'B'
    buffer[11] === 0x50 // 'P'
  ) {
    return 'webp';
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    // 1. ตรวจสอบสิทธิ์ Admin ฝั่ง Server ก่อนประมวลผลไฟล์ใดๆ
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // 2. ดึงข้อมูลไฟล์จาก FormData
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'ไม่พบไฟล์รูปภาพที่อัปโหลด' }, { status: 400 });
    }

    // 3. ตรวจสอบขนาดไฟล์ (ไม่เกิน 10MB และต้องมีขนาดมากกว่า 0 ไบต์)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size <= 0) {
      return NextResponse.json({ error: 'ไฟล์ไม่มีข้อมูล (Empty file)' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'ขนาดไฟล์เกิน 10MB กรุณาเลือกรูปภาพขนาดเล็กลง' },
        { status: 400 }
      );
    }

    // 4. ตรวจสอบนามสกุลไฟล์ (Extension Whitelist)
    const rawExt = path.extname(file.name || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(rawExt)) {
      return NextResponse.json(
        { error: 'นามสกุลไฟล์ไม่ถูกต้อง อนุญาตเฉพาะ JPG, JPEG, PNG และ WebP เท่านั้น (ห้าม SVG, HTML หรือไฟล์อื่น)' },
        { status: 400 }
      );
    }

    // 5. ตรวจสอบ MIME Type (MIME Whitelist)
    const mimeType = (file.type || '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: 'ประเภท MIME Type ไม่ถูกต้อง อนุญาตเฉพาะ JPEG, PNG และ WebP เท่านั้น' },
        { status: 400 }
      );
    }

    // 6. อ่านข้อมูลไบนารีและตรวจสอบ Magic Bytes (File Signature)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const magicType = detectImageMagicBytes(buffer);

    if (!magicType) {
      return NextResponse.json(
        { error: 'เนื้อหาไฟล์ไม่ถูกต้อง (Invalid file signature) อนุญาตเฉพาะรูปภาพ JPEG, PNG และ WebP เท่านั้น' },
        { status: 400 }
      );
    }

    // 7. ตรวจสอบความสอดคล้องกันระหว่าง Magic Bytes กับ Extension และ MIME Type
    const isJpegMatch =
      magicType === 'jpeg' &&
      (rawExt === '.jpg' || rawExt === '.jpeg') &&
      (mimeType === 'image/jpeg' || mimeType === 'image/jpg');

    const isPngMatch =
      magicType === 'png' &&
      rawExt === '.png' &&
      mimeType === 'image/png';

    const isWebpMatch =
      magicType === 'webp' &&
      rawExt === '.webp' &&
      mimeType === 'image/webp';

    if (!isJpegMatch && !isPngMatch && !isWebpMatch) {
      return NextResponse.json(
        { error: 'ประเภทไฟล์ไม่สอดคล้องกับเนื้อหาจริง (MIME/Extension mismatch)' },
        { status: 400 }
      );
    }

    // 8. เตรียมโฟลเดอร์จัดเก็บใน public/uploads
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 9. สร้างชื่อไฟล์ใหม่ที่ปลอดภัย ป้องกัน Path Traversal และอักขระพิเศษ
    const rawBase = path.basename(file.name || '', rawExt);
    const safeSlug = rawBase.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24);
    const baseName = safeSlug.length > 0 ? safeSlug : 'image';
    const randomHex = crypto.randomBytes(4).toString('hex');
    const canonicalExt = magicType === 'jpeg' ? (rawExt === '.jpeg' ? '.jpeg' : '.jpg') : `.${magicType}`;
    const uniqueFileName = `${Date.now()}-${baseName}-${randomHex}${canonicalExt}`;

    // ป้องกัน Path Traversal
    const targetFilePath = path.resolve(uploadDir, uniqueFileName);
    const resolvedUploadDir = path.resolve(uploadDir);
    if (!targetFilePath.startsWith(resolvedUploadDir + path.sep)) {
      return NextResponse.json(
        { error: 'ตรวจพบชื่อไฟล์ที่ไม่ปลอดภัย (Invalid file path)' },
        { status: 400 }
      );
    }

    // ป้องกันการเขียนทับไฟล์เดิม (Overwrite protection)
    if (fs.existsSync(targetFilePath)) {
      return NextResponse.json(
        { error: 'เกิดข้อผิดพลาดชื่อไฟล์ซ้ำ กรุณาลองใหม่อีกครั้ง' },
        { status: 409 }
      );
    }

    // 10. บันทึกไฟล์ลง Disk
    fs.writeFileSync(targetFilePath, buffer, { flag: 'wx' });

    const publicUrl = `/uploads/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: uniqueFileName,
    });
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึกรูปภาพ' }, { status: 500 });
  }
}
