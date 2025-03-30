import { NextRequest, NextResponse } from 'next/server';
import { loadEnvVars, getEmailSettings } from '../utils/environment';
import nodemailer from 'nodemailer';

/**
 * GET handler for email API
 * Returns API status and available actions
 */
export async function GET(request: NextRequest) {
  await loadEnvVars();
  const settings = getEmailSettings();
  const envVarsLoaded = Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.FROM_EMAIL &&
    process.env.FROM_NAME
  );

  return NextResponse.json({
    success: true,
    message: envVarsLoaded ? 'Email API is running with environment variables' : 'Email API is running',
    envVarsLoaded,
    ...settings,
    availableActions: [
      { action: 'updateSettings', method: 'POST', description: 'Update email settings' },
      { action: 'resetSettings', method: 'POST', description: 'Reset to server settings' },
      { action: 'sendEmail', method: 'POST', description: 'Send an email (default action for POST)' }
    ]
  });
}

/**
 * POST handler for email API
 * Handles email sending and settings management
 */
export async function POST(request: NextRequest) {
  await loadEnvVars();
  const settings = getEmailSettings();
  
  try {
    const body = await request.json();
    const { to, subject, text } = body;

    if (!to || !subject || !text) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields'
      }, { status: 400 });
    }

    // Configure nodemailer
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: parseInt(settings.smtpPort),
      secure: settings.smtpPort === '465',
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

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully'
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to send email'
    }, { status: 500 });
  }
}
