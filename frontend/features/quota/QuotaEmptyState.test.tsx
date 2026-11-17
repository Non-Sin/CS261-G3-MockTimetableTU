import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import QuotaEmptyState from "./QuotaEmptyState";

describe("QuotaEmptyState", () => {
  it("UT-UI-26 ค้นหาไม่พบ แสดงหัวข้อและรหัสวิชาที่ค้น", () => {
    render(<QuotaEmptyState query="DM201" />);
    expect(screen.getByText("ไม่พบข้อมูลช่องทางขอโควตาสำหรับวิชานี้")).toBeInTheDocument();
    expect(screen.getByText("ยังไม่มีข้อมูลช่องทางการขอโควตา สำหรับรายวิชา DM201 ในระบบ")).toBeInTheDocument();
  });

  it("ไม่มีคำค้น (ติ๊กเฉพาะวิชาในแผนแล้วไม่มีผล) ใช้ข้อความของแผนการเรียน", () => {
    render(<QuotaEmptyState query="" />);
    expect(screen.getByText("ไม่พบรายวิชาในแผนการเรียนของคุณที่มีข้อมูลการขอโควตา")).toBeInTheDocument();
  });
});
