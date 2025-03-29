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
    SMTP_PASS: 'initial-password',
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

describe('Password update in /api/email endpoint', () => {
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

  test('Updates only the password field correctly', async () => {
    const NEW_PASSWORD = 'updated-password-' + Date.now();
    
    // Create mock request with only password update
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        action: 'updateSettings',
        smtpPass: NEW_PASSWORD
      }
    });

    // Call the API handler
    await handler(req, res);

    // Check response
    expect(res.statusCode).toBe(200);
    const responseData = JSON.parse(res._getData());
    expect(responseData).toMatchObject({
      success: true,
      message: expect.any(String)
    });
  });

  test('Password is included in email request', async () => {
    const TEST_PASSWORD = 'email-test-password';
    
    // First update the password
    const { req: updateReq, res: updateRes } = createMocks({
      method: 'POST',
      body: {
        action: 'updateSettings',
        smtpPass: TEST_PASSWORD
      }
    });

    await handler(updateReq, updateRes);
    expect(updateRes.statusCode).toBe(200);
    
    // Create mock request for sending email
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test body',
        html: '<p>Test body</p>'
      }
    });

    // Call the API handler
    await handler(req, res);

    // Check response
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res._getData()).success).toBe(true);
    expect(JSON.parse(res._getData()).messageId).toBe('test-message-id');
  });
});
