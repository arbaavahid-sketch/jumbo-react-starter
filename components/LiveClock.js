// components/LiveClock.js
import { useEffect, useState } from "react";

export default function LiveClock() {
  const [now, setNow] = useState("");

  useEffect(() => {
    const update = () => {
      const d = new Date();

      // تاریخ میلادی (مثلاً: 10 Mar 2025)
      const date = d.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });

      // ساعت (اروپا مرکزی، مثل سیستم خودت)
      const time = d.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      setNow(`${date} | ${time}`);
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 600,
        color: "#0f172a",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
      }}
    >
      {now}
    </div>
  );
}
