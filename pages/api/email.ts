import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

// Helper function to mask sensitive data
function maskSensitiveData(value: string | undefined): string {
  if (!value) return '';
  
  // Show first 3 characters and mask the rest
  const firstPart = value.substring(0, 3);
  const maskedPart = '*'.repeat(Math.min(value.length - 3, 3));
  return `${firstPart}${maskedPart}`;
}

// Define response types
type EmailResponse = {
  messageId: string;
};

type ApiResponse = {
  success: boolean;
  message: string;
  settings?: {
    smtpHost: string | undefined;
    smtpPort: string | undefined;
    smtpUser: string | undefined;
    smtpPass: string | undefined;
    fromEmail: string | undefined;
    fromName: string | undefined;
    brevoApiKey: string | undefined;
  };
  error?: string;
  messageId?: string;
  status?: string;
  environment?: string;
  usedClientSettings?: boolean;
  details?: string;
  needsSettings?: boolean;
  envVarsLoaded?: boolean;
  fromEmail?: string;
  smtpUser?: string;
  smtpPass?: string;
  fromName?: string;
  brevoApiKey?: string;
};

// Custom environment variable loader that ensures .env.local overrides .env
function loadEnvVars() {
  const envLocalPath = path.join(process.cwd(), ".env.local");
  const envPath = path.join(process.cwd(), ".env");
  
  console.log("Loading environment variables...");
  
  try {
    let envVars: Record<string, string> = {};
    
    // Load .env file if it exists
    if (fs.existsSync(envPath)) {
      console.log(".env file exists, loading...");
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envLines = envContent.split('\n');
      
      for (const line of envLines) {
        if (line.trim() && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            envVars[key.trim()] = value;
          }
        }
      }
    }
    
    // Load .env.local file if it exists (will override .env)
    if (fs.existsSync(envLocalPath)) {
      console.log(".env.local file exists, loading (will override .env)...");
      const envLocalContent = fs.readFileSync(envLocalPath, 'utf8');
      const envLocalLines = envLocalContent.split('\n');
      
      for (const line of envLocalLines) {
        if (line.trim() && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            if (envVars[key.trim()]) {
              console.log(`Overriding ${key.trim()} with value from .env.local`);
            }
            envVars[key.trim()] = value;
          }
        }
      }
    }
    
    // Set environment variables
    for (const [key, value] of Object.entries(envVars)) {
      process.env[key] = value;
    }
    
    console.log("Environment variables loaded:");
    console.log("SMTP_HOST:", process.env.SMTP_HOST);
    console.log("SMTP_PORT:", process.env.SMTP_PORT);
    console.log("SMTP_USER:", process.env.SMTP_USER ? maskSensitiveData(process.env.SMTP_USER) : "undefined");
    console.log("SMTP_PASS:", process.env.SMTP_PASS ? maskSensitiveData(process.env.SMTP_PASS) : "undefined");
    console.log("FROM_EMAIL:", process.env.FROM_EMAIL);
    console.log("FROM_NAME:", process.env.FROM_NAME);
    console.log("BREVO_API_KEY:", process.env.BREVO_API_KEY ? maskSensitiveData(process.env.BREVO_API_KEY) : "undefined");
    
    return envVars;
  } catch (error) {
    console.error('Error loading environment variables:', error);
    throw error;
  }
}

