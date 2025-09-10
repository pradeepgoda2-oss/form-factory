import { prisma } from '@/lib/prisma';

function prettyValue(v: string | null) {
  if (!v) return '';
  try {
    const parsed = JSON.parse(v);
    if (Array.isArray(parsed)) return parsed.join(', ');
  } catch {}
  return v;
}

export default async function ResponsesPage() {
  const form = await prisma.form.findUnique({
    where: { slug: 'demo' }, // change slug if needed
    include: {
      questions: {
        orderBy: { sortOrder: 'asc' },
        include: { question: true },
      },
      responses: {
        orderBy: { createdAt: 'desc' },
        include: { answers: true },
      },
    },
  });

  if (!form) {
    return (
      <main className="container py-5">
        <div className="alert alert-warning">Form “demo” not found.</div>
      </main>
    );
  }

  const labelByQid = new Map(form.questions.map((fq) => [fq.questionId, fq.question.label]));

  return (
    <main className="container py-5">
      <h1 className="h4 mb-3">Responses — {form.title}</h1>

      {!form.responses.length ? (
        <div className="text-secondary">No responses yet.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle">
            <thead>
              <tr>
                <th style={{width: 240}}>Response ID</th>
                <th style={{width: 200}}>Created</th>
                <th>User Email</th>
                <th>Answers</th>
              </tr>
            </thead>
            <tbody>
              {form.responses.map((r) => (
                <tr key={r.id}>
                  <td><code>{r.id}</code></td>
                  <td>{new Date(r.createdAt).toLocaleString()}</td>
                  <td>{r.userEmail ?? <span className="text-secondary">—</span>}</td>
                  <td>
                    <div className="small">
                      {r.answers.map((a) => (
                        <div key={a.id}>
                          <strong>{labelByQid.get(a.questionId) ?? a.questionId}:</strong>{' '}
                          {prettyValue(a.value)}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
