import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { fetchCourses } from "../courses/api";
import { addTimetableEntry, fetchTimetable } from "../timetable/api";
import Timetable from "../timetable/Timetable";
import { buildTimetable, findCourse } from "../timetable/testFixtures";
import type { Timetable as TimetableData } from "../timetable/types";
import { timetableDeleteApi } from "./api";

vi.mock("../timetable/api", () => ({ fetchTimetable: vi.fn(), addTimetableEntry: vi.fn() }));
vi.mock("../courses/api", () => ({ fetchCourses: vi.fn() }));
vi.mock("./api", () => ({
  timetableDeleteApi: { removeEntry: vi.fn(), removeEntries: vi.fn() },
}));

const timetableBox = () =>
  within(screen.getByRole("heading", { name: "ตารางเรียนจำลอง" }).closest("section")!);
const addedCoursesSection = () =>
  within(screen.getByRole("heading", { name: "วิชาที่เพิ่มแล้ว" }).closest("section")!);
const addedCard = (courseCode: string) =>
  addedCoursesSection()
    .getAllByRole("article")
    .find((article) => within(article).queryByText(courseCode, { selector: "p" }))!;
const removeButton = (courseCode: string) => within(addedCard(courseCode)).getByRole("button", { name: "ลบวิชา" });
const checkboxOf = (courseCode: string) =>
  addedCoursesSection().getByRole("checkbox", { name: `เลือกวิชา ${courseCode}` });

// การ์ดวิชาในส่วน "ค้นหารายวิชา" (การ์ดที่มีปุ่มเพิ่มวิชาหรือ "เพิ่มแล้ว")
const courseCard = (courseCode: string) =>
  screen.getAllByRole("article").find((article) =>
    within(article).queryByText(courseCode, { selector: "p" }) &&
    within(article).queryByRole("button", { name: /เพิ่ม/ }),
  )!;
const addButton = (courseCode: string) => within(courseCard(courseCode)).getByRole("button", { name: /เพิ่ม/ });

const waitForTimetable = () =>
  waitFor(() => expect(screen.queryByText("กำลังโหลดตารางเรียน…")).not.toBeInTheDocument());

// promise ที่ test ควบคุมเวลา resolve เอง ใช้จำลอง API ที่ตอบช้า
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
};

// entryId ใน fixture เรียงตามลำดับวิชา ตารางหลังลบจึงใช้ลำดับเดิมโดยตัดวิชาท้ายออก ให้ entryId ตรงกับก่อนลบ
const THREE_COURSES = ["CS111", "MA211", "CS180"];

