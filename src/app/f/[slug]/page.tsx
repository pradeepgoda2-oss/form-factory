import { prisma } from '@/lib/prisma';
import FormRenderer from '@/components/FormRenderer';
import { FormDef } from '@/lib/types';

type Params = { params: { slug: string } };

async function getForm(slug: string): Promise<FormDef | null> {
  const form = await prisma.form.findUnique({
    where: { slug },
    include: {
      questions: {
        orderBy: { sortOrder: 'asc' },
        include: {
          question: {
            select: {
              id: true,
              label: true,
              type: true,
              required: true,
              helpText: true,
              fileMultiple: true,
              options: {
                select: { id: true, label: true, value: true },
              },
            },
          },
        }
      },
    },
  });
  if (!form) return null;

  return {
    id: form.id,
    slug: form.slug,
    title: form.title,
    description: form.description ?? undefined,
    questions: form.questions.map((fq) => {
      const q = fq.question;
      return {
        id: q.id,
        label: q.label,
        helpText: q.helpText ?? undefined,
        type: q.type as any,
        required: q.required,
        fileMultiple: q.fileMultiple,
        options: q.options.map(o => ({ id: o.id, label: o.label, value: o.value })),
      };
    }),
  };
}

export default async function FormPage({ params }: Params) {
  const form = await getForm(params.slug);
  return (
    <main className="container py-5">
      {!form ? <div className="alert alert-warning">Form not found.</div> : <FormRenderer form={form} />}
    </main>
  );
}
