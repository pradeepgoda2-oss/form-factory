export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const items = await prisma.question.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { options: true },
    });
    return NextResponse.json(items);
  } catch (e) {
    console.error('GET /api/questions error:', e);
    return NextResponse.json({ error: 'Failed to list' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { label, sortOrder, type, required, helpText, options, fileMultiple = null } = await req.json();
    if (!label || !type) {
      return NextResponse.json({ error: 'label and type are required' }, { status: 400 });
    }

    const created = await prisma.question.create({
      data: {
        label,
        sortOrder,
        type,
        required: Boolean(required),
        helpText: helpText ?? null,
        fileMultiple: String(type).toUpperCase() === "FILE" ? fileMultiple : null,
        ...(Array.isArray(options) && options.length
          ? { options: { create: options.map((v: string) => ({ label: v.trim(), value: v.trim() })) } }
          : {}),
      },
      include: { options: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error('POST /api/questions error:', e);
    return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
  }
}
