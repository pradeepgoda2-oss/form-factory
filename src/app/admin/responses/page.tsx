import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function ResponsesHomePage() {
  const forms = await prisma.form.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      createdAt: true,
      _count: { select: { responses: true } },
    },
  });

  return (
    <div className="container py-4">
      <h1 className="h4 mb-3">Responses</h1>
      {forms.length === 0 ? (
        <div className="text-muted">No forms yet.</div>
      ) : (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>#</th>
                <th>Form</th>
                <th>Responses</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {forms.map((f, idx) => (
                <tr key={f.id}>
                  <td>{idx + 1}</td>
                  <td>{f.title}</td>
                  <td>{f._count.responses}</td>
                  <td>
                    <Link
                      href={`/admin/forms/${f.slug}/responses`}
                      className="btn btn-sm btn-primary"
                    >
                      View Responses
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
