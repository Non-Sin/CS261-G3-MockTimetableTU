import { ApiError, apiFetch } from "@/lib/api";
import { SessionProvider } from "./session";
import type { LoginRequest, LoginResponse } from "./types";

// ตัวอย่างสำหรับพัฒนา UI เปิดได้เฉพาะ next dev และต้องเลือกเปิดเอง
export const isAuthDemo = () =>
  process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_AUTH_MODE === "mock";

export const authApi = {
  async login(request: LoginRequest): Promise<LoginResponse> {
    if (isAuthDemo()) {
      const { demoLogin } = await import("./demoApi");
      return demoLogin(request);
    }

    return apiFetch<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(request),
    });
  },

  async logout(token?: string): Promise<void> {
    const authToken = token ?? SessionProvider.getToken();
    try {
      if (isAuthDemo()) {
        const { demoLogout } = await import("./demoApi");
        await demoLogout();
        return;
      }

      await apiFetch<void>("/api/auth/logout", {
        method: "POST",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      });
    } catch (cause) {
      // Logout ตอน token หมดอายุแล้ว (401) ให้ล้าง session เหมือนสำเร็จโดยไม่แสดง banner เซสชันหมดอายุ (US4-T05, US4-T06, US4-T15)
      if (!(cause instanceof ApiError && cause.status === 401)) {
        throw cause;
      }
    } finally {
      SessionProvider.clearSession();
    }
  },
};
