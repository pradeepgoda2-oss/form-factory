import { prisma } from '@/lib/prisma';
import FormRenderer from '@/components/FormRenderer';

function toAnswersMap(answers: { questionId: string; value: any }[]) {
    const map: Record<string, string> = {};
    for (const a of answers) {
        if (Array.isArray(a.value)) map[a.questionId] = a.value.join(', ');
        else if (a?.value == null) map[a.questionId] = '';
        else map[a.questionId] = String(a.value);
    }
    return map;
}

export default async function ResponseViewPage({
    params,
}: {
    params: Promise<{ slug: string; rid: string }>;
}) {
    const { slug, rid } = await params;

    const form = await prisma.form.findUnique({
        where: { slug },
        include: {
            questions: {
                orderBy: [{ row: 'asc' }, { col: 'asc' }, { order: 'asc' }],
                include: { question: { include: { options: true } } },
            },
        },
    });
    if (!form) return <div className="container py-5">Form not found</div>;

    const resp = await prisma.response.findUnique({
        where: { id: rid },
        include: { answers: true },
    });
    if (!resp || resp.formId !== form.id) {
        return <div className="container py-5">Response not found</div>;
    }

    const answersMap = toAnswersMap(resp.answers);
    const items = form.questions.map(it => ({
        id: it.id,
        qid: it.questionId,
        row: it.row,
        col: it.col,
        span: it.span,
        question: it.question,
    }));

    return (
        <div className="container py-4">
            <h1 className="h5 mb-3">{form.title} — Response</h1>
            <FormRenderer form={{ id: form.id, title: form.title, items }} mode="review" answers={answersMap} />
        </div>
    );
}
