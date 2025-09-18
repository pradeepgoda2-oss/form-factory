// src/app/api/forms/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { NextRequest } from "next/server";

// tiny slugify + de-dup
function slugify(input: string) {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export async function GET() {
    try {
        const forms = await prisma.form.findMany({
            orderBy: { sortOrder: 'asc' },
            select: {
                id: true,
                slug: true,
                title: true,
                sortOrder: true,
                createdAt: true,
            },
        });
        return NextResponse.json(forms);
    } catch (e) {
        console.error('GET /api/forms error:', e);
        return NextResponse.json({ error: 'Failed to fetch forms' }, { status: 500 });
    }
}

type Item = { qid: string; row: number; col: 1|2|3; span: 12|8|6|4 };
type Body = { title: string; slug?: string; description?: string; items: Item[] };

const ALLOWED_ROWS = new Set(["12", "6,6", "4,4,4", "4,8", "8,4"]);

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

  for (const [row, arr] of byRow) {
    const sorted = [...arr].sort((a, b) => a.col - b.col);
    const sig = sorted.map(a => a.span).join(",");
    if (!ALLOWED_ROWS.has(sig)) throw new Error(`row ${row} invalid layout (${sig})`);

    const sum = arr.reduce((s, a) => s + a.span, 0);
    if (sum !== 12) throw new Error(`row ${row} must sum to 12`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, slug, description, items } = (await req.json()) as Body;
    if (!title || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: "title and items required" }, { status: 400 });
    }

    validate(items);

    const finalSlug = slug && slug.length ? slugify(slug) : slugify(title);

    const form = await prisma.$transaction(async (tx) => {
      const created = await tx.form.create({
        data: { title, slug: finalSlug, description: description ?? null },
      });

      await tx.formQuestion.createMany({
        data: items.map((it, idx) => ({
          formId: created.id,
          questionId: it.qid,
          row: it.row,
          col: it.col,
          span: it.span,
          order: idx, // stable render
        })),
        skipDuplicates: false,
      });

      return created;
    });

    return Response.json({ id: form.id, slug: form.slug }, { status: 201 });
  } catch (err: any) {
  // Prisma Known Request Error
  if (err?.code === "P2002" && err?.meta?.target?.includes("slug")) {
    return Response.json({ error: "slug already exists" }, { status: 409 });
  }
  if (err?.code === "P2003") {
    // FK violation → at least one questionId does not exist
    return Response.json({ error: "One or more questionId values do not exist.", code: "P2003" }, { status: 400 });
  }
  if (err?.code) {
    return Response.json({ error: err.message, code: err.code }, { status: 400 });
  }
  return Response.json({ error: err?.message ?? "Failed" }, { status: 400 });
}

}
