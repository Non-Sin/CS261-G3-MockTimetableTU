import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { SessionProvider } from "@/features/auth/session";
import { applyPlan, getPlans } from "./api";

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

afterEach(() => vi.unstubAllGlobals());

describe("Curriculum Plan API adapters (US8)", () => {
  it("getPlans ส่ง GET /api/study-plans พร้อม studyYear, semester และ Bearer token", async () => {
    SessionProvider.saveToken("plan-token");
    const responseBody = {
      department: "วิทยาการคอมพิวเตอร์",
      studyYear: 2,
      semester: 1,
      plans: [],
      minors: [],
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(responseBody), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getPlans({ studyYear: 2, semester: 1 })).resolves.toEqual(responseBody);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/study-plans?studyYear=2&semester=1"),
      expect.any(Object),
    );
    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.get("Authorization")).toBe("Bearer plan-token");
  });

  it("applyPlan ส่ง POST /api/timetable/apply-plan พร้อม JSON body และ Bearer token", async () => {
    SessionProvider.saveToken("plan-token");
    const responseBody = {
      planId: 21,
      minorId: 3,
      dryRun: true,
      added: [],
      skipped: [],
      timetable: null,
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(responseBody), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const req = { planId: 21, minorId: 3, academicYear: 2568, dryRun: true };
    await expect(applyPlan(req)).resolves.toEqual(responseBody);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/timetable/apply-plan"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(req),
      }),
    );
    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer plan-token");
  });

  it("เก็บ code จาก ProblemDetail เมื่อ API ตอบ 400 (เช่น MINOR_PLAN_MISMATCH)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ status: 400, code: "MINOR_PLAN_MISMATCH", detail: "วิชาโทไม่ตรงกับหลักสูตร" }),
          { status: 400 },
        ),
      ),
    );

    const error = await applyPlan({ planId: 21, minorId: 99, academicYear: 2568, dryRun: true }).catch(
      (cause: unknown) => cause,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: "MINOR_PLAN_MISMATCH" });
  });
});
