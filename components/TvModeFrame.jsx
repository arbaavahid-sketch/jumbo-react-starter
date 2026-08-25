import { useEffect, useRef, useState } from "react";

const TV_CANVAS_WIDTH = 1920;

export default function TvModeFrame({ enabled, children }) {
  const stageRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!enabled) return undefined;

    const stage = stageRef.current;
    if (!stage) return undefined;

    let animationFrame = 0;
    const fitToScreen = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const contentHeight = Math.max(stage.scrollHeight, 1);
        const nextScale = Math.min(
          window.innerWidth / TV_CANVAS_WIDTH,
          window.innerHeight / contentHeight,
        );
        setScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1);
      });
    };

    fitToScreen();
    window.addEventListener("resize", fitToScreen);

    const resizeObserver = new ResizeObserver(fitToScreen);
    resizeObserver.observe(stage);
    document.fonts?.ready.then(fitToScreen).catch(() => {});

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", fitToScreen);
      resizeObserver.disconnect();
    };
  }, [enabled]);

  if (!enabled) return children;

  return (
    <div className="tv-mode-viewport">
      <div
        ref={stageRef}
        className="tv-mode-stage"
        style={{ transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
