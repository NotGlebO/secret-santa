
import { useEffect, useState } from "react";
import "./Wishlist.css";

const API_URL = "/api";

export default function Wishlist({ userId, onBack }) {
  const [text, setText] = useState("");
  const [savedText, setSavedText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadWishlist() {
      try {
        const response = await fetch(
          `${API_URL}/wishlist/${encodeURIComponent(userId)}`,
          { signal: controller.signal }
        );

        if (!response.ok) throw new Error("Ошибка загрузки");

        const data = await response.json();
        setText(data.text);
        setSavedText(data.text);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadWishlist();
    return () => controller.abort();
  }, [userId]);

  const changed = text.trim() !== savedText;

  async function saveWishlist() {
    setSaving(true);
    setConfirmOpen(false);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/wishlist/${encodeURIComponent(userId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка сохранения");
      }

      setSavedText(text.trim());
      setText(text.trim());

      if (data.emailStatus === "sent") {
        setMessage("🎅 Сохранено! Твоему Санте отправлено письмо.");
      } else if (data.emailStatus === "pending") {
        setMessage(
          "🎁 Сохранено! Санта получит пожелания, когда откроет кейс."
        );
      } else if (data.emailStatus === "failed") {
        setMessage(
          "⚠️ Вишлист сохранён, но письмо отправить не удалось."
        );
      } else {
        setMessage("Изменений нет.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="wishlist-page">
      <button
        className="wishlist-back"
        onClick={onBack}
        disabled={saving}
      >
        НАЗАД В МЕНЮ
      </button>

      <div className="wishlist-panel">
        <div className="wishlist-icon">🎁</div>
        <h2>МОЙ ВИШЛИСТ</h2>
        <p className="wishlist-subtitle">
          Расскажи своему Тайному Санте, что хочешь получить!
        </p>

        <textarea
          className="wishlist-textarea"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setMessage("");
          }}
          disabled={loading || saving}
          maxLength={5000}
          placeholder={
            "🎮 Игры\n" +
            "🍫 Сладости\n" +
            "🎧 Наушники\n\n" +
            "Или напиши что-нибудь своё..."
          }
        />

        <div className="wishlist-counter">
          {text.length} / 5000
        </div>

        {message && (
          <p className="wishlist-success">{message}</p>
        )}

        {error && (
          <p className="wishlist-error">{error}</p>
        )}

        <button
          className="wishlist-save"
          disabled={loading || saving || !changed}
          onClick={() => setConfirmOpen(true)}
        >
          {saving ? "СОХРАНЯЕМ..." : "💾 СОХРАНИТЬ ВИШЛИСТ"}
        </button>
      </div>

      {confirmOpen && (
        <div className="wishlist-overlay">
          <div
            className="wishlist-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wishlist-confirm-title"
          >
            <div className="wishlist-icon">📨</div>
            <h3 id="wishlist-confirm-title">
              ТОЧНО СОХРАНИТЬ?
            </h3>

            <p>
              После сохранения твоему Тайному Санте
              придёт <strong>новое письмо</strong> с
              обновлённым вишлистом.
            </p>

            <p className="wishlist-note">
              Если Санта ещё не открыл рулетку,
              письмо придёт позже.
            </p>

            <div className="wishlist-modal-actions">
              <button
                className="wishlist-cancel"
                onClick={() => setConfirmOpen(false)}
              >
                ОТМЕНА
              </button>

              <button
                className="wishlist-confirm"
                onClick={saveWishlist}
              >
                ДА, СОХРАНИТЬ
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
