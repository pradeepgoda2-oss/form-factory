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


export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const form = await prisma.form.findUnique({
        where: { slug },
        include: {
            questions: {
                orderBy: [{ row: "asc" }, { col: "asc" }, { order: "asc" }],
                include: { question: { include: { options: true } } }, // <-- important
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

type Body = {
  title?: string;
  slug?: string;
  description?: string | null;
  items?: Array<{ qid: string; row: number; col: number; span: number }>;
};

type Item = { qid: string; row: number; col: 1|2|3; span: 12|8|6|4 };

function validate(items: Item[]) {
  if (!Array.isArray(items) || items.length === 0) throw new Error("items required");

  const byRow = new Map<number, Item[]>();
  const seenSlot = new Set<string>(); // (row,col) uniqueness

  for (const it of items) {
    if (!it?.qid) throw new Error("qid required");
    if (!Number.isInteger(it.row) || it.row < 1) throw new Error("row must be >= 1");
    if (![1, 2, 3].includes(it.col)) throw new Error("col must be 1..3");
    if (![12, 8, 6, 4].includes(it.span)) throw new Error("span must be 12|8|6|4");

    const key = `${it.row}:${it.col}`;
    if (seenSlot.has(key)) throw new Error(`duplicate slot row=${it.row} col=${it.col}`);
    seenSlot.add(key);

    const arr = byRow.get(it.row) ?? [];
    arr.push(it);
    byRow.set(it.row, arr);
  }

  
const ALLOWED_ROWS = new Set(["12", "6,6", "4,4,4", "4,8", "8,4"]);

  for (const [row, arr] of byRow) {
    const sorted = [...arr].sort((a, b) => a.col - b.col);
    const sig = sorted.map(a => a.span).join(",");
    if (!ALLOWED_ROWS.has(sig)) throw new Error(`row ${row} invalid layout (${sig})`);

    const sum = arr.reduce((s, a) => s + a.span, 0);
    if (sum !== 12) throw new Error(`row ${row} must sum to 12`);
  }
}

// tiny slugify + de-dup
function slugify(input: string) {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug: currentSlug } = await params;
    const { title, slug, description, items } = (await req.json()) as Body;

    if (!title || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'title and items required' }, { status: 400 });
    }

    validate(items);

    const finalSlug = slug && slug.length ? slugify(slug) : slugify(title);

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.form.findUnique({ where: { slug: currentSlug }, select: { id: true } });
      if (!existing) return null;

      const form = await tx.form.update({
        where: { id: existing.id },
        data: { title, slug: finalSlug, description: description ?? null },
      });

      await tx.formQuestion.deleteMany({ where: { formId: form.id } });

      await tx.formQuestion.createMany({
        data: items.map((it, idx) => ({
          formId: form.id,
          questionId: it.qid,
          row: it.row,
          col: it.col,
          span: it.span,
          order: idx,
        })),
      });

      return form;
    });

    if (!updated) return Response.json({ error: 'form not found' }, { status: 404 });
    return Response.json({ id: updated.id, slug: updated.slug }, { status: 200 });
  } catch (err: any) {
    if (err?.code === 'P2002' && err?.meta?.target?.includes('slug')) {
      return Response.json({ error: 'slug already exists' }, { status: 409 });
    }
    if (err?.code === 'P2003') {
      return Response.json({ error: 'One or more questionId values do not exist.', code: 'P2003' }, { status: 400 });
    }
    if (err?.code) {
      return Response.json({ error: err.message, code: err.code }, { status: 400 });
    }
    return Response.json({ error: err?.message ?? 'Failed' }, { status: 400 });
  }
}

