import { sendEmailSmtp, sendEmailBrevo } from '../email';
import nodemailer from 'nodemailer';
import { BrevoClient } from '../brevo-client';
import { getEmailSettings } from '../environment';
import { logStateChange } from '../logging';

jest.mock('nodemailer');
jest.mock('../brevo-client');
jest.mock('../environment', () => ({
  getEmailSettings: jest.fn().mockReturnValue({
    smtpHost: 'smtp.test.com',
    smtpPort: '587',
    smtpUser: 'testuser',
    smtpPass: 'testpass',
    fromEmail: 'from@test.com',
    fromName: 'Test Sender'
  })
}));
jest.mock('../logging', () => ({
  logStateChange: jest.fn().mockResolvedValue(true)
}));

describe('Email Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendEmailSmtp', () => {
    it('should send email via SMTP successfully', async () => {
      const mockTransport = {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
      };
      (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransport);

      const result = await sendEmailSmtp(
        'test@example.com',
        'Test Subject',
        '<p>Test content</p>',
        'Test content',
        'test-request-id'
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('test-id');
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        auth: {
          user: 'testuser',
          pass: 'testpass'
        }
      });
      expect(logStateChange).toHaveBeenCalledWith('email_success', expect.objectContaining({
        requestId: 'test-request-id',
        method: 'smtp',
        messageId: 'test-id'
      }));
    });

    it('should handle SMTP errors', async () => {
      const mockTransport = {
        sendMail: jest.fn().mockRejectedValue(new Error('SMTP error'))
      };
      (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransport);

      const result = await sendEmailSmtp(
        'test@example.com',
        'Test Subject',
        '<p>Test content</p>',
        'Test content',
        'test-request-id'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('SMTP error');
      expect(logStateChange).toHaveBeenCalledWith('email_error', expect.objectContaining({
        requestId: 'test-request-id',
        method: 'smtp',
        error: 'SMTP error'
      }));
    });
  });

  describe('sendEmailBrevo', () => {
    it('should send email via Brevo API successfully', async () => {
      const mockSendTransactionalEmail = jest.fn().mockResolvedValue({ messageId: 'brevo-test-id' });
      (BrevoClient as jest.Mock).mockImplementation(() => ({
        sendTransactionalEmail: mockSendTransactionalEmail
      }));

      const result = await sendEmailBrevo(
        'test@example.com',
        'Test Subject',
        '<p>Test content</p>',
        'Test content',
        'test-api-key',
        'test-request-id'
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('brevo-test-id');
      expect(mockSendTransactionalEmail).toHaveBeenCalled();
      expect(logStateChange).toHaveBeenCalledWith('email_success', expect.objectContaining({
        requestId: 'test-request-id',
        method: 'brevo',
        messageId: 'brevo-test-id'
      }));
    });

    it('should handle Brevo API errors', async () => {
      const mockSendTransactionalEmail = jest.fn().mockRejectedValue(new Error('API error'));
      (BrevoClient as jest.Mock).mockImplementation(() => ({
        sendTransactionalEmail: mockSendTransactionalEmail
      }));

      const result = await sendEmailBrevo(
        'test@example.com',
        'Test Subject',
        '<p>Test content</p>',
        'Test content',
        'test-api-key',
        'test-request-id'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('API error');
      expect(logStateChange).toHaveBeenCalledWith('email_error', expect.objectContaining({
        requestId: 'test-request-id',
        method: 'brevo',
        error: 'API error'
      }));
    });
  });
});
