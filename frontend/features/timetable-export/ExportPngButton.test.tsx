import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toPng } from "html-to-image";
import { createRef, useRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExportPngButton from "./ExportPngButton";

vi.mock("html-to-image", () => ({ toPng: vi.fn() }));

const DATA_URL = "data:image/png;base64,TEST";
const ERROR_TEXT = "ส่งออกภาพไม่สำเร็จ กรุณาลองใหม่";

// กล่องตารางจำลองที่มีปุ่ม PNG อยู่ข้างใน เหมือนที่ US1 วางไว้
const TimetableBox = ({ academicYear = 2569, semester = 2, hasConflicts = false }) => {
  const ref = useRef<HTMLElement>(null);

  return (
    <section ref={ref} aria-label="ตารางเรียนจำลอง">
      <h2>ตารางเรียนจำลอง</h2>
      <ExportPngButton targetRef={ref} academicYear={academicYear} semester={semester} hasConflicts={hasConflicts} />
    </section>
  );
};

const pngButton = () => screen.getByRole("button", { name: "PNG" });

describe("ExportPngButton", () => {
  let downloads: string[];

  beforeEach(() => {
    vi.mocked(toPng).mockReset().mockResolvedValue(DATA_URL);
    downloads = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this.download);
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("[UT-UI-03] กดแล้วถ่ายกล่องตารางของ targetRef และดาวน์โหลด timetable-2569-2.png", async () => {
    render(<TimetableBox />);

    await userEvent.click(pngButton());

    await waitFor(() => expect(downloads).toEqual(["timetable-2569-2.png"]));
    expect(toPng).toHaveBeenCalledTimes(1);
    expect(vi.mocked(toPng).mock.calls[0][0]).toBe(screen.getByRole("region", { name: "ตารางเรียนจำลอง" }));
    expect(screen.queryByText(ERROR_TEXT)).not.toBeInTheDocument();
  });

  it("[UT-UI-06] ระหว่างสร้างภาพ ปุ่ม disabled ข้อความยังเป็น PNG และกดซ้ำไม่ได้", async () => {
    let finish!: (dataUrl: string) => void;
    vi.mocked(toPng).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<TimetableBox />);

    await userEvent.click(pngButton());
    await waitFor(() => expect(pngButton()).toBeDisabled());
    expect(pngButton()).toHaveTextContent(/^PNG$/);
    expect(screen.queryByText(/กำลังสร้างภาพ/)).not.toBeInTheDocument();

    await userEvent.click(pngButton());
    await userEvent.click(pngButton());
    finish(DATA_URL);

    await waitFor(() => expect(pngButton()).toBeEnabled());
    expect(toPng).toHaveBeenCalledTimes(1);
    expect(downloads).toEqual(["timetable-2569-2.png"]);
  });

  it("[UT-UI-08] สร้างภาพไม่สำเร็จ แสดงข้อความ error แล้วกดใหม่ได้", async () => {
    vi.mocked(toPng).mockRejectedValueOnce(new Error("render failed"));
    render(<TimetableBox />);

    await userEvent.click(pngButton());
    expect(await screen.findByText(ERROR_TEXT)).toBeInTheDocument();
    expect(downloads).toHaveLength(0);
    expect(pngButton()).toBeEnabled();

    await userEvent.click(pngButton());
    await waitFor(() => expect(downloads).toEqual(["timetable-2569-2.png"]));
    expect(screen.queryByText(ERROR_TEXT)).not.toBeInTheDocument();
  });

  it("[UT-UI-09] กล่องตารางยังไม่ render แสดงข้อความ error และไม่ดาวน์โหลด", async () => {
    render(<ExportPngButton targetRef={createRef<HTMLElement>()} academicYear={2569} semester={2} hasConflicts={false} />);

    await userEvent.click(pngButton());

    expect(await screen.findByText(ERROR_TEXT)).toBeInTheDocument();
    expect(toPng).not.toHaveBeenCalled();
    expect(downloads).toHaveLength(0);
  });

  it("[UT-UI-10] มีเวลาชน ปุ่มยังแสดงแต่ disabled และไม่สร้างภาพ", async () => {
    render(<TimetableBox hasConflicts />);

    expect(pngButton()).toBeVisible();
    expect(pngButton()).toBeDisabled();
    await userEvent.click(pngButton());

    expect(toPng).not.toHaveBeenCalled();
    expect(downloads).toHaveLength(0);
  });
});
