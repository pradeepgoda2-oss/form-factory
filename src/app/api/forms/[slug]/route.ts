// src/app/api/forms/[slug]/route.ts
import { NextResponse } from 'next/server';
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";


export async function DELETE(
    _req: Request,
    { params }: { params: { slug: string } }
) {
    const { slug } = params;
    if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

    try {
        await prisma.form.delete({ where: { slug } });
        return NextResponse.json({ ok: true });
    } catch (e: any) {
        // If you want to block delete when responses exist, we can change this later.
        console.error('DELETE /api/forms/[slug] error:', e);
        return NextResponse.json({ error: 'Failed to delete form' }, { status: 500 });
    }
}


export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const form = await prisma.form.findUnique({
    where: { slug: params.slug },
    include: {
      questions: {
        orderBy: [{ row: "asc" }, { col: "asc" }, { order: "asc" }],
        include: { question: true },
      },
    },
  });
  if (!form) return Response.json({ error: "not found" }, { status: 404 });

  return Response.json({
    id: form.id,
    title: form.title,
    slug: form.slug,
    description: form.description,
    items: form.questions.map(fq => ({
      id: fq.id,
      qid: fq.questionId,
      row: fq.row,
      col: fq.col,
      span: fq.span,
      order: fq.order ?? null,
    })),
  });
}
