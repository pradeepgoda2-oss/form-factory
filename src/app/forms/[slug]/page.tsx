// app/forms/[slug]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import FormRenderer from "@/components/FormRenderer";

export default async function FormViewPage( { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const form = await prisma.form.findUnique({
        where: { slug },
        include: {
            questions: {
                orderBy: [{ row: 'asc' }, { col: 'asc' }, { order: 'asc' }],
                include: { question: { include: { options: true } } }, // <-- important
            },
        }
    });

    if (!form) notFound();

    // Map DB → renderer props; tweak to your FormRender's expected shape
    const items = form.questions.map(fq => ({
        id: fq.id,
        qid: fq.questionId,
        row: fq.row,
        col: fq.col,
        span: fq.span,
        // include the full question for rendering controls
        question: fq.question,
    }));

    return (
        <div className="container py-3" style={{ maxWidth: 820 }}>
            <FormRenderer
                form={{ id: form.id, slug: form.slug, title: form.title, description: form.description ?? null, items }}

            />
        </div>
    );
}
