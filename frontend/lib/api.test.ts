import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_TOKEN_KEY, SessionProvider } from "@/features/auth/session";
import { timetableDeleteApi } from "@/features/timetable-delete/api";
import { apiFetch } from "./api";

const fetchMock = vi.fn();
const sentHeaders = () => new Headers(fetchMock.mock.calls[0][1].headers);
const unauthorized = () => new Response(JSON.stringify({ status: 401 }), { status: 401 });

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  fetchMock.mockReset().mockResolvedValue(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe("apiFetch เชื่อม JWT ของ browser กับ API ตารางเรียน", () => {
  it.each([
    ["/api/timetable?academicYear=2568&semester=1", "GET"],
    ["/api/courses?academicYear=2568&semester=1", "GET"],
    ["/api/timetable/entries", "POST"],
    ["/api/timetable/entries/1", "DELETE"],
  ])("แนบ token จาก session ให้ %s (%s)", async (path, method) => {
    SessionProvider.saveToken("stored-test-token");
    await apiFetch(path, { method });
    const headers = sentHeaders();
    expect(headers.get("Authorization")).toBe("Bearer stored-test-token");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("US3-T10 ลบหลายวิชา (DELETE /api/timetable/entries?entryIds=) แนบ token", async () => {
    SessionProvider.saveToken("stored-test-token");
    await timetableDeleteApi.removeEntries([1, 2]);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/timetable/entries?entryIds=1,2");
    expect(sentHeaders().get("Authorization")).toBe("Bearer stored-test-token");
  });

  it("ไม่สร้าง Authorization เมื่อไม่มี token", async () => {
    await apiFetch("/api/timetable");
    expect(sentHeaders().has("Authorization")).toBe(false);
  });

  it("ใช้ Authorization ที่ caller ส่งมาแทน token ใน session", async () => {
    SessionProvider.saveToken("old-test-token");
    await apiFetch("/api/users/me", { headers: new Headers({ Authorization: "Bearer explicit-test-token" }) });
    expect(sentHeaders().get("Authorization")).toBe("Bearer explicit-test-token");
  });

  it("ไม่แนบ token ใน session ไปกับ request Login", async () => {
    SessionProvider.saveToken("old-test-token");
    await apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ username: "test-student", password: "test-password" }) });
    expect(sentHeaders().has("Authorization")).toBe(false);
  });

  it("US3-T10 ตอบ 401 (token หมดอายุหรือไม่ถูกต้อง) ล้าง token และตั้งสถานะเซสชันหมดอายุ", async () => {
    SessionProvider.saveToken("expired-token");
    fetchMock.mockResolvedValue(unauthorized());
    await expect(apiFetch("/api/timetable")).rejects.toMatchObject({ status: 401 });
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(SessionProvider.isSessionExpired()).toBe(true);
  });

  it("US3-T10 login ตอบ 401 (รหัสผิด) ไม่ตั้งสถานะเซสชันหมดอายุ", async () => {
    fetchMock.mockResolvedValue(unauthorized());
    await expect(apiFetch("/api/auth/login", { method: "POST" })).rejects.toMatchObject({ status: 401 });
    expect(SessionProvider.isSessionExpired()).toBe(false);
  });
});
