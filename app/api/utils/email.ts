import nodemailer from 'nodemailer';
import { getEmailSettings } from './environment';
import { logStateChange } from './logging';
import { BrevoClient } from './brevo-client';

/**
 * Send email using SMTP
 * @param to Recipient email address
 * @param subject Email subject
 * @param html HTML content
 * @param text Plain text content
 * @param requestId Optional request ID for logging
 * @returns Object with success status and message
 */
export async function sendEmailSmtp(
  to: string, 
  subject: string, 
  html: string, 
  text: string,
  requestId?: string
) {
  const settings = getEmailSettings();
  
  try {
    // Log email attempt
    if (requestId) {
      await logStateChange('email_attempt', {
        requestId,
        method: 'smtp',
        to,
        subject,
        settings: {
          host: settings.smtpHost,
          port: settings.smtpPort,
          user: settings.smtpUser,
          from: settings.fromEmail
        }
      });
    }
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: parseInt(settings.smtpPort),
      secure: false,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass
      }
    });
    
    // Send email
    const info = await transporter.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      to,
      subject,
      text,
      html
    });
    
    // Log email success
    if (requestId) {
      await logStateChange('email_success', {
        requestId,
        method: 'smtp',
        messageId: info.messageId,
        response: info
      });
    }
    
    return {
      success: true,
      message: `Email sent: ${info.messageId}`,
      info
    };
  } catch (error) {
    console.error('SMTP email error:', error);
    
    // Log email error
    if (requestId) {
      await logStateChange('email_error', {
        requestId,
        method: 'smtp',
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    return {
      success: false,
      message: `Failed to send email: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Send email using Brevo API
 * @param to Recipient email address
 * @param subject Email subject
 * @param html HTML content
 * @param text Plain text content
 * @param requestId Optional request ID for logging
 * @returns Object with success status and message
 */
export async function sendEmailBrevo(
  to: string, 
  subject: string, 
  html: string, 
  text: string,
  requestId?: string
) {
  const settings = getEmailSettings();
  
  try {
    // Log email attempt
    if (requestId) {
      await logStateChange('email_attempt', {
        requestId,
        method: 'brevo',
        to,
        subject
      });
    }
    
    // Create Brevo client with API key
    const brevoClient = new BrevoClient(settings.brevoApiKey);
    
    // Create sender
    const sender = {
      email: settings.fromEmail,
      name: settings.fromName
    };
    
    // Create recipient
    const recipient = {
      email: to
    };
    
    // Send email
    const response = await brevoClient.sendTransactionalEmail({
      sender,
      to: [recipient],
      subject,
      htmlContent: html,
      textContent: text
    });
    
    // Log email success
    if (requestId) {
      await logStateChange('email_success', {
        requestId,
        method: 'brevo',
        response
      });
    }
    
    return {
      success: true,
      message: 'Email sent via Brevo API',
      response
    };
  } catch (error) {
    console.error('Brevo API error:', error);
    
    // Log email error
    if (requestId) {
      await logStateChange('email_error', {
        requestId,
        method: 'brevo',
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    return {
      success: false,
      message: `Failed to send email via Brevo API: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}
