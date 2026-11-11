import { sendGmailEmail } from "./gmailClient.js";
import "dotenv/config";



function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

export async function sendWishlistEmail(
  email,
  giver,
  recipient,
  wishlist
) {
  const giverName = escapeHtml(giver.name);
  const recipientName = escapeHtml(recipient.name);
  const wishes = escapeHtml(wishlist).replace(/\n/g, "<br>");

  await sendGmailEmail({
    to: email,
    subject: `🎁 Вишлист обновлён — ${recipient.name}`,

    text: `Привет, ${giver.name}!

${recipient.name} обновил(а) свой вишлист:

${wishlist}

Это пожелания, а не обязательный список покупок. 🎄`,

    html: `
      <div style="
        background:#0f172a;
        color:#ffffff;
        padding:35px 24px;
        text-align:center;
        font-family:Arial,sans-serif;
        border-radius:18px;
      ">
        <h1 style="color:#ffd166;">
          🎄 SECRET SANTA 🎄
        </h1>

        <p>Привет, ${giverName}!</p>
        <p>У тебя новое сообщение от Санты!</p>

        <div style="
          background:#1e293b;
          border:2px solid #ffd166;
          border-radius:15px;
          padding:25px;
          margin:25px auto;
          max-width:450px;
        ">
          <h2 style="color:#ffd166;">
            🎁 Вишлист: ${recipientName}
          </h2>

          <p style="
            font-size:16px;
            line-height:1.8;
            overflow-wrap:anywhere;
            white-space:normal;
          ">
            ${wishes}
          </p>
        </div>

        <p>Вишлист обновился — проверь пожелания!</p>

        <p style="color:#94a3b8;">
          Merry Christmas, degenerate 🎅
        </p>
      </div>
    `
  });

  console.log(`📧 Wishlist email sent to ${email}`);
}
