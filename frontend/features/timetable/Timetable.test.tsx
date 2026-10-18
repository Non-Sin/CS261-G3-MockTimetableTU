import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { fetchCourses } from "../courses/api";
import { addTimetableEntry, fetchTimetable } from "./api";
import Timetable from "./Timetable";
import {
  buildTimetable,
  cs111WithTwoSections,
  findCourse,
  LAS101_TU109_CONFLICTS,
  SIX_COURSES,
} from "./testFixtures";

vi.mock("./api", () => ({ fetchTimetable: vi.fn(), addTimetableEntry: vi.fn() }));
vi.mock("../courses/api", () => ({ fetchCourses: vi.fn() }));

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

// รายวิชาที่ GET /api/courses ตอบในทุกเคส: CS111 มี 2 กลุ่ม, TU109 ชนกับ LAS101
const SEARCH_RESULT = () => [cs111WithTwoSections(), findCourse("CS180"), findCourse("TU109"), findCourse("MA211")];

describe("US1-T10 หน้าตารางเรียนจำลองเชื่อมกับ API", () => {
  beforeEach(() => {
    vi.mocked(fetchTimetable).mockReset().mockResolvedValue(buildTimetable([]));
    vi.mocked(addTimetableEntry).mockReset();
    vi.mocked(fetchCourses).mockReset().mockResolvedValue(SEARCH_RESULT());
  });

  it("เปิดหน้าแล้วโหลดตารางและรายวิชาของภาคเรียน 1/2568", async () => {
    vi.mocked(fetchTimetable).mockResolvedValue(buildTimetable(SIX_COURSES));
    render(<Timetable />);

    expect(screen.getByText("กำลังโหลดตารางเรียน…")).toBeInTheDocument();
    await waitForTimetable();

    expect(fetchTimetable).toHaveBeenCalledWith({ academicYear: 2568, semester: 1 });
    expect(fetchCourses).toHaveBeenCalledWith({ academicYear: 2568, semester: 1, q: "", category: undefined });
    expect(timetableBox().getByText("หน่วยกิต 18 / 22")).toBeInTheDocument();
    expect(timetableBox().getByText("วิชาในตารางเรียน: 6 วิชา (18.0 หน่วยกิต)")).toBeInTheDocument();
    expect(await screen.findByText("พบ 4 รายวิชา")).toBeInTheDocument();
    expect(addButton("CS111")).toHaveTextContent("เพิ่มแล้ว");
    expect(addButton("TU109")).toHaveTextContent("+ เพิ่มวิชา");
  });

  it("กดเพิ่มวิชา ส่ง sectionId ไป API แล้วแสดงตารางที่ backend ตอบกลับ", async () => {
    vi.mocked(addTimetableEntry).mockResolvedValue(buildTimetable(["CS180"]));
    render(<Timetable />);
    await waitForTimetable();
    await screen.findByText("พบ 4 รายวิชา");

    await userEvent.click(addButton("CS180"));

    expect(addTimetableEntry).toHaveBeenCalledWith({ sectionId: findCourse("CS180").sections[0].sectionId });
    await waitFor(() => expect(addButton("CS180")).toHaveTextContent("เพิ่มแล้ว"));
    expect(timetableBox().getByText("หน่วยกิต 3 / 22")).toBeInTheDocument();
    expect(timetableBox().getAllByText("CS180", { selector: "strong" })).toHaveLength(1);
  });

  it("เลือกกลุ่มเรียนอื่นก่อนเพิ่ม จะส่ง sectionId ของกลุ่มที่เลือก", async () => {
    vi.mocked(addTimetableEntry).mockResolvedValue(buildTimetable(["CS111"]));
    render(<Timetable />);
    await waitForTimetable();
    await screen.findByText("พบ 4 รายวิชา");

    await userEvent.selectOptions(within(courseCard("CS111")).getByRole("combobox"), "9030002");
    await userEvent.click(addButton("CS111"));

    expect(addTimetableEntry).toHaveBeenCalledWith({ sectionId: 9030002 });
  });

  it("backend ตอบว่ามีเวลาชน แสดงแถบเตือนตาม conflicts ของ API", async () => {
    vi.mocked(fetchTimetable).mockResolvedValue(buildTimetable(["LAS101"]));
    vi.mocked(addTimetableEntry).mockResolvedValue(
      buildTimetable(["LAS101", "TU109"], { conflicts: LAS101_TU109_CONFLICTS }),
    );
    render(<Timetable />);
    await waitForTimetable();
    await screen.findByText("พบ 4 รายวิชา");

    await userEvent.click(addButton("TU109"));

    expect(await screen.findByText("ตรวจพบเวลาเรียนซ้อนทับกัน")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "PNG" })).toBeDisabled();
  });

  it("เพิ่มแล้วจะเกิน 22 หน่วยกิต ปุ่มเพิ่มกดไม่ได้ และไม่มีข้อความแจ้งเตือนหน่วยกิตเกิน", async () => {
    vi.mocked(fetchTimetable).mockResolvedValue(buildTimetable(SIX_COURSES, { totalCredits: 21 }));
    render(<Timetable />);
    await waitForTimetable();
    await screen.findByText("พบ 4 รายวิชา");

    expect(addButton("TU109")).toBeDisabled();
    expect(addButton("TU109")).toHaveTextContent("+ เพิ่มวิชา");
    await userEvent.click(addButton("TU109"));

    expect(addTimetableEntry).not.toHaveBeenCalled();
    expect(screen.queryByText(/เกิน/)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("API ตอบ 409 หน่วยกิตเกิน ไม่แสดงข้อความ แต่โหลดตารางล่าสุดใหม่", async () => {
    vi.mocked(addTimetableEntry).mockRejectedValue(
      new ApiError({ status: 409, code: "CREDIT_LIMIT_EXCEEDED", detail: "เกินกำหนด 22 หน่วยกิต" }),
    );
    render(<Timetable />);
    await waitForTimetable();
    await screen.findByText("พบ 4 รายวิชา");

    await userEvent.click(addButton("TU109"));

    await waitFor(() => expect(fetchTimetable).toHaveBeenCalledTimes(2));
    expect(screen.queryByText(/เกิน/)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("เพิ่มวิชาไม่สำเร็จเพราะเชื่อมต่อไม่ได้ แสดงข้อความให้ลองใหม่ และกดได้อีกครั้ง", async () => {
    vi.mocked(addTimetableEntry).mockRejectedValue(new TypeError("Failed to fetch"));
    render(<Timetable />);
    await waitForTimetable();
    await screen.findByText("พบ 4 รายวิชา");

    await userEvent.click(addButton("TU109"));

    expect(await screen.findByText("เพิ่มวิชาไม่สำเร็จ กรุณาลองใหม่")).toBeInTheDocument();
    expect(addButton("TU109")).toBeEnabled();
  });

  it("เปลี่ยนภาคเรียน โหลดตารางและรายวิชาของภาคใหม่ และไม่แสดงวิชาของภาคเดิม", async () => {
    vi.mocked(fetchTimetable).mockImplementation(async ({ academicYear, semester }) =>
      academicYear === 2568 && semester === 1 ? buildTimetable(SIX_COURSES) : buildTimetable([], { academicYear, semester }),
    );
    render(<Timetable />);
    await waitForTimetable();
    expect(timetableBox().getByText("หน่วยกิต 18 / 22")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("ภาคเรียน"), "2");

    await waitFor(() => expect(fetchTimetable).toHaveBeenLastCalledWith({ academicYear: 2568, semester: 2 }));
    await waitFor(() => expect(timetableBox().getByText("หน่วยกิต 0 / 22")).toBeInTheDocument());
    expect(fetchCourses).toHaveBeenLastCalledWith(expect.objectContaining({ academicYear: 2568, semester: 2 }));

    await userEvent.selectOptions(screen.getByLabelText("ภาคเรียน"), "1");
    await waitFor(() => expect(timetableBox().getByText("หน่วยกิต 18 / 22")).toBeInTheDocument());
  });

  describe("เปลี่ยนภาคเรียนระหว่างใช้งาน (จากรีวิวของ sitch ใน #45)", () => {
    // CS111 ภาค 2/2568 ตาม seed มีกลุ่ม 030001 แต่ sectionId คนละตัวกับภาค 1
    const cs111Semester2 = () => ({
      ...findCourse("CS111"),
      sections: [{ ...findCourse("CS111").sections[0], sectionId: 9030011 }],
    });
    const byTerm = <T,>(semester1: T, semester2: T) =>
      async ({ semester }: { semester: number }) => (semester === 1 ? semester1 : semester2);
    // promise ที่ test ควบคุมเวลา resolve / reject เอง
    const deferred = <T,>() => {
      let resolve!: (value: T) => void;
      let reject!: (reason: unknown) => void;
      const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
      return { promise, resolve, reject };
    };

    beforeEach(() => {
      vi.mocked(fetchTimetable).mockImplementation(async ({ academicYear, semester }) =>
        buildTimetable([], { academicYear, semester }),
      );
    });

    it("เลือก CS111 กลุ่ม 030002 ในภาค 1 แล้วเปลี่ยนเป็นภาค 2 กดเพิ่มต้องส่ง sectionId ของภาค 2", async () => {
      vi.mocked(fetchCourses).mockImplementation(byTerm([cs111WithTwoSections()], [cs111Semester2()]));
      vi.mocked(addTimetableEntry).mockResolvedValue(buildTimetable(["CS111"], { semester: 2 }));
      render(<Timetable />);
      await screen.findByText("พบ 1 รายวิชา");

      await userEvent.selectOptions(within(courseCard("CS111")).getByRole("combobox"), "9030002");
      await userEvent.selectOptions(screen.getByLabelText("ภาคเรียน"), "2");
      await waitFor(() => expect(within(courseCard("CS111")).queryByRole("combobox")).not.toBeInTheDocument());
      await waitFor(() => expect(addButton("CS111")).toBeEnabled());
      await userEvent.click(addButton("CS111"));

      expect(addTimetableEntry).toHaveBeenCalledWith({ sectionId: 9030011 });
    });

    it("เปลี่ยนภาคแล้วรายวิชาภาคใหม่ยังโหลดไม่เสร็จ ไม่แสดงรายวิชาภาคเก่าให้กดเพิ่ม", async () => {
      const semester2Courses = deferred<ReturnType<typeof SEARCH_RESULT>>();
      vi.mocked(fetchCourses).mockImplementation(({ semester }) =>
        semester === 1 ? Promise.resolve(SEARCH_RESULT()) : semester2Courses.promise,
      );
      render(<Timetable />);
      await screen.findByText("พบ 4 รายวิชา");

      await userEvent.selectOptions(screen.getByLabelText("ภาคเรียน"), "2");
      await waitFor(() => expect(fetchTimetable).toHaveBeenLastCalledWith({ academicYear: 2568, semester: 2 }));
      await waitForTimetable();

      expect(screen.queryAllByRole("button", { name: "+ เพิ่มวิชา" })).toHaveLength(0);
      expect(screen.getByText("กำลังโหลดรายวิชา…")).toBeInTheDocument();
    });

    it("เปลี่ยนภาคแล้วโหลดรายวิชาภาคใหม่ไม่สำเร็จ ไม่แสดงรายวิชาภาคเก่า และแสดงข้อความ", async () => {
      vi.mocked(fetchCourses).mockImplementation(({ semester }) =>
        semester === 1 ? Promise.resolve(SEARCH_RESULT()) : Promise.reject(new TypeError("Failed to fetch")),
      );
      render(<Timetable />);
      await screen.findByText("พบ 4 รายวิชา");

      await userEvent.selectOptions(screen.getByLabelText("ภาคเรียน"), "2");

      expect(await screen.findByText("โหลดรายวิชาไม่สำเร็จ กรุณาลองใหม่")).toBeInTheDocument();
      expect(screen.queryAllByRole("button", { name: "+ เพิ่มวิชา" })).toHaveLength(0);
    });

    it("ผลเพิ่มวิชาของภาคเก่าที่ตอบกลับช้า ไม่ทับตารางภาคใหม่", async () => {
      const lateAdd = deferred<ReturnType<typeof buildTimetable>>();
      vi.mocked(fetchCourses).mockImplementation(byTerm(SEARCH_RESULT(), [cs111Semester2()]));
      vi.mocked(addTimetableEntry).mockReturnValue(lateAdd.promise);
      render(<Timetable />);
      await screen.findByText("พบ 4 รายวิชา");

      await userEvent.click(addButton("TU109"));
      await userEvent.selectOptions(screen.getByLabelText("ภาคเรียน"), "2");
      await waitFor(() => expect(fetchTimetable).toHaveBeenLastCalledWith({ academicYear: 2568, semester: 2 }));
      await waitForTimetable();

      lateAdd.resolve(buildTimetable(["TU109"], { academicYear: 2568, semester: 1 }));
      await waitFor(() => expect(addButton("CS111")).toBeEnabled());

      expect(timetableBox().getByText("หน่วยกิต 0 / 22")).toBeInTheDocument();
      expect(timetableBox().queryByText("TU109")).not.toBeInTheDocument();
    });
  });

  it("เลือกภาคเรียนเดิมซ้ำ ตารางยังแสดงอยู่และไม่โหลดใหม่", async () => {
    vi.mocked(fetchTimetable).mockResolvedValue(buildTimetable(SIX_COURSES));
    render(<Timetable />);
    await waitForTimetable();

    await userEvent.selectOptions(screen.getByLabelText("ภาคเรียน"), "1");
    await userEvent.selectOptions(screen.getByLabelText("ปีการศึกษา"), "2568");

    expect(screen.queryByText("กำลังโหลดตารางเรียน…")).not.toBeInTheDocument();
    expect(timetableBox().getByText("หน่วยกิต 18 / 22")).toBeInTheDocument();
    expect(fetchTimetable).toHaveBeenCalledTimes(1);
  });

  it("ค้นหาและกรองหมวด ส่งคำค้นกับหมวดวิชาไปที่ API", async () => {
    render(<Timetable />);
    await waitForTimetable();

    await userEvent.type(screen.getByPlaceholderText("ค้นหารหัสหรือชื่อวิชา"), " cs1 ");
    await userEvent.click(screen.getByRole("button", { name: "ค้นหา" }));
    await waitFor(() => expect(fetchCourses).toHaveBeenLastCalledWith(expect.objectContaining({ q: " cs1 " })));

    await userEvent.selectOptions(screen.getByLabelText("กรองตามหมวดวิชา"), "MAJOR");
    await waitFor(() =>
      expect(fetchCourses).toHaveBeenLastCalledWith(expect.objectContaining({ q: " cs1 ", category: "MAJOR" })),
    );
  });

  it("โหลดตารางไม่สำเร็จ แสดงข้อความ และกดลองใหม่แล้วโหลดได้", async () => {
    vi.mocked(fetchTimetable)
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValue(buildTimetable(["CS111"]));
    render(<Timetable />);

    expect(await screen.findByText("โหลดตารางเรียนไม่สำเร็จ")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "ลองใหม่" }));

    await waitFor(() => expect(timetableBox().getByText("หน่วยกิต 3 / 22")).toBeInTheDocument());
    expect(screen.queryByText("โหลดตารางเรียนไม่สำเร็จ")).not.toBeInTheDocument();
  });

  it("โหลดรายวิชาไม่สำเร็จ แสดงข้อความ", async () => {
    vi.mocked(fetchCourses).mockRejectedValue(new TypeError("Failed to fetch"));
    render(<Timetable />);

    expect(await screen.findByText("โหลดรายวิชาไม่สำเร็จ กรุณาลองใหม่")).toBeInTheDocument();
  });

  it("ปุ่มลบวิชาปิดไว้จนกว่า US2 จะเชื่อม API", async () => {
    vi.mocked(fetchTimetable).mockResolvedValue(buildTimetable(["CS111"]));
    render(<Timetable />);
    await waitForTimetable();

    expect(screen.getByRole("button", { name: "ลบวิชา" })).toBeDisabled();
  });
});
