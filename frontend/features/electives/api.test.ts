import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { SessionProvider } from "../auth/session";
import { fetchElectiveDetail, fetchElectives } from "./api";

const fetchMock = vi.fn();

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  SessionProvider.saveToken("electives-test-token");
  fetchMock.mockReset().mockResolvedValue(new Response("[]", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("US6 API adapter", () => {
  it("ส่งปี/ภาคปัจจุบันและ Bearer token โดยไม่ส่งตัวกรองว่าง", async () => {
    await fetchElectives({
      academicYear: 2568,
      currentSemester: 1,
      q: "  ",
      excludeConflicts: false,
    });
    const [path, init] = fetchMock.mock.calls[0];
    const url = new URL(path, "http://localhost");
    expect(url.pathname).toBe("/api/electives");
    expect([...url.searchParams.entries()]).toEqual([
      ["academicYear", "2568"],
      ["currentSemester", "1"],
    ]);
    expect(new Headers(init.headers).get("Authorization")).toBe(
      "Bearer electives-test-token",
    );
    expect(init.body).toBeUndefined();
  });

  it("ส่งทุกตัวกรองพร้อมกันและแยก currentSemester จาก semester", async () => {
    await fetchElectives({
      academicYear: 2568,
      currentSemester: 1,
      q: "  ภาษาฝรั่งเศส & FR  ",
      semester: 2,
      day: "MONDAY",
      timeSlot: "AFTERNOON",
      group: "LANGUAGE",
      excludeConflicts: true,
    });
    const url = new URL(fetchMock.mock.calls[0][0], "http://localhost");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      academicYear: "2568",
      currentSemester: "1",
      q: "ภาษาฝรั่งเศส & FR",
      semester: "2",
      day: "MONDAY",
      timeSlot: "AFTERNOON",
      group: "LANGUAGE",
      excludeConflicts: "true",
    });
  });

  it("อ่านรายละเอียดโดย encode courseCode และส่งเฉพาะปี/ภาคปัจจุบัน", async () => {
    await fetchElectiveDetail("FR205/x", 2568, 2);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/electives/FR205%2Fx?academicYear=2568&currentSemester=2",
    );
  });

  it("200 [] คืนรายการว่างตามจริง", async () => {
    expect(
      await fetchElectives({
        academicYear: 2568,
        currentSemester: 1,
        q: "SA240",
      }),
    ).toEqual([]);
  });

  it("404 ส่งต่อ ApiError พร้อม detail", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ status: 404, detail: "ไม่พบวิชาเสรีแนะนำ: SA240" }),
        { status: 404 },
      ),
    );
    await expect(fetchElectiveDetail("SA240", 2568, 1)).rejects.toMatchObject({
      status: 404,
      message: "ไม่พบวิชาเสรีแนะนำ: SA240",
    });
  });

  it.each(["list", "detail"])(
    "401 ของ %s ใช้ session หมดอายุชุดเดิม",
    async (endpoint) => {
      fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));
      const request =
        endpoint === "list"
          ? fetchElectives({ academicYear: 2568, currentSemester: 1 })
          : fetchElectiveDetail("FR205", 2568, 1);
      await expect(request).rejects.toBeInstanceOf(ApiError);
      expect(SessionProvider.getToken()).toBeNull();
      expect(SessionProvider.isSessionExpired()).toBe(true);
    },
  );

  it("network error ไม่ถูกแทนด้วยข้อมูลตัวอย่างหรือรายการว่าง", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(
      fetchElectives({ academicYear: 2568, currentSemester: 1 }),
    ).rejects.toThrow("Failed to fetch");
  });
});
