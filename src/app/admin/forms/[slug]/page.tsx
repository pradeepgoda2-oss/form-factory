import FormBuilder from '@/components/FormBuilder';

export default async function EditFormPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    return <FormBuilder slug={slug} />;
}
