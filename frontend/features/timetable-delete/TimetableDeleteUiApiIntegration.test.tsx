import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionProvider } from "../auth/session";
import Timetable from "../timetable/Timetable";
import { LAS101_TU109_CONFLICTS, SIX_COURSES, buildTimetable } from "../timetable/testFixtures";
import type { Timetable as TimetableData } from "../timetable/types";

// US2-T13 IT-01–18: ไม่ mock api.ts แต่ดัก fetch แทน
// จึงทดสอบทั้งทาง UI → useTimetable → timetableDeleteApi → apiFetch → HTTP request
// fetch ตอบเหมือน backend: GET คืนตารางล่าสุดของ server, DELETE ลบแบบ all-or-nothing และ id ที่ไม่มีได้ 404

const fetchMock = vi.fn();
const json = (body: unknown, status: number, contentType = "application/json") =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": contentType } });
const problem = (status: number, extra: Record<string, unknown> = {}) =>
  json({ type: "about:blank", title: "Error", status, ...extra }, status, "application/problem+json");

const DELETED_AT = "2026-10-31T10:30:00+07:00";

// ชุดข้อมูล A: 7 วิชา 21 หน่วยกิต TU109 ชนกับ LAS101
// entryId เรียงตามลำดับวิชา: CS180=1 MA211=2 CS111=3 LAS101=4 TU101=5 TU106=6 TU109=7
const datasetA = (): TimetableData => {
  const table = buildTimetable([...SIX_COURSES, "TU109"], { conflicts: LAS101_TU109_CONFLICTS });
  return {
    ...table,
    entries: table.entries.map((entry) => ({
      ...entry,
      conflictWith: entry.courseCode === "LAS101" ? ["TU109"] : entry.courseCode === "TU109" ? ["LAS101"] : [],
    })),
  };
};
// ชุดข้อมูล B: ตารางที่ไม่เคยเพิ่มวิชา
const datasetB = () => buildTimetable([]);

// ตารางหลังลบ entryId ออก คำนวณหน่วยกิตและเวลาชนใหม่แบบเดียวกับ backend
const withoutEntries = (table: TimetableData, entryIds: number[]): TimetableData => {
  const entries = table.entries.filter((entry) => !entryIds.includes(entry.entryId));
  const codes = new Set(entries.map((entry) => entry.courseCode));
  const stillConflict = codes.has("LAS101") && codes.has("TU109");
  return {
    ...table,
    entries: entries.map((entry) => (stillConflict ? entry : { ...entry, conflictWith: [] })),
    totalCredits: entries.reduce((total, entry) => total + entry.credits, 0),
    conflicts: stillConflict ? table.conflicts : [],
    updatedAt: DELETED_AT,
  };
};

const entryIdOf = (table: TimetableData, courseCode: string) =>
  table.entries.find((entry) => entry.courseCode === courseCode)!.entryId;

// อ่าน entryId จาก URL ทั้ง endpoint 1 (/entries/{id}) และ endpoint 2 (?entryIds=7,8)
const entryIdsFromUrl = (url: string) => {
  const single = url.match(/^\/api\/timetable\/entries\/(\d+)$/);
  if (single) return [Number(single[1])];
  const query = new URL(url, "http://localhost").searchParams.get("entryIds") ?? "";
  return [...new Set(query.split(",").map(Number))];
};

// ตารางบน server ที่ GET อ่าน และ DELETE แก้
let serverTable: TimetableData;
const deleteLikeBackend = (url: string) => {
  const ids = entryIdsFromUrl(url);
  const missing = ids.find((id) => !serverTable.entries.some((entry) => entry.entryId === id));
  if (missing !== undefined) {
    return Promise.resolve(problem(404, { detail: `ไม่พบวิชาในตารางเรียนของคุณ: entryId ${missing}` }));
  }
  serverTable = withoutEntries(serverTable, ids);
  return Promise.resolve(json(serverTable, 200));
};
// ค่าเริ่มต้นตอบเหมือน backend แต่ละ test เปลี่ยนเป็น error หรือ response ที่หน่วงได้
let respondToDelete: (url: string) => Promise<Response>;

const deleteCalls = () => fetchMock.mock.calls.filter(([, init]) => init?.method === "DELETE");
const getTimetableCalls = () =>
  fetchMock.mock.calls.filter(([url, init]) => !init?.method && url.startsWith("/api/timetable?"));

