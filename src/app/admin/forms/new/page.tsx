import { Suspense } from 'react';
import FormBuilder from '@/components/FormBuilder';

export const dynamic = 'force-dynamic';

export default function NewFormPage() {
  return (
    <Suspense fallback={null}>
      <FormBuilder />
    </Suspense>
  );
}
