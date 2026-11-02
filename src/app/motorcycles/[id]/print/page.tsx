import { Suspense } from 'react';
import SingleMotorcyclePrintView from './SingleMotorcyclePrintView';

async function SinglePrintContainer({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SingleMotorcyclePrintView id={id} />;
}

export default function SingleMotorcyclePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-sm w-full">
            <div className="animate-spin rounded-full h-14 w-14 border-4 border-red-600 border-t-transparent mx-auto mb-4" />
            <p className="text-gray-900 font-bold text-lg mb-1">กำลังโหลดหน้าพิมพ์</p>
            <p className="text-gray-500 text-sm">เตรียมข้อมูลเอกสาร A4...</p>
          </div>
        </div>
      }
    >
      <SinglePrintContainer params={params} />
    </Suspense>
  );
}
