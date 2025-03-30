import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

const ENV_FILE_PATH = path.join(process.cwd(), '.env.local');

export async function POST(request: NextRequest) {
  try {
    const settings = await request.json();
    
    // Build environment variables string
    const envContent = Object.entries({
      SMTP_HOST: settings.smtpHost,
      SMTP_PORT: settings.smtpPort,
      SMTP_USER: settings.smtpUser,
      SMTP_PASS: settings.smtpPass,
      FROM_EMAIL: settings.fromEmail,
      FROM_NAME: settings.fromName,
      BREVO_API_KEY: settings.brevoApiKey,
    })
      .filter(([_, value]) => value) // Only include non-empty values
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Write to .env.local file
    await fs.writeFile(ENV_FILE_PATH, envContent);

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully. Please restart the server for changes to take effect.',
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to save settings',
    }, { status: 500 });
  }
}
