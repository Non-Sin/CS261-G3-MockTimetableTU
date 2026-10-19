import { useEffect, useState } from "react";

const secondsUntil = (deadline: number) => Math.max(0, Math.ceil((deadline - Date.now()) / 1000));

export const useCountdown = (deadline: number, onComplete: () => void) => {
  const [remaining, setRemaining] = useState(() => secondsUntil(deadline));

  useEffect(() => {
    // คำนวณจาก deadline ทุกครั้ง จึงตามเวลาจริงทันแม้ browser พัก timer ของแท็บเบื้องหลัง
    const tick = () => {
      const next = secondsUntil(deadline);
      setRemaining(next);
      if (next === 0) onComplete();
    };
    const timer = window.setInterval(tick, 1000);
    const firstTick = window.setTimeout(tick, 0);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(firstTick);
    };
  }, [deadline, onComplete]);

  return { minutes: String(Math.floor(remaining / 60)).padStart(2, "0"), seconds: String(remaining % 60).padStart(2, "0") };
};
