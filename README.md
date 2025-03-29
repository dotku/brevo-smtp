# Vercel Email Sending Service

A simple email sending service built with Vercel serverless functions and Brevo SMTP.

## Features

- Serverless API endpoint for sending emails
- Uses Brevo SMTP for reliable email delivery
- Simple HTML form for testing the email service
- Environment-based configuration

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:
   - Use `.env.local` for local development with real credentials
   - The sample `.env` file shows the required variables

3. Run the development server:

```bash
npm run dev
```

4. Deploy to Vercel:

```bash
npm run deploy
```

## API Usage

Send a POST request to `/api/send-email` with the following JSON body:

```json
{
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "text": "Plain text version of the email",
  "html": "<p>HTML version of the email</p>"
}
```

Response:

```json
{
  "success": true,
  "messageId": "message-id-from-smtp-server"
}
```

## Environment Variables

- `SMTP_HOST`: SMTP server hostname
- `SMTP_PORT`: SMTP server port
- `SMTP_USER`: SMTP username/login
- `SMTP_PASS`: SMTP password
- `FROM_EMAIL`: Sender email address
- `FROM_NAME`: Sender name

## Security Notes

- Never commit `.env.local` with real credentials to version control
- Add `.env.local` to your `.gitignore` file
