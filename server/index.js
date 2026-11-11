
import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { randomInt } from "node:crypto";
import { fileURLToPath } from "node:url";
import { readdir } from "node:fs/promises";
import { sendSantaEmail } from "./mailService.js";
import { sendWishlistEmail } from "./wishlistMailService.js";

const app = express();

const PORT = Number(process.env.PORT) || 3001;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, "../data");

fs.mkdirSync(dataDir, { recursive: true });

const participantsFile = path.join(dataDir, "participants.json");
const assignmentsFile = path.join(dataDir, "assignments.json");
const wishlistsFile = path.join(dataDir, "wishlists.json");

function getWishlists() {
  if (!fs.existsSync(wishlistsFile)) {
    writeJson(wishlistsFile, {});
  }

  return readJson(wishlistsFile);
}

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// ==============================
// JSON
// ==============================

function readJson(file) {
  const content = fs.readFileSync(file, "utf8").trim();

  if (!content) {
    throw new Error(`JSON file is empty: ${file}`);
  }

  return JSON.parse(content);
}

function writeJson(file, data) {
  const tempFile = `${file}.tmp`;

  fs.writeFileSync(
    tempFile,
    JSON.stringify(data, null, 2),
    "utf8"
  );

  fs.renameSync(tempFile, file);
}

function getParticipants() {
  const participants = readJson(participantsFile);

  if (!Array.isArray(participants) || participants.length < 3) {
    throw new Error("Нужно минимум 3 участника");
  }

  const ids = participants.map((person) => person.id);

  if (
    ids.some((id) => typeof id !== "string" || !id.trim()) ||
    new Set(ids).size !== ids.length
  ) {
    throw new Error("ID участников должны быть уникальными");
  }

  return participants;
}

function getAssignments() {
  if (!fs.existsSync(assignmentsFile)) {
    writeJson(assignmentsFile, {});
  }

  return readJson(assignmentsFile);
}

// ==============================
// RANDOM
// ==============================

function shuffle(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);

    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

// ==============================
// VALIDATION
// ==============================

function isValidAssignment(giverId, recipientId, assignments) {
  // Нельзя дарить самому себе
  if (giverId === recipientId) {
    return false;
  }

  // Нельзя повторно назначать получателя
  const recipientAlreadyUsed = Object.values(assignments).some(
    (assignment) => assignment.recipientId === recipientId
  );

  if (recipientAlreadyUsed) {
    return false;
  }

  // Нельзя образовывать взаимную пару:
  // A -> B и B -> A
  if (assignments[recipientId]?.recipientId === giverId) {
    return false;
  }

  return true;
}


// Получить свой вишлист
app.get("/api/wishlist/:userId", (req, res) => {
  const participants = getParticipants();
  const user = participants.find(
    (p) => p.id === req.params.userId
  );

  if (!user) {
    return res.status(404).json({
      error: "Участник не найден"
    });
  }

  const wishlists = getWishlists();

  res.json({
    text: wishlists[user.id]?.text ?? "",
    updatedAt: wishlists[user.id]?.updatedAt ?? null
  });
});

// Сохранить вишлист
app.put("/api/wishlist/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { text } = req.body ?? {};

    const participants = getParticipants();
    const recipient = participants.find((p) => p.id === userId);

    if (!recipient) {
      return res.status(404).json({
        error: "Участник не найден"
      });
    }

    if (typeof text !== "string" || text.length > 5000) {
      return res.status(400).json({
        error: "Вишлист должен содержать не более 5000 символов"
      });
    }

    const normalizedText = text.trim();
    const wishlists = getWishlists();
    const previous = wishlists[userId]?.text ?? "";

    if (previous === normalizedText) {
      return res.json({
        success: true,
        changed: false,
        emailStatus: "unchanged"
      });
    }

    wishlists[userId] = {
      text: normalizedText,
      updatedAt: new Date().toISOString()
    };

    writeJson(wishlistsFile, wishlists);

    // Ищем человека, которому выпал автор вишлиста
    const assignments = getAssignments();

    const giverId = Object.keys(assignments).find(
      (id) =>
        assignments[id].recipientId === userId &&
        assignments[id].revealed === true
    );

    if (!giverId) {
      return res.json({
        success: true,
        changed: true,
        emailStatus: "pending"
      });
    }

    const giver = participants.find((p) => p.id === giverId);
    const email = assignments[giverId].email;

    if (!giver || !email) {
      return res.json({
        success: true,
        changed: true,
        emailStatus: "pending"
      });
    }

    try {
      await sendWishlistEmail(
        email,
        giver,
        recipient,
        normalizedText || "Пожелания пока не указаны."
      );

      return res.json({
        success: true,
        changed: true,
        emailStatus: "sent"
      });
    } catch (error) {
      console.error("Wishlist email failed:", error);

      return res.json({
        success: true,
        changed: true,
        emailStatus: "failed"
      });
    }
  } catch (error) {
    next(error);
  }
});


