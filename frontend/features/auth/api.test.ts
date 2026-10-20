import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { userApi } from "../users/api";
import { authApi } from "./api";
import { AUTH_TOKEN_KEY, SESSION_EXPIRED_KEY, SessionProvider } from "./session";

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

afterEach(() => vi.unstubAllGlobals());

describe("Auth API adapters (mock fetch, ไม่เรียก TU จริง)", () => {
  it("ส่ง POST /api/auth/login เป็น JSON ของระบบเรา", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ token: "test-token" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(authApi.login({ username: "6809610000", password: "test-password" })).resolves.toEqual({ token: "test-token" });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/auth/login"), expect.objectContaining({
      method: "POST", body: JSON.stringify({ username: "6809610000", password: "test-password" }),
    }));
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get("Content-Type")).toBe("application/json");
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
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/users/me"), expect.any(Object));
    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer test-token");
  });

  it("US4: POST /api/auth/logout ส่ง Bearer token ไม่มี body และล้าง session เมื่อได้ 204", async () => {
    SessionProvider.saveToken("logout-token");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(authApi.logout()).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/logout"),
      expect.objectContaining({
        method: "POST",
      }),
    );
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer logout-token");
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBeUndefined();
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(sessionStorage.getItem(SESSION_EXPIRED_KEY)).toBeNull();
  });

  it("US4: POST /api/auth/logout ตอบ 401 ล้าง session เหมือนสำเร็จโดยไม่ติดสถานะเซสชันหมดอายุ", async () => {
    SessionProvider.saveToken("expired-token");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 401, title: "Unauthorized", detail: "กรุณาเข้าสู่ระบบก่อนใช้งาน" }), { status: 401 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(authApi.logout()).resolves.toBeUndefined();

    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(SessionProvider.isSessionExpired()).toBe(false);
  });
});
