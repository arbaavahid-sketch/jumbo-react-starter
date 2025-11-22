// components/EventSlideshow.js
import { useEffect, useState } from "react";

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function EventSlideshow() {
  const [files, setFiles] = useState([]);
  const [shuffled, setShuffled] = useState([]);
  const [mode, setMode] = useState(null); // "video" یا "image"
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((d) => {
        const all = d.files || [];
        const s = shuffle(all);
        setFiles(all);
        setShuffled(s);

        const videos = s.filter((src) => /\.mp4$|\.webm$/i.test(src));
        const images = s.filter((src) => !/\.mp4$|\.webm$/i.test(src));

        // 👇 انتخاب حالت نمایش به صورت تصادفی
        if (videos.length && images.length) {
          setMode(Math.random() < 0.5 ? "video" : "image");
        } else if (videos.length) {
          setMode("video");
        } else {
          setMode("image");
        }

        setCurrentIndex(0);
      })
      .catch((e) => {
        console.error("EVENT SLIDESHOW ERROR", e);
      });
  }, []);

  // اگر عکس داریم و حالت image است، هر ۸ ثانیه عکس بعدی
  useEffect(() => {
    if (mode !== "image") return;
    const images = shuffled.filter((src) => !/\.mp4$|\.webm$/i.test(src));
    if (images.length <= 1) return;

    const id = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % images.length);
    }, 8000); // هر ۸ ثانیه

    return () => clearInterval(id);
  }, [mode, shuffled]);

  if (!files || files.length === 0) {
    return (
      <div
        style={{
          padding: 24,
          textAlign: "center",
          color: "#6b7280",
          fontSize: 14,
        }}
      >
        No event media found.
      </div>
    );
  }

  const videos = shuffled.filter((src) => /\.mp4$|\.webm$/i.test(src));
  const images = shuffled.filter((src) => !/\.mp4$|\.webm$/i.test(src));

  const showVideo = mode === "video" && videos.length > 0;
  const selectedVideo = showVideo ? videos[0] : null; // چون shuffled شده، همین هم رندومه

  const showImages = mode === "image" && images.length > 0;
  const currentImage =
    showImages && images.length > 0
      ? images[currentIndex % images.length]
      : null;

  return (
    <div
      style={{
        background: "#020617",
        borderRadius: 28,
        padding: 24,
        boxShadow: "0 32px 80px rgba(15,23,42,0.85)",
        color: "#f9fafb",
        width: "100%",
        marginTop: 24,
      }}
    >
      {/* هدر بالای اسلایدشو */}
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 14,
        }}
      >
        <span style={{ fontWeight: 700 }}>Company Events</span>
        <span style={{ fontSize: 12, opacity: 0.8 }}>
          Auto slideshow ({showVideo ? "video" : "images"})
        </span>
      </div>

      {/* قاب بزرگ مدیا */}
      <div
        style={{
          position: "relative",
          borderRadius: 22,
          overflow: "hidden",
          width: "100%",
          // تقریباً تمام ارتفاع مانیتور، ولی محدود:
          height: "64vh",
          maxHeight: 720,
          minHeight: 360,
          background: "#0b1120",
        }}
      >
        {showVideo && selectedVideo && (
          <video
            key={selectedVideo} // برای شروع مجدد وقتی رفرش می‌شود
            src={selectedVideo}
            controls={false}
            autoPlay
            loop
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        )}

        {showImages && currentImage && (
          <img
            key={currentImage}
            src={currentImage}
            alt="Company event"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        )}
      </div>
    </div>
  );
}