// ==============================
// ПРОВЕРКА БУДУЩИХ НАЗНАЧЕНИЙ
// ==============================

// Проверяет, можно ли завершить распределение
// всех оставшихся участников.
//
// Для небольшого количества участников
// (например, 6) backtracking отлично подходит.

function canCompleteAssignments(participants, assignments) {
  const ids = participants.map((person) => person.id);

  const remainingGivers = ids.filter(
    (id) => !assignments[id]?.recipientId
  );

  if (remainingGivers.length === 0) {
    return true;
  }

  // Выбираем участника с минимальным количеством
  // доступных получателей для ускорения поиска.
  let selectedGiver = null;
  let selectedCandidates = null;

  for (const giverId of remainingGivers) {
    const candidates = ids.filter((recipientId) =>
      isValidAssignment(giverId, recipientId, assignments)
    );

    if (candidates.length === 0) {
      return false;
    }

    if (
      selectedCandidates === null ||
      candidates.length < selectedCandidates.length
    ) {
      selectedGiver = giverId;
      selectedCandidates = candidates;
    }
  }

  for (const recipientId of selectedCandidates) {
    assignments[selectedGiver] = {
      recipientId
    };

    if (canCompleteAssignments(participants, assignments)) {
      delete assignments[selectedGiver];
      return true;
    }

    delete assignments[selectedGiver];
  }

  return false;
}

// ==============================
// ВЫБОР ПОЛУЧАТЕЛЯ
// ==============================

function chooseRecipient(giverId, participants, assignments) {
  const candidates = shuffle(
    participants
      .map((person) => person.id)
      .filter((recipientId) =>
        isValidAssignment(giverId, recipientId, assignments)
      )
  );

  for (const recipientId of candidates) {
    // Временно назначаем получателя
    const temporaryAssignments = structuredClone(assignments);

    temporaryAssignments[giverId] = {
      recipientId,
      revealed: true
    };

    // Проверяем, смогут ли все остальные
    // получить допустимого человека
    if (
      canCompleteAssignments(
        participants,
        temporaryAssignments
      )
    ) {
      return recipientId;
    }
  }

  return null;
}

// ==============================
// API: PARTICIPANTS
// ==============================

app.get("/api/participants", (req, res) => {
  const participants = getParticipants();

  res.json(
    participants.map(({ id, name, avatar }) => ({
      id,
      name,
      avatar,
      image: avatar
    }))
  );
});

// ==============================
// API: EMAIL
// ==============================

app.post("/api/participants/:userId/email", (req, res) => {
  const { userId } = req.params;
  const { email } = req.body ?? {};

  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return res.status(400).json({
      error: "Некорректный email"
    });
  }

  const participants = getParticipants();

  if (!participants.some((person) => person.id === userId)) {
    return res.status(404).json({
      error: "Участник не найден"
    });
  }

  const assignments = getAssignments();

  assignments[userId] = {
    ...assignments[userId],
    email: email.trim()
  };

  writeJson(assignmentsFile, assignments);

  res.json({ success: true });
});

// ==============================
// API: ROULETTE STATUS
// ==============================

