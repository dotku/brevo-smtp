/**
 * Load environment variables
 * Ensures all required environment variables are available
 */
export function loadEnvVars() {
  // Check for required environment variables
  const requiredVars = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'FROM_EMAIL',
    'FROM_NAME',
    'BREVO_API_KEY'
  ];
  
  // Log missing variables but don't throw errors
  // This allows the application to continue running with defaults
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.warn(`Missing environment variables: ${missingVars.join(', ')}`);
  }
}

/**
 * Get email settings from environment variables
 * @returns Object containing email settings
 */
export function getEmailSettings() {
  return {
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: process.env.SMTP_PORT || '',
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    fromEmail: process.env.FROM_EMAIL || '',
    fromName: process.env.FROM_NAME || '',
    brevoApiKey: process.env.BREVO_API_KEY || ''
  };
}
