import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "../api";
import { SessionProvider } from "../session";

export const useLogout = () => {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const logout = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoggingOut(true);
    const token = SessionProvider.getToken() ?? undefined;
    try {
      await authApi.logout(token);
    } catch {
      // ล้าง session ฝั่ง client และนำทางกลับหน้า login เสมอแม้เรียก API ไม่สำเร็จ (US4-T06)
    } finally {
      SessionProvider.clearSession();
      inFlight.current = false;
      if (mounted.current) setLoggingOut(false);
      router.replace("/login");
    }
  }, [router]);

  return { logout, loggingOut };
};
