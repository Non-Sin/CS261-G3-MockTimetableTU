import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./api";
import { authSession } from "./authSession";

const fetchMock = vi.fn();

beforeEach(() => {
  sessionStorage.clear();
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
    authSession.saveToken("stored-test-token");
    await apiFetch(path, { method });
    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.get("Authorization")).toBe("Bearer stored-test-token");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("ไม่สร้าง Authorization เมื่อไม่มี token", async () => {
    await apiFetch("/api/timetable");
    expect(new Headers(fetchMock.mock.calls[0][1].headers).has("Authorization")).toBe(false);
  });

  it("ใช้ Authorization ที่ caller ส่งมาแทน token ใน session", async () => {
    authSession.saveToken("old-test-token");
    await apiFetch("/api/users/me", { headers: new Headers({ Authorization: "Bearer explicit-test-token" }) });
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get("Authorization")).toBe("Bearer explicit-test-token");
  });

  it("ไม่แนบ token ใน session ไปกับ request Login", async () => {
    authSession.saveToken("old-test-token");
    await apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ username: "test-student", password: "test-password" }) });
    expect(new Headers(fetchMock.mock.calls[0][1].headers).has("Authorization")).toBe(false);
  });
});
