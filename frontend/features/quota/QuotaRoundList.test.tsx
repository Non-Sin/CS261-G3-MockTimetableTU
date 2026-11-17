import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import QuotaRoundList from "./QuotaRoundList";
import { COURSE_EL395, COURSE_MA211, COURSE_NO_ROUNDS } from "./quotaFixtures";

describe("QuotaRoundList", () => {
  it("UT-UI-16 ช่วงวันที่ พ.ศ. พร้อมป้ายจำนวนรอบและ label", () => {
    render(<QuotaRoundList rounds={COURSE_EL395.rounds} />);
    expect(screen.getByText("เปิดรับทั้งหมด 2 รอบ")).toBeInTheDocument();
    const [first, second] = screen.getAllByRole("listitem");
    expect(first).toHaveTextContent("รอบที่ 1");
    expect(first).toHaveTextContent("คำร้องช่วงต้น");
    expect(within(first).getByText("4 - 8 สิงหาคม 2568")).toBeInTheDocument();
    expect(second).toHaveTextContent("รอบที่ 2");
    expect(second).toHaveTextContent("คำร้องรอบสอง");
    expect(within(second).getByText("18 - 21 สิงหาคม 2568")).toBeInTheDocument();
  });

  it("UT-UI-17 กำหนดส่งวันเดียว (startDate: null) แสดงป้ายกำหนดการและเวลาสิ้นสุด", () => {
    render(<QuotaRoundList rounds={COURSE_MA211.rounds} />);
    expect(screen.getByText("กำหนดการ")).toBeInTheDocument();
    expect(screen.queryByText(/รอบที่ 1/)).not.toBeInTheDocument();
    expect(screen.getByText("ยื่นคำร้องภายใน 20 สิงหาคม 2568 เวลา 15:00 น.")).toBeInTheDocument();
  });

  it("กำหนดส่งวันเดียวที่ไม่มี endTime ตัดส่วนเวลาออก", () => {
    render(<QuotaRoundList rounds={[{ roundNo: 1, label: null, startDate: null, endDate: "2025-08-20", endTime: null }]} />);
    expect(screen.getByText("ยื่นคำร้องภายใน 20 สิงหาคม 2568")).toBeInTheDocument();
  });

  it("UT-UI-18 ไม่มีรอบแสดงข้อความยังไม่ประกาศ และไม่มีป้ายจำนวนรอบ", () => {
    render(<QuotaRoundList rounds={COURSE_NO_ROUNDS.rounds} />);
    expect(screen.getByText("ยังไม่ประกาศช่วงเวลายื่นคำร้องของภาคนี้")).toBeInTheDocument();
    expect(screen.queryByText(/เปิดรับทั้งหมด/)).not.toBeInTheDocument();
  });
});
