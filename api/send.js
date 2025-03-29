// Simple API endpoint for sending emails
const nodemailer = require('nodemailer');

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

  // Handle GET request for testing the API
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'Email API is running' });
  }

  // Only allow POST requests for sending emails
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, text, html } = req.body;

    // Validate required fields
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, and either text or html' });
    }

    // Create transporter with hardcoded credentials for testing
    // In production, use environment variables
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: '891f97001@smtp-brevo.com',
        pass: '8PGnaNrq5Ypf7dsU',
      },
    });

    // Send mail
    const info = await transporter.sendMail({
      from: '"Vercel Email Service" <891f97001@smtp-brevo.com>',
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      text,
      html: html || undefined,
    });

    return res.status(200).json({ 
      success: true, 
      messageId: info.messageId 
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ 
      error: 'Failed to send email', 
      details: error.message 
    });
  }
};
