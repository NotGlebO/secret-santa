
import { useState } from "react";
import "./WelcomeScreen.css";

export default function WelcomeScreen({
  participants,
  onComplete,
}) {
  const [step, setStep] = useState("session");
  const [sessionCode, setSessionCode] = useState("");
  const [email, setEmail] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [error, setError] = useState("");

  // Временный код для frontend-прототипа.
  const DEMO_SESSION_CODE = "2599";

  function verifySession(event) {
    event.preventDefault();
    setError("");

    if (
      sessionCode.trim().toUpperCase() !==
      DEMO_SESSION_CODE
    ) {
      setError("Неверный код сессии 🎅");
      return;
    }

    setStep("register");
  }

  function register(event) {
    event.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Введи свою почту");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Почта выглядит подозрительно 🤨");
      return;
    }

    if (!participantId) {
      setError("Выбери своего персонажа");
      return;
    }

    onComplete({
      sessionCode: sessionCode.trim().toUpperCase(),
      email: email.trim(),
      participantId,
    });
  }

  return (
    <section className="welcome-screen">
      <div className="welcome-card">
        <div className="welcome-icon">
          {step === "session" ? "🔐" : "🎅"}
        </div>

        {step === "session" ? (
          <>
            <h2>СЕКРЕТНЫЙ ВХОД</h2>

            <p className="welcome-description">
              Только избранные достойны
              участвовать в этом безумии.
            </p>

            <form onSubmit={verifySession}>
              <label htmlFor="session-code">
                Код сессии
              </label>

              <input
                id="session-code"
                type="text"
                value={sessionCode}
                onChange={(event) =>
                  setSessionCode(event.target.value)
                }
                placeholder="Введи секретный код"
                autoComplete="off"
                required
              />

              {error && (
                <div className="welcome-error">
                  {error}
                </div>
              )}

              <button type="submit">
                🚪 ВОЙТИ
              </button>
            </form>
          </>
        ) : (
          <>
            <h2>КТО ТЫ, ВОИН?</h2>

            <p className="welcome-description">
              Представься, чтобы Санта знал,
              кого винить.
            </p>

            <form onSubmit={register}>
              <label htmlFor="email">
                Твоя почта
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="example@gmail.com"
                required
              />

              <label>Выбери себя</label>

              <div className="participant-grid">
                {participants.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    className={
                      "participant-option" +
                      (participantId === person.id
                        ? " selected"
                        : "")
                    }
                    onClick={() =>
                      setParticipantId(person.id)
                    }
                  >
                    <img
                      src={person.image}
                      alt={person.name}
                    />

                    <span>
                      {person.name.toUpperCase()}
                    </span>
                  </button>
                ))}
              </div>

              {error && (
                <div className="welcome-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="welcome-submit"
              >
                🎁 ПРОДОЛЖИТЬ
              </button>
            </form>

            <button
              type="button"
              className="welcome-back"
              onClick={() => {
                setStep("session");
                setError("");
              }}
            >
              ← Назад
            </button>
          </>
        )}
      </div>
    </section>
  );
}
