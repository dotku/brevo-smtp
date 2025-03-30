/**
 * Custom Brevo API client implementation to avoid module resolution issues
 * This is a simplified version that only implements what we need for sending emails
 */

import fetch from 'node-fetch';

export interface SendEmailOptions {
  sender: {
    name: string;
    email: string;
  };
  to: {
    email: string;
  }[];
  subject: string;
  htmlContent: string;
  textContent: string;
}

export class BrevoClient {
  private apiKey: string;
  private baseUrl = 'https://api.brevo.com/v3';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Send a transactional email
   * @param options Email options
   * @returns Response from Brevo API
   */
  async sendTransactionalEmail(options: SendEmailOptions): Promise<any> {
    const url = `${this.baseUrl}/smtp/email`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': this.apiKey
        },
        body: JSON.stringify(options)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Brevo API error: ${response.status} ${errorData.message || response.statusText}`);
      }
      
      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }
}
