import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./BackgroundMusic.css";
import trackMetadata from "../assets/music/tracks.json";

const musicModules = import.meta.glob(
  "../assets/music/*.{mp3,wav,ogg,m4a}",
  {
    eager: true,
    query: "?url",
    import: "default",
  }
);

const musicFiles = Object.fromEntries(
    
  Object.entries(musicModules).map(([path, url]) => [
    path.split("/").pop(),
    url,
  ])
);
console.log("MP3 files:", musicFiles);
console.log("JSON tracks:", trackMetadata);

const tracks = trackMetadata
  .filter((track) => musicFiles[track.file])
  .map((track) => ({
    ...track,
    url: musicFiles[track.file],
  }));

const STORAGE_KEY = "musicMuted";
const MUSIC_VOLUME = 0.25;

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);

  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function randomIndex(exclude = -1) {
  if (tracks.length <= 1) return 0;

  const index = Math.floor(
    Math.random() * (tracks.length - 1)
  );

  return index >= exclude ? index + 1 : index;
}

function shuffleTracks(length) {
  const queue = Array.from(
    { length },
    (_, index) => index
  );

  // Алгоритм Fisher–Yates
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [queue[i], queue[j]] = [queue[j], queue[i]];
  }

  return queue;
}

export default function BackgroundMusic() {
  const audioRef = useRef(null);
  const titleContainerRef = useRef(null);
  const titleTextRef = useRef(null);
  const [titleOverflow, setTitleOverflow] = useState(0);

 

  const [muted, setMuted] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved !== null) {
      return saved === "true";
    }

    return localStorage.getItem("musicEnabled") === "false";
  });

  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);

 const [queue, setQueue] = useState(() =>
  shuffleTracks(tracks.length)
);

const [queuePosition, setQueuePosition] = useState(0);

