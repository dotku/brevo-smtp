import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import type { EmailSettings } from '../../../settings/page';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, subject, text, ...settings }: { to: string; subject: string; text: string } & EmailSettings = body;

    // Create transporter with settings from request
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: parseInt(settings.smtpPort),
      secure: parseInt(settings.smtpPort) === 465,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass,
      },
    });

    // Send email
    await transporter.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      to,
      subject,
      text,
    });

    return NextResponse.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Failed to send email:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send email' },
      { status: 500 }
    );
  }
}