// promise ที่ test ควบคุมเวลา resolve เอง ใช้จำลอง API ที่ตอบช้า
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
};

const timetableBox = () =>
  within(screen.getByRole("heading", { name: "ตารางเรียนจำลอง" }).closest("section")!);
const addedCoursesSection = () =>
  within(screen.getByRole("heading", { name: "วิชาที่เพิ่มแล้ว" }).closest("section")!);
const addedCard = (courseCode: string) =>
  addedCoursesSection()
    .getAllByRole("article")
    .find((article) => within(article).queryByText(courseCode, { selector: "p" }))!;
const addedCodes = () =>
  addedCoursesSection().queryAllByRole("article").map((article) => article.querySelector("p")!.textContent);
const removeButton = (courseCode: string) => within(addedCard(courseCode)).getByRole("button", { name: "ลบวิชา" });
const checkboxOf = (courseCode: string) =>
  addedCoursesSection().getByRole("checkbox", { name: `เลือกวิชา ${courseCode}` });
const removeSelectedButton = () => addedCoursesSection().getByRole("button", { name: /^ลบที่เลือก/ });
const removeAllButton = () => addedCoursesSection().getByRole("button", { name: "ลบทั้งหมด" });

const STALE_MESSAGE = "ตารางเรียนมีการเปลี่ยนแปลงจากที่อื่น กรุณาตรวจตารางล่าสุดแล้วเลือกวิชาที่จะลบอีกครั้ง";
const ERROR_MESSAGE = "ลบวิชาไม่สำเร็จ กรุณาลองใหม่";

const renderReady = async (table: TimetableData) => {
  serverTable = table;
  render(<Timetable />);
  await waitFor(() => expect(screen.queryByText("กำลังโหลดตารางเรียน…")).not.toBeInTheDocument());
};

// ตารางบนหน้าจอตรงกับ response: วิชาในรายการ บล็อกใน grid และหน่วยกิต
const expectScreenMatches = (table: TimetableData) => {
  expect(addedCodes()).toEqual(table.entries.map((entry) => entry.courseCode));
  // วิชาที่เวลาชนถูกวาดซ้ำในกรอบเวลาชน จึงตรวจแค่ว่ามีหรือไม่มีบล็อกบน grid
  for (const entry of datasetA().entries) {
    const blocks = timetableBox().queryAllByText(entry.courseCode, { selector: "strong" });
    const inTable = table.entries.some((item) => item.courseCode === entry.courseCode);
    expect(blocks.length > 0).toBe(inTable);
  }
  expect(timetableBox().getByText(`หน่วยกิต ${table.totalCredits} / ${table.maxCredits}`)).toBeInTheDocument();
  expect(
    timetableBox().getByText(`วิชาในตารางเรียน: ${table.entries.length} วิชา (${table.totalCredits.toFixed(1)} หน่วยกิต)`),
  ).toBeInTheDocument();
};

// UI ตัดสินว่าว่างจาก entries.length === 0 ไม่ว่า updatedAt จะเป็นค่าใด
const expectEmptyState = () => {
  expect(addedCoursesSection().getByText("ยังไม่มีวิชาในตาราง")).toBeInTheDocument();
  expect(addedCoursesSection().queryAllByRole("article")).toHaveLength(0);
  expect(removeSelectedButton()).toBeDisabled();
  expect(removeAllButton()).toBeDisabled();
  expect(timetableBox().getByText("หน่วยกิต 0 / 22")).toBeInTheDocument();
};

// request ที่ UI ส่งออกไปตาม API Spec: DELETE ไม่มี body และแนบ token
const expectDeleteRequest = (call: unknown[], url: string) => {
  const [actualUrl, init] = call as [string, RequestInit];
  expect(actualUrl).toBe(url);
  expect(init.method).toBe("DELETE");
  expect(init.body).toBeUndefined();
  expect(new Headers(init.headers).get("Authorization")).toBe("Bearer it-test-token");
};

