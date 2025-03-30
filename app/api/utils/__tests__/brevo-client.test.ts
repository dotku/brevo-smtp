import { BrevoClient } from '../brevo-client';
import fetch from 'node-fetch';

jest.mock('node-fetch');

describe('BrevoClient', () => {
  const mockApiKey = 'test-api-key';
  let client: BrevoClient;

  beforeEach(() => {
    client = new BrevoClient(mockApiKey);
    jest.clearAllMocks();
  });

  describe('sendTransactionalEmail', () => {
    const mockEmailOptions = {
      sender: {
        name: 'Test Sender',
        email: 'sender@test.com'
      },
      to: [{
        email: 'recipient@test.com'
      }],
      subject: 'Test Subject',
      htmlContent: '<p>Test content</p>',
      textContent: 'Test content'
    };

    it('should send email successfully', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ messageId: 'test-id' })
      };
      (fetch as unknown as jest.Mock).mockResolvedValue(mockResponse);

      const result = await client.sendTransactionalEmail(mockEmailOptions);

      expect(result.messageId).toBe('test-id');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.brevo.com/v3/smtp/email',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'api-key': mockApiKey
          },
          body: JSON.stringify(mockEmailOptions)
        })
      );
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ message: 'Invalid request' })
      };
      (fetch as unknown as jest.Mock).mockResolvedValue(mockResponse);

      await expect(client.sendTransactionalEmail(mockEmailOptions))
        .rejects
        .toThrow('Brevo API error: 400 Invalid request');
    });

    it('should handle network errors', async () => {
      (fetch as unknown as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(client.sendTransactionalEmail(mockEmailOptions))
        .rejects
        .toThrow('Network error');
    });
  });
});
