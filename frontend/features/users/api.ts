import { apiFetch } from "@/lib/api";
import { isAuthDemo } from "../auth/api";
import type { UserProfileResponse } from "./types";

export const userApi = {
  async getCurrentUser(token: string): Promise<UserProfileResponse> {
    if (isAuthDemo()) {
      const { demoCurrentUser } = await import("../auth/demoApi");
      return demoCurrentUser(token);
    }

    return apiFetch<UserProfileResponse>("/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
