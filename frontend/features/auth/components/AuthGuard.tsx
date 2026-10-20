"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { SessionProvider } from "../session";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const isAuth = SessionProvider.isAuthenticated();
      setAuthenticated(isAuth);
      if (!isAuth) {
        router.replace("/login");
      }
    };

    checkAuth();
    const unsubscribe = SessionProvider.subscribe(checkAuth);
    window.addEventListener("popstate", checkAuth);
    window.addEventListener("pageshow", checkAuth);

    return () => {
      unsubscribe();
      window.removeEventListener("popstate", checkAuth);
      window.removeEventListener("pageshow", checkAuth);
    };
  }, [router]);

  if (!authenticated) return null;

  return <>{children}</>;
}
