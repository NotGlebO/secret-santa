
import "dotenv/config";
import nodemailer from "nodemailer";
import { google } from "googleapis";

const oauth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const gmail = google.gmail({
  version: "v1",
  auth: oauth
});

const transport = nodemailer.createTransport({
  streamTransport: true,
  buffer: true
});

export async function sendGmailEmail(options) {
  const result = await transport.sendMail({
    ...options,
    from: `"Secret Santa 🎅" <${process.env.GOOGLE_SENDER_EMAIL}>`
  });

  const raw = result.message.toString("base64url");

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw }
  });

  console.log("Gmail API message sent:", response.data.id);
  return response.data;
}
