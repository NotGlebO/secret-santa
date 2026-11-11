
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, "../data");

const files = [
  "assignments.json",
  "wishlists.json"
];

const confirmed = process.argv.includes("--confirm");

if (!confirmed) {
  console.log("⚠️ This will reset ALL Secret Santa assignments and wishlists.");
  console.log("Run with --confirm to continue.");
  process.exit(1);
}

fs.mkdirSync(dataDir, { recursive: true });

for (const filename of files) {
  const filePath = path.join(dataDir, filename);

  fs.writeFileSync(
    filePath,
    JSON.stringify({}, null, 2),
    "utf8"
  );

  console.log(`✅ Reset: ${filePath}`);
}

console.log("🎄 Secret Santa data reset completed!");