const trackIndex = queue[queuePosition] ?? 0;

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const currentTrack = tracks[trackIndex];

  useLayoutEffect(() => {
    const container = titleContainerRef.current;
    const text = titleTextRef.current;

    if (!container || !text) return;

    const updateOverflow = () => {
      setTitleOverflow(
        Math.max(0, text.scrollWidth - container.clientWidth)
      );
    };

    updateOverflow();

    const observer = new ResizeObserver(updateOverflow);
    observer.observe(container);
    observer.observe(text);

    return () => observer.disconnect();
  }, [currentTrack?.title, expanded]);

  // Сохраняем настройку звука
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(muted));
  }, [muted]);

  // Управляем громкостью без остановки трека
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = MUSIC_VOLUME;
    audio.muted = muted;
  }, [muted]);

  // Автоматически запускаем трек
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || tracks.length === 0) return;

    audio.play().catch((error) => {
      if (error.name !== "NotAllowedError" &&
          error.name !== "AbortError") {
        console.error("Music error:", error);
      }
    });
  }, [trackIndex]);

  // Если браузер заблокировал автозапуск,
  // пробуем после первого взаимодействия
  useEffect(() => {
    function resumeMusic() {
      const audio = audioRef.current;

      if (!audio || !audio.paused) return;

      audio.play().catch(() => {});
    }

    document.addEventListener("pointerdown", resumeMusic);
    document.addEventListener("keydown", resumeMusic);

    return () => {
      document.removeEventListener("pointerdown", resumeMusic);
      document.removeEventListener("keydown", resumeMusic);
    };
  }, []);

  // Включение/выключение только звука
  function toggleMute(event) {
    event?.stopPropagation();

    const audio = audioRef.current;
    if (!audio) return;

    const nextMuted = !muted;

    audio.muted = nextMuted;
    setMuted(nextMuted);

    if (audio.paused) {
      audio.play().catch(console.error);
    }
  }

  function changeTrack(nextIndex) {
    if (tracks.length === 0) return;

    setCurrentTime(0);
    setDuration(0);
    setTrackIndex(nextIndex);
  }

  function nextTrack() {
    if (tracks.length === 0) return;

    // Если дошли до конца очереди
    if (queuePosition >= queue.length - 1) {
      const newQueue = shuffleTracks(tracks.length);

      // Не допускаем повтор последней песни
      // на границе двух очередей
      if (
        newQueue.length > 1 &&
        newQueue[0] === queue[queuePosition]
      ) {
        const swapIndex = 1 + Math.floor(
          Math.random() * (newQueue.length - 1)
        );

        [newQueue[0], newQueue[swapIndex]] =
          [newQueue[swapIndex], newQueue[0]];
      }

      setQueue(newQueue);
      setQueuePosition(0);
    } else {
      setQueuePosition((prev) => prev + 1);
    }

    setCurrentTime(0);
    setDuration(0);
  }

  function previousTrack() {
    if (tracks.length === 0) return;

    const audio = audioRef.current;

    // Если прошло больше 3 секунд — начать песню заново
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    if (queuePosition > 0) {
      setQueuePosition((prev) => prev - 1);
      setCurrentTime(0);
      setDuration(0);
    } else if (audio) {
      audio.currentTime = 0;
    }
  }

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio) return;

    setCurrentTime(audio.currentTime);
  }

  function handleLoadedMetadata() {
    const audio = audioRef.current;
    if (!audio) return;

    setDuration(
      Number.isFinite(audio.duration)
        ? audio.duration
        : 0
    );
  }

  function handleSeek(event) {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const nextTime = Number(event.target.value);

    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  const remaining = Math.max(0, duration - currentTime);

  const progress = duration
    ? (currentTime / duration) * 100
    : 0;

  return (
    <>
      <audio
        ref={audioRef}
        src={currentTrack?.url}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={nextTrack}
      />

      <div className="music-player">
        {expanded && (
          <div className="music-panel">
            <div className="music-panel-header">
              <div>
                <span className="music-panel-label">
                  🎄 CHRISTMAS RADIO
                </span>

                <div className="music-panel-title">
                  Secret Santa FM
                </div>
              </div>

              <button
                type="button"
                className="music-close"
                onClick={() => setExpanded(false)}
                title="Свернуть"
              >
                ✕
              </button>
            </div>

            {/* Информация о песне */}
            <div className="music-track">
              <div className="music-track-icon">
                {currentTrack?.cover ? (
                  <img
                    src={currentTrack.cover}
                    alt={currentTrack.title}
                    className="music-cover"
                  />
                ) : (
                  "🎵"
                )}
              </div>

              <div className="music-track-info">
                <div className="music-track-name" ref={titleContainerRef}>
                    <span
                        ref={titleTextRef}
                        className={
                        titleOverflow > 0 ? "music-title-scrolling" : ""
                        }
                        style={{
                        "--scroll-distance": `-${titleOverflow}px`,
                        "--scroll-duration": `${Math.max(5, titleOverflow / 25 + 3)}s`,
                        }}
                        key={currentTrack?.id}
                    >
                        {currentTrack?.title || "Нет музыки"}
                    </span>
                </div>

                <div className="music-track-artist">
                  {currentTrack?.artist ||
                    "Неизвестный исполнитель"}
                </div>

                <div className="music-track-status">
                  {!playing
                    ? "Нажми, чтобы запустить"
                    : muted
                      ? "Играет без звука"
                      : "Сейчас играет"}
                </div>
              </div>
            </div>

            {/* Прогресс песни */}
            <div className="music-progress">
              <input
                type="range"
                min="0"
                max={duration || 1}
                step="0.1"
                value={Math.min(
                  currentTime,
                  duration || 1
                )}
                onChange={handleSeek}
                style={{
                  "--music-progress": `${progress}%`,
                }}
                aria-label="Перемотать трек"
              />

              <div className="music-time">
                <span>{formatTime(currentTime)}</span>
                <span>-{formatTime(remaining)}</span>
              </div>
            </div>

            {/* Управление */}
            <div className="music-controls">
              <button
                type="button"
                onClick={previousTrack}
                title="Предыдущий трек"
                disabled={tracks.length === 0}
              >
                ⏮
              </button>

              <button
                type="button"
                className="music-main-control"
                onClick={toggleMute}
                title={
                  muted
                    ? "Включить звук"
                    : "Выключить звук"
                }
                disabled={tracks.length === 0}
              >
                {muted ? "🔇" : "🔊"}
              </button>

              <button
                type="button"
                onClick={nextTrack}
                title="Следующий трек"
                disabled={tracks.length === 0}
              >
                ⏭
              </button>
            </div>

            <div className="music-panel-footer">
              {tracks.length > 0 ? queuePosition + 1 : 0}
              {" / "}
              {queue.length} треков
            </div>
          </div>
        )}

        {!playing && tracks.length > 0 && (
          <div className="music-start-hint">
            🎄 Нажми, чтобы включить музыку
          </div>
        )}

        {/* Кнопка открытия плеера */}
        <button
          type="button"
          className="music-toggle"
          onClick={() => {
            if (!playing) {
              audioRef.current
                ?.play()
                .catch(console.error);

              setExpanded(true);
            } else {
              setExpanded((prev) => !prev);
            }
          }}
          title="Музыкальный плеер"
        >
          {muted ? "🔇" : playing ? "🎶" : "🎵"}
        </button>
      </div>
    </>
  );
}
