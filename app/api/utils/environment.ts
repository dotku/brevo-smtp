import path from "path";
import * as dotenv from "dotenv";
import { trackEnvVarLoading } from "./redis";

/**
 * Load environment variables
 * Ensures all required environment variables are available
 */
export async function loadEnvVars() {
  // Load .env first
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });
  const envVars = Object.keys(process.env).filter(
    (key) => process.env[key] !== undefined
  );
  await trackEnvVarLoading(".env", envVars);

  // Then load .env.local to override
  dotenv.config({
    path: path.resolve(process.cwd(), ".env.local"),
    override: true, // Force override of existing env vars
  });
  const localEnvVars = Object.keys(process.env).filter(
    (key) => process.env[key] !== undefined
  );
  await trackEnvVarLoading(".env.local", localEnvVars);

  // Check for required environment variables
  const requiredVars = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "FROM_EMAIL",
    "FROM_NAME",
  ];

  // Log missing variables but don't throw errors
  // This allows the application to continue running with defaults
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);
  if (missingVars.length > 0) {
    console.warn(`Missing environment variables: ${missingVars.join(", ")}`);
  }
}

/**
 * Get email settings from environment variables
 * @returns Object containing email settings
 */
export function getEmailSettings() {
  return {
    smtpHost: process.env.SMTP_HOST || "",
    smtpPort: process.env.SMTP_PORT || "",
    smtpUser: process.env.SMTP_USER || "",
    smtpPass: process.env.SMTP_PASS || "",
    fromEmail: process.env.FROM_EMAIL || "",
    fromName: process.env.FROM_NAME || "",
    brevoApiKey: process.env.BREVO_API_KEY || "",
  };
}
