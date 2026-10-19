import { apiFetch } from "@/lib/api";
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
};