describe("US2-T10 ต่อปุ่มลบ ↔ API ↔ DB ตาม Sequence Diagram ของ US2-T06", () => {
  beforeEach(() => {
    vi.mocked(fetchTimetable).mockReset().mockResolvedValue(buildTimetable(THREE_COURSES));
    vi.mocked(addTimetableEntry).mockReset();
    vi.mocked(fetchCourses).mockReset().mockResolvedValue([findCourse("TU109"), findCourse("CS111")]);
    vi.mocked(timetableDeleteApi.removeEntry).mockReset();
    vi.mocked(timetableDeleteApi.removeEntries).mockReset();
  });

  it("ติ๊กหลายวิชาแล้วลบ ส่ง entryId ของวิชาที่ติ๊ก และวิชาที่เหลือในตารางตรงกับ response", async () => {
    vi.mocked(timetableDeleteApi.removeEntries).mockResolvedValue(buildTimetable(["CS111"]));
    render(<Timetable />);
    await waitForTimetable();

    await userEvent.click(checkboxOf("MA211"));
    await userEvent.click(checkboxOf("CS180"));
    await userEvent.click(addedCoursesSection().getByRole("button", { name: "ลบที่เลือก (2)" }));

    expect(timetableDeleteApi.removeEntries).toHaveBeenCalledWith([2, 3]);
    await waitFor(() => expect(timetableBox().getByText("หน่วยกิต 3 / 22")).toBeInTheDocument());
    // CS111 เรียน 2 คาบ (อังคาร พฤหัสบดี) จึงมี 2 บล็อกใน grid
    expect(timetableBox().getAllByText("CS111", { selector: "strong" })).toHaveLength(2);
    expect(timetableBox().queryByText("MA211", { selector: "strong" })).not.toBeInTheDocument();
    expect(addedCoursesSection().getAllByRole("article")).toHaveLength(1);
  });

  it("ได้ 404 แจ้งว่าตารางเปลี่ยน โหลดตารางล่าสุด และล้าง checkbox ให้เลือกใหม่", async () => {
    vi.mocked(timetableDeleteApi.removeEntries).mockRejectedValue(
      new ApiError({ status: 404, detail: "ไม่พบวิชาในตารางเรียนของคุณ: entryId 3" }),
    );
    render(<Timetable />);
    await waitForTimetable();
    // CS180 ถูกลบจากอีกแท็บไปแล้ว GET ครั้งถัดไปจึงเหลือ 2 วิชา
    vi.mocked(fetchTimetable).mockResolvedValue(buildTimetable(["CS111", "MA211"]));

    await userEvent.click(checkboxOf("MA211"));
    await userEvent.click(checkboxOf("CS180"));
    await userEvent.click(addedCoursesSection().getByRole("button", { name: "ลบที่เลือก (2)" }));

    expect(
      await screen.findByText("ตารางเรียนมีการเปลี่ยนแปลงจากที่อื่น กรุณาตรวจตารางล่าสุดแล้วเลือกวิชาที่จะลบอีกครั้ง"),
    ).toBeInTheDocument();
    await waitFor(() => expect(timetableBox().getByText("หน่วยกิต 6 / 22")).toBeInTheDocument());
    expect(checkboxOf("MA211")).not.toBeChecked();
    expect(checkboxOf("CS111")).not.toBeChecked();
    expect(addedCoursesSection().getByRole("button", { name: "ลบที่เลือก" })).toBeDisabled();
  });

  it("ลบไม่สำเร็จเพราะเชื่อมต่อไม่ได้ ยังเก็บ checkbox ไว้ให้กดลบซ้ำ", async () => {
    vi.mocked(timetableDeleteApi.removeEntries).mockRejectedValue(new TypeError("Failed to fetch"));
    render(<Timetable />);
    await waitForTimetable();

    await userEvent.click(checkboxOf("MA211"));
    await userEvent.click(addedCoursesSection().getByRole("button", { name: "ลบที่เลือก (1)" }));

    expect(await screen.findByText("ลบวิชาไม่สำเร็จ กรุณาลองใหม่")).toBeInTheDocument();
    expect(checkboxOf("MA211")).toBeChecked();
    expect(addedCoursesSection().getByRole("button", { name: "ลบที่เลือก (1)" })).toBeEnabled();
  });

  it("ผล GET ที่โหลดใหม่หลัง 404 ตอบช้ากว่าการลบครั้งถัดไป ไม่ทำให้วิชาที่ลบแล้วกลับมา", async () => {
    const lateReload = deferred<TimetableData>();
    vi.mocked(timetableDeleteApi.removeEntry)
      .mockRejectedValueOnce(new ApiError({ status: 404, detail: "ไม่พบวิชาในตารางเรียนของคุณ: entryId 3" }))
      .mockResolvedValueOnce(buildTimetable(["CS111"]));
    render(<Timetable />);
    await waitForTimetable();
    vi.mocked(fetchTimetable).mockReturnValueOnce(lateReload.promise);

    await userEvent.click(removeButton("CS180"));
    await waitFor(() => expect(fetchTimetable).toHaveBeenCalledTimes(2));
    await userEvent.click(removeButton("MA211"));
    await waitFor(() => expect(timetableBox().getByText("หน่วยกิต 3 / 22")).toBeInTheDocument());

    // GET เริ่มก่อนลบ MA211 จึงยังมี MA211 อยู่
    lateReload.resolve(buildTimetable(["CS111", "MA211"]));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(timetableBox().getByText("หน่วยกิต 3 / 22")).toBeInTheDocument();
    expect(addedCoursesSection().queryByText("MA211", { selector: "p" })).not.toBeInTheDocument();
  });

  it("สลับภาค 1 → 2 → 1 ระหว่างรอเพิ่มวิชา ผล GET ภาค 1 ที่ตอบช้าไม่ทับวิชาที่เพิ่ง (ข้อเสนอของ sitch ใน #45)", async () => {
    const lateAdd = deferred<TimetableData>();
    const lateSemester1 = deferred<TimetableData>();
    vi.mocked(fetchTimetable)
      .mockReset()
      .mockResolvedValueOnce(buildTimetable([]))
      .mockResolvedValueOnce(buildTimetable([], { semester: 2 }))
      .mockReturnValueOnce(lateSemester1.promise);
    vi.mocked(addTimetableEntry).mockReturnValue(lateAdd.promise);
    render(<Timetable />);
    await waitForTimetable();
    await screen.findByText("พบ 2 รายวิชา");

    await userEvent.click(addButton("TU109"));
    await userEvent.selectOptions(screen.getByLabelText("ภาคเรียน"), "2");
    await waitForTimetable();
    await userEvent.selectOptions(screen.getByLabelText("ภาคเรียน"), "1");
    await waitFor(() => expect(fetchTimetable).toHaveBeenCalledTimes(3));

    lateAdd.resolve(buildTimetable(["TU109"]));
    await waitFor(() => expect(timetableBox().getByText("หน่วยกิต 3 / 22")).toBeInTheDocument());
    // GET ภาค 1 รอบนี้เริ่มก่อนการเพิ่ม TU109 ขึ้นจอ จึงยังเป็นตารางว่าง
    lateSemester1.resolve(buildTimetable([]));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(timetableBox().getByText("หน่วยกิต 3 / 22")).toBeInTheDocument();
    expect(addedCoursesSection().getByText("TU109", { selector: "p" })).toBeInTheDocument();
  });

  it("ระหว่างรอผลเพิ่มวิชา ปุ่มลบและ checkbox กดไม่ได้ ได้ผลแล้วกลับมากดได้", async () => {
    const lateAdd = deferred<TimetableData>();
    vi.mocked(fetchTimetable).mockResolvedValue(buildTimetable(["CS111"]));
    vi.mocked(addTimetableEntry).mockReturnValue(lateAdd.promise);
    render(<Timetable />);
    await waitForTimetable();
    await screen.findByText("พบ 2 รายวิชา");

    await userEvent.click(addButton("TU109"));

    expect(removeButton("CS111")).toBeDisabled();
    expect(checkboxOf("CS111")).toBeDisabled();
    expect(addedCoursesSection().getByRole("button", { name: "ลบทั้งหมด" })).toBeDisabled();

    lateAdd.resolve(buildTimetable(["CS111", "TU109"]));
    await waitFor(() => expect(removeButton("TU109")).toBeEnabled());
    expect(removeButton("CS111")).toBeEnabled();
  });

  it("ระหว่างรอผลลบวิชา ปุ่มเพิ่มวิชากดไม่ได้ ได้ผลแล้วกลับมากดได้", async () => {
    const lateDelete = deferred<TimetableData>();
    vi.mocked(fetchTimetable).mockResolvedValue(buildTimetable(["CS111"]));
    vi.mocked(timetableDeleteApi.removeEntry).mockReturnValue(lateDelete.promise);
    render(<Timetable />);
    await waitForTimetable();
    await screen.findByText("พบ 2 รายวิชา");

    await userEvent.click(removeButton("CS111"));

    expect(addButton("TU109")).toBeDisabled();

    lateDelete.resolve(buildTimetable([]));
    await waitFor(() => expect(addButton("TU109")).toBeEnabled());
    expect(addButton("CS111")).toHaveTextContent("+ เพิ่มวิชา");
  });
});
