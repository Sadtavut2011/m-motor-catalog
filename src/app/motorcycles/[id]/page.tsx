import { Suspense } from 'react';
import MotorcycleDetailView from './MotorcycleDetailView';

async function MotorcycleDetailContainer({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MotorcycleDetailView id={id} />;
}

export default function MotorcycleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">กำลังโหลดข้อมูลรถ...</p>
          </div>
        </div>
      }
    >
      <MotorcycleDetailContainer params={params} />
    </Suspense>
  );
}
