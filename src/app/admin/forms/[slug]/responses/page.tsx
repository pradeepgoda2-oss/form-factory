import {prisma} from '@/lib/prisma';
import Link from 'next/link';

export default async function FormResponsesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const form = await prisma.form.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      responses: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true, name: true, email: true },
      },
    },
  });

  if (!form) return <div className="container py-5">Form not found</div>;

  return (
    <div className="container py-4">
      <h1 className="h5 mb-3">{form.title} — Responses</h1>
      {form.responses.length === 0 ? (
        <div className="text-muted">No responses yet.</div>
      ) : (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Submitted</th>
                <th>Name</th>
                <th>Email</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {form.responses.map(r => (
                <tr key={r.id}>
                  <td>{new Date(r.createdAt).toLocaleString()}</td>
                  <td>{r.name ?? <span className="text-muted">Anonymous</span>}</td>
                  <td>{r.email ?? <span className="text-muted">—</span>}</td>
                  <td>
                    <Link
                      href={`./responses/${r.id}`}
                      className="btn btn-sm btn-primary"
                    >
                      View Response
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
