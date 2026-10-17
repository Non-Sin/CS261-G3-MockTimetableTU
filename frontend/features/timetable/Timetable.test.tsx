import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { coursesApi } from "../courses/api";
import { timetableApi } from "./api";
import Timetable from "./Timetable";
import { buildTimetable, CS111_CS102_CONFLICTS, findCourse, SIX_COURSES } from "./testFixtures";

vi.mock("./api", () => ({ timetableApi: { get: vi.fn(), addEntry: vi.fn() } }));
vi.mock("../courses/api", () => ({ coursesApi: { search: vi.fn() } }));

const timetableBox = () => within(screen.getByRole("heading", { name: "ตารางเรียนจำลอง" }).closest("section")!);

// การ์ดวิชาในส่วน "ค้นหารายวิชา" (การ์ดที่มีปุ่มเพิ่มวิชาหรือ "เพิ่มแล้ว")
const courseCard = (courseCode: string) =>
  screen.getAllByRole("article").find((article) =>
    within(article).queryByText(courseCode, { selector: "p" }) &&
    within(article).queryByRole("button", { name: /เพิ่ม/ }),
  )!;
const addButton = (courseCode: string) => within(courseCard(courseCode)).getByRole("button", { name: /เพิ่ม/ });

const waitForTimetable = () =>
  waitFor(() => expect(screen.queryByText("กำลังโหลดตารางเรียน…")).not.toBeInTheDocument());

