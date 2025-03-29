import type { NextApiRequest, NextApiResponse } from 'next';
import { 
  getRedisClient,
  maskSensitiveData,
  generateRequestId,
  logStateChange,
  getEmailSettings,
  loadEnvVars,
  sendEmailSmtp,
  sendEmailBrevo
} from './utils';

type EmailResponse = {
  success: boolean;
  message: string;
  [key: string]: any;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EmailResponse>
) {
  // Generate a unique request ID for tracking
  const requestId = generateRequestId();
  
  // Load environment variables
  loadEnvVars();
  
  // Handle GET requests - return API status and available actions
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      message: 'Email API is running',
      availableActions: [
        { action: 'updateSettings', method: 'POST', description: 'Update email settings' },
        { action: 'resetSettings', method: 'POST', description: 'Reset to server settings' },
        { action: 'sendEmail', method: 'POST', description: 'Send an email (default action for POST)' }
      ]
    });
  }
  
  // Handle settings update request
  if (req.method === 'POST' && req.body.action === 'updateSettings') {
    try {
      const { 
        smtpHost, 
        smtpPort, 
        smtpUser, 
        smtpPass, 
        fromEmail, 
        fromName,
        brevoApiKey 
      } = req.body;
      
      // Log the settings update request (before)
      await logStateChange('settings_update_before', {
        requestId,
        currentSettings: {
          smtpHost: process.env.SMTP_HOST,
          smtpPort: process.env.SMTP_PORT,
          smtpUser: process.env.SMTP_USER,
          smtpPass: maskSensitiveData(process.env.SMTP_PASS),
          fromEmail: process.env.FROM_EMAIL,
          fromName: process.env.FROM_NAME,
          brevoApiKey: maskSensitiveData(process.env.BREVO_API_KEY)
        }
      });
      
      // Update environment variables
      process.env.SMTP_HOST = smtpHost;
      process.env.SMTP_PORT = smtpPort;
      process.env.SMTP_USER = smtpUser;
      if (smtpPass) process.env.SMTP_PASS = smtpPass;
      process.env.FROM_EMAIL = fromEmail;
      process.env.FROM_NAME = fromName;
      if (brevoApiKey) process.env.BREVO_API_KEY = brevoApiKey;
      
      // Log the settings update request (after)
      await logStateChange('settings_update_after', {
        requestId,
        newSettings: {
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPass: maskSensitiveData(smtpPass),
          fromEmail,
          fromName,
          brevoApiKey: maskSensitiveData(brevoApiKey)
        }
      });
      
      return res.status(200).json({
        success: true,
        message: 'Settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  // Handle settings reset request
  if (req.method === 'POST' && req.body.action === 'resetSettings') {
    try {
      // Load environment variables to ensure they're up to date
      loadEnvVars();
      
      // Initialize Redis client
      await getRedisClient();
      
      // Get current settings from environment variables
      const settings = getEmailSettings();
      
      // Create a response object with the server settings
      const serverSettings = {
        success: true,
        message: 'Current server settings retrieved',
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        smtpUser: settings.smtpUser,
        smtpPass: settings.smtpPass,
        fromEmail: settings.fromEmail,
        fromName: settings.fromName,
        brevoApiKey: settings.brevoApiKey
      };
      
      // Try to log the settings reset request, but don't fail if Redis has issues
      try {
        await logStateChange('settings_reset', {
          requestId,
          serverSettings: {
            smtpHost: settings.smtpHost,
            smtpPort: settings.smtpPort,
            smtpUser: settings.smtpUser,
            smtpPass: maskSensitiveData(settings.smtpPass),
            fromEmail: settings.fromEmail,
            fromName: settings.fromName,
            brevoApiKey: maskSensitiveData(settings.brevoApiKey)
          }
        });
      } catch (logError) {
        console.error('Error logging settings reset (continuing anyway):', logError);
        // Don't fail the whole request if just logging fails
      }
      
      // Return the settings regardless of whether logging succeeded
      return res.status(200).json(serverSettings);
    } catch (error) {
      console.error('Error handling settings reset:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve server settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  // Handle POST requests for sending emails
  if (req.method === 'POST' && req.body.action !== 'updateSettings' && req.body.action !== 'resetSettings') {
    try {
      const { 
        to, 
        subject, 
        html, 
        text, 
        method = 'smtp' 
      } = req.body;
      
      // Log API request
      await logStateChange('api_request', {
        requestId,
        method: 'POST',
        path: '/api/email',
        body: {
          to,
          subject,
          method
        }
      });
      
      // Validate required fields
      if (!to || !subject || (!html && !text)) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: to, subject, and either html or text'
        });
      }
      
      // Send email based on method
      let result;
      if (method === 'brevo') {
        result = await sendEmailBrevo(to, subject, html, text || html, requestId);
      } else {
        result = await sendEmailSmtp(to, subject, html, text || html, requestId);
      }
      
      return res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      // Log API error
      await logStateChange('api_error', {
        requestId,
        method: 'POST',
        path: '/api/email',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      console.error('Error sending email:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  // Handle unsupported methods
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }
}
