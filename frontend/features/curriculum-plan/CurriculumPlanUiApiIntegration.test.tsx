import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionProvider } from "../auth/session";
import Timetable from "../timetable/Timetable";
import realApi from "./testdata/us8-t17-api-responses.json";

/*
 * US8-T17 รัน Integration Test ระหว่าง UI กับ API ตาม US8-T13 (IT-US8-01 ถึง 34)
 *
 * ไม่ mock api.ts แต่ดัก fetch ของ browser จึงทดสอบครบทาง Timetable → CurriculumPlanLauncher → useCurriculumPlan
 * → getPlans / applyPlan → apiFetch → HTTP request
 * response ทุกตัวมาจาก backend จริง (docker compose, profile stub-tu, seed จริง) ที่บันทึกไว้ใน
 * testdata/us8-t17-api-responses.json (ดู .doc/US8/T17/US8-T17-real-api-log.md) ยกเว้นกรณีที่ T13 ให้ดัก/จำลอง
 * (minors ว่าง, 500, network, 401 ตอนกดจากหน้าเว็บ)
 *
 * เทสต์ตรวจพฤติกรรมจริงของหน้าเว็บ เคสที่พฤติกรรมจริงต่างจากผลที่ T13 คาดหวังมีป้าย [ต่างจาก T13] ในชื่อ
 * และบันทึกเป็น Fail ใน .doc/US8/T17/US8-T17-Test-Result.md
 */

type Recorded = { status: number; body: unknown };
const REAL = realApi as Record<string, Recorded>;
const clone = <T,>(name: string): T => structuredClone(REAL[name].body) as T;

const CURRICULUM = "หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ (ฉบับปรับปรุง พ.ศ. 2566)";
const TOKEN = "it-us8-t17-token";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

const fetchMock = vi.fn();
const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": status >= 400 ? "application/problem+json" : "application/json" },
  });
const recorded = (name: string) => Promise.resolve(json(REAL[name].body, REAL[name].status));

// ---------------------------------------------------------------- fake server state (per test)

let timetableBody: Json;
let plansResponse: (studyYear: string | null, semester: string | null) => Promise<Response>;
let applyResponse: (request: Json) => Promise<Response>;

const PLAN_FIXTURES: Record<string, string> = {
  "1/1": "plans-y1s1",
  "2/1": "plans-y2s1",
  "3/1": "plans-y3s1",
  "3/2": "plans-y3s2",
  "4/1": "plans-y4s1",
  "4/2": "plans-y4s2-empty",
};
const defaultPlans = (y: string | null, s: string | null) =>
  recorded(PLAN_FIXTURES[`${y}/${s}`] ?? "plans-y4s2-empty");

/** preview / confirm ของแผนจริงที่บันทึกไว้ เลือกจาก planId + minorId + dryRun */
const APPLY_FIXTURES: Record<string, string> = {
  "3/null/true": "preview-y2s1-empty",
  "3/null/false": "confirm-y2s1-new-timetable",
  "6/null/true": "preview-y3s1-sp-no-minor",
  "6/1/true": "preview-y3s1-sp-datascience",
  "6/3/true": "preview-y3s1-sp-digital-nosection",
  "6/4/true": "preview-y3s1-sp-devops",
  "8/1/true": "preview-y3s2-sp-datascience-conflict",
  "8/1/false": "confirm-y3s2-sp-datascience-conflict",
  "1/null/true": "preview-y1s1-tu100-already",
};
const defaultApply = (req: Json) => {
  const name = APPLY_FIXTURES[`${req.planId}/${req.minorId ?? null}/${req.dryRun}`];
  return name ? recorded(name) : Promise.reject(new Error(`ไม่ได้เตรียม apply-plan ${JSON.stringify(req)}`));
};

const emptyTimetable = (semester = 1): Json => ({
  ...clone<Json>("timetable-empty"),
  semester,
  entries: [],
  totalCredits: 0,
  conflicts: [],
  updatedAt: null,
});

// ---------------------------------------------------------------- request helpers

const calls = () => fetchMock.mock.calls as [string, RequestInit | undefined][];
const planGets = () => calls().filter(([url]) => url.startsWith("/api/study-plans"));
const applyCalls = () =>
  calls()
    .filter(([url]) => url === "/api/timetable/apply-plan")
    .map(([, init]) => ({ body: JSON.parse(String(init?.body)), headers: new Headers(init?.headers) }));
const previews = () => applyCalls().filter((c) => c.body.dryRun === true);
/** UI ไม่ส่ง minorId เมื่อเลือก "ไม่เรียนวิชาโท" (T13 IT-14 ยอมรับ null หรือไม่ส่ง) จึงเทียบแบบไม่ส่ง = null */
const sent = (body: Json) => ({ ...body, minorId: body.minorId ?? null });
const confirms = () => applyCalls().filter((c) => c.body.dryRun === false);
const timetableGets = () => calls().filter(([url]) => url.startsWith("/api/timetable?"));

// ---------------------------------------------------------------- UI helpers

const dialog = () => screen.getByRole("dialog", { name: "จัดตารางเรียนตามแผนหลักสูตร" });
const inDialog = () => within(dialog());
const timetableBox = () => within(screen.getByRole("heading", { name: "ตารางเรียนจำลอง" }).closest("section")!);
const user = () => userEvent.setup();