describe("US1-T10 หน้าตารางเรียนจำลองเชื่อมกับ API", () => {
  beforeEach(() => {
    vi.mocked(timetableApi.get).mockReset().mockResolvedValue(buildTimetable([]));
    vi.mocked(timetableApi.addEntry).mockReset();
    vi.mocked(coursesApi.search).mockReset().mockResolvedValue(
      ["CS111", "CS180", "CS102", "MA211"].map(findCourse),
    );
  });

  it("เปิดหน้าแล้วโหลดตารางและรายวิชาของภาคเรียน 1/2568", async () => {
    vi.mocked(timetableApi.get).mockResolvedValue(buildTimetable(SIX_COURSES));
    render(<Timetable />);

    expect(screen.getByText("กำลังโหลดตารางเรียน…")).toBeInTheDocument();
    await waitForTimetable();

    expect(timetableApi.get).toHaveBeenCalledWith(2568, 1);
    expect(coursesApi.search).toHaveBeenCalledWith({ academicYear: 2568, semester: 1, q: "", category: undefined });
    expect(timetableBox().getByText("หน่วยกิต 18 / 22")).toBeInTheDocument();
    expect(timetableBox().getByText("วิชาในตารางเรียน: 6 วิชา (18.0 หน่วยกิต)")).toBeInTheDocument();
    expect(await screen.findByText("พบ 4 รายวิชา")).toBeInTheDocument();
    expect(addButton("CS111")).toHaveTextContent("เพิ่มแล้ว");
    expect(addButton("CS102")).toHaveTextContent("+ เพิ่มวิชา");
  });

  it("กดเพิ่มวิชา ส่ง sectionId ไป API แล้วแสดงตารางที่ backend ตอบกลับ", async () => {
    vi.mocked(timetableApi.addEntry).mockResolvedValue(buildTimetable(["CS111"]));
    render(<Timetable />);
    await waitForTimetable();
    await screen.findByText("พบ 4 รายวิชา");

    await userEvent.click(addButton("CS111"));

    expect(timetableApi.addEntry).toHaveBeenCalledWith({ sectionId: findCourse("CS111").sections[0].sectionId });
    await waitFor(() => expect(addButton("CS111")).toHaveTextContent("เพิ่มแล้ว"));
    expect(timetableBox().getByText("หน่วยกิต 3 / 22")).toBeInTheDocument();
    expect(timetableBox().getAllByText("CS111", { selector: "strong" })).toHaveLength(2);
  });

  it("เลือกกลุ่มเรียนอื่นก่อนเพิ่ม จะส่ง sectionId ของกลุ่มที่เลือก", async () => {
    vi.mocked(timetableApi.addEntry).mockResolvedValue(buildTimetable(["CS102"]));
    render(<Timetable />);
    await waitForTimetable();
    await screen.findByText("พบ 4 รายวิชา");
    const secondSection = findCourse("CS102").sections[1];

    await userEvent.selectOptions(within(courseCard("CS102")).getByRole("combobox"), String(secondSection.sectionId));
    await userEvent.click(addButton("CS102"));

    expect(timetableApi.addEntry).toHaveBeenCalledWith({ sectionId: secondSection.sectionId });
  });

  it("backend ตอบว่ามีเวลาชน แสดงแถบเตือนตาม conflicts ของ API", async () => {
    vi.mocked(timetableApi.get).mockResolvedValue(buildTimetable(["CS111"]));
    vi.mocked(timetableApi.addEntry).mockResolvedValue(
      buildTimetable(["CS111", "CS102"], { conflicts: CS111_CS102_CONFLICTS }),
    );
    render(<Timetable />);
    await waitForTimetable();
    await screen.findByText("พบ 4 รายวิชา");

    await userEvent.click(addButton("CS102"));

    expect(await screen.findByText("ตรวจพบเวลาเรียนซ้อนทับกัน")).toBeInTheDocument();
    expect(screen.getByText("CS111 และ CS102 · อังคาร 11:00-12:30")).toBeInTheDocument();
  });

  it("เพิ่มแล้วจะเกิน 22 หน่วยกิต ปุ่มเพิ่มกดไม่ได้ และไม่มีข้อความแจ้งเตือนหน่วยกิตเกิน", async () => {
    vi.mocked(timetableApi.get).mockResolvedValue(
      buildTimetable(SIX_COURSES, { totalCredits: 21 }),
    );
    render(<Timetable />);
    await waitForTimetable();
    await screen.findByText("พบ 4 รายวิชา");

    expect(addButton("CS102")).toBeDisabled();
    expect(addButton("CS102")).toHaveTextContent("+ เพิ่มวิชา");
    await userEvent.click(addButton("CS102"));

    expect(timetableApi.addEntry).not.toHaveBeenCalled();
    expect(screen.queryByText(/เกิน/)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("API ตอบ 409 หน่วยกิตเกิน ไม่แสดงข้อความ แต่โหลดตารางล่าสุดใหม่", async () => {
    vi.mocked(timetableApi.addEntry).mockRejectedValue(
      new ApiError({ status: 409, code: "CREDIT_LIMIT_EXCEEDED", detail: "เกินกำหนด 22 หน่วยกิต" }),
    );
    render(<Timetable />);
    await waitForTimetable();
    await screen.findByText("พบ 4 รายวิชา");

    await userEvent.click(addButton("CS102"));

    await waitFor(() => expect(timetableApi.get).toHaveBeenCalledTimes(2));
    expect(screen.queryByText(/เกิน/)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("เพิ่มวิชาไม่สำเร็จเพราะเชื่อมต่อไม่ได้ แสดงข้อความให้ลองใหม่ และกดได้อีกครั้ง", async () => {
    vi.mocked(timetableApi.addEntry).mockRejectedValue(new TypeError("Failed to fetch"));
    render(<Timetable />);
    await waitForTimetable();
    await screen.findByText("พบ 4 รายวิชา");

    await userEvent.click(addButton("CS102"));

    expect(await screen.findByText("เพิ่มวิชาไม่สำเร็จ กรุณาลองใหม่")).toBeInTheDocument();
    expect(addButton("CS102")).toBeEnabled();
  });

  it("เปลี่ยนภาคเรียน โหลดตารางและรายวิชาของภาคใหม่ และไม่แสดงวิชาของภาคเดิม", async () => {
    vi.mocked(timetableApi.get).mockImplementation(async (academicYear, semester) =>
      academicYear === 2568 && semester === 1 ? buildTimetable(SIX_COURSES) : buildTimetable([], { academicYear, semester }),
    );
    render(<Timetable />);
    await waitForTimetable();
    expect(timetableBox().getByText("หน่วยกิต 18 / 22")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("ภาคเรียน"), "2");

    await waitFor(() => expect(timetableApi.get).toHaveBeenLastCalledWith(2568, 2));
    await waitFor(() => expect(timetableBox().getByText("หน่วยกิต 0 / 22")).toBeInTheDocument());
    expect(coursesApi.search).toHaveBeenLastCalledWith(expect.objectContaining({ academicYear: 2568, semester: 2 }));

    await userEvent.selectOptions(screen.getByLabelText("ภาคเรียน"), "1");
    await waitFor(() => expect(timetableBox().getByText("หน่วยกิต 18 / 22")).toBeInTheDocument());
  });

  it("ค้นหาและกรองหมวด ส่งคำค้นกับหมวดวิชาไปที่ API", async () => {
    render(<Timetable />);
    await waitForTimetable();

    await userEvent.type(screen.getByPlaceholderText("ค้นหารหัสหรือชื่อวิชา"), " cs1 ");
    await userEvent.click(screen.getByRole("button", { name: "ค้นหา" }));
    await waitFor(() => expect(coursesApi.search).toHaveBeenLastCalledWith(expect.objectContaining({ q: " cs1 " })));

    await userEvent.selectOptions(screen.getByLabelText("กรองตามหมวดวิชา"), "MAJOR");
    await waitFor(() =>
      expect(coursesApi.search).toHaveBeenLastCalledWith(expect.objectContaining({ q: " cs1 ", category: "MAJOR" })),
    );
  });

  it("โหลดตารางไม่สำเร็จ แสดงข้อความ และกดลองใหม่แล้วโหลดได้", async () => {
    vi.mocked(timetableApi.get)
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValue(buildTimetable(["CS111"]));
    render(<Timetable />);

    expect(await screen.findByText("โหลดตารางเรียนไม่สำเร็จ")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "ลองใหม่" }));

    await waitFor(() => expect(timetableBox().getByText("หน่วยกิต 3 / 22")).toBeInTheDocument());
    expect(screen.queryByText("โหลดตารางเรียนไม่สำเร็จ")).not.toBeInTheDocument();
  });

  it("โหลดรายวิชาไม่สำเร็จ แสดงข้อความ", async () => {
    vi.mocked(coursesApi.search).mockRejectedValue(new TypeError("Failed to fetch"));
    render(<Timetable />);

    expect(await screen.findByText("โหลดรายวิชาไม่สำเร็จ กรุณาลองใหม่")).toBeInTheDocument();
  });

  it("ปุ่มลบวิชาปิดไว้จนกว่า US2 จะเชื่อม API", async () => {
    vi.mocked(timetableApi.get).mockResolvedValue(buildTimetable(["CS111"]));
    render(<Timetable />);
    await waitForTimetable();

    expect(screen.getByRole("button", { name: "ลบวิชา" })).toBeDisabled();
  });
});
