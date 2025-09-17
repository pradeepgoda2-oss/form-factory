import FormBuilder from '@/components/FormBuilder';

export default function EditFormPage({ params }: { params: { slug: string } }) {
  return <FormBuilder slug={params.slug} />;
}
