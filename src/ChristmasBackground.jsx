
import { useEffect, useMemo, useState } from "react";
import "./ChristmasBackground.css";

const API_URL = "";

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function shuffle(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

export default function ChristmasBackground() {
  const [images, setImages] = useState([]);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${API_URL}/api/background-images`, {
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Не удалось загрузить картинки");
        }

        return response.json();
      })
      .then(setImages)
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Background images:", error);
        }
      });

    return () => controller.abort();
  }, []);

  const snowflakes = useMemo(() => {
    return Array.from({ length: 65 }, (_, i) => ({
      id: i,
      left: random(0, 100),
      size: random(3, 9),
      duration: random(9, 23),
      delay: random(-25, 0),
      opacity: random(0.3, 0.85),
      drift: random(-90, 90)
    }));
  }, []);

  const floatingImages = useMemo(() => {
    return shuffle(images).map((src, i) => ({
      id: i,
      src,
      left: random(0, 100),
      top: random(0, 100),
      size: random(65, 150),
      duration: random(15, 35),
      delay: random(-35, 0),
      rotation: random(-35, 35),
      driftX: random(-100, 100),
      driftY: random(-100, 100),
      opacity: random(0.25, 0.6)
    }));
  }, [images]);

  return (
    <div className="christmas-background" aria-hidden="true">
      <div className="christmas-glow" />

      <div className="snow-layer">
        {snowflakes.map((flake) => (
          <span
            key={flake.id}
            className="snowflake"
            style={{
              left: `${flake.left}%`,
              width: `${flake.size}px`,
              height: `${flake.size}px`,
              opacity: flake.opacity,
              animationDuration: `${flake.duration}s`,
              animationDelay: `${flake.delay}s`,
              "--snow-drift": `${flake.drift}px`
            }}
          />
        ))}
      </div>

      <div className="meme-layer">
        {floatingImages.map((item) => (
          <img
            key={item.src}
            src={item.src}
            alt=""
            className="floating-meme"
            draggable={false}
            style={{
              left: `${item.left}%`,
              top: `${item.top}%`,
              width: `${item.size}px`,
              height: `${item.size}px`,
              opacity: item.opacity,
              animationDuration: `${item.duration}s`,
              animationDelay: `${item.delay}s`,
              "--rotation": `${item.rotation}deg`,
              "--drift-x": `${item.driftX}px`,
              "--drift-y": `${item.driftY}px`
            }}
          />
        ))}
      </div>
    </div>
  );
}
