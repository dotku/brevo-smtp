import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

type EmailResponse = {
  success?: boolean;
  messageId?: string;
  usedClientSettings?: boolean;
  status?: string;
  environment?: string;
  fromEmail?: string;
  smtpUser?: string;
  smtpPass?: string;
  fromName?: string;
  brevoApiKey?: string;
  envVarsLoaded?: boolean;
  error?: string;
  details?: string;
  needsSettings?: boolean;
}

// Custom environment variable loader that ensures .env.local overrides .env
function loadEnvVars() {
  console.log("Loading environment variables...");
  const envLocalPath = path.join(process.cwd(), ".env.local");
  const envPath = path.join(process.cwd(), ".env");

  // Start with empty config
  let envConfig: Record<string, string> = {};

  // First try to load from .env (base config)
  if (fs.existsSync(envPath)) {
    console.log(".env file exists, loading...");
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach((line) => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["'](.*)["']$/, "$1"); // Remove quotes if present
        envConfig[key] = value;
      }
    });
  }

  // Then override with .env.local if it exists (takes precedence)
  if (fs.existsSync(envLocalPath)) {
    console.log(".env.local file exists, loading (will override .env)...");
    const envLocalContent = fs.readFileSync(envLocalPath, "utf8");
    envLocalContent.split("\n").forEach((line) => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["'](.*)["']$/, "$1"); // Remove quotes if present
        envConfig[key] = value;
        console.log(`Overriding ${key} with value from .env.local`);
      }
    });
  }

  // Set environment variables
  Object.keys(envConfig).forEach((key) => {
    process.env[key] = envConfig[key];
  });

  console.log("Environment variables loaded:");
  console.log("SMTP_HOST:", process.env.SMTP_HOST);
  console.log("SMTP_PORT:", process.env.SMTP_PORT);
  console.log("SMTP_USER:", process.env.SMTP_USER ? process.env.SMTP_USER.substring(0, 3) + "***" : "undefined");
  console.log("SMTP_PASS:", process.env.SMTP_PASS ? process.env.SMTP_PASS.substring(0, 3) + "***" : "undefined");
  console.log("FROM_EMAIL:", process.env.FROM_EMAIL);
  console.log("FROM_NAME:", process.env.FROM_NAME);
  console.log("BREVO_API_KEY:", process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.substring(0, 3) + "***" : "undefined");
}

// Load environment variables with our custom function
loadEnvVars();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EmailResponse>
) {
  console.log(
    `[${new Date().toISOString()}] Received ${req.method} request to ${req.url}`
  );

  // Helper function to mask sensitive data
  const maskSensitiveData = (value: string | undefined): string => {
    if (!value) return '';
    if (value.startsWith('your_') || value.startsWith('your-')) return value;
    
    // Show first 3 characters and mask the rest
    const firstPart = value.substring(0, 3);
    const maskedPart = "*".repeat(Math.min(value.length - 3, 10));
    return `${firstPart}${maskedPart}`;
  };

  // Health check for GET requests
  if (req.method === 'GET') {
    // Check if environment variables are properly loaded
    const envVarsLoaded = process.env.BREVO_API_KEY && process.env.FROM_EMAIL;
    
    return res.status(200).json({
      status: "API is running",
      environment: process.env.NODE_ENV || "development",
      fromEmail: process.env.FROM_EMAIL,
      smtpUser: process.env.SMTP_USER,
      smtpPass: maskSensitiveData(process.env.SMTP_PASS),
      fromName: process.env.FROM_NAME,
      brevoApiKey: maskSensitiveData(process.env.BREVO_API_KEY),
      envVarsLoaded: !!envVarsLoaded
    });
  }

  // Handle POST requests for sending emails
  if (req.method === 'POST') {
    try {
      const { to, subject, text, html, settings } = req.body;

      // Validate required fields
      if (!to || !subject || (!text && !html)) {
        return res.status(400).json({
          error:
            "Missing required fields: to, subject, and either text or html",
        });
      }

      // First check if environment variables are loaded
      let brevoApiKey = process.env.BREVO_API_KEY;
      let fromEmail = process.env.FROM_EMAIL;
      let fromName = process.env.FROM_NAME;
      
      // If environment variables are not available, use client-side settings
      const useClientSettings = !brevoApiKey || !fromEmail;
      
      if (useClientSettings && settings) {
        console.log("Using client-side settings as fallback");
        brevoApiKey = settings.brevoApiKey || brevoApiKey;
        fromEmail = settings.fromEmail || fromEmail;
        fromName = settings.fromName || fromName;
      }

      // Final fallback values
      fromName = fromName || "Email Service";
      fromEmail = fromEmail || "noreply@example.com";

      if (!brevoApiKey) {
        return res.status(500).json({
          error: "Missing Brevo API key",
          details: "Please add BREVO_API_KEY to your environment variables or configure it in the settings tab",
          needsSettings: true
        });
      }

      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "api-key": brevoApiKey,
        },
        body: JSON.stringify({
          sender: {
            name: fromName,
            email: fromEmail
          },
          to: [{ email: Array.isArray(to) ? to[0] : to }],
          subject: subject,
          textContent: text || "",
          htmlContent: html || text || "<p>Email content</p>",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(JSON.stringify(result));
      }

      console.log("Email sent successfully via Brevo API:", result);
      return res.status(200).json({
        success: true,
        messageId: result.messageId || "sent-via-api",
        usedClientSettings: useClientSettings
      });
    } catch (error: any) {
      console.error("Error sending email:", error);
      return res.status(500).json({
        error: "Failed to send email",
        details: error.message,
      });
    }
  }

  // Method not allowed for other request types
  return res.status(405).json({ error: "Method not allowed" });
}
