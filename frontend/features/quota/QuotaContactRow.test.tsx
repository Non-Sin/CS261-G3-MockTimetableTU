import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import QuotaContactRow from "./QuotaContactRow";
import { COURSE_CONTACT_NO_URL, COURSE_EL395 } from "./quotaFixtures";

describe("QuotaContactRow", () => {
  it("UT-UI-21 มี URL: แสดงชื่อองค์กรและลิงก์เปิดแท็บใหม่", () => {
    render(<QuotaContactRow contact={COURSE_EL395.contacts[0]} />);
    expect(screen.getByText("สถาบันภาษา มหาวิทยาลัยธรรมศาสตร์ (LITU)")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Facebook: สถาบันภาษา มหาวิทยาลัยธรรมศาสตร์" });
    expect(link).toHaveAttribute("href", "https://www.facebook.com/litu.thammasat");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("UT-UI-21 ไม่มี URL: แสดงชื่อองค์กรและ label แต่ไม่ใช่ลิงก์", () => {
    render(<QuotaContactRow contact={COURSE_CONTACT_NO_URL.contacts[0]} />);
    expect(screen.getByText("งานบริการการศึกษา")).toBeInTheDocument();
    expect(screen.getByText("ติดต่อที่ห้องธุรการ")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
