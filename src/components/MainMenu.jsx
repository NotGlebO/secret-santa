
import "./MainMenu.css";

export default function MainMenu({ onWishlist, onRoulette }) {
  return (
    <section className="main-menu">
      <div className="main-menu-heading">
        <span>🎄</span>
        <h2>ВЫБЕРИ СВОЮ СУДЬБУ</h2>
        <span>🎄</span>
      </div>

      <p className="main-menu-subtitle">
        Два стула. На какой сам сядешь, на какой мать посадишь.
      </p>

      <div className="main-menu-grid">
        <button
          type="button"
          className="main-menu-card"
          onClick={onWishlist}
        >
          <span className="main-menu-icon">🎁</span>
          <span className="main-menu-title">ВИШЛИСТ</span>
          <span className="main-menu-description">
            Расскажи Санте, что хочешь получить
          </span>
          <span className="main-menu-action">
            ОТКРЫТЬ ✍️
          </span>
        </button>

        <button
          type="button"
          className="main-menu-card"
          onClick={onRoulette}
        >
          <span className="main-menu-icon">🎰</span>
          <span className="main-menu-title">РУЛЕТКА</span>
          <span className="main-menu-description">
            Узнай, кому ты будешь дарить подарок
          </span>
          <span className="main-menu-action">
            ИСПЫТАТЬ УДАЧУ 🫵
          </span>
        </button>
      </div>
    </section>
  );
}
