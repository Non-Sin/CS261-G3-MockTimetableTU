import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { getCourseQuota, searchQuotaCourses } from "./api";
import QuotaSearchPage from "./QuotaSearchPage";
import {
  COURSE_CS232, COURSE_EL295, COURSE_EL395, COURSE_MA211, MY_TIMETABLE_COURSES, SEARCH_EMPTY, searchResponse,
} from "./quotaFixtures";

vi.mock("./api", () => ({ searchQuotaCourses: vi.fn(), getCourseQuota: vi.fn() }));

const searchMock = vi.mocked(searchQuotaCourses);
const courseMock = vi.mocked(getCourseQuota);

beforeEach(() => {
  searchMock.mockReset();
  courseMock.mockReset();
});

const renderPage = () =>
  render(<QuotaSearchPage academicYear={2568} semester={1} myCourseCodes={MY_TIMETABLE_COURSES} />);

const searchFor = async (text: string) => {
  await userEvent.type(screen.getByRole("textbox"), `${text}{Enter}`);
};

const GUIDE_TITLE = "4 ขั้นตอนการขอโควตาสำหรับนักศึกษา มธ.";

describe("QuotaSearchPage", () => {
  it("UT-UI-01 หน้าเริ่มต้น: แสดง Guide ไม่แสดงผลลัพธ์ และไม่เรียก API", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "ค้นหาช่องทางขอโควตา" })).toBeInTheDocument();
    expect(screen.getByText("ภาคเรียนที่ 1/2568")).toBeInTheDocument();
    expect(screen.getByText("ข้อควรรู้สำคัญเกี่ยวกับการขอโควตารายวิชา")).toBeInTheDocument();
    const input = screen.getByPlaceholderText("ค้นหาด้วยรหัสวิชา หรือชื่อวิชา เช่น MA211");
    expect(input).toHaveValue("");
    expect(screen.getByText(GUIDE_TITLE)).toBeInTheDocument();
    expect(screen.queryByText(/พบทั้งหมด/)).not.toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(searchMock).not.toHaveBeenCalled();
  });

  it("ค้นหาด้วยรหัสวิชา เรียก API ด้วย academicYear/semester/q และแสดงการ์ด", async () => {
    searchMock.mockResolvedValue(searchResponse([COURSE_EL395], { query: "EL395" }));
    renderPage();
    await searchFor("EL395");
    expect(await screen.findByRole("article", { name: /EL395/ })).toBeInTheDocument();
    expect(searchMock).toHaveBeenCalledWith(expect.objectContaining({ academicYear: 2568, semester: 1, q: "EL395", mine: false }));
    expect(screen.queryByText(GUIDE_TITLE)).not.toBeInTheDocument();
  });

  it("UT-UI-04 กด × ขณะไม่ติ๊ก checkbox กลับสู่ Guide โดยไม่เรียก API เพิ่ม", async () => {
    searchMock.mockResolvedValue(searchResponse([COURSE_EL395]));
    renderPage();
    await searchFor("EL395");
    await screen.findByRole("article", { name: /EL395/ });

    await userEvent.click(screen.getByRole("button", { name: "ล้างคำค้น" }));
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByText(GUIDE_TITLE)).toBeInTheDocument();
    expect(searchMock).toHaveBeenCalledTimes(1);
  });

  it("UT-UI-05 สั่งค้นหาขณะช่องว่างและไม่ติ๊ก checkbox ไม่เรียก API", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "ค้นหาข้อมูล" }));
    await userEvent.type(screen.getByRole("textbox"), "{Enter}");
    await userEvent.type(screen.getByRole("textbox"), "   {Enter}");
    expect(searchMock).not.toHaveBeenCalled();
    expect(screen.getByText(GUIDE_TITLE)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("UT-UI-08 ติ๊ก checkbox ตอนช่องว่าง เรียก API mine=true ทันทีและแสดงผล", async () => {
    searchMock.mockResolvedValue(searchResponse([COURSE_MA211], { mine: true }));
    renderPage();
    await userEvent.click(screen.getByRole("checkbox", { name: /เฉพาะวิชาในแผนของฉัน/ }));
    expect(await screen.findByRole("article", { name: /MA211/ })).toBeInTheDocument();
    expect(searchMock).toHaveBeenCalledWith(expect.objectContaining({ academicYear: 2568, semester: 1, q: "", mine: true }));
    expect(screen.queryByText(GUIDE_TITLE)).not.toBeInTheDocument();
    expect(screen.getByText("ในแผนการเรียน")).toBeInTheDocument();
  });

  it("UT-UI-09 เลิกติ๊ก checkbox ตอนช่องว่าง กลับสู่ Guide โดยไม่เรียก API เพิ่ม", async () => {
    searchMock.mockResolvedValue(searchResponse([COURSE_MA211], { mine: true }));
    renderPage();
    const checkbox = screen.getByRole("checkbox", { name: /เฉพาะวิชาในแผนของฉัน/ });
    await userEvent.click(checkbox);
    await screen.findByRole("article", { name: /MA211/ });

    await userEvent.click(checkbox);
    expect(searchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText(GUIDE_TITLE)).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("ติ๊ก checkbox ขณะมีคำค้น ค้นใหม่ด้วยทั้ง q และ mine (AND)", async () => {
    searchMock.mockResolvedValue(searchResponse([COURSE_MA211]));
    renderPage();
    await userEvent.type(screen.getByRole("textbox"), "MA");
    await userEvent.click(screen.getByRole("checkbox", { name: /เฉพาะวิชาในแผนของฉัน/ }));
    await screen.findByRole("article", { name: /MA211/ });
    expect(searchMock).toHaveBeenCalledWith(expect.objectContaining({ q: "MA", mine: true }));
  });

  it("UT-UI-10 สรุปจำนวนวิชา และข้อความจำกัด 50 วิชาแรก", async () => {
    searchMock.mockResolvedValueOnce(searchResponse([COURSE_EL395, COURSE_CS232]));
    const first = renderPage();
    await searchFor("E");
    expect(await screen.findByText("ช่องทางและรอบเวลายื่นคำร้อง")).toBeInTheDocument();
    expect(screen.getByText("พบทั้งหมด 2 วิชา")).toBeInTheDocument();
    first.unmount();

    const many = Array.from({ length: 50 }, (_, i) => ({ ...COURSE_CS232, courseCode: `CS${String(i).padStart(3, "0")}` }));
    searchMock.mockResolvedValueOnce(searchResponse(many, { total: 65 }));
    renderPage();
    await searchFor("C");
    expect(await screen.findByText("พบทั้งหมด 65 วิชา (แสดง 50 วิชาแรก)")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(50);
  });

  it("ค้นหาไม่พบ (courses: []) แสดง QuotaEmptyState พร้อมรหัสที่ค้น", async () => {
    searchMock.mockResolvedValue(SEARCH_EMPTY);
    renderPage();
    await searchFor("DM201");
    expect(await screen.findByText("ไม่พบข้อมูลช่องทางขอโควตาสำหรับวิชานี้")).toBeInTheDocument();
    expect(screen.getByText("ยังไม่มีข้อมูลช่องทางการขอโควตา สำหรับรายวิชา DM201 ในระบบ")).toBeInTheDocument();
    expect(screen.getByText("พบทั้งหมด 0 วิชา")).toBeInTheDocument();
  });

  it("UT-UI-27 กดชิป EL295 ใส่รหัสในช่องค้นหา ดึงวิชาเดี่ยว และแทนที่ผลเดิม", async () => {
    searchMock.mockResolvedValue(searchResponse([COURSE_EL395]));
    courseMock.mockResolvedValue(COURSE_EL295);
    renderPage();
    await searchFor("EL395");
    await screen.findByRole("article", { name: /EL395/ });

    await userEvent.click(screen.getByRole("button", { name: "EL295" }));
    expect(await screen.findByRole("article", { name: /EL295/ })).toBeInTheDocument();
    expect(courseMock).toHaveBeenCalledWith("EL295", { academicYear: 2568, semester: 1 });
    expect(screen.getByRole("textbox")).toHaveValue("EL295");
    expect(screen.queryByRole("article", { name: /EL395/ })).not.toBeInTheDocument();
  });

  it("UT-UI-28 กดชิปแล้ว API ตอบ 404 แสดง QuotaEmptyState", async () => {
    searchMock.mockResolvedValue(searchResponse([COURSE_EL395]));
    courseMock.mockRejectedValue(new ApiError({ status: 404, detail: "ไม่พบรายวิชา EL295" }));
    renderPage();
    await searchFor("EL395");
    await screen.findByRole("article", { name: /EL395/ });

    await userEvent.click(screen.getByRole("button", { name: "EL295" }));
    expect(await screen.findByText("ไม่พบข้อมูลช่องทางขอโควตาสำหรับวิชานี้")).toBeInTheDocument();
    expect(screen.getByText(/สำหรับรายวิชา EL295 ในระบบ/)).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("UT-UI-29 ระหว่างโหลดแสดง skeleton ไม่แสดงการ์ด error หรือ empty state", async () => {
    searchMock.mockReturnValue(new Promise(() => {})); // ค้างไว้ไม่ resolve
    renderPage();
    await searchFor("EL395");
    expect(await screen.findByRole("status", { name: "กำลังโหลดข้อมูลโควตา" })).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("ไม่พบข้อมูลช่องทางขอโควตาสำหรับวิชานี้")).not.toBeInTheDocument();
  });

  it("UT-UI-30 API ล้มเหลวแสดงข้อความ error และปุ่มลองใหม่ที่ค้นซ้ำด้วยค่าเดิม", async () => {
    searchMock.mockRejectedValueOnce(new Error("Failed to fetch")).mockResolvedValueOnce(searchResponse([COURSE_EL395]));
    renderPage();
    await searchFor("EL395");
    expect(await screen.findByRole("alert")).toHaveTextContent("ไม่สามารถโหลดข้อมูลโควตาได้ กรุณาลองใหม่อีกครั้ง");

    await userEvent.click(screen.getByRole("button", { name: "ลองใหม่" }));
    expect(await screen.findByRole("article", { name: /EL395/ })).toBeInTheDocument();
    expect(searchMock).toHaveBeenCalledTimes(2);
    expect(searchMock.mock.calls[1][0]).toEqual(searchMock.mock.calls[0][0]);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("ไม่ใช้ผลของคำขอเก่าที่ตอบกลับช้ากว่าคำขอใหม่", async () => {
    let resolveFirst!: (value: ReturnType<typeof searchResponse>) => void;
    searchMock
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce(searchResponse([COURSE_CS232]));
    renderPage();
    await searchFor("EL395");
    await userEvent.clear(screen.getByRole("textbox"));
    await searchFor("CS232");
    await screen.findByRole("article", { name: /CS232/ });

    resolveFirst(searchResponse([COURSE_EL395]));
    await waitFor(() => expect(screen.queryByRole("article", { name: /EL395/ })).not.toBeInTheDocument());
    expect(screen.getByRole("article", { name: /CS232/ })).toBeInTheDocument();
  });

  it("รีเซ็ตตัวกรองและผลค้นหาเมื่อแผนกลายเป็นว่าง พร้อมป้องกันผล request เก่ากลับมาทับ", async () => {
    let resolveSearch!: (value: ReturnType<typeof searchResponse>) => void;
    searchMock.mockReturnValue(new Promise((resolve) => { resolveSearch = resolve; }));

    // 1. เริ่มต้นด้วยการมีวิชาในตาราง เช่น ["MA211"]
    const { rerender } = render(
      <QuotaSearchPage academicYear={2568} semester={1} myCourseCodes={["MA211"]} />
    );

    const checkbox = screen.getByRole("checkbox", { name: /เฉพาะวิชาในแผนของฉัน/ });
    expect(checkbox).toBeEnabled();
    expect(checkbox).not.toBeChecked();

    // 2. ผู้ใช้ติ๊กตัวกรอง "เฉพาะวิชาในแผนของฉัน" ขณะที่คำขอกำลังส่ง
    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(screen.getByRole("status", { name: "กำลังโหลดข้อมูลโควตา" })).toBeInTheDocument();

    // 3. การลบวิชาในตารางสำเร็จ แผนกลายเป็นว่าง (myCourseCodes เปลี่ยนเป็น [])
    rerender(<QuotaSearchPage academicYear={2568} semester={1} myCourseCodes={[]} />);

    // 4. Checkbox ต้องถูกรีเซ็ต (ไม่ติ๊ก) และถูก disabled
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toBeDisabled();

    // 5. ผลค้นหาถูกรีเซ็ตกลับสู่หน้า Guide ทันที
    expect(screen.getByText(GUIDE_TITLE)).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();

    // 6. เมื่อ request เก่า (mine: true) ตอบกลับมาช้า ผลลัพธ์ต้องไม่กลับมาทับหน้าจอ
    resolveSearch(searchResponse([COURSE_MA211], { mine: true }));
    await waitFor(() => {
      expect(screen.queryByRole("article")).not.toBeInTheDocument();
    });
    expect(screen.getByText(GUIDE_TITLE)).toBeInTheDocument();
  });

  it("รีเซ็ตตัวกรองและลบการ์ดเดิมเมื่อแผนกลายเป็นว่างหลังจากโหลดผลสำเร็จแล้ว", async () => {
    searchMock.mockResolvedValue(searchResponse([COURSE_MA211], { mine: true }));
    const { rerender } = render(
      <QuotaSearchPage academicYear={2568} semester={1} myCourseCodes={["MA211"]} />
    );

    const checkbox = screen.getByRole("checkbox", { name: /เฉพาะวิชาในแผนของฉัน/ });
    await userEvent.click(checkbox);
    expect(await screen.findByRole("article", { name: /MA211/ })).toBeInTheDocument();

    // แผนกลายเป็นว่าง
    rerender(<QuotaSearchPage academicYear={2568} semester={1} myCourseCodes={[]} />);

    // การ์ดเดิมต้องหายไป กลับสู่หน้า Guide และ checkbox ต้องไม่ถูกติ๊ก + disabled
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toBeDisabled();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByText(GUIDE_TITLE)).toBeInTheDocument();
  });
});