describe("US2-T17 ลบวิชาจากตารางเรียน UI ↔ API (US2-T13)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    SessionProvider.saveToken("it-test-token");
    respondToDelete = deleteLikeBackend;
    fetchMock.mockReset().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") return respondToDelete(url);
      if (url.startsWith("/api/timetable?")) return Promise.resolve(json(serverTable, 200));
      if (url.startsWith("/api/courses?")) return Promise.resolve(json([], 200));
      return Promise.reject(new Error(`ไม่ได้เตรียม response ของ ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  describe("ลบสำเร็จ", () => {
    it("IT-01 กดปุ่มลบวิชาของ LAS101 ส่ง DELETE /entries/{entryId} ครั้งเดียว และวิชาอื่นยังอยู่ที่เดิม", async () => {
      await renderReady(datasetA());
      const las101Id = entryIdOf(serverTable, "LAS101");
      const sectionTextBefore = addedCard("CS111").textContent;

      await userEvent.click(removeButton("LAS101"));

      await waitFor(() => expect(addedCoursesSection().queryByText("LAS101", { selector: "p" })).not.toBeInTheDocument());
      expect(deleteCalls()).toHaveLength(1);
      expectDeleteRequest(deleteCalls()[0], `/api/timetable/entries/${las101Id}`);
      expectScreenMatches(serverTable);
      // วิชาที่ไม่ได้ลบยังเป็นกลุ่ม วัน เวลา ห้องเดิม
      expect(addedCard("CS111").textContent).toBe(sectionTextBefore);
    });

    it("IT-02 ติ๊ก 1 วิชาแล้วกดลบที่เลือก ใช้ endpoint 2 (?entryIds=) ผลบนหน้าจอเหมือน IT-01", async () => {
      await renderReady(datasetA());
      const las101Id = entryIdOf(serverTable, "LAS101");

      await userEvent.click(checkboxOf("LAS101"));
      await userEvent.click(addedCoursesSection().getByRole("button", { name: "ลบที่เลือก (1)" }));

      await waitFor(() => expect(addedCoursesSection().queryByText("LAS101", { selector: "p" })).not.toBeInTheDocument());
      expect(deleteCalls()).toHaveLength(1);
      expectDeleteRequest(deleteCalls()[0], `/api/timetable/entries?entryIds=${las101Id}`);
      expectScreenMatches(serverTable);
    });

    it("IT-03 ติ๊ก TU109 และ LAS101 แล้วลบ ส่ง request เดียวที่ join entryId ด้วย comma", async () => {
      await renderReady(datasetA());
      const tu109Id = entryIdOf(serverTable, "TU109");
      const las101Id = entryIdOf(serverTable, "LAS101");

      await userEvent.click(checkboxOf("TU109"));
      await userEvent.click(checkboxOf("LAS101"));
      await userEvent.click(addedCoursesSection().getByRole("button", { name: "ลบที่เลือก (2)" }));

      await waitFor(() => expect(addedCoursesSection().getAllByRole("article")).toHaveLength(5));
      expect(deleteCalls()).toHaveLength(1);
      expectDeleteRequest(deleteCalls()[0], `/api/timetable/entries?entryIds=${tu109Id},${las101Id}`);
      expect(serverTable.totalCredits).toBe(15);
      expectScreenMatches(serverTable);
    });

    it("IT-04 ลบทั้งหมดแล้วยืนยัน ส่ง entryId ทุกตัวใน request เดียว และแสดง empty state", async () => {
      await renderReady(datasetA());
      const allIds = serverTable.entries.map((entry) => entry.entryId);

      await userEvent.click(removeAllButton());
      await userEvent.click(screen.getByRole("button", { name: "ยืนยันลบทั้งหมด" }));

      expect(await addedCoursesSection().findByText("ยังไม่มีวิชาในตาราง")).toBeInTheDocument();
      expect(deleteCalls()).toHaveLength(1);
      expectDeleteRequest(deleteCalls()[0], `/api/timetable/entries?entryIds=${allIds.join(",")}`);
      expect(serverTable.entries).toEqual([]);
      expect(serverTable.updatedAt).not.toBeNull();
      expect(timetableBox().getByText("หน่วยกิต 0 / 22")).toBeInTheDocument();
      expect(timetableBox().queryAllByText(/./, { selector: "strong" })).toHaveLength(0);
      expect(screen.queryByRole("region", { name: "ยืนยันการลบรายวิชาทั้งหมด" })).not.toBeInTheDocument();
    });

    it("IT-04 (เพิ่ม) กดลบทั้งหมดแล้วกดยกเลิก ปิดกล่องยืนยันโดยไม่ส่ง request", async () => {
      await renderReady(datasetA());

      await userEvent.click(removeAllButton());
      await userEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));

      expect(screen.queryByRole("region", { name: "ยืนยันการลบรายวิชาทั้งหมด" })).not.toBeInTheDocument();
      expect(deleteCalls()).toHaveLength(0);
      expectScreenMatches(datasetA());
    });

    it("IT-05 ลบ LAS101 ที่เวลาชน แถบเวลาชนและสัญลักษณ์ชนบน grid หายไป", async () => {
      await renderReady(datasetA());
      // ก่อนลบ: แสดงแถบเตือน ป้ายชนกัน และกรอบเวลาชนบน grid
      expect(screen.getByText("ตรวจพบเวลาเรียนซ้อนทับกัน")).toBeInTheDocument();
      expect(timetableBox().getByText(/⚠ ชนกัน/)).toBeInTheDocument();
      expect(timetableBox().getByText(/^เวลาชนกัน/)).toBeInTheDocument();

      await userEvent.click(removeButton("LAS101"));

      await waitFor(() => expect(screen.queryByText("ตรวจพบเวลาเรียนซ้อนทับกัน")).not.toBeInTheDocument());
      expect(serverTable.conflicts).toEqual([]);
      expect(serverTable.entries.find((entry) => entry.courseCode === "TU109")!.conflictWith).toEqual([]);
      expect(timetableBox().queryByText(/⚠ ชนกัน/)).not.toBeInTheDocument();
      expect(timetableBox().queryByText(/^เวลาชนกัน/)).not.toBeInTheDocument();
      expect(timetableBox().getByText("TU109", { selector: "strong" })).toBeInTheDocument();
    });

    it("IT-06 หลังลบสำเร็จใช้ response แทน state เดิมโดยไม่ GET ซ้ำ ล้าง checkbox และกดลบต่อได้", async () => {
      await renderReady(datasetA());
      expect(getTimetableCalls()).toHaveLength(1);

      await userEvent.click(checkboxOf("CS180"));
      await userEvent.click(checkboxOf("MA211"));
      await userEvent.click(addedCoursesSection().getByRole("button", { name: "ลบที่เลือก (2)" }));

      await waitFor(() => expect(addedCoursesSection().getAllByRole("article")).toHaveLength(5));
      expect(getTimetableCalls()).toHaveLength(1);
      expectScreenMatches(serverTable);
      for (const entry of serverTable.entries) expect(checkboxOf(entry.courseCode)).not.toBeChecked();
      // สถานะกลับเป็น idle: ปุ่มลบรายวิชาและ checkbox กดได้ ปุ่มลบที่เลือกปิดเพราะยังไม่ได้ติ๊ก
      expect(removeButton("CS111")).toBeEnabled();
      expect(checkboxOf("CS111")).toBeEnabled();
      expect(removeSelectedButton()).toBeDisabled();
      expect(screen.queryByText(ERROR_MESSAGE)).not.toBeInTheDocument();
    });

    it("IT-08 ตารางที่ลบจนว่างกับตารางที่ไม่เคยใช้ แสดง empty state เหมือนกัน", async () => {
      await renderReady(datasetA());
      await userEvent.click(removeAllButton());
      await userEvent.click(screen.getByRole("button", { name: "ยืนยันลบทั้งหมด" }));
      expect(await addedCoursesSection().findByText("ยังไม่มีวิชาในตาราง")).toBeInTheDocument();
      expect(serverTable.updatedAt).toBe(DELETED_AT);
      expectEmptyState();

      // เปิดหน้าใหม่ด้วยตารางที่ไม่เคยใช้ (updatedAt: null) ได้ empty state เดียวกัน
      cleanup();
      await renderReady(datasetB());
      expect(serverTable.updatedAt).toBeNull();
      expectEmptyState();
    });
  });

  describe("สถานะปุ่มลบ (ไม่มีการเรียก API)", () => {
    it("IT-09 ตารางว่าง (ชุด B) ปุ่มลบที่เลือกและลบทั้งหมดกดไม่ได้ และไม่มี request", async () => {
      await renderReady(datasetB());

      expect(removeSelectedButton()).toBeDisabled();
      expect(removeAllButton()).toBeDisabled();
      expect(addedCoursesSection().queryAllByRole("checkbox")).toHaveLength(0);
      await userEvent.click(removeAllButton());
      expect(deleteCalls()).toHaveLength(0);
    });

    it("IT-10 ยังไม่ติ๊กวิชาใด ปุ่มลบที่เลือกกดไม่ได้ และไม่มี request", async () => {
      await renderReady(datasetA());

      expect(removeSelectedButton()).toBeDisabled();
      await userEvent.click(removeSelectedButton());
      expect(deleteCalls()).toHaveLength(0);
    });

    it("IT-11 ติ๊กแล้วเอาติ๊กออกทั้งหมด ปุ่มลบที่เลือกกลับเป็น disabled", async () => {
      await renderReady(datasetA());

      await userEvent.click(checkboxOf("CS111"));
      await userEvent.click(checkboxOf("TU101"));
      expect(addedCoursesSection().getByRole("button", { name: "ลบที่เลือก (2)" })).toBeEnabled();
      await userEvent.click(checkboxOf("CS111"));
      await userEvent.click(checkboxOf("TU101"));

      expect(removeSelectedButton()).toHaveTextContent(/^ลบที่เลือก$/);
      expect(removeSelectedButton()).toBeDisabled();
      expect(deleteCalls()).toHaveLength(0);
    });

    it("IT-12 ระหว่างรอผลลบ (deleting) กดซ้ำไม่ได้ ส่ง request ครั้งเดียว ได้ผลแล้วกลับมาปกติ", async () => {
      await renderReady(datasetA());
      const slowDelete = deferred<Response>();
      respondToDelete = () => slowDelete.promise;

      await userEvent.click(checkboxOf("CS180"));
      const button = addedCoursesSection().getByRole("button", { name: "ลบที่เลือก (1)" });
      await userEvent.click(button);
      await userEvent.click(button);
      await userEvent.click(removeButton("MA211"));

      expect(deleteCalls()).toHaveLength(1);
      expect(button).toBeDisabled();
      expect(removeButton("MA211")).toBeDisabled();
      expect(removeAllButton()).toBeDisabled();
      expect(checkboxOf("MA211")).toBeDisabled();

      serverTable = withoutEntries(serverTable, [entryIdOf(serverTable, "CS180")]);
      slowDelete.resolve(json(serverTable, 200));

      await waitFor(() => expect(removeButton("MA211")).toBeEnabled());
      expect(deleteCalls()).toHaveLength(1);
      expect(removeAllButton()).toBeEnabled();
      expectScreenMatches(serverTable);
    });
  });

  describe("Error", () => {
    it("IT-13 ลบวิชาที่อีกแท็บลบไปแล้ว ได้ 404 แจ้งว่าตารางเปลี่ยน โหลดตารางใหม่ และล้าง checkbox", async () => {
      await renderReady(datasetA());
      // อีกแท็บลบ CS180 ไปก่อน หน้าจอนี้ยังเห็น CS180 อยู่
      const cs180Id = entryIdOf(serverTable, "CS180");
      serverTable = withoutEntries(serverTable, [cs180Id]);

      await userEvent.click(checkboxOf("MA211"));
      await userEvent.click(removeButton("CS180"));

      expect(await screen.findByText(STALE_MESSAGE)).toBeInTheDocument();
      expectDeleteRequest(deleteCalls()[0], `/api/timetable/entries/${cs180Id}`);
      await waitFor(() => expect(getTimetableCalls()).toHaveLength(2));
      await waitFor(() => expect(addedCoursesSection().getAllByRole("article")).toHaveLength(6));
      expectScreenMatches(serverTable);
      for (const entry of serverTable.entries) expect(checkboxOf(entry.courseCode)).not.toBeChecked();
    });

    it("IT-14 ติ๊ก 2 วิชาที่ 1 วิชาถูกลบไปแล้ว ได้ 404 ไม่มีวิชาใดถูกลบ และหลังโหลดใหม่วิชาที่เหลือแสดงครบ", async () => {
      await renderReady(datasetA());
      const cs180Id = entryIdOf(serverTable, "CS180");
      const ma211Id = entryIdOf(serverTable, "MA211");
      serverTable = withoutEntries(serverTable, [cs180Id]);

      await userEvent.click(checkboxOf("CS180"));
      await userEvent.click(checkboxOf("MA211"));
      await userEvent.click(addedCoursesSection().getByRole("button", { name: "ลบที่เลือก (2)" }));

      expect(await screen.findByText(STALE_MESSAGE)).toBeInTheDocument();
      expectDeleteRequest(deleteCalls()[0], `/api/timetable/entries?entryIds=${cs180Id},${ma211Id}`);
      // all-or-nothing: MA211 ยังอยู่บน server
      expect(serverTable.entries.map((entry) => entry.entryId)).toContain(ma211Id);
      await waitFor(() => expect(addedCoursesSection().getAllByRole("article")).toHaveLength(6));
      expectScreenMatches(serverTable);
      expect(checkboxOf("MA211")).not.toBeChecked();
      expect(removeSelectedButton()).toBeDisabled();
    });

    it.each([
      ["IT-15", 400, "entryIds ต้องเป็นวิชาในตารางเดียวกัน"],
      ["IT-16", 500, "Internal server error"],
    ])("%s DELETE ตอบ %i แสดงข้อความ error ทั่วไป ตารางคงเดิม และกดลบใหม่ได้", async (_id, status, detail) => {
      await renderReady(datasetA());
      respondToDelete = () => Promise.resolve(problem(status, { detail }));

      await userEvent.click(checkboxOf("LAS101"));
      await userEvent.click(addedCoursesSection().getByRole("button", { name: "ลบที่เลือก (1)" }));

      expect(await screen.findByText(ERROR_MESSAGE)).toBeInTheDocument();
      // ไม่แสดง detail จาก backend และไม่โหลดตารางใหม่ (ต่างจาก 404)
      expect(screen.queryByText(detail)).not.toBeInTheDocument();
      expect(getTimetableCalls()).toHaveLength(1);
      expectScreenMatches(datasetA());
      // ไม่ค้างที่ deleting: checkbox ยังติ๊กอยู่และกดลบซ้ำได้
      expect(checkboxOf("LAS101")).toBeChecked();
      expect(addedCoursesSection().getByRole("button", { name: "ลบที่เลือก (1)" })).toBeEnabled();
      expect(removeButton("CS111")).toBeEnabled();
    });

    it("IT-17 เครือข่ายล่ม (fetch reject) แสดงข้อความ หน้าจอไม่เพี้ยน และกดลบซ้ำแล้วส่ง request ใหม่", async () => {
      await renderReady(datasetA());
      // fetch ของ browser โยน TypeError เมื่อ offline หรือเชื่อมต่อ server ไม่ได้
      respondToDelete = () => Promise.reject(new TypeError("Failed to fetch"));

      await userEvent.click(removeButton("LAS101"));

      expect(await screen.findByText(ERROR_MESSAGE)).toBeInTheDocument();
      expectScreenMatches(datasetA());
      expect(screen.queryByText("กำลังโหลดตารางเรียน…")).not.toBeInTheDocument();
      await waitFor(() => expect(removeButton("LAS101")).toBeEnabled());

      await userEvent.click(removeButton("LAS101"));
      await waitFor(() => expect(deleteCalls()).toHaveLength(2));
    });

    it("IT-18 หลัง 500 แล้ว API กลับมาปกติ กดลบอีกครั้งสำเร็จ ข้อความ error หาย", async () => {
      await renderReady(datasetA());
      respondToDelete = () => Promise.resolve(problem(500, { detail: "Internal server error" }));

      await userEvent.click(removeButton("LAS101"));
      expect(await screen.findByText(ERROR_MESSAGE)).toBeInTheDocument();

      respondToDelete = deleteLikeBackend;
      await userEvent.click(removeButton("LAS101"));

      await waitFor(() => expect(screen.queryByText(ERROR_MESSAGE)).not.toBeInTheDocument());
      expect(deleteCalls()).toHaveLength(2);
      expectScreenMatches(serverTable);
      expect(addedCoursesSection().queryByText("LAS101", { selector: "p" })).not.toBeInTheDocument();
      expect(removeButton("CS111")).toBeEnabled();
    });
  });
});
