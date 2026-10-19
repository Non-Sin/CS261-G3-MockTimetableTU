import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { userApi } from "../users/api";
import { authApi } from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("Auth API adapters (mock fetch, ไม่เรียก TU จริง)", () => {
  it("ส่ง POST /api/auth/login เป็น JSON ของระบบเรา", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ token: "test-token" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(authApi.login({ username: "6809610000", password: "test-password" })).resolves.toEqual({ token: "test-token" });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/auth/login"), expect.objectContaining({
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "6809610000", password: "test-password" }),
    }));
  });

  it("เก็บ code และ retryAfterSeconds จาก ProblemDetail ให้ UI ใช้", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 429, code: "ACCOUNT_LOCKED", retryAfterSeconds: 125 }), { status: 429 })));
    const error = await authApi.login({ username: "6809610000", password: "test-password" }).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 429, code: "ACCOUNT_LOCKED", retryAfterSeconds: 125 });
  });

  it("GET /api/users/me ส่ง Bearer token", async () => {
    const profile = { studentId: "6809610000", firstName: "Alysa", lastName: "Liu" };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(profile), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(userApi.getCurrentUser("test-token")).resolves.toEqual(profile);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/users/me"), expect.objectContaining({ headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" } }));
  });
});
