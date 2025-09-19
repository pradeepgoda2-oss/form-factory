export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const TO = 'pradeepgoda2@gmail.com';

export async function POST(req: Request) {
  try {
    const { name = '', email = '', phone = '', message = '' } = await req.json();

    // minimal validation
    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!user || !pass) {
      return NextResponse.json({ error: 'Email not configured' }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });

    const subject = `Form Factory — New contact from ${name}`;
    const text = `Name: ${name}
Email: ${email}
Phone: ${phone || '(none)'}
  
Message:
${message}`;

    await transporter.sendMail({
      from: `Form Factory <${user}>`,
      to: TO,
      subject,
      text,
      replyTo: email,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}
