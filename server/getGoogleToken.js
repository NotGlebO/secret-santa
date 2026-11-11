
import fs from "node:fs";
import http from "node:http";
import { google } from "googleapis";

const credentials = JSON.parse(
  fs.readFileSync(
    new URL("./google-credentials.json", import.meta.url),
    "utf8"
  )
);

const client = credentials.web ?? credentials.installed;
const redirectUri = "http://localhost:3001/auth/google/callback";

const oauth = new google.auth.OAuth2(
  client.client_id,
  client.client_secret,
  redirectUri
);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, redirectUri);

  if (url.pathname !== "/auth/google/callback") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const code = url.searchParams.get("code");

  if (!code) {
    res.writeHead(400);
    res.end("Authorization code missing");
    return;
  }

  try {
    const { tokens } = await oauth.getToken(code);

    console.log("\n=================================");
    console.log("GOOGLE_REFRESH_TOKEN:");
    console.log(tokens.refresh_token ?? "NOT RETURNED");
    console.log("=================================\n");

    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8"
    });

    res.end("<h1>Google authorization successful!</h1>");
  } catch (error) {
    console.error("OAuth error:", error.message);
    res.writeHead(500);
    res.end("Authorization failed");
  } finally {
    server.close();
  }
});

server.listen(3001, () => {
  const authUrl = oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/gmail.send"]
  });

  console.log("\nОткрой эту ссылку в браузере:\n");
  console.log(authUrl);
  console.log("\nОжидание авторизации Google...");
});
