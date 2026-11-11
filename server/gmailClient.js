
import "dotenv/config";
import nodemailer from "nodemailer";
import { google } from "googleapis";

// ==============================
// GOOGLE OAUTH 2.0
// ==============================

const oauth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

// ==============================
// GMAIL API
// ==============================

const gmail = google.gmail({
  version: "v1",
  auth: oauth
});

// Nodemailer только формирует MIME-письмо.
// SMTP-подключение не используется.
const transport = nodemailer.createTransport({
  streamTransport: true,
  buffer: true,
  newline: "unix"
});

// ==============================
// SEND EMAIL
// ==============================

export async function sendGmailEmail(options) {
  const senderEmail = process.env.GOOGLE_SENDER_EMAIL;

  if (
    !process.env.GOOGLE_CLIENT_ID ||
    !process.env.GOOGLE_CLIENT_SECRET ||
    !process.env.GOOGLE_REFRESH_TOKEN ||
    !senderEmail
  ) {
    throw new Error("Missing Google Gmail API environment variables");
  }

  if (!options?.to) {
    throw new Error("Recipient email is required");
  }

  try {
    // Создаём MIME-письмо с HTML и вложениями
    const message = await transport.sendMail({
      ...options,
      from: `"Secret Santa 🎅" <${senderEmail}>`
    });

    // Gmail API требует base64url
    const raw = message.message.toString("base64url");

    // Отправляем письмо через HTTPS
    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw
      }
    });

    console.log(
      `📧 Gmail API: email sent to ${options.to}, ID: ${response.data.id}`
    );

    return response.data;
  } catch (error) {
    console.error("❌ Gmail API send failed:", {
      message: error.message,
      status: error.response?.status,
      details: error.response?.data
    });

    throw error;
  }
}
