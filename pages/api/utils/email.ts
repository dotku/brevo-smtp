import nodemailer from 'nodemailer';
import SibApiV3Sdk from 'sib-api-v3-sdk';
import { getEmailSettings } from './environment';
import { logStateChange } from './logging';

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
        error: error.message
      });
    }
    
    return {
      success: false,
      message: `Failed to send email: ${error.message}`,
      error
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
    
    // Configure API key authorization
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = settings.brevoApiKey;
    
    // Create API instance
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    
    // Create sender
    const sender = {
      email: settings.fromEmail,
      name: settings.fromName
    };
    
    // Create recipient
    const recipient = {
      email: to
    };
    
    // Create email
    const email = new SibApiV3Sdk.SendSmtpEmail();
    email.sender = sender;
    email.to = [recipient];
    email.subject = subject;
    email.htmlContent = html;
    email.textContent = text;
    
    // Send email
    const response = await apiInstance.sendTransacEmail(email);
    
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
        error: error.message
      });
    }
    
    return {
      success: false,
      message: `Failed to send email via Brevo API: ${error.message}`,
      error
    };
  }
}