// Load environment variables with our custom function
try {
  loadEnvVars();
} catch (error) {
  console.error("Failed to load environment variables:", error);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse | EmailResponse>
) {
  console.log(
    `[${new Date().toISOString()}] Received ${req.method} request to ${req.url}`
  );

  // Get environment status for GET requests
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      message: 'Environment status retrieved',
      status: 'ok',
      environment: process.env.NODE_ENV || 'development',
      fromEmail: process.env.FROM_EMAIL,
      smtpUser: maskSensitiveData(process.env.SMTP_USER),
      smtpPass: maskSensitiveData(process.env.SMTP_PASS),
      fromName: process.env.FROM_NAME,
      brevoApiKey: maskSensitiveData(process.env.BREVO_API_KEY),
      envVarsLoaded: true
    });
  }

  // Update settings for POST requests with settings update
  if (req.method === 'POST' && req.body.action === 'updateSettings') {
    try {
      const { smtpHost, smtpPort, smtpUser, smtpPass, fromEmail, fromName, brevoApiKey } = req.body;
      
      // Debug log
      console.log('Received settings update request with:', {
        smtpHost: smtpHost || 'not provided',
        smtpPort: smtpPort || 'not provided',
        smtpUser: smtpUser || 'not provided',
        smtpPass: smtpPass ? 'provided (masked)' : 'not provided',
        fromEmail: fromEmail || 'not provided',
        fromName: fromName || 'not provided',
        brevoApiKey: brevoApiKey ? 'provided (masked)' : 'not provided'
      });
      
      // Create a temporary object to store the updated settings
      const updatedSettings: Record<string, string> = {};
      
      // Only update settings that are provided
      if (smtpHost) updatedSettings['SMTP_HOST'] = smtpHost;
      if (smtpPort) updatedSettings['SMTP_PORT'] = smtpPort;
      if (smtpUser) updatedSettings['SMTP_USER'] = smtpUser;
      if (smtpPass) updatedSettings['SMTP_PASS'] = smtpPass;
      if (fromEmail) updatedSettings['FROM_EMAIL'] = fromEmail;
      if (fromName) updatedSettings['FROM_NAME'] = fromName;
      if (brevoApiKey) updatedSettings['BREVO_API_KEY'] = brevoApiKey;
      
      // Update process.env with the new settings
      Object.keys(updatedSettings).forEach(key => {
        process.env[key] = updatedSettings[key];
      });
      
      console.log('Settings updated:');
      console.log('SMTP_HOST:', process.env.SMTP_HOST);
      console.log('SMTP_PORT:', process.env.SMTP_PORT);
      console.log('SMTP_USER:', process.env.SMTP_USER ? maskSensitiveData(process.env.SMTP_USER) : "undefined");
      console.log('SMTP_PASS:', process.env.SMTP_PASS ? maskSensitiveData(process.env.SMTP_PASS) : "undefined");
      console.log('FROM_EMAIL:', process.env.FROM_EMAIL);
      console.log('FROM_NAME:', process.env.FROM_NAME);
      console.log('BREVO_API_KEY:', process.env.BREVO_API_KEY ? maskSensitiveData(process.env.BREVO_API_KEY) : "undefined");
      
      return res.status(200).json({
        success: true,
        message: 'Settings applied for current session',
        settings: {
          smtpHost: process.env.SMTP_HOST,
          smtpPort: process.env.SMTP_PORT,
          smtpUser: maskSensitiveData(process.env.SMTP_USER),
          smtpPass: maskSensitiveData(process.env.SMTP_PASS),
          fromEmail: process.env.FROM_EMAIL,
          fromName: process.env.FROM_NAME,
          brevoApiKey: maskSensitiveData(process.env.BREVO_API_KEY)
        }
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update settings',
        error: String(error)
      });
    }
  }

  // Handle POST requests for sending emails
  if (req.method === 'POST' && req.body.action !== 'updateSettings') {
    try {
      const { 
        to, 
        subject, 
        html, 
        text, 
        // Get settings from request if provided
        smtpHost, 
        smtpPort, 
        smtpUser, 
        smtpPass, 
        fromEmail, 
        fromName, 
        brevoApiKey 
      } = req.body;

      // Validate required fields
      if (!to || !subject || (!html && !text)) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
          error: 'Missing required fields'
        });
      }

      // Use settings from request if provided, otherwise use environment variables
      const apiKey = brevoApiKey || process.env.BREVO_API_KEY;
      const sender = {
        name: fromName || process.env.FROM_NAME || 'Email Service',
        email: fromEmail || process.env.FROM_EMAIL || 'noreply@example.com'
      };

      // Check if we have the required API key
      if (!apiKey) {
        return res.status(400).json({
          success: false,
          message: 'Missing Brevo API Key',
          error: 'Missing Brevo API Key',
          details: 'Please set the BREVO_API_KEY environment variable or provide it in the request',
          needsSettings: true
        });
      }

      // Send email using Brevo API
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': apiKey
        },
        body: JSON.stringify({
          sender,
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: text
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error sending email via Brevo API:', errorData);
        return res.status(response.status).json({
          success: false,
          message: 'Failed to send email via Brevo API',
          error: 'Failed to send email',
          details: errorData
        });
      }

      const data = await response.json();
      console.log('Email sent successfully via Brevo API:', data);

      return res.status(200).json({
        success: true,
        message: 'Email sent successfully',
        messageId: data.messageId,
        usedClientSettings: !!brevoApiKey
      });
    } catch (error) {
      console.error('Error sending email:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: String(error),
        details: error instanceof Error ? error.stack : String(error)
      });
    }
  }

  // Return 405 for other methods
  return res.status(405).json({
    success: false,
    message: 'Method not allowed',
    error: `Method ${req.method} not allowed`
  });
}
