// Integration test for the full email service flow
import { createMocks } from 'node-mocks-http';
import handler from '../../pages/api/email';

// Define the global test logs array if it doesn't exist
if (!global.__TEST_LOGS) {
  global.__TEST_LOGS = [];
}

// Mock fetch for API calls
jest.mock('node-fetch', () => jest.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      messageId: 'test-message-id'
    }),
    text: () => Promise.resolve('{}')
  })
));

// Mock uuid to generate predictable IDs for testing
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-request-id')
}));

// Mock fs for file operations
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue(''),
  writeFileSync: jest.fn()
}));

describe('Full email service flow', () => {
  // Reset mocks and test logs before each test
  beforeEach(() => {
    jest.clearAllMocks();
    global.__TEST_LOGS = [];
    
    // Set up test environment
    process.env.NODE_ENV = 'test';
    process.env.TRACK_LOGS_IN_TEST = 'true';
    process.env.SMTP_HOST = 'original-smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'original-user';
    process.env.SMTP_PASS = 'original-password';
    process.env.FROM_EMAIL = 'original@example.com';
    process.env.FROM_NAME = 'Original User';
    process.env.BREVO_API_KEY = 'original-api-key';
    process.env.LOG_API_KEY = 'test-log-api-key';
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

    // Verify logs were created for the settings update
    expect(global.__TEST_LOGS.length).toBeGreaterThan(0);
    
    // Find the settings update logs
    const settingsBeforeLog = global.__TEST_LOGS.find(log => log.type === 'settings_update_before');
    const settingsAfterLog = global.__TEST_LOGS.find(log => log.type === 'settings_update_after');
    
    expect(settingsBeforeLog).toBeDefined();
    expect(settingsAfterLog).toBeDefined();
    
    // Verify the settings logs have the correct data structure
    expect(settingsBeforeLog.data).toHaveProperty('currentSettings');
    expect(settingsAfterLog.data).toHaveProperty('newSettings');
    
    // Verify the after state has the new values
    expect(settingsAfterLog.data.newSettings.smtpHost).toBe('new-smtp.example.com');
    expect(settingsAfterLog.data.newSettings.smtpPort).toBe('25');
    
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

    // Clear the test logs to track new entries
    global.__TEST_LOGS = [];
    
    await handler(emailReq, emailRes);

    // Check email sending response
    expect(emailRes.statusCode).toBe(200);
    const emailData = JSON.parse(emailRes._getData());
    expect(emailData.success).toBe(true);
    
    // Verify logs were created for the email sending
    expect(global.__TEST_LOGS.length).toBeGreaterThan(0);
    
    // Check for email sending logs
    const emailSendingLog = global.__TEST_LOGS.find(log => log.type === 'email_sending');
    
    expect(emailSendingLog).toBeDefined();
    
    // Verify the email sending log has the correct data
    expect(emailSendingLog.data.emailDetails.to).toBe('recipient@example.com');
    expect(emailSendingLog.data.emailDetails.subject).toBe('Test Email');
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
    
    // Verify logs were created for the password update
    expect(global.__TEST_LOGS.length).toBeGreaterThan(0);
    
    // Check for settings update logs
    const settingsBeforeLog = global.__TEST_LOGS.find(log => log.type === 'settings_update_before');
    const settingsAfterLog = global.__TEST_LOGS.find(log => log.type === 'settings_update_after');
    
    expect(settingsBeforeLog).toBeDefined();
    expect(settingsAfterLog).toBeDefined();
    
    // Verify the password is masked in the logs
    expect(settingsBeforeLog.data.currentSettings.smtpPass).not.toBe(newPassword);
    expect(settingsAfterLog.data.newSettings.smtpPass).not.toBe(newPassword);
    
    // Verify the password is masked but we can see it was updated
    // Just check that the password field exists in both logs
    expect(settingsBeforeLog.data.currentSettings).toHaveProperty('smtpPass');
    expect(settingsAfterLog.data.newSettings).toHaveProperty('smtpPass');
  });

  test('Verifies sensitive data is masked in logs', async () => {
    const sensitivePassword = 'super-secret-password';
    const sensitiveApiKey = 'confidential-api-key';
    
    // Update with sensitive data
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        action: 'updateSettings',
        smtpPass: sensitivePassword,
        brevoApiKey: sensitiveApiKey
      }
    });

    await handler(req, res);
    
    // Verify logs were created with masked sensitive data
    expect(global.__TEST_LOGS.length).toBeGreaterThan(0);
    
    // Find the settings update logs
    const settingsAfterLog = global.__TEST_LOGS.find(log => log.type === 'settings_update_after');
    
    expect(settingsAfterLog).toBeDefined();
    
    // Verify sensitive data is masked
    expect(settingsAfterLog.data.newSettings.smtpPass).not.toBe(sensitivePassword);
    expect(settingsAfterLog.data.newSettings.brevoApiKey).not.toBe(sensitiveApiKey);
    
    // Check if the password is masked with asterisks
    if (settingsAfterLog.data.newSettings.smtpPass) {
      expect(settingsAfterLog.data.newSettings.smtpPass.includes('*')).toBe(true);
    }
    
    if (settingsAfterLog.data.newSettings.brevoApiKey) {
      expect(settingsAfterLog.data.newSettings.brevoApiKey.includes('*')).toBe(true);
    }
  });
});
