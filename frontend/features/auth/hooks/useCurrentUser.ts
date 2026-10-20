import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { userApi } from "../../users/api";
import type { UserProfileResponse } from "../../users/types";
import { SessionProvider } from "../session";

export const useCurrentUser = () => {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    const enforceSession = () => {
      if (!SessionProvider.isAuthenticated()) {
        setProfile(null);
        setError(false);
        router.replace("/login");
      }
    };

    const unsubscribe = SessionProvider.subscribe(enforceSession);
    window.addEventListener("popstate", enforceSession);
    window.addEventListener("pageshow", enforceSession);

    // อ่าน session ใน browser หลัง mount เพื่อให้ server render ไม่แตะ window/sessionStorage
    Promise.resolve().then(async () => {
      if (ignore) return;
      const token = SessionProvider.getToken();
      if (!token) {
        setProfile(null);
        router.replace("/login");
        return;
      }
      const currentUser = await userApi.getCurrentUser(token);
      if (!ignore && SessionProvider.isAuthenticated()) {
        setProfile(currentUser);
      }
    }).catch((cause) => {
      if (ignore) return;
      if (cause instanceof ApiError && cause.status === 401) {
        setProfile(null);
        SessionProvider.expireSession();
        router.replace("/login");
      } else {
        setError(true);
      }
    });
    // ไม่ใช้ผล request เก่าหลังออกจากหน้า หรือเมื่อเริ่มโหลดรอบใหม่
    return () => {
      ignore = true;
      unsubscribe();
      window.removeEventListener("popstate", enforceSession);
      window.removeEventListener("pageshow", enforceSession);
    };
  }, [router, reloadKey]);

  const retry = () => {
    setError(false);
    setReloadKey((key) => key + 1);
  };

  return { profile, error, retry };
};