app.get("/api/roulette/:userId/status", (req, res) => {
  const { userId } = req.params;

  const participants = getParticipants();

  if (!participants.some((person) => person.id === userId)) {
    return res.status(404).json({
      error: "Участник не найден"
    });
  }

  const assignments = getAssignments();
  const assignment = assignments[userId];

  res.json({
    revealed: assignment?.revealed === true
  });
});

// ==============================
// API: SPIN
// ==============================

app.post("/api/roulette/:userId/spin", (req, res) => {
  const { userId } = req.params;

  const participants = getParticipants();

  const giver = participants.find(
    (person) => person.id === userId
  );

  if (!giver) {
    return res.status(404).json({
      error: "Участник не найден"
    });
  }

  const assignments = getAssignments();

  // Уже открывал кейс
  if (assignments[userId]?.revealed === true) {
    return res.status(409).json({
      error: "Ты уже открывал рулетку"
    });
  }

  // Получатель определяется только сейчас
  const recipientId = chooseRecipient(
    userId,
    participants,
    assignments
  );

  if (!recipientId) {
    return res.status(409).json({
      error: "Не удалось найти допустимого получателя"
    });
  }

  const recipient = participants.find(
    (person) => person.id === recipientId
  );

  // Сохраняем назначение
  assignments[userId] = {
    ...assignments[userId],
    recipientId,
    revealed: true
  };

  writeJson(assignmentsFile, assignments);

  const recipientEmail = assignments[userId].email;

  if (recipientEmail) {
  sendSantaEmail(recipientEmail, giver, recipient)
      .then(() => {
      console.log(`📧 Email sent to ${recipientEmail}`);
      })
      .catch((error) => {
      console.error("Failed to send Santa email:", error);
      });
  } else {
  console.warn(`Email not specified for ${giver.name}`);
  }
  console.log(
    `🎁 ${giver.name} -> ${recipient.name}`
  );

  res.json({
    recipient: {
      id: recipient.id,
      name: recipient.name,
      avatar: recipient.avatar,
      image: recipient.avatar
    }
  });

  const wishlists = getWishlists();
  const recipientWishlist = wishlists[recipientId]?.text;

  const giverEmail = assignments[userId].email;

  if (giverEmail && recipientWishlist) {
    sendWishlistEmail(
      giverEmail,
      giver,
      recipient,
      recipientWishlist
    ).catch((error) => {
      console.error("Initial wishlist email failed:", error);
    });
  }
});

// ==============================
// ERRORS
// ==============================

app.use((error, req, res, next) => {
  console.error(error);

  res.status(500).json({
    error: "Внутренняя ошибка сервера"
  });
});

// ==============================
// START
// ==============================

getParticipants();
getAssignments();

// Получить все изображения из public/partc
app.get("/api/background-images", async (req, res, next) => {
  try {
    const imagesDir = path.resolve(__dirname, "../public/partc");
    const allowedExtensions = new Set([
      ".png", ".jpg", ".jpeg", ".webp", ".gif"
    ]);

    async function collectImages(directory) {
      const entries = await readdir(directory, {
        withFileTypes: true
      });

      const images = [];

      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
          images.push(...await collectImages(fullPath));
        } else if (
          entry.isFile() &&
          allowedExtensions.has(
            path.extname(entry.name).toLowerCase()
          )
        ) {
          const relativePath = path.relative(imagesDir, fullPath);

          const url = "/partc/" + relativePath
            .split(path.sep)
            .map(encodeURIComponent)
            .join("/");

          images.push(url);
        }
      }

      return images;
    }

    const images = await collectImages(imagesDir);

    res.json(images);
  } catch (error) {
    next(error);
  }
});

// Все /api маршруты должны быть объявлены выше

app.use("/api", (req, res) => {
  res.status(404).json({
    error: "API endpoint not found"
  });
});

// Собранный React
const distDir = path.resolve(__dirname, "../dist");

app.use(express.static(distDir));

// Остальные маршруты открывают React
app.get("/{*path}", (req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(
    `🎅 Secret Santa API: http://localhost:${PORT}`
  );
});
