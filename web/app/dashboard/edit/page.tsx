'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductForm from '@/components/ProductForm';

function EditInner() {
  const id = useSearchParams().get('id');
  if (!id) return null;
  return <ProductForm mode="edit" productId={id} />;
}

export default function EditProductPage() {
  return (
    <Suspense fallback={<div className="text-neutral-500">Загрузка…</div>}>
      <EditInner />
    </Suspense>
  );
}
