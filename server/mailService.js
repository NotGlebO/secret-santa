
import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));



function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

export async function sendSantaEmail(email, giver, recipient) {
  const avatarPath = path.resolve(
    __dirname,
    "../public",
    recipient.avatar.replace(/^\/+/, "")
  );

  const giverName = escapeHtml(giver.name);
  const recipientName = escapeHtml(recipient.name);

  await sendGmailEmail({
    to: email,
    subject: "🎄 Secret Santa — твой результат!",

    text: `Привет, ${giver.name}!

🎁 Тебе выпал(а): ${recipient.name}

Никому не рассказывай!`,

    html: `
      <div style="
        background:#0f172a;
        color:white;
        padding:35px;
        text-align:center;
        font-family:Arial,sans-serif;
        border-radius:18px;
      ">
        <h1 style="color:#ffd166;">
          🎄 SECRET SANTA 🎄
        </h1>

        <p>Привет, ${giverName}!</p>
        <p>Твоя секретная миссия:</p>

        <div style="
          background:#1e293b;
          border:2px solid #ffd166;
          border-radius:15px;
          padding:25px;
          margin:25px auto;
          max-width:350px;
        ">
          <img
            src="cid:recipient-avatar"
            alt="${recipientName}"
            width="180"
            style="
              width:180px;
              height:180px;
              object-fit:cover;
              border-radius:15px;
            "
          />

          <h2 style="
            color:#ffd166;
            font-size:30px;
          ">
            🎁 ${recipientName} 🎁
          </h2>
        </div>

        <p>Теперь ты должен подготовить подарок!</p>
        <p>🤫 Никому не рассказывай!</p>

        <p style="color:#94a3b8;">
          Merry Christmas, degenerate 🎅
        </p>
      </div>
    `,

    attachments: [
      {
        filename: path.basename(avatarPath),
        path: avatarPath,
        cid: "recipient-avatar"
      }
    ]
  });

  console.log(`📧 Santa email sent to ${email}`);
}
