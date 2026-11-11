
import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";

import ChristmasBackground from "./ChristmasBackground";
import WelcomeScreen from "./components/WelcomeScreen";
import BackgroundMusic from "./components/BackgroundMusic";
import MainMenu from "./components/MainMenu";
import Wishlist from "./components/Wishlist";
import {
  getParticipants,
  getRouletteStatus,
  spinRoulette
} from "./api/santaApi";

import { saveParticipantEmail } from "./api/santaApi";
import "./App.css";

// Настройки кейса
const CARD_WIDTH = 160;
const CARD_GAP = 12;
const CARD_STEP = CARD_WIDTH + CARD_GAP;

const SPIN_DURATION = 6500;
const TARGET_INDEX = 45;
const TOTAL_CARDS = 52;

function randomPerson(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function createReel(pool, winner) {
  const cards = Array.from(
    { length: TOTAL_CARDS },
    () => randomPerson(pool)
  );

  cards[TARGET_INDEX] = winner;

  return cards;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [participantsError, setParticipantsError] = useState("");
  const [rouletteUsed, setRouletteUsed] = useState(false);
  const [rouletteLoading, setRouletteLoading] = useState(false);
  const [rouletteChecking, setRouletteChecking] = useState(false);
  const [rouletteError, setRouletteError] = useState("");

  const [page, setPage] = useState("menu");
  const [reel, setReel] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [offset, setOffset] = useState(0);
  const [animated, setAnimated] = useState(false);

  const viewportRef = useRef(null);
  const reelRef = useRef(null);
  const pointerRef = useRef(null);

  const timerRef = useRef(null);
  const frameRef = useRef(null);
  const busyRef = useRef(false);

  const openSoundRef = useRef(null);
  const dropSoundRef = useRef(null);

  const tickPoolRef = useRef([]);
  const tickCursorRef = useRef(0);

  useEffect(() => {
    getParticipants()
      .then((data) => {
        setParticipants(data.map((p) => ({
          ...p,
          image: p.avatar ?? p.image ?? "",
        })));
        setParticipantsError("");
      })
      .catch((error) => setParticipantsError(error.message));
  }, []);

  useEffect(() => {
    if (page !== "roulette" || !currentUser) return;

    let cancelled = false;
    setRouletteChecking(true);
    setRouletteError("");

    getRouletteStatus(currentUser.participantId)
      .then(({ revealed }) => {
        if (!cancelled) setRouletteUsed(revealed);
      })
      .catch((error) => {
        if (!cancelled) setRouletteError(error.message);
      })
      .finally(() => {
        if (!cancelled) setRouletteChecking(false);
      });

    return () => { cancelled = true; };
  }, [page, currentUser?.participantId]);

  // Визуальная лента до открытия кейса. Серверный результат не меняется.
  useEffect(() => {
    if (page !== "roulette" || !currentUser || spinning || reel.length > 0) return;
    const pool = participants.filter((p) => p.id !== currentUser.participantId);
    if (!pool.length) return;
    setReel(Array.from({ length: TOTAL_CARDS }, () => randomPerson(pool)));
    setOffset(0);
    setAnimated(false);
  }, [page, currentUser?.participantId, participants, spinning, reel.length]);

  // Подготавливаем звуки щелчков
  useEffect(() => {
    tickPoolRef.current = Array.from(
      { length: 8 },
      () => {
        const audio = new Audio(
          "/sounds/case-scroll.mp3"
        );

        audio.preload = "auto";
        audio.volume = 0.75;

        return audio;
      }
    );

    return () => {
      clearTimeout(timerRef.current);
      cancelAnimationFrame(frameRef.current);

      tickPoolRef.current.forEach((audio) => {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      });
    };
  }, []);

  // Один щелчок + движение стрелки
  function playTick() {
    const pool = tickPoolRef.current;

    if (pool.length > 0) {
      const sound =
        pool[tickCursorRef.current % pool.length];

      tickCursorRef.current += 1;

      sound.currentTime = 0;

      sound.play().catch((error) => {
        console.warn("Case tick:", error);
      });
    }

    const pointer = pointerRef.current;

    if (pointer) {
      pointer.classList.remove("pointer-tick");

      // Перезапускаем анимацию при каждом щелчке
      void pointer.offsetWidth;

      pointer.classList.add("pointer-tick");
    }
  }

  // Следим за реальным положением карточек
  function watchReel(lastBoundary, startedAt) {
    const reelElement = reelRef.current;
    const viewport = viewportRef.current;

    if (
      !reelElement ||
      !viewport ||
      !busyRef.current
    ) {
      return;
    }

    const transform =
      getComputedStyle(reelElement).transform;

    const actualOffset =
      transform === "none"
        ? 0
        : -new DOMMatrixReadOnly(transform).m41;

    // Положение центральной стрелки относительно ленты
    const centerInReel =
      actualOffset + viewport.clientWidth / 2;

    // Определяем, сколько границ карточек пройдено
    const boundary = Math.floor(
      (centerInReel + CARD_GAP / 2) / CARD_STEP
    );

    if (boundary > lastBoundary) {
      playTick();
    }

    if (
      performance.now() - startedAt <
      SPIN_DURATION
    ) {
      frameRef.current = requestAnimationFrame(
        () => watchReel(boundary, startedAt)
      );
    }
  }

  async function handleLogin(user) {
    try {
      await saveParticipantEmail(
        user.participantId,
        user.email
      );

      setCurrentUser(user);
      setPage("menu");

      setReel([]);
      setWinner(null);
      setOffset(0);
      setAnimated(false);
    } catch (error) {
      console.error("Failed to save email:", error);
      alert("Не удалось сохранить email. Попробуй ещё раз.");
    }
  }

  function handleLogout() {
    if (busyRef.current) return;

    setPage("menu");
    setCurrentUser(null);
    setRouletteUsed(false);
    setRouletteError("");
    setReel([]);
    setWinner(null);
    setOffset(0);
    setAnimated(false);
  }

  function launchConfetti() {
    confetti({
      particleCount: 250,
      spread: 130,
      startVelocity: 45,
      origin: { y: 0.5 },
    });
  }

  async function openCase() {
    if (
      busyRef.current || !currentUser || rouletteUsed ||
      rouletteLoading || rouletteChecking || rouletteError
    ) return;

    const pool = participants.filter(
      (person) => person.id !== currentUser.participantId
    );
    if (pool.length === 0) return;

    busyRef.current = true;
    setRouletteLoading(true);
    setRouletteError("");

    let result;
    try {
      const response = await spinRoulette(currentUser.participantId);
      result = participants.find((person) => person.id === response.recipient.id);
      if (!result) {
        throw new Error("Получатель отсутствует в списке участников");
      }
      setRouletteUsed(true);
    } catch (error) {
      setRouletteError(error.message);
      busyRef.current = false;
      setRouletteLoading(false);
      return;
    }
    setRouletteLoading(false);

    const openSound = openSoundRef.current;
    if (openSound) {
      openSound.currentTime = 0;
      openSound.volume = 0.8;
      openSound.play().catch(console.error);
    }

    const cards = createReel(pool, result);

    setWinner(null);
    setSpinning(true);
    setAnimated(false);
    setOffset(0);
    setReel(cards);

    // Запускаем анимацию после отрисовки
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!busyRef.current) return;

        const viewportWidth =
          viewportRef.current?.clientWidth || 600;

        const targetOffset =
          TARGET_INDEX * CARD_STEP +
          CARD_WIDTH / 2 -
          viewportWidth / 2;

        const jitter =
          (Math.random() - 0.5) * 35;

        setAnimated(true);
        setOffset(targetOffset + jitter);

        // Начальная граница под стрелкой
        const initialBoundary = Math.floor(
          (viewportWidth / 2 + CARD_GAP / 2) /
            CARD_STEP
        );

        cancelAnimationFrame(frameRef.current);

        // Отслеживаем прохождение карточек
        frameRef.current = requestAnimationFrame(
          () =>
            watchReel(
              initialBoundary,
              performance.now()
            )
        );
      });
    });

    // Завершение открытия
    timerRef.current = setTimeout(() => {
      busyRef.current = false;

      setSpinning(false);
      setWinner(result);

      cancelAnimationFrame(frameRef.current);

      pointerRef.current?.classList.remove(
        "pointer-tick"
      );

      // Звук выпадения
      const dropSound = dropSoundRef.current;

      if (dropSound) {
        dropSound.currentTime = 0;
        dropSound.volume = 1;
        dropSound.play().catch(console.error);
      }

      launchConfetti();
    }, SPIN_DURATION + 100);
  }

  return (
    <>
      <ChristmasBackground />
      <BackgroundMusic />

      {/* Звуки кейса */}
      <audio
        ref={openSoundRef}
        src="/sounds/case-open.mp3"
        preload="auto"
      />

      <audio
        ref={dropSoundRef}
        src="/sounds/case-drop.mp3"
        preload="auto"
      />

      <main className="app">
        <header className="header">
          <div className="decorations">
            ❄️ 🎄 🎁 🎄 ❄️
          </div>

          <h1>SECRET SANTA</h1>

          <p className="subtitle">
            CASE OPENING: CHRISTMAS EDITION
          </p>
        </header>

        {participantsError && <p className="error-message">{participantsError}</p>}

        {!currentUser ? (
          <WelcomeScreen
            participants={participants}
            onComplete={handleLogin}
          />
        ) : page === "menu" ? (
          <MainMenu
            onWishlist={() => setPage("wishlist")}
            onRoulette={() => setPage("roulette")}
          />
        ) : page === "wishlist" ? (
          <Wishlist
            userId={currentUser.participantId}
            onBack={() => setPage("menu")}
          />
        ) : (
          <section className="case-section">
            <button
              type="button"
              className="back-to-menu"
              onClick={() => setPage("menu")}
              disabled={spinning || rouletteLoading}
            >
              Назад в меню
            </button>
            <div className="case-heading">
              <span>🎰</span>
              <h2>КТО ТВОЯ ЖЕРТВА?</h2>
              <span>🎰</span>
            </div>

            {/* Текущий пользователь */}
            <div className="current-user">
              <div className="current-user-info">
                <img
                  src={
                    participants.find(
                      (person) =>
                        person.id ===
                        currentUser.participantId
                    )?.image
                  }
                  alt="Твой персонаж"
                  className="current-user-avatar"
                />

                <span className="current-user-email">
                  {currentUser.email}
                </span>
              </div>
            </div>

            {/* Кейс */}
            <div className="case-frame">
              <div
                className="case-pointer top"
                ref={pointerRef}
              />

              <div
                className="case-viewport"
                ref={viewportRef}
              >
                <div
                  className="case-reel"
                  ref={reelRef}
                  style={{
                    transform: `translateX(-${offset}px)`,
                    transition: animated
                      ? `transform ${SPIN_DURATION}ms cubic-bezier(0.08, 0.65, 0.12, 1)`
                      : "none",
                  }}
                >
                  {reel.length === 0 ? (
                    <div className="case-placeholder">
                      🎁 ТВОЯ СУДЬБА ЖДЁТ ТЕБЯ
                    </div>
                  ) : (
                    reel.map((person, index) => (
                      <div
                        className="case-card"
                        key={`${index}-${person.id}`}
                      >
                        <div className="card-image">
                          <img
                            src={person.image}
                            alt={person.name}
                            draggable={false}
                          />
                        </div>

                        <div className="card-name">
                          {person.name.toUpperCase()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="case-pointer bottom" />
              <div className="case-glow" />
            </div>

            {/* Кнопка открытия */}
            <button
              className="open-button"
              onClick={openCase}
              disabled={
                spinning || rouletteUsed || rouletteLoading ||
                rouletteChecking || Boolean(rouletteError) ||
                participants.length < 2
              }
            >
              {spinning
                ? "🎰 ОПРЕДЕЛЯЕМ СУДЬБУ..."
                : rouletteLoading || rouletteChecking
                  ? "⏳ ПРОВЕРЯЕМ..."
                  : rouletteUsed
                    ? "🔒 РУЛЕТКА УЖЕ ИСПОЛЬЗОВАНА"
                    : "🎁 ОТКРЫТЬ КЕЙС"}
            </button>

            {rouletteError && (
              <p className="error-message">{rouletteError}</p>
            )}

            {/* Победитель */}
            {winner && (
              <div
                className="winner-result"
                key={winner.id}
              >
                <div className="winner-label">
                  🎉 ЛЕГЕНДАРНЫЙ ДРОП 🎉
                </div>

                <img
                  src={winner.image}
                  alt={winner.name}
                  className="winner-image"
                />

                <h2>
                  {winner.name.toUpperCase()}
                </h2>

                <p>
                  Поздравляем! Теперь ты обязан
                  купить этому персонажу подарок.
                </p>
              </div>
            )}
          </section>
        )}

        <footer className="footer">
          🎄 Merry Christmas, degenerates 🎄
        </footer>
      </main>
    </>
  );
}
