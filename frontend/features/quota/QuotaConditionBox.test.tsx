import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import QuotaConditionBox from "./QuotaConditionBox";
import { COURSE_EL395, COURSE_NO_CHIP } from "./quotaFixtures";

describe("QuotaConditionBox", () => {
  it("UT-UI-13 แสดงเงื่อนไขครบและชิปรหัสวิชา EL295 ที่กดได้", async () => {
    const onSelectCourse = vi.fn();
    render(<QuotaConditionBox conditions={COURSE_EL395.conditions} onSelectCourse={onSelectCourse} />);
    expect(screen.getByText("เงื่อนไขและข้อกำหนดสำคัญ")).toBeInTheDocument();
    expect(screen.getByText(COURSE_EL395.conditions[0].text)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "EL295" }));
    expect(onSelectCourse).toHaveBeenCalledWith("EL295");
  });

  it("UT-UI-14 เงื่อนไขที่ไม่มี relatedCourseCode ไม่แสดงชิปปุ่มกด", () => {
    render(<QuotaConditionBox conditions={COURSE_NO_CHIP.conditions} onSelectCourse={vi.fn()} />);
    expect(screen.getByText("ต้องได้รับอนุมัติจากอาจารย์ผู้สอน")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("UT-UI-15 ไม่มีเงื่อนไขแสดงข้อความสามารถยื่นได้ตามกำหนดเวลา", () => {
    render(<QuotaConditionBox conditions={[]} onSelectCourse={vi.fn()} />);
    expect(screen.getByText("ไม่มีเงื่อนไข สามารถยื่นขอโควตาได้ตามกำหนดเวลา")).toBeInTheDocument();
  });
});
