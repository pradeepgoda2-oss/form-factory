// src/app/api/forms/[slug]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
