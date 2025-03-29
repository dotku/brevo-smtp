const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Load environment variables from .env.local if it exists, otherwise from .env
const dotenvPath = path.join(process.cwd(), fs.existsSync(path.join(process.cwd(), '.env.local')) ? '.env.local' : '.env');
require('dotenv').config({ path: dotenvPath });

// Simple health check endpoint
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health check for GET requests
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'API is running',
      environment: process.env.NODE_ENV || 'development'
    });
  }

  // Only allow POST requests for sending emails
  if (req.method === 'POST') {
    try {
      const { to, subject, text, html } = req.body;

      // Validate required fields
      if (!to || !subject || (!text && !html)) {
        return res.status(400).json({ error: 'Missing required fields: to, subject, and either text or html' });
      }

      // Try direct HTTP request to Brevo API instead of SMTP
      const brevoApiKey = process.env.BREVO_API_KEY;
      
      if (!brevoApiKey) {
        return res.status(500).json({ 
          error: 'Missing Brevo API key', 
          details: 'Please add BREVO_API_KEY to your environment variables' 
        });
      }
      
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': brevoApiKey
        },
        body: JSON.stringify({
          sender: {
            name: process.env.FROM_NAME || 'Email Service',
            email: process.env.FROM_EMAIL || '891f97001@smtp-brevo.com'
          },
          to: [{ email: Array.isArray(to) ? to[0] : to }],
          subject: subject,
          textContent: text || '',
          htmlContent: html || text || '<p>Email content</p>'
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(JSON.stringify(result));
      }

      console.log('Email sent successfully via Brevo API:', result);
      return res.status(200).json({ 
        success: true, 
        messageId: result.messageId || 'sent-via-api'
      });

    } catch (error) {
      console.error('Error sending email:', error);
      return res.status(500).json({ 
        error: 'Failed to send email', 
        details: error.message 
      });
    }
  }

  // Method not allowed for other request types
  return res.status(405).json({ error: 'Method not allowed' });
}
