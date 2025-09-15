// src/app/api/forms/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// tiny slugify + de-dup
function slugify(input: string) {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

async function uniqueSlug(base: string) {
    let candidate = base || 'form';
    let i = 1;
    // Try candidate, candidate-2, candidate-3, ...
    while (true) {
        const exists = await prisma.form.findUnique({ where: { slug: candidate } });
        if (!exists) return candidate;
        i += 1;
        candidate = `${base}-${i}`;
    }
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

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { title, description = null, sortOrder = 0 } = body ?? {};
        if (!title || typeof title !== 'string') {
            return NextResponse.json({ error: 'title is required' }, { status: 400 });
        }
        const base = slugify(title);
        const slug = await uniqueSlug(base);

        const created = await prisma.form.create({
            data: { title, description, slug, sortOrder },
            select: { id: true, slug: true, title: true, sortOrder: true, createdAt: true },
        });

        return NextResponse.json(created, { status: 201 });
    } catch (e) {
        console.error('POST /api/forms error:', e);
        return NextResponse.json({ error: 'Failed to create form' }, { status: 500 });
    }
}
