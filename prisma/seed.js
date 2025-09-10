const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // clean for dev
  await prisma.answer.deleteMany();
  await prisma.response.deleteMany();
  await prisma.formQuestion.deleteMany();
  await prisma.option.deleteMany();
  await prisma.question.deleteMany();
  await prisma.form.deleteMany();

  const form = await prisma.form.create({
    data: {
      slug: 'demo',
      title: 'Customer Feedback',
      description: 'Tell us about your experience.',
    },
  });

  const q1 = await prisma.question.create({ data: { label: 'Your Name', type: 'text', required: true }});
  const q2 = await prisma.question.create({ data: { label: 'Email', type: 'text' }});
  const q3 = await prisma.question.create({
    data: {
      label: 'How satisfied are you?', type: 'radio', required: true,
      options: { create: [
        { label: 'Very satisfied', value: '5' },
        { label: 'Satisfied', value: '4' },
        { label: 'Neutral', value: '3' },
        { label: 'Dissatisfied', value: '2' },
        { label: 'Very dissatisfied', value: '1' },
      ]},
    },
  });
  const q4 = await prisma.question.create({
    data: {
      label: 'Topics you care about', type: 'checkbox',
      options: { create: [
        { label: 'Speed', value: 'speed' },
        { label: 'Design', value: 'design' },
        { label: 'Features', value: 'features' },
      ]},
    },
  });
  const q5 = await prisma.question.create({ data: { label: 'Anything else?', type: 'textarea' }});
  const q6 = await prisma.question.create({ data: { label: 'Visit date', type: 'date' }});

  // link with order
  const qs = [q1, q2, q3, q4, q5, q6];
  for (let i = 0; i < qs.length; i++) {
    await prisma.formQuestion.create({
      data: { formId: form.id, questionId: qs[i].id, sortOrder: i + 1 },
    });
  }

  console.log('Seeded: /f/demo');
}

main().finally(() => prisma.$disconnect());
