# Next Brevo Email Sending Service

A modern email sending service built with Next.js and Brevo SMTP/API.

## Features

- Next.js API routes for sending emails
- Uses Brevo API for reliable email delivery
- React-based UI with a clean, modern interface
- Client-side settings storage with localStorage as fallback
- Environment-based configuration with graceful fallbacks

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment variables:
   - Use `.env.local` for local development with real credentials
   - Use `.env` for default fallback values
   - Create a `.env.local` file with the following variables:

   ```env
   SMTP_HOST=smtp-relay.brevo.com
   SMTP_PORT=587
   SMTP_USER=your-smtp-username
   SMTP_PASS=your-smtp-password
   FROM_EMAIL=your-email@example.com
   FROM_NAME=Your Name
   BREVO_API_KEY=your-brevo-api-key
   ```

3. Run the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

- `/pages` - Next.js pages and API routes
  - `/pages/index.tsx` - Main email sending interface
  - `/pages/api/email.ts` - API endpoint for sending emails
- `/styles` - CSS modules and global styles
- `/public` - Static assets

## Deployment

This project is configured for easy deployment on Vercel:

```bash
npm run build
vercel
```

## Client-Side Settings

If environment variables are not available, the application will prompt users to configure settings through the UI. These settings are stored in localStorage and used as a fallback.

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
- `BREVO_API_KEY`: Brevo API key

## Security Notes

- Never commit `.env.local` with real credentials to version control
- Add `.env.local` to your `.gitignore` file
