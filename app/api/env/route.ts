import { NextResponse } from "next/server";
import { loadEnvVars } from "../utils/environment";

export async function GET() {
  try {
    await loadEnvVars();
    console.log("Environment variables:", process.env.SMTP_PASS);
    return NextResponse.json({
      success: true,
      data: {
        smtpHost: process.env.SMTP_HOST || "",
        smtpPort: process.env.SMTP_PORT || "",
        smtpUser: process.env.SMTP_USER || "",
        smtpPass: process.env.SMTP_PASS || "",
        fromEmail: process.env.FROM_EMAIL || "",
        fromName: process.env.FROM_NAME || "",
        brevoApiKey: process.env.BREVO_API_KEY || "",
      },
    });
  } catch (error) {
    console.error("Failed to load environment variables:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load environment variables" },
      { status: 500 }
    );
  }
}
