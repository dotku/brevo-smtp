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

type ApiResponse = {
  success: boolean;
  message: string;
  [key: string]: any;
};

/**
 * API handler for email functionality
 * Handles GET requests for status and POST requests for email sending and settings management
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // Handle GET requests
  if (req.method === 'GET') {
    // Load environment variables
    loadEnvVars();
    
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
  
  // Handle POST requests
  if (req.method === 'POST') {
    // Generate a unique request ID for tracking
    const requestId = generateRequestId();
    
    // Load environment variables
    loadEnvVars();
    
    try {
      // Parse request body
      const body = req.body;
      
      // Handle settings update request
      if (body.action === 'updateSettings') {
        const { 
          smtpHost, 
          smtpPort, 
          smtpUser, 
          smtpPass, 
          fromEmail, 
          fromName,
          brevoApiKey 
        } = body;
        
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
      }
      
      // Handle settings reset request
      if (body.action === 'resetSettings') {
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
      }
      
      // Handle email sending (default action)
      const { 
        to, 
        subject, 
        html, 
        text, 
        method = 'smtp' 
      } = body;
      
      // Log API request
      await logStateChange('api_request', {
        requestId,
        method: 'POST',
        path: '/api/route',
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
        path: '/api/route',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      console.error('Error handling request:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to process request',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  // Method not allowed
  return res.status(405).json({
    success: false,
    message: 'Method not allowed'
  });
}
