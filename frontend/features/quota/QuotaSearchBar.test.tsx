import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import QuotaSearchBar from "./QuotaSearchBar";
import { MY_TIMETABLE_COURSES } from "./quotaFixtures";

// QuotaSearchBar เป็น controlled จึงห่อด้วย state เหมือนที่หน้าหลักทำ
const Harness = ({ onSearch, initial = "", myCourseCodes = MY_TIMETABLE_COURSES }: {
  onSearch: (submit: { q: string; mine: boolean }) => void;
  initial?: string;
  myCourseCodes?: string[];
}) => {
  const [value, setValue] = useState(initial);
  const [mine, setMine] = useState(false);
  return (
    <QuotaSearchBar
      value={value}
      mine={mine}
      myCourseCodes={myCourseCodes}
      onValueChange={setValue}
      onMineChange={setMine}
      onSearch={onSearch}
      onClear={() => setValue("")}
    />
  );
};

const noop = () => {};

describe("QuotaSearchBar", () => {
  it("UT-UI-02 พิมพ์แล้วกดปุ่มค้นหา หรือกด Enter ส่ง { q, mine } ถูกต้อง", async () => {
    const onSearch = vi.fn();
    render(<Harness onSearch={onSearch} />);
    const input = screen.getByPlaceholderText("ค้นหาด้วยรหัสวิชา หรือชื่อวิชา เช่น MA211");

    await userEvent.type(input, "EL395");
    await userEvent.click(screen.getByRole("button", { name: "ค้นหาข้อมูล" }));
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenLastCalledWith({ q: "EL395", mine: false });

    await userEvent.clear(input);
    await userEvent.type(input, "แคลคูลัส{Enter}");
    expect(onSearch).toHaveBeenCalledTimes(2);
    expect(onSearch).toHaveBeenLastCalledWith({ q: "แคลคูลัส", mine: false });
  });

  it("UT-UI-03 ปุ่มล้างคำค้น (×) แสดงเมื่อมีข้อความ เรียก onClear และหายไปเมื่อช่องว่าง", async () => {
    const onClear = vi.fn();
    const { rerender } = render(
      <QuotaSearchBar value="CS" mine={false} myCourseCodes={[]} onValueChange={noop} onMineChange={noop} onSearch={noop} onClear={onClear} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "ล้างคำค้น" }));
    expect(onClear).toHaveBeenCalledTimes(1);

    rerender(
      <QuotaSearchBar value="" mine={false} myCourseCodes={[]} onValueChange={noop} onMineChange={noop} onSearch={noop} onClear={onClear} />,
    );
    expect(screen.queryByRole("button", { name: /ล้าง|clear/i })).not.toBeInTheDocument();
  });

  it("UT-UI-03 (ผ่าน Harness) กด × แล้วช่องค้นหาถูกล้าง", async () => {
    render(<Harness onSearch={vi.fn()} initial="CS" />);
    await userEvent.click(screen.getByRole("button", { name: "ล้างคำค้น" }));
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(screen.queryByRole("button", { name: "ล้างคำค้น" })).not.toBeInTheDocument();
  });

  it("UT-UI-06 มีวิชาในตาราง: ป้าย checkbox มีรหัสวิชาและใช้งานได้", () => {
    render(<Harness onSearch={vi.fn()} />);
    expect(screen.getByRole("checkbox", { name: "เฉพาะวิชาในแผนของฉัน (MA211, LAS101)" })).toBeEnabled();
  });

  it("UT-UI-07 ตารางว่าง: ป้ายไม่มีวงเล็บและ checkbox ถูก disabled", () => {
    render(<Harness onSearch={vi.fn()} myCourseCodes={[]} />);
    const checkbox = screen.getByRole("checkbox", { name: "เฉพาะวิชาในแผนของฉัน" });
    expect(checkbox).toBeDisabled();
  });

  it("ช่องค้นหาจำกัดความยาวไม่เกิน 50 ตัวอักษรตาม Spec", () => {
    render(<Harness onSearch={vi.fn()} />);
    expect(screen.getByRole("textbox")).toHaveAttribute("maxlength", "50");
  });
});
