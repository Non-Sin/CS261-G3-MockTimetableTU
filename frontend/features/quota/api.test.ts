import { afterEach, describe, expect, it, vi } from "vitest";
import { getCourseQuota, searchQuotaCourses } from "./api";

const stubFetch = (body: unknown = {}) => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};
const urlOf = (fetchMock: ReturnType<typeof stubFetch>) => String(fetchMock.mock.calls[0][0]);

afterEach(() => vi.unstubAllGlobals());

describe("quota API adapters (mock fetch)", () => {
  it("ค้นด้วย q ส่ง academicYear, semester, q และไม่ส่ง mine=false", async () => {
    const fetchMock = stubFetch();
    await searchQuotaCourses({ academicYear: 2568, semester: 1, q: " EL395 ", mine: false });
    expect(urlOf(fetchMock)).toBe("/api/quota/courses?academicYear=2568&semester=1&q=EL395");
  });

  it("UT-UI-08 ติ๊ก mine ตอน q ว่าง ส่ง mine=true และไม่ส่ง q", async () => {
    const fetchMock = stubFetch();
    await searchQuotaCourses({ academicYear: 2568, semester: 1, q: "", mine: true });
    expect(urlOf(fetchMock)).toBe("/api/quota/courses?academicYear=2568&semester=1&mine=true");
  });

  it("UT-UI-27 ดึงวิชาเดี่ยวด้วย path รหัสวิชา", async () => {
    const fetchMock = stubFetch();
    await getCourseQuota("EL295", { academicYear: 2568, semester: 1 });
    expect(urlOf(fetchMock)).toBe("/api/quota/courses/EL295?academicYear=2568&semester=1");
  });

  it("encode รหัสวิชาที่มีอักขระพิเศษใน path", async () => {
    const fetchMock = stubFetch();
    await getCourseQuota("A/B", { academicYear: 2568, semester: 2 });
    expect(urlOf(fetchMock)).toContain("/api/quota/courses/A%2FB?");
  });
});
