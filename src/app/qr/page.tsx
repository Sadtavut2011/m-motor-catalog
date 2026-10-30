'use client';

import QRCode from 'react-qr-code';
import { Download, Home } from 'lucide-react';
import { useRef } from 'react';
import Image from 'next/image';

export default function QRPage() {
  const qrRef = useRef<HTMLDivElement>(null);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const catalogUrl = `${baseUrl}/`;

  const downloadQR = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new window.Image();

    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx?.scale(2, 2);
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = 'm-motor-qr.png';
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.png"
              alt="เอ็ม มอเตอร์"
              width={80}
              height={80}
              className="rounded-full"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">QR Code สำหรับ เอ็ม มอเตอร์</h1>
          <p className="text-gray-600 text-sm">สแกน QR Code เพื่อดูแคตตาล็อกรถจักรยานยนต์ Honda</p>
        </div>

        <div className="flex justify-center mb-6" ref={qrRef}>
          <div className="p-4 bg-white rounded-xl shadow-inner border-2 border-gray-200">
            <QRCode
              value={catalogUrl}
              size={200}
              level="H"
            />
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={downloadQR}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
          >
            <Download className="h-5 w-5" />
            ดาวน์โหลด QR Code
          </button>
          <a
            href="/"
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
          >
            <Home className="h-5 w-5" />
            กลับหน้าหลัก
          </a>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-xl">
          <p className="text-sm text-blue-800 text-center">
            <strong>URL:</strong> {catalogUrl}
          </p>
        </div>

        <div className="mt-4 text-center">
          <a
            href="/admin"
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            ไปหน้าหลังบ้าน
          </a>
        </div>
      </div>
    </div>
  );
}
