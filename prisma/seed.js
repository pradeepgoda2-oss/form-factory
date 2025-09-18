// prisma/seed.js (CommonJS)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding…');

  // --- clean for dev (respect FK order)
  await prisma.answer.deleteMany();
  await prisma.response.deleteMany();
  await prisma.formQuestion.deleteMany();
  await prisma.option.deleteMany();
  await prisma.question.deleteMany();
  await prisma.form.deleteMany();

  // --- demo form
  const form = await prisma.form.create({
    data: {
      slug: 'demo',
      title: 'Customer Feedback',
      description: 'Tell us about your experience.',
    },
  });

  // --- questions (types use your enum: text/textarea/radio/checkbox/select/number/date/file)
  const q1 = await prisma.question.create({
    data: { label: 'Your Name', type: 'text', required: true },
  });

  const q2 = await prisma.question.create({
    data: { label: 'Email', type: 'text' },
  });

  const q3 = await prisma.question.create({
    data: {
      label: 'How satisfied are you?',
      type: 'radio',
      required: true,
      options: {
        create: [
          { label: 'Very satisfied', value: '5' },
          { label: 'Satisfied', value: '4' },
          { label: 'Neutral', value: '3' },
          { label: 'Dissatisfied', value: '2' },
          { label: 'Very dissatisfied', value: '1' },
        ],
      },
    },
  });

  const q4 = await prisma.question.create({
    data: {
      label: 'Topics you care about',
      type: 'checkbox',
      options: {
        create: [
          { label: 'Speed', value: 'speed' },
          { label: 'Design', value: 'design' },
          { label: 'Features', value: 'features' },
        ],
      },
    },
  });

  const q5 = await prisma.question.create({
    data: { label: 'Anything else?', type: 'textarea' },
  });

  const q6 = await prisma.question.create({
    data: { label: 'Visit date', type: 'date' },
  });

  // --- place questions on the form (uses your FormQuestion fields)
  // Layout plan:
  // Row 1: Name (6) | Email (6)
  // Row 2: Satisfaction (12)
  // Row 3: Topics (12)
  // Row 4: Anything else (12)
  // Row 5: Visit date (6)
  const placements = [
    { qid: q1.id, row: 1, col: 1, span: 6 },
    { qid: q2.id, row: 1, col: 7, span: 6 },
    { qid: q3.id, row: 2, col: 1, span: 12 },
    { qid: q4.id, row: 3, col: 1, span: 12 },
    { qid: q5.id, row: 4, col: 1, span: 12 },
    { qid: q6.id, row: 5, col: 1, span: 6 },
  ];

  await prisma.formQuestion.createMany({
    data: placements.map((p, idx) => ({
      formId: form.id,
      questionId: p.qid,
      // ordering & grid
      sortOrder: idx + 1,   // your model has sortOrder
      order: idx,           // optional; set too for stability
      row: p.row,
      col: p.col,
      span: p.span,
      // defaults exist for rowSpan/colSpan but set if you prefer:
      rowSpan: 1,
      colSpan: 1,
    })),
    skipDuplicates: false,
  });

  console.log('Seeded form at /forms/demo');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Done.');
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
