import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toPng } from "html-to-image";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Timetable from "../timetable/Timetable";
import { EXPORT_IGNORE_ATTR } from "./exportPng";

vi.mock("html-to-image", () => ({ toPng: vi.fn() }));

const DATA_URL = "data:image/png;base64,TEST";
const ERROR_TEXT = "ส่งออกภาพไม่สำเร็จ กรุณาลองใหม่";

// 6 วิชา 18 หน่วยกิต ตามหน้า "ตารางเรียนจำลอง" ใน UI Prototype
const SIX_COURSES = ["CS180", "MA211", "CS111", "LAS101", "TU101", "TU106"];

const pngButton = () => screen.getByRole("button", { name: "PNG" });
const timetableBox = () => screen.getByRole("heading", { name: "ตารางเรียนจำลอง" }).closest("section")!;

// กด "+ เพิ่มวิชา" ของรายวิชาในส่วนค้นหารายวิชา (ข้อมูลจำลองของ US1)
const addCourses = async (courseCodes: string[]) => {
  for (const courseCode of courseCodes) {
    const card = screen
      .getAllByRole("article")
      .find((article) => within(article).queryByText(courseCode, { selector: "p" }) && within(article).queryByRole("button", { name: "+ เพิ่มวิชา" }));

    await userEvent.click(within(card!).getByRole("button", { name: "+ เพิ่มวิชา" }));
  }
};

describe("ปุ่ม PNG บนหน้าตารางเรียนจำลอง (US1-T07)", () => {
  let downloads: HTMLAnchorElement[];

  beforeEach(() => {
    vi.mocked(toPng).mockReset().mockResolvedValue(DATA_URL);
    downloads = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this);
    });
  });

  it("[UT-UI-02] แสดงปุ่ม PNG บนหัวกล่องตาราง กดได้ และมี data-export-ignore", async () => {
    render(<Timetable />);
    await addCourses(SIX_COURSES);

    expect(within(timetableBox()).getByRole("button", { name: "PNG" })).toBeEnabled();
    expect(pngButton()).toHaveAttribute(EXPORT_IGNORE_ATTR);
    expect(pngButton().querySelector("svg")).toBeInTheDocument();
  });

  it("[UT-UI-03] กดแล้วถ่ายกล่องตารางด้วย option ตามสเปก และดาวน์โหลด timetable-2568-1.png", async () => {
    render(<Timetable />);
    await addCourses(SIX_COURSES);
    Object.defineProperty(timetableBox(), "scrollWidth", { configurable: true, value: 1600 });
    Object.defineProperty(timetableBox(), "scrollHeight", { configurable: true, value: 720 });

    await userEvent.click(pngButton());

    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(toPng).toHaveBeenCalledTimes(1);
    expect(toPng).toHaveBeenCalledWith(timetableBox(), expect.objectContaining({
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      width: 1600,
      height: 720,
    }));
    expect(downloads[0].download).toBe("timetable-2568-1.png");
    expect(downloads[0].href).toBe(DATA_URL);
    expect(screen.queryByText(ERROR_TEXT)).not.toBeInTheDocument();
  });

  it("[UT-UI-04] ภาพมีข้อมูลตารางครบ และตัดปุ่ม PNG ออก", async () => {
    render(<Timetable />);
    await addCourses(SIX_COURSES);

    await userEvent.click(pngButton());
    await waitFor(() => expect(toPng).toHaveBeenCalledTimes(1));
    const { filter } = vi.mocked(toPng).mock.calls[0][1]!;
    const box = within(timetableBox());

    expect(filter!(pngButton())).toBe(false);
    expect(filter!(pngButton().parentElement!)).toBe(false);
    expect(filter!(box.getByRole("heading", { name: "ตารางเรียนจำลอง" }))).toBe(true);
    SIX_COURSES.forEach((courseCode) => {
      expect(filter!(box.getByText(courseCode, { selector: "span" }))).toBe(true);
      expect(filter!(box.getAllByText(courseCode, { selector: "strong" })[0].parentElement!)).toBe(true);
    });
    expect(filter!(box.getByText("วิชาในตารางเรียน: 6 วิชา (18.0 หน่วยกิต)"))).toBe(true);
  });

  it("[UT-UI-05] ตารางว่าง กดได้และได้ภาพตารางเปล่าโดยไม่เกิด error", async () => {
    render(<Timetable />);
    const box = within(timetableBox());

    expect(pngButton()).toBeEnabled();
    expect(box.getByText("จันทร์")).toBeInTheDocument();
    expect(box.getByText("08:00")).toBeInTheDocument();
    SIX_COURSES.forEach((courseCode) => expect(box.queryByText(courseCode)).not.toBeInTheDocument());

    await userEvent.click(pngButton());

    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(vi.mocked(toPng).mock.calls[0][0]).toBe(timetableBox());
    expect(downloads[0].download).toBe("timetable-2568-1.png");
    expect(screen.queryByText(ERROR_TEXT)).not.toBeInTheDocument();
  });

  it("[UT-UI-10] มีเวลาชน ปุ่มยังแสดงแต่ disabled และไม่สร้างภาพ", async () => {
    render(<Timetable />);
    // CS102 Sec 030001 เรียนอังคาร/พฤหัสบดี 11:00-12:30 ชนกับ CS111
    await addCourses([...SIX_COURSES, "CS102"]);

    expect(screen.getByText("ตรวจพบเวลาเรียนซ้อนทับกัน")).toBeInTheDocument();
    expect(within(timetableBox()).getByRole("button", { name: "PNG" })).toBeDisabled();
    await userEvent.click(pngButton());

    expect(toPng).not.toHaveBeenCalled();
    expect(downloads).toHaveLength(0);
  });
});
