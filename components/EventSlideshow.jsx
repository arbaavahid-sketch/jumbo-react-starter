// components/EventSlideshow.js
import { useEffect, useState } from "react";

export default function EventSlideshow({ files = [], onSkip }) {
  const all = Array.isArray(files) ? files : [];

  const videos = all.filter((src) => /\.mp4$|\.webm$/i.test(src));
  const images = all.filter((src) => !/\.mp4$|\.webm$/i.test(src));

  const hasEvents = all.length > 0;
  const hasVideo = videos.length > 0;
  const hasImages = images.length > 0;

  // mode: "video" یا "images"
  const [mode, setMode] = useState(() => (hasVideo ? "video" : "images"));
  const [currentImage, setCurrentImage] = useState(0);

  // وقتی لیست مدیا عوض شد، حالت رو ری‌ست کن
  useEffect(() => {
    if (!hasEvents) return;
    setMode(hasVideo ? "video" : "images");
    setCurrentImage(0);
  }, [hasEvents, hasVideo]);

  // اسلایدشو عکس‌ها – هر ۶ ثانیه
  useEffect(() => {
    if (mode !== "images" || !hasImages) return;

    const id = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 6000); // ۶ ثانیه

    return () => clearInterval(id);
  }, [mode, hasImages, images.length]);

  if (!hasEvents) {
    // اگر هیچ مدیایی نیست، اصلاً چیزی رندر نکن
    return null;
  }

  const activeVideo = hasVideo ? videos[0] : null;
  const activeImage = hasImages ? images[currentImage] : null;

  // برای کپشن ساده، اسم فایل رو می‌گیریم
  const currentSrc = mode === "video" ? activeVideo : activeImage;
  const fileName = currentSrc ? currentSrc.split("/").pop() : "";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#020617",
        display: "flex",
        flexDirection: "column",
        padding: 16,
        zIndex: 9999,
      }}
    >
      {/* هدر بالا */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "white",
          fontSize: 14,
          marginBottom: 8,
        }}
      >
        <span style={{ fontWeight: 700 }}>Company Events</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>
            Auto slideshow ({mode === "video" ? "video" : "images"})
          </span>
          <button
            type="button"
            onClick={onSkip}
            style={{
              border: "none",
              padding: "8px 14px",
              borderRadius: 999,
              background: "#0f172a",
              color: "white",
              fontSize: 12,
              cursor: "pointer",
              boxShadow: "0 0 0 1px rgba(148,163,184,0.5)",
            }}
          >
            Skip to Dashboard ⏩
          </button>
        </div>
      </div>

      {/* محتوای اصلی – فول‌اسکرین، با حاشیه خیلی کم */}
      <div
        style={{
          flex: 1,
          borderRadius: 20,
          overflow: "hidden",
          background: "black",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {mode === "video" && activeVideo ? (
          <video
  key={activeVideo}
  src={activeVideo}
  autoPlay
  loop
  controls
  style={{
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
  }}
/>

        ) : (
          activeImage && (
            <img
              key={activeImage}
              src={activeImage}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
              }}
            />
          )
        )}
      </div>

      {/* کپشن پایین + یادآوری بی‌صدا بودن ویدیو */}
      <div
        style={{
          marginTop: 8,
          color: "#e5e7eb",
          fontSize: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ opacity: 0.85 }}>
          {fileName ? `Now playing: ${fileName}` : ""}
        </span>
        {mode === "video" && (
          <span style={{ opacity: 0.7 }}>
            Video is muted for auto-play – subtitles / captions only
          </span>
        )}
      </div>
    </div>
  );
}
