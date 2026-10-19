import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { userApi } from "../../users/api";
import type { UserProfileResponse } from "../../users/types";
import { authSession } from "../session";

export const useCurrentUser = () => {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    // อ่าน session ใน browser หลัง mount เพื่อให้ server render ไม่แตะ window/sessionStorage
    Promise.resolve().then(async () => {
      if (ignore) return;
      const token = authSession.getToken();
      if (!token) {
        router.replace("/login");
        return;
      }
      const currentUser = await userApi.getCurrentUser(token);
      if (!ignore) setProfile(currentUser);
    }).catch((cause) => {
      if (ignore) return;
      if (cause instanceof ApiError && cause.status === 401) {
        authSession.clear();
        router.replace("/login");
      } else {
        setError(true);
      }
    });
    // ไม่ใช้ผล request เก่าหลังออกจากหน้า หรือเมื่อเริ่มโหลดรอบใหม่
    return () => { ignore = true; };
  }, [router, reloadKey]);

  const retry = () => {
    setError(false);
    setReloadKey((key) => key + 1);
  };

  return { profile, error, retry };
};
