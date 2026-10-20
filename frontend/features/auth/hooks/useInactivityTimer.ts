import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SessionProvider } from "../session";

const configuredTimeout = process.env.NEXT_PUBLIC_INACTIVITY_TIMEOUT_MS
  ? Number(process.env.NEXT_PUBLIC_INACTIVITY_TIMEOUT_MS)
  : NaN;

export const DEFAULT_INACTIVITY_TIMEOUT_MS =
  Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : process.env.NEXT_PUBLIC_AUTH_MODE === "mock"
    ? 30 * 1000
    : 15 * 60 * 1000;

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;

export const useInactivityTimer = (timeoutMs = DEFAULT_INACTIVITY_TIMEOUT_MS) => {
  const router = useRouter();
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    if (!SessionProvider.isAuthenticated() || timeoutMs <= 0) return;

    timerRef.current = window.setTimeout(() => {
      if (!SessionProvider.isAuthenticated()) return;
      SessionProvider.expireSession();
      router.replace("/login");
    }, timeoutMs);
  }, [clearTimer, router, timeoutMs]);

  useEffect(() => {
    if (!SessionProvider.isAuthenticated() || timeoutMs <= 0) return;

    reset();

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, reset, { passive: true });
    }

    const unsubscribe = SessionProvider.subscribe(() => {
      if (!SessionProvider.isAuthenticated()) {
        clearTimer();
      }
    });

    return () => {
      clearTimer();
      unsubscribe();
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, reset);
      }
    };
  }, [clearTimer, reset, timeoutMs]);

  return { reset };
};
