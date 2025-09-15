import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// DELETE /api/questions/:id
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    await prisma.question.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        // Record not found
        return NextResponse.json({ error: "Question not found" }, { status: 404 });
      }
      if (err.code === "P2003") {
        // Foreign key constraint (related rows exist)
        return NextResponse.json(
          { error: "Cannot delete: related data exists (FK constraint)" },
          { status: 409 }
        );
      }
    }
    console.error("DELETE /api/questions/:id failed:", err);
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const body = await req.json();

    const {
      label,
      type,
      sortOrder,
      required,
      helpText,
      // file config (used when type === "FILE")
      fileAccept,
      fileMaxSizeMB,
      fileMultiple,
      // OPTIONAL: pass options to replace existing ones for RADIO/CHECKBOX/SELECT
      options,
    } = body;

    // Build scalar update data (only include keys that were provided)
    const data: Record<string, any> = {};
    if (typeof label !== "undefined") data.label = label;
    if (typeof sortOrder !== "undefined") data.sortOrder = sortOrder;
    if (typeof type !== "undefined") data.type = type;
    if (typeof required !== "undefined") data.required = required;
    if (typeof helpText !== "undefined") data.helpText = helpText;

    if (typeof fileAccept !== "undefined") data.fileAccept = fileAccept;
    if (typeof fileMaxSizeMB !== "undefined") data.fileMaxSizeMB = fileMaxSizeMB;
    if (typeof fileMultiple !== "undefined") {
      data.fileMultiple = String(type).toUpperCase() === "FILE" ? fileMultiple : null;
    }

    // If options are provided AND the type is one that uses options,
    // replace them atomically inside a transaction.
    if (Array.isArray(options)) {
      const typeUsesOptions =
        typeof type !== "undefined"
          ? ["RADIO", "CHECKBOX", "SELECT"].includes(type)
          : // if type isn't changing, check current record's type
            undefined;

      // We will: delete existing options -> update scalars -> create new options
      const updated = await prisma.$transaction(async (tx) => {
        // If caller is replacing options, clear current ones first.
        await tx.option.deleteMany({ where: { questionId: id } });

        // Update scalar fields
        const q = await tx.question.update({
          where: { id },
          data,
        });

        // Only recreate options if the question type uses them
        const shouldCreateOptions =
          typeUsesOptions === undefined
            ? ["RADIO", "CHECKBOX", "SELECT"].includes(q.type as any)
            : typeUsesOptions;

        if (shouldCreateOptions && options.length > 0) {
          await tx.option.createMany({
            data: options.map((o: any) => ({
              label: o.label,
              value: o.value,
              questionId: id,
            })),
          });
        }

        return q;
      });

      return NextResponse.json(updated);
    }

    // No options in payload -> simple scalar update
    const updated = await prisma.question.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        return NextResponse.json({ error: "Question not found" }, { status: 404 });
      }
    }
    console.error("PUT /api/questions/:id failed:", err);
    return NextResponse.json({ error: "Failed to update question" }, { status: 500 });
  }
}