import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionProvider } from "../auth/session";
import Timetable from "./Timetable";
import { buildTimetable, findCourse } from "./testFixtures";

// US1-T13 IT-10–12: ไม่ mock api.ts แต่ดัก fetch แทน
// จึงทดสอบทั้งทาง UI → useTimetable → addTimetableEntry → apiFetch → HTTP request

const fetchMock = vi.fn();
const json = (body: unknown, status: number, contentType = "application/json") =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": contentType } });
const problem = (status: number, extra: Record<string, unknown> = {}) =>
  json({ type: "about:blank", title: "Error", status, ...extra }, status, "application/problem+json");

// ตอบ GET ตามจริง ส่วน POST ให้แต่ละ test กำหนดเอง
let respondToPost: () => Promise<Response>;
const postCalls = () => fetchMock.mock.calls.filter(([, init]) => init?.method === "POST");

const timetableBox = () => within(screen.getByRole("heading", { name: "ตารางเรียนจำลอง" }).closest("section")!);
const courseCard = (courseCode: string) =>
  screen.getAllByRole("article").find((article) =>
    within(article).queryByText(courseCode, { selector: "p" }) &&
    within(article).queryByRole("button", { name: /เพิ่ม/ }),
  )!;
const addButton = (courseCode: string) => within(courseCard(courseCode)).getByRole("button", { name: /เพิ่ม/ });

const CS180_SECTION_ID = findCourse("CS180").sections[0].sectionId;

// เปิดหน้าด้วยตารางที่มี CS111 แล้ว (3 หน่วยกิต) และรอจนการ์ด CS180 พร้อมกด
const renderReady = async () => {
  render(<Timetable />);
  await screen.findByText("พบ 2 รายวิชา");
  await waitFor(() => expect(addButton("CS180")).toBeEnabled());
};

// ตารางต้องคงเดิมหลัง error: CS111 อย่างเดียว 3 หน่วยกิต และ CS180 ยังกดเพิ่มได้
const expectTimetableUnchanged = () => {
  expect(timetableBox().getByText("หน่วยกิต 3 / 22")).toBeInTheDocument();
  expect(timetableBox().queryByText("CS180", { selector: "strong" })).not.toBeInTheDocument();
  expect(addButton("CS180")).toHaveTextContent("+ เพิ่มวิชา");
};

describe("US1-T17 IT-10–12 เพิ่มวิชาแล้ว API error (UI ↔ API)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    SessionProvider.saveToken("it-test-token");
    fetchMock.mockReset().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") return respondToPost();
      if (url.startsWith("/api/timetable?")) return Promise.resolve(json(buildTimetable(["CS111"]), 200));
      if (url.startsWith("/api/courses?")) {
        return Promise.resolve(json([findCourse("CS111"), findCourse("CS180")], 200));
      }
      return Promise.reject(new Error(`ไม่ได้เตรียม response ของ ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });
  it("IT-10 POST ตอบ 400 ProblemDetail แสดงข้อความ error ทั่วไป ตารางคงเดิม และหน้าไม่พัง", async () => {
    respondToPost = () => Promise.resolve(problem(400, { detail: "Validation failed", errors: { sectionId: "must not be null" } }));
    await renderReady();

    await userEvent.click(addButton("CS180"));

    // request ที่ UI ส่งออกไปตาม API Spec
    expect(postCalls()).toHaveLength(1);
    const [url, init] = postCalls()[0];
    expect(url).toBe("/api/timetable/entries");
    expect(JSON.parse(init.body)).toEqual({ sectionId: CS180_SECTION_ID });
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer it-test-token");

    expect(await screen.findByText("เพิ่มวิชาไม่สำเร็จ กรุณาลองใหม่")).toBeInTheDocument();
    // ไม่แสดง detail ภาษาอังกฤษจาก backend ให้ผู้ใช้เห็น
    expect(screen.queryByText("Validation failed")).not.toBeInTheDocument();
    expectTimetableUnchanged();
    // หน้ายังใช้งานได้ ไม่ได้ล้างตารางไปโหลดใหม่ (400 ไม่ใช่ 409)
    expect(screen.queryByText("กำลังโหลดตารางเรียน…")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ตารางเรียนจำลอง" })).toBeInTheDocument();
  });

  it("IT-11 POST ตอบ 500 แสดงข้อความ error ตารางคงเดิม แล้วกดเพิ่มใหม่ได้สำเร็จ", async () => {
    respondToPost = () => Promise.resolve(problem(500, { detail: "Internal server error" }));
    await renderReady();

    await userEvent.click(addButton("CS180"));

    expect(await screen.findByText("เพิ่มวิชาไม่สำเร็จ กรุณาลองใหม่")).toBeInTheDocument();
    expectTimetableUnchanged();
    expect(addButton("CS180")).toBeEnabled();

    // ลองใหม่ครั้งที่ 2 backend กลับมาปกติ ตอบ 201 พร้อมตารางทั้งก้อน
    respondToPost = () => Promise.resolve(json(buildTimetable(["CS111", "CS180"]), 201));
    await userEvent.click(addButton("CS180"));

    await waitFor(() => expect(addButton("CS180")).toHaveTextContent("เพิ่มแล้ว"));
    expect(postCalls()).toHaveLength(2);
    expect(screen.queryByText("เพิ่มวิชาไม่สำเร็จ กรุณาลองใหม่")).not.toBeInTheDocument();
    expect(timetableBox().getByText("หน่วยกิต 6 / 22")).toBeInTheDocument();
  });

  it("IT-12 เครือข่ายล่ม (fetch reject ไม่มี response) แสดงข้อความ ปุ่มกลับมากดได้ และหน้าไม่ค้าง", async () => {
    // fetch ของ browser โยน TypeError เมื่อ offline หรือเชื่อมต่อ server ไม่ได้
    respondToPost = () => Promise.reject(new TypeError("Failed to fetch"));
    await renderReady();

    await userEvent.click(addButton("CS180"));

    expect(await screen.findByText("เพิ่มวิชาไม่สำเร็จ กรุณาลองใหม่")).toBeInTheDocument();
    expectTimetableUnchanged();
    // สถานะไม่ค้าง: ปุ่มทุกใบกดได้อีกครั้ง และไม่มีสถานะกำลังโหลด
    await waitFor(() => expect(addButton("CS180")).toBeEnabled());
    expect(screen.queryByText("กำลังโหลดตารางเรียน…")).not.toBeInTheDocument();

    // กดซ้ำได้จริงและส่ง request ใหม่
    await userEvent.click(addButton("CS180"));
    await waitFor(() => expect(postCalls()).toHaveLength(2));
  });
});