const openModal = async () => {
  render(<Timetable />);
  const launcher = await screen.findByRole("button", { name: "จัดตามแผนหลักสูตร" });
  await waitFor(() => expect(launcher).toBeEnabled());
  await user().click(launcher);
  return dialog();
};

const pick = async (name: RegExp | string) => {
  await user().click(inDialog().getByRole("button", { name }));
};

const chooseTerm = async (studyYear: number, semester: number) => {
  await pick(new RegExp(`ชั้นปีที่ ${studyYear}$`));
  await pick(new RegExp(`^ภาคเรียนที่ ${semester}$`));
};

const waitAdded = (count: number) => inDialog().findByText(`วิชาที่จะเพิ่มลงตาราง (${count} วิชา)`);
const confirmButton = () => inDialog().getByRole("button", { name: /เพิ่มลงตารางเรียน/ });

describe("US8-T17 Integration Test ระหว่าง UI กับ API (US8-T13)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    SessionProvider.saveToken(TOKEN);
    timetableBody = emptyTimetable();
    plansResponse = defaultPlans;
    applyResponse = defaultApply;
    fetchMock.mockReset().mockImplementation((url: string, init?: RequestInit) => {
      if (url.startsWith("/api/timetable?")) return Promise.resolve(json(timetableBody, 200));
      if (url.startsWith("/api/courses?")) return Promise.resolve(json([], 200));
      if (url.startsWith("/api/study-plans")) {
        const q = new URL(url, "http://localhost").searchParams;
        return plansResponse(q.get("studyYear"), q.get("semester"));
      }
      if (url === "/api/timetable/apply-plan") return applyResponse(JSON.parse(String(init?.body)));
      return Promise.reject(new Error(`ไม่ได้เตรียม response ของ ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  // ============================================================ 3.1 GET /api/study-plans

  it("IT-US8-01 ชั้นปี 2 ภาค 1 ส่ง GET พร้อม JWT ได้แผนเดียว ไม่มีปุ่มแผนและวิชาโท และเรียก preview อัตโนมัติ", async () => {
    await openModal();
    await chooseTerm(2, 1);
    await waitAdded(6);

    const [url, init] = planGets().at(-1)!;
    expect(url).toBe("/api/study-plans?studyYear=2&semester=1");
    expect(new Headers(init?.headers).get("Authorization")).toBe(`Bearer ${TOKEN}`);
    expect(inDialog().getByText("วิชาแนะนำสำหรับ: ชั้นปีที่ 2 ภาคเรียนที่ 1")).toBeInTheDocument();
    expect(inDialog().queryByText("เลือกวิชาโท")).not.toBeInTheDocument();
    expect(inDialog().queryByText("เลือกได้ 1 แผน")).not.toBeInTheDocument();
    expect(previews()).toHaveLength(1);
  });

  it("IT-US8-02 ชั้นปี 3 ภาค 1 แผนไม่มีค่าเริ่มต้น วิชาโทเริ่มที่ 'ไม่เรียนวิชาโท' เลือกแผนแล้ว preview อัตโนมัติ", async () => {
    await openModal();
    await chooseTerm(3, 1);

    expect(await inDialog().findByText("กรุณาเลือกแผนการศึกษาเพื่อแสดงรายวิชาแนะนำ")).toBeInTheDocument();
    expect(inDialog().getByRole("button", { name: /ทำหัวข้อพิเศษ/ })).toHaveAttribute("aria-pressed", "false");
    expect(inDialog().getByRole("button", { name: /สหกิจศึกษา/ })).toHaveAttribute("aria-pressed", "false");
    expect(inDialog().getByRole("button", { name: /ไม่เรียนวิชาโท/ })).toHaveAttribute("aria-pressed", "true");
    for (const minor of ["วิทยาการข้อมูล", "ปัญญาประดิษฐ์", "การออกแบบและพัฒนาผลิตภัณฑ์ดิจิทัล", "เดฟออปส์"]) {
      expect(inDialog().getByRole("button", { name: new RegExp(minor) })).toBeInTheDocument();
    }
    expect(previews()).toHaveLength(0);

    await pick(/ทำหัวข้อพิเศษ/);
    await waitAdded(5);
    expect(sent(previews().at(-1)!.body)).toEqual({ planId: 6, minorId: null, academicYear: 2568, dryRun: true });
    expect(inDialog().getByText("CS301")).toBeInTheDocument();
  });

  it("IT-US8-03 ชั้นปี 4 ภาค 2 ไม่มีแผน ได้ 200 plans: [] แสดง 'ยังไม่มีแผนการเรียนสำหรับชั้นปีนี้' และกดเพิ่มไม่ได้", async () => {
    await openModal();
    await chooseTerm(4, 2);

    expect(await inDialog().findByText("ยังไม่มีแผนการเรียนสำหรับชั้นปีนี้")).toBeInTheDocument();
    expect(inDialog().queryByRole("button", { name: /เพิ่มลงตารางเรียน/ })).not.toBeInTheDocument();
    expect(inDialog().queryByRole("alert")).not.toBeInTheDocument();
    expect(previews()).toHaveLength(0);
  });

  it("IT-US8-04 ชั้นปี 3–4 ที่ minors ว่าง ซ่อนกลุ่มวิชาโท แต่เลือกแผนและดูสรุปได้ (จำลอง minors: [])", async () => {
    plansResponse = async (y, s) => {
      if (y === "3" && s === "1") return json({ ...clone<Json>("plans-y3s1"), minors: [] }, 200);
      return defaultPlans(y, s);
    };
    await openModal();
    await chooseTerm(3, 1);

    await inDialog().findByText("กรุณาเลือกแผนการศึกษาเพื่อแสดงรายวิชาแนะนำ");
    expect(inDialog().queryByText("เลือกวิชาโท")).not.toBeInTheDocument();
    await pick(/ทำหัวข้อพิเศษ/);
    await waitAdded(5);
  });

  it("IT-US8-05 เปลี่ยนภาค/ชั้นปีแล้ว GET ใหม่ทุกครั้ง แผนยังจำไว้ วิชาโทที่ไม่มีกลับเป็น 'ไม่เรียนวิชาโท' และชั้นปี 2 ล้างทั้งหมด", async () => {
    // ภาค 2 ของข้อมูลจริงมีวิชาโทวิทยาการข้อมูล จึงตัดออกให้ตรงสถานการณ์ใน T13
    plansResponse = async (y, s) => {
      if (y === "3" && s === "2") {
        const body = clone<Json>("plans-y3s2");
        body.minors = body.minors.filter((m: Json) => m.minorName !== "วิทยาการข้อมูล");
        return json(body, 200);
      }
      return defaultPlans(y, s);
    };
    applyResponse = async (req) => (req.dryRun ? json(clone<Json>("preview-y3s1-sp-no-minor"), 200) : defaultApply(req));
    await openModal();
    await chooseTerm(3, 1);
    await pick(/สหกิจศึกษา/);
    await pick(/วิทยาการข้อมูล/);
    expect(inDialog().getByRole("button", { name: /วิทยาการข้อมูล/ })).toHaveAttribute("aria-pressed", "true");

    await pick(/^ภาคเรียนที่ 2$/);
    await waitFor(() => expect(planGets().at(-1)![0]).toBe("/api/study-plans?studyYear=3&semester=2"));
    await waitFor(() =>
      expect(inDialog().getByRole("button", { name: /สหกิจศึกษา/ })).toHaveAttribute("aria-pressed", "true"),
    );
    expect(inDialog().getByRole("button", { name: /ไม่เรียนวิชาโท/ })).toHaveAttribute("aria-pressed", "true");
    expect(inDialog().queryByRole("button", { name: /วิทยาการข้อมูล/ })).not.toBeInTheDocument();

    await pick(/ชั้นปีที่ 2$/);
    await waitFor(() => expect(planGets().at(-1)![0]).toBe("/api/study-plans?studyYear=2&semester=2"));
    expect(inDialog().queryByText("เลือกวิชาโท")).not.toBeInTheDocument();
    expect(inDialog().queryByText("เลือกได้ 1 แผน")).not.toBeInTheDocument();
  });

  it("IT-US8-34 สาขามีหลายหลักสูตร แสดงตัวเลือกหลักสูตร เลือกหลักสูตรแล้ว preview ด้วย planId ของหลักสูตรนั้น", async () => {
    plansResponse = async (y, s) => (y === "2" && s === "1" ? recorded("plans-y2s1-multi-curricula") : defaultPlans(y, s));
    applyResponse = async (req) =>
      req.planId === 3 ? defaultApply(req) : json({ ...clone<Json>("preview-y2s1-empty"), planId: req.planId }, 200);
    await openModal();
    await chooseTerm(2, 1);

    expect(await inDialog().findByText("หลักสูตร")).toBeInTheDocument();
    expect(inDialog().getByRole("button", { name: "หลักสูตรทดสอบ ST-A" })).toBeInTheDocument();
    expect(inDialog().getByRole("button", { name: "หลักสูตรทดสอบ ST-B" })).toBeInTheDocument();
    await pick(CURRICULUM);
    await waitFor(() => expect(previews().at(-1)!.body.planId).toBe(3));
    expect(inDialog().getByRole("button", { name: CURRICULUM })).toHaveAttribute("aria-pressed", "true");
  });

  // ============================================================ 3.2 Preview (dryRun: true)

  it("IT-US8-06 ตารางว่าง preview แผนปี 2 ภาค 1 ส่ง body ตาม Spec แสดง 6 วิชาพร้อม Sec และหน่วยกิต ไม่เขียนตาราง", async () => {
    await openModal();
    await chooseTerm(2, 1);
    await waitAdded(6);

    const call = previews()[0];
    expect(sent(call.body)).toEqual({ planId: 3, minorId: null, academicYear: 2568, dryRun: true });
    expect(call.headers.get("Authorization")).toBe(`Bearer ${TOKEN}`);
    for (const [code, sec] of [["CS221", "040001"], ["CS213", "050001"], ["ST329", "090001"], ["CS261", "100001"], ["CS240", "870001"], ["EL295", "780001"]]) {
      const row = inDialog().getByText(code).closest("li")!;
      expect(within(row).getByText(`Sec ${sec}`)).toBeInTheDocument();
      expect(within(row).getByText("3.0 หน่วยกิต")).toBeInTheDocument();
    }
    expect(inDialog().queryByText(/วิชาที่เพิ่มไม่ได้/)).not.toBeInTheDocument();
    expect(confirmButton()).toBeEnabled();
    expect(confirms()).toHaveLength(0);
    expect(timetableBox().getByText("หน่วยกิต 0 / 22")).toBeInTheDocument();
  });

  it("IT-US8-07 แผนหัวข้อพิเศษ + วิชาโทวิทยาการข้อมูล ส่ง minorId และแสดงป้าย 'วิชาโท'", async () => {
    await openModal();
    await chooseTerm(3, 1);
    await pick(/ทำหัวข้อพิเศษ/);
    await pick(/วิทยาการข้อมูล/);
    await waitFor(() => expect(sent(previews().at(-1)!.body)).toEqual({ planId: 6, minorId: 1, academicYear: 2568, dryRun: true }));
    await waitAdded(7);

    expect(inDialog().getByText("วิชาแนะนำสำหรับ: ชั้นปีที่ 3 ภาคเรียนที่ 1 (แผนทำหัวข้อพิเศษ · วิชาโทวิทยาการข้อมูล)")).toBeInTheDocument();
    for (const code of ["CS345", "CS346"]) {
      expect(within(inDialog().getByText(code).closest("li")!).getAllByText("วิชาโท").length).toBeGreaterThan(0);
    }
    expect(within(inDialog().getByText("CS301").closest("li")!).queryByText("วิชาโท")).not.toBeInTheDocument();
  });

  it("IT-US8-08 TU100 อยู่ในตารางแล้ว preview แผนปี 1 ภาค 1 แสดง TU100 ในรายการข้ามพร้อม message ของ API", async () => {
    timetableBody = { ...emptyTimetable(), entries: [], totalCredits: 3 };
    await openModal();
    await chooseTerm(1, 1);
    await waitAdded(6);

    const skipped = inDialog().getByText("TU100").closest("li")!;
    expect(within(skipped).getByText("TU100 อยู่ในตารางแล้ว (Sec 820001)")).toBeInTheDocument();
    expect(within(skipped).getByText("อยู่ในตารางแล้ว")).toBeInTheDocument();
    expect(inDialog().getAllByText("TU100")).toHaveLength(1);
  });

  it("IT-US8-09 ปี 3 ภาค 2 หัวข้อพิเศษ + วิทยาการข้อมูล CS246 ข้ามเพราะเวลาชน CS314 ยังอยู่ในรายการที่จะเพิ่ม", async () => {
    await openModal();
    await chooseTerm(3, 2);
    await pick(/ทำหัวข้อพิเศษ/);
    await pick(/วิทยาการข้อมูล/);
    await waitAdded(6);

    const skipped = inDialog().getByText("CS246").closest("li")!;
    expect(within(skipped).getByText("เวลาเรียนชน")).toBeInTheDocument();
    expect(within(skipped).getByText("วิชาโท")).toBeInTheDocument();
    // ข้อมูลจริง CS246 ชนกับทั้ง CS332 และ CS314 (T13 เขียนไว้แค่ CS314) หน้าเว็บแสดงตาม message ของ API
    expect(within(skipped).getByText("CS246 ทุกกลุ่มเรียนเวลาชนกับ CS332, CS314")).toBeInTheDocument();
    expect(inDialog().getByText("CS314").closest("li")).not.toBe(skipped);
  });

  it("IT-US8-10 หน่วยกิตเกิน 22 แสดงวิชาที่ข้ามพร้อม message ของ API", async () => {
    applyResponse = async (req) => (req.dryRun ? recorded("preview-y2s1-credit") : defaultApply(req));
    await openModal();
    await chooseTerm(2, 1);
    await waitAdded(5);

    const message = clone<Json>("preview-y2s1-credit").skipped[0].message;
    const skipped = inDialog().getByText("EL295").closest("li")!;
    expect(within(skipped).getByText("หน่วยกิตเกินกำหนด")).toBeInTheDocument();
    expect(within(skipped).getByText(message)).toBeInTheDocument();
  });

  it("IT-US8-11 วิชาโทการออกแบบฯ มี CS287 ที่ไม่มี section แสดงในรายการข้ามพร้อม message วิชาอื่นยังจะเพิ่ม", async () => {
    await openModal();
    await chooseTerm(3, 1);
    await pick(/ทำหัวข้อพิเศษ/);
    await pick(/การออกแบบและพัฒนาผลิตภัณฑ์ดิจิทัล/);
    await waitAdded(6);

    const skipped = inDialog().getByText("CS287").closest("li")!;
    expect(within(skipped).getByText("ไม่เปิดสอนในภาคนี้")).toBeInTheDocument();
    expect(within(skipped).getByText("CS287 ไม่เปิดสอนในภาคเรียนนี้")).toBeInTheDocument();
    expect(inDialog().getByText("CS384")).toBeInTheDocument();
  });

  it("IT-US8-12 ทุกวิชาอยู่ในตารางแล้ว added ว่าง แสดง 'ไม่มีวิชาที่เพิ่มลงตารางได้ในแผนนี้' และปุ่มยังกดได้", async () => {
    timetableBody = clone<Json>("timetable-after-confirm");
    applyResponse = async (req) => (req.dryRun ? recorded("preview-y2s1-all-already") : recorded("confirm-y2s1-all-already"));
    await openModal();
    await chooseTerm(2, 1);
    await waitAdded(0);

    expect(inDialog().getByText("ไม่มีวิชาที่เพิ่มลงตารางได้ในแผนนี้")).toBeInTheDocument();
    expect(inDialog().getByText("วิชาที่เพิ่มไม่ได้ (6 วิชา)")).toBeInTheDocument();
    expect(inDialog().getByText("CS221 อยู่ในตารางแล้ว (Sec 040001)")).toBeInTheDocument();
    expect(confirmButton()).toBeEnabled();
  });

  it("IT-US8-13 แผน 'greedy พลาด' (CS111 + CS102 จากข้อมูลจริง) API เลือก CS111 Sec 030002 ให้ได้ครบทั้งสองวิชา", async () => {
    plansResponse = async (y, s) => {
      if (y !== "1" || s !== "1") return defaultPlans(y, s);
      const body = clone<Json>("plans-y1s1");
      const [cs111, cs102] = ["CS111", "CS102"].map((code) => ({ courseCode: code, courseName: code, category: "MAJOR", credits: 3 }));
      body.plans = [{ ...body.plans[0], planId: 16, curriculumName: "หลักสูตรทดสอบ T17-GREEDY", totalCredits: 6, courses: [cs111, cs102] }];
      return json(body, 200);
    };
    applyResponse = async (req) => (req.planId === 16 ? recorded("preview-greedy-miss") : defaultApply(req));
    await openModal();
    await chooseTerm(1, 1);
    await waitAdded(2);

    expect(previews().at(-1)!.body.planId).toBe(16);
    expect(within(inDialog().getByText("CS111").closest("li")!).getByText("Sec 030002")).toBeInTheDocument();
    expect(within(inDialog().getByText("CS102").closest("li")!).getByText("Sec 030001")).toBeInTheDocument();
    expect(inDialog().queryByText(/วิชาที่เพิ่มไม่ได้/)).not.toBeInTheDocument();
  });

  it("IT-US8-14 body ตรงกับสิ่งที่เลือก: ไม่เรียนวิชาโทส่ง minorId null เปลี่ยนเป็นเดฟออปส์ส่ง minorId 4 รายการอัปเดตตาม response ล่าสุด", async () => {
    await openModal();
    await chooseTerm(3, 1);
    await pick(/ทำหัวข้อพิเศษ/);
    await waitAdded(5);
    expect(sent(previews().at(-1)!.body)).toEqual({ planId: 6, minorId: null, academicYear: 2568, dryRun: true });
    expect(inDialog().queryByText("CS224")).not.toBeInTheDocument();

    await pick(/เดฟออปส์/);
    await waitAdded(7);
    expect(sent(previews().at(-1)!.body)).toEqual({ planId: 6, minorId: 4, academicYear: 2568, dryRun: true });
    expect(inDialog().getByText("CS224")).toBeInTheDocument();
  });

  it("IT-US8-15 preview ที่ตอบช้าแสดง Loading และผลที่ค้างของ selection เก่าไม่ทับผลล่าสุด", async () => {
    const pending: Array<{ req: Json; resolve: (r: Response) => void }> = [];
    applyResponse = (req) => new Promise((resolve) => pending.push({ req, resolve }));
    await openModal();
    await chooseTerm(3, 1);
    await pick(/ทำหัวข้อพิเศษ/);
    expect(await inDialog().findByText("กำลังคำนวณรายวิชาและกลุ่มเรียน…")).toBeInTheDocument();
    await pick(/เดฟออปส์/);
    await waitFor(() => expect(pending).toHaveLength(2));
    expect(pending.map((p) => p.req.minorId ?? null)).toEqual([null, 4]);

    // ตอบ request ล่าสุดก่อน แล้วค่อยตอบ request แรกที่ค้าง
    pending[1].resolve(json(clone<Json>("preview-y3s1-sp-devops"), 200));
    await waitAdded(7);
    pending[0].resolve(json(clone<Json>("preview-y3s1-sp-no-minor"), 200));
    await new Promise((r) => setTimeout(r, 50));
    expect(inDialog().getByText("วิชาที่จะเพิ่มลงตาราง (7 วิชา)")).toBeInTheDocument();
    expect(inDialog().getByText("CS224")).toBeInTheDocument();
    expect(previews()).toHaveLength(2);
  });

  // ============================================================ 3.3 Confirm (dryRun: false)

  it("IT-US8-16 กดเพิ่มลงตารางเรียน ส่ง dryRun false ปิด modal วาดตารางจาก response โดยไม่ GET /api/timetable ซ้ำ", async () => {
    await openModal();
    await chooseTerm(2, 1);
    await waitAdded(6);
    const getsBefore = timetableGets().length;

    await user().click(confirmButton());
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "จัดตารางเรียนตามแผนหลักสูตร" })).not.toBeInTheDocument());

    expect(confirms()).toHaveLength(1);
    expect(sent(confirms()[0].body)).toEqual({ planId: 3, minorId: null, academicYear: 2568, dryRun: false });
    expect(timetableGets()).toHaveLength(getsBefore);
    expect(timetableBox().getByText("หน่วยกิต 18 / 22")).toBeInTheDocument();
    for (const code of ["CS221", "CS213", "ST329", "CS261", "CS240", "EL295"]) {
      expect(timetableBox().getAllByText(code).length).toBeGreaterThan(0);
    }
  });

  it("IT-US8-17 ยืนยันโดย CS246 ข้ามเพราะเวลาชน ตารางมีวิชาที่เพิ่มได้ และ dialog แจ้งว่าชนกับวิชาไหน", async () => {
    await openModal();
    await chooseTerm(3, 2);
    await pick(/ทำหัวข้อพิเศษ/);
    await pick(/วิทยาการข้อมูล/);
    await waitAdded(6);
    await user().click(confirmButton());

    const conflictDialog = await screen.findByRole("dialog", { name: /ตรวจพบเวลาเรียนซ้อนทับกัน/ });
    expect(within(conflictDialog).getByText("CS246 ทุกกลุ่มเรียนเวลาชนกับ CS332, CS314")).toBeInTheDocument();
    expect(confirms()).toHaveLength(1);
    expect(timetableBox().getAllByText("CS314").length).toBeGreaterThan(0);
    expect(timetableBox().queryByText("CS246")).not.toBeInTheDocument();
  });

  it("IT-US8-18 [ต่างจาก T13] ยืนยันโดยข้ามหลายเหตุผล ตารางบันทึกเฉพาะ added แต่หลังยืนยันแจ้งเฉพาะวิชาที่เวลาชน", async () => {
    applyResponse = async (req) =>
      req.planId === 6 && req.minorId === 3
        ? recorded(req.dryRun ? "preview-y3s1-multi-reasons" : "confirm-y3s1-multi-reasons")
        : defaultApply(req);
    await openModal();
    await chooseTerm(3, 1);
    await pick(/ทำหัวข้อพิเศษ/);
    await pick(/การออกแบบและพัฒนาผลิตภัณฑ์ดิจิทัล/);
    await waitAdded(4);
    // ก่อนยืนยัน: หน้าสรุปแสดงครบทั้ง 3 เหตุผล ข้อความตาม message ของ API
    for (const item of clone<Json>("preview-y3s1-multi-reasons").skipped) {
      expect(inDialog().getByText(item.message)).toBeInTheDocument();
    }

    await user().click(confirmButton());
    const conflictDialog = await screen.findByRole("dialog", { name: /ตรวจพบเวลาเรียนซ้อนทับกัน/ });
    // หลังยืนยัน: แจ้งเฉพาะ TIME_CONFLICT (TU108) ไม่แสดง CS301 (อยู่ในตารางแล้ว) และ CS287 (ไม่มี section) ซ้ำ
    expect(within(conflictDialog).getAllByText(/TU108/).length).toBeGreaterThan(0);
    expect(within(conflictDialog).queryByText(/CS301/)).not.toBeInTheDocument();
    expect(within(conflictDialog).queryByText(/CS287/)).not.toBeInTheDocument();
    for (const code of ["CS223", "CS241", "CS331", "CS384"]) {
      expect(timetableBox().getAllByText(code).length).toBeGreaterThan(0);
    }
  });

  it("IT-US8-19 ยืนยันเมื่อ added ว่าง ไม่แสดง error ตารางเดิมไม่มีวิชาใหม่ (API คืน updatedAt เดิม)", async () => {
    timetableBody = clone<Json>("timetable-after-confirm");
    applyResponse = async (req) => (req.dryRun ? recorded("preview-y2s1-all-already") : recorded("confirm-y2s1-all-already"));
    await openModal();
    await chooseTerm(2, 1);
    await waitAdded(0);
    await user().click(confirmButton());

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "จัดตารางเรียนตามแผนหลักสูตร" })).not.toBeInTheDocument());
    expect(screen.queryByRole("alert", { name: /ไม่สำเร็จ/ })).not.toBeInTheDocument();
    expect(timetableBox().getByText("หน่วยกิต 18 / 22")).toBeInTheDocument();
    expect(clone<Json>("confirm-y2s1-all-already").timetable.updatedAt).toBe(clone<Json>("timetable-after-confirm").updatedAt);
  });

  it("IT-US8-20 ยืนยันเมื่อยังไม่มีตารางของภาค (updatedAt null) API สร้างตารางให้และหน้าเว็บแสดงตารางใหม่", async () => {
    expect(timetableBody.updatedAt).toBeNull();
    await openModal();
    await chooseTerm(2, 1);
    await waitAdded(6);
    await user().click(confirmButton());

    await waitFor(() => expect(timetableBox().getByText("หน่วยกิต 18 / 22")).toBeInTheDocument());
    expect(clone<Json>("confirm-y2s1-new-timetable").timetable).not.toBeNull();
    expect(clone<Json>("timetable-after-confirm").entries).toHaveLength(6);
  });

  it("IT-US8-21 ยืนยันซ้ำหลังจัดตารางแล้ว ทุกวิชาเป็น 'อยู่ในตารางแล้ว' ตารางไม่มีรายการซ้ำ", async () => {
    let confirmed = false;
    applyResponse = async (req) => {
      if (req.dryRun) return recorded(confirmed ? "preview-y2s1-all-already" : "preview-y2s1-empty");
      const name = confirmed ? "confirm-y2s1-all-already" : "confirm-y2s1-new-timetable";
      confirmed = true;
      return recorded(name);
    };
    await openModal();
    await chooseTerm(2, 1);
    await waitAdded(6);
    await user().click(confirmButton());
    await waitFor(() => expect(timetableBox().getByText("หน่วยกิต 18 / 22")).toBeInTheDocument());

    await user().click(screen.getByRole("button", { name: "จัดตามแผนหลักสูตร" }));
    await chooseTerm(2, 1);
    await waitAdded(0);
    for (const item of clone<Json>("preview-y2s1-all-already").skipped) {
      expect(inDialog().getByText(item.message)).toBeInTheDocument();
    }
    await user().click(confirmButton());
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "จัดตารางเรียนตามแผนหลักสูตร" })).not.toBeInTheDocument());
    expect(timetableBox().getByText("หน่วยกิต 18 / 22")).toBeInTheDocument();
    expect(confirms()).toHaveLength(2);
  });

  it("IT-US8-22 ตารางถูกแก้จากอีกแท็บหลัง preview หน้าเว็บแสดงผลตาม response ของการยืนยัน ไม่ใช่ผล preview", async () => {
    applyResponse = async (req) =>
      recorded(req.dryRun ? "preview-y2s1-before-other-tab" : "confirm-y2s1-after-other-tab");
    await openModal();
    await chooseTerm(2, 1);
    await waitAdded(6);
    expect(inDialog().getByText("CS221").closest("li")).toHaveTextContent("Sec 040001");

    await user().click(confirmButton());
    await waitFor(() => expect(timetableBox().getByText("หน่วยกิต 18 / 22")).toBeInTheDocument());
    const confirmBody = clone<Json>("confirm-y2s1-after-other-tab");
    expect(confirmBody.skipped.map((s: Json) => [s.courseCode, s.reason])).toEqual([["CS221", "COURSE_ALREADY_IN_TIMETABLE"]]);
    expect(confirmBody.timetable.entries.filter((e: Json) => e.courseCode === "CS221")).toHaveLength(1);
  });

  // ============================================================ 3.4 Errors

  const expectPreviewError = async (text: string) => {
    const alert = await inDialog().findByRole("alert");
    expect(alert).toHaveTextContent(text);
    expect(inDialog().queryByText("กำลังคำนวณรายวิชาและกลุ่มเรียน…")).not.toBeInTheDocument();
    expect(inDialog().queryByText(/วิชาที่จะเพิ่มลงตาราง/)).not.toBeInTheDocument();
    return alert;
  };

  it("IT-US8-23 [ต่างจาก T13] 400 MINOR_NOT_ALLOWED หน้าเว็บแสดง detail ของ API ไม่ใช่ข้อความที่ T13 กำหนด", async () => {
    applyResponse = () => recorded("error-minor-not-allowed");
    await openModal();
    await chooseTerm(2, 1);

    await expectPreviewError("ชั้นปีที่ 2 เลือกวิชาโทไม่ได้");
    expect(inDialog().queryByText("แผนการเรียนชั้นปีที่ 1–2 ไม่สามารถเลือกวิชาโทได้")).not.toBeInTheDocument();
  });

  it("IT-US8-24 [ต่างจาก T13] 400 MINOR_PLAN_MISMATCH แสดง detail ของ API และเลือกวิชาโทใหม่ได้", async () => {
    applyResponse = async (req) => (req.minorId === 1 ? recorded("error-minor-plan-mismatch") : defaultApply(req));
    await openModal();
    await chooseTerm(3, 1);
    await pick(/ทำหัวข้อพิเศษ/);
    await waitAdded(5);
    await pick(/วิทยาการข้อมูล/);

    await expectPreviewError("วิชาโทเดฟออปส์ ไม่ได้อยู่ในหลักสูตรเดียวกับแผนการเรียนที่เลือก");
    expect(inDialog().queryByText("วิชาโทที่เลือกไม่ตรงกับหลักสูตรของแผนการเรียน")).not.toBeInTheDocument();
    await pick(/ไม่เรียนวิชาโท/);
    await waitAdded(5);
  });

  it("IT-US8-25 [ต่างจาก T13] 400 validation หน้าเว็บแสดง 'Validation failed' ภาษาอังกฤษจาก API", async () => {
    applyResponse = () => recorded("error-400-no-planId");
    await openModal();
    await chooseTerm(2, 1);

    await expectPreviewError("Validation failed");
    expect(inDialog().queryByText("ข้อมูลที่ส่งไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง")).not.toBeInTheDocument();
    expect(REAL["error-400-no-academicYear"].status).toBe(400);
  });

  it("IT-US8-26 [ต่างจาก T13] 404 planId/minorId หน้าเว็บแสดง detail ภาษาอังกฤษจาก API", async () => {
    applyResponse = () => recorded("error-404-plan");
    await openModal();
    await chooseTerm(2, 1);

    await expectPreviewError("Study plan not found with id: 99999");
    expect(inDialog().queryByText("ไม่พบแผนการเรียนหรือวิชาโทที่เลือก กรุณาเลือกใหม่อีกครั้ง")).not.toBeInTheDocument();
    expect(REAL["error-404-minor"].status).toBe(404);
  });

  it("IT-US8-27 [ต่างจาก T13] GET /api/study-plans ตอบ 404 หน้าเว็บแสดง detail ของ API และไม่ค้างที่ Loading", async () => {
    plansResponse = async () =>
      json({ type: "about:blank", title: "Not Found", status: 404, detail: "User not found with id: 6609000803" }, 404);
    await openModal();
    await chooseTerm(2, 1);

    const alert = await inDialog().findByRole("alert");
    expect(alert).toHaveTextContent("User not found with id: 6609000803");
    expect(inDialog().queryByText("ไม่สามารถโหลดแผนการเรียนได้ กรุณาลองใหม่อีกครั้ง")).not.toBeInTheDocument();
    expect(inDialog().queryByText("กำลังโหลดแผนการเรียน…")).not.toBeInTheDocument();
  });

  it("IT-US8-28 [ต่างจาก T13] GET ที่ query ผิดได้ 400 (ไม่ใช่ 500) แต่หน้าเว็บแสดง 'Validation failure' ภาษาอังกฤษ", async () => {
    for (const name of Object.keys(REAL).filter((n) => n.startsWith("plans-400-"))) {
      expect(REAL[name].status).toBe(400);
    }
    plansResponse = () => recorded("plans-400-studyYear=5&semester=1");
    await openModal();
    await chooseTerm(2, 1);

    expect(await inDialog().findByRole("alert")).toHaveTextContent("Validation failure");
    expect(inDialog().queryByText("ข้อมูลที่ส่งไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง")).not.toBeInTheDocument();
  });

  it("IT-US8-29 GET ตอบ 401 apiFetch หมดอายุ session (ลบ token และตั้ง flag ให้กลับหน้า Login)", async () => {
    plansResponse = () => recorded("plans-401");
    await openModal();
    await chooseTerm(2, 1);

    await waitFor(() => expect(SessionProvider.getToken()).toBeNull());
    expect(sessionStorage.getItem("mocktimetable.auth.expired")).toBe("true");
  });

  it("IT-US8-30 POST ตอบ 401 ทั้ง preview และยืนยัน หมดอายุ session และตารางไม่ถูกแก้", async () => {
    applyResponse = () => recorded("error-401-apply");
    await openModal();
    await chooseTerm(2, 1);
    await waitFor(() => expect(SessionProvider.getToken()).toBeNull());
    expect(previews()).toHaveLength(1);

    // ยืนยัน: login ใหม่แล้ว preview ผ่าน แต่ตอนกดเพิ่มได้ 401
    SessionProvider.saveToken(TOKEN);
    applyResponse = async (req) => (req.dryRun ? defaultApply(req) : recorded("error-401-apply"));
    await pick(/^ภาคเรียนที่ 2$/);
    await pick(/^ภาคเรียนที่ 1$/);
    await waitAdded(6);
    await user().click(confirmButton());
    await waitFor(() => expect(SessionProvider.getToken()).toBeNull());
    expect(timetableBox().getByText("หน่วยกิต 0 / 22")).toBeInTheDocument();
  });

  it("IT-US8-31 [ต่างจาก T13] GET ตอบ 500 แสดง 'Internal server error' จาก API กดลองใหม่แล้วโหลดแผนได้", async () => {
    let fail = true;
    plansResponse = async (y, s) => (fail ? json({ type: "about:blank", title: "Internal Server Error", status: 500, detail: "Internal server error" }, 500) : defaultPlans(y, s));
    await openModal();
    await chooseTerm(2, 1);

    const alert = await inDialog().findByRole("alert");
    expect(alert).toHaveTextContent("Internal server error");
    expect(inDialog().queryByText("ไม่สามารถโหลดแผนการเรียนได้ กรุณาลองใหม่อีกครั้ง")).not.toBeInTheDocument();
    fail = false;
    await user().click(within(alert).getByRole("button", { name: "ลองใหม่" }));
    await waitAdded(6);
  });

  it("IT-US8-32 [ต่างจาก T13] preview ตอบ 500 แสดง 'Internal server error' ไม่แสดงรายการค้าง และไม่ค้างที่ Loading", async () => {
    applyResponse = async () => json({ type: "about:blank", title: "Internal Server Error", status: 500, detail: "Internal server error" }, 500);
    await openModal();
    await chooseTerm(2, 1);

    await expectPreviewError("Internal server error");
    expect(inDialog().queryByText("ไม่สามารถจัดตารางเรียนได้ กรุณาลองใหม่อีกครั้ง")).not.toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();
  });

  it("IT-US8-33 [ต่างจาก T13] ยืนยันได้ 500 / network error ยังอยู่ที่ modal ตารางไม่เปลี่ยน ลองใหม่แล้วบันทึกครั้งเดียว", async () => {
    let mode: "500" | "offline" | "ok" = "500";
    applyResponse = async (req) => {
      if (req.dryRun) return defaultApply(req);
      if (mode === "500") return json({ type: "about:blank", title: "Internal Server Error", status: 500, detail: "Internal server error" }, 500);
      if (mode === "offline") throw new TypeError("Failed to fetch");
      return recorded("confirm-y2s1-new-timetable");
    };
    await openModal();
    await chooseTerm(2, 1);
    await waitAdded(6);

    await user().click(confirmButton());
    expect(await inDialog().findByText("Internal server error")).toBeInTheDocument();
    expect(timetableBox().getByText("หน่วยกิต 0 / 22")).toBeInTheDocument();

    mode = "offline";
    await user().click(confirmButton());
    expect(await inDialog().findByText("เพิ่มวิชาตามแผนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง")).toBeInTheDocument();
    expect(inDialog().queryByText("ไม่สามารถจัดตารางเรียนได้ กรุณาลองใหม่อีกครั้ง")).not.toBeInTheDocument();
    expect(timetableBox().getByText("หน่วยกิต 0 / 22")).toBeInTheDocument();

    mode = "ok";
    await user().click(confirmButton());
    await waitFor(() => expect(timetableBox().getByText("หน่วยกิต 18 / 22")).toBeInTheDocument());
    expect(confirms()).toHaveLength(3);
  });
});
