// src/app/api/responses/route.ts
export const runtime = 'nodejs'; // ensure Prisma works

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { formId, answers, userEmail } = await req.json();
    if (!formId || !answers) {
      return NextResponse.json({ error: 'Missing formId or answers' }, { status: 400 });
    }

    const response = await prisma.response.create({
      data: { formId, userEmail: userEmail ?? null },
    });

    const entries = Object.entries(answers as Record<string, unknown>);
    if (entries.length) {
      await prisma.answer.createMany({
        data: entries.map(([questionId, value]) => ({
          responseId: response.id,
          questionId,
          value: Array.isArray(value) ? JSON.stringify(value) : (value ?? '').toString(),
        })),
      });
    }

    return NextResponse.json({ id: response.id }, { status: 201 });
  } catch (e) {
    console.error('POST /api/responses error:', e);
    return NextResponse.json({ error: 'Failed to save response' }, { status: 500 });
  }
}
