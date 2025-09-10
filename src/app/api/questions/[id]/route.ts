export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Ctx = { params: { id: string } }

/** Delete a question */
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await prisma.question.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/questions/:id error:', e)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}

/** Update a question (label, type, required, helpText, options[]) */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const id = params.id
    const { label, type, required, helpText, options } = await req.json()

    if (!label || !type) {
      return NextResponse.json({ error: 'label and type are required' }, { status: 400 })
    }

    // If type needs options, validate input
    const needsOptions = ['radio', 'checkbox', 'select'].includes(type)
    if (needsOptions && !Array.isArray(options)) {
      return NextResponse.json({ error: 'options[] required for this type' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.question.update({
        where: { id },
        data: {
          label,
          type,
          required: Boolean(required),
          helpText: helpText ?? null,
        },
      })

      // Replace options if provided
      if (Array.isArray(options)) {
        await tx.option.deleteMany({ where: { questionId: id } })
        if (options.length) {
          await tx.option.createMany({
            data: options.map((v: string) => ({
              questionId: id,
              label: v.trim(),
              value: v.trim(),
            })),
          })
        }
      }
    })

    const updated = await prisma.question.findUnique({
      where: { id },
      include: { options: true },
    })
    return NextResponse.json(updated)
  } catch (e) {
    console.error('PATCH /api/questions/:id error:', e)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
