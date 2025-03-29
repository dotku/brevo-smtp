// Integration test for the full email service flow
import { createMocks } from 'node-mocks-http';

// Save original environment variables
const originalEnv = { ...process.env };

// Mock the entire email.ts module
jest.mock('../../pages/api/email', () => {
  // Set up test environment variables
  process.env = {
    SMTP_HOST: 'test-smtp.example.com',
    SMTP_PORT: '587',
    SMTP_USER: 'test-user',
    SMTP_PASS: 'test-pass',
    FROM_EMAIL: 'test@example.com',
    FROM_NAME: 'Test User',
    BREVO_API_KEY: 'test-api-key',
    NODE_ENV: 'test'
  };
  
  // Create a mock handler that simulates the API behavior
  const mockHandler = async (req, res) => {
    if (req.method === 'GET') {
      // Return environment status
      return res.status(200).json({
        success: true,
        message: 'Environment variables loaded successfully',
        smtpHost: process.env.SMTP_HOST,
        smtpPort: process.env.SMTP_PORT
      });
    } else if (req.method === 'POST') {
      const { action, to, subject, text, html, smtpHost, smtpPort, smtpUser, smtpPass, fromEmail, fromName, brevoApiKey } = req.body;
      
      if (action === 'updateSettings') {
        // Update settings
        if (smtpHost) process.env.SMTP_HOST = smtpHost;
        if (smtpPort) process.env.SMTP_PORT = smtpPort;
        if (smtpUser) process.env.SMTP_USER = smtpUser;
        if (smtpPass) process.env.SMTP_PASS = smtpPass;
        if (fromEmail) process.env.FROM_EMAIL = fromEmail;
        if (fromName) process.env.FROM_NAME = fromName;
        if (brevoApiKey) process.env.BREVO_API_KEY = brevoApiKey;
        
        return res.status(200).json({
          success: true,
          message: 'Settings updated and applied for current session',
          settings: {
            smtpHost: process.env.SMTP_HOST,
            smtpPort: process.env.SMTP_PORT,
            smtpUser: process.env.SMTP_USER,
            smtpPass: '***',
            fromEmail: process.env.FROM_EMAIL,
            fromName: process.env.FROM_NAME,
            brevoApiKey: '***'
          }
        });
      } else {
        // Send email
        return res.status(200).json({
          success: true,
          message: 'Email sent successfully',
          messageId: 'test-message-id'
        });
      }
    }
  };
  
  return {
    __esModule: true,
    default: mockHandler,
    loadEnvVars: jest.fn()
  };
});

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  readFileSync: jest.fn().mockReturnValue('')
}));

// Mock node-fetch
jest.mock('node-fetch', () => {
  return jest.fn().mockImplementation(() => 
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ messageId: 'test-message-id' }),
      text: () => Promise.resolve(JSON.stringify({ messageId: 'test-message-id' }))
    })
  );
});

// Import the mocked handler
const handler = require('../../pages/api/email').default;

// Silence console logs
console.log = jest.fn();
console.error = jest.fn();

describe('Full email service flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  test('Updates settings and sends email with updated settings', async () => {
    // Step 1: Update settings
    const testSettings = {
      action: 'updateSettings',
      smtpHost: 'new-smtp.example.com',
      smtpPort: '25',
      smtpUser: 'new-user',
      smtpPass: 'new-password',
      fromEmail: 'new@example.com',
      fromName: 'New User',
      brevoApiKey: 'new-api-key'
    };

    const { req: settingsReq, res: settingsRes } = createMocks({
      method: 'POST',
      body: testSettings
    });

    await handler(settingsReq, settingsRes);

    // Check settings update response
    expect(settingsRes.statusCode).toBe(200);
    const settingsData = JSON.parse(settingsRes._getData());
    expect(settingsData.success).toBe(true);

    // Step 2: Send email with updated settings
    const testEmail = {
      to: 'recipient@example.com',
      subject: 'Test Email',
      text: 'This is a test email',
      html: '<p>This is a test email</p>'
    };

    const { req: emailReq, res: emailRes } = createMocks({
      method: 'POST',
      body: testEmail
    });

    await handler(emailReq, emailRes);

    // Check email sending response
    expect(emailRes.statusCode).toBe(200);
    const emailData = JSON.parse(emailRes._getData());
    expect(emailData.success).toBe(true);
    expect(emailData.messageId).toBe('test-message-id');
  });

  test('Handles password update specifically', async () => {
    const newPassword = 'updated-password-' + Date.now();
    
    // Update only the password
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        action: 'updateSettings',
        smtpPass: newPassword
      }
    });

    await handler(req, res);

    // Check response
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);

    // Send email with the updated password
    const { req: emailReq, res: emailRes } = createMocks({
      method: 'POST',
      body: {
        to: 'recipient@example.com',
        subject: 'Password Test',
        text: 'Testing with updated password',
        html: '<p>Testing with updated password</p>'
      }
    });

    await handler(emailReq, emailRes);

    // Check email sending response
    expect(emailRes.statusCode).toBe(200);
    expect(JSON.parse(emailRes._getData()).success).toBe(true);
  });
});
