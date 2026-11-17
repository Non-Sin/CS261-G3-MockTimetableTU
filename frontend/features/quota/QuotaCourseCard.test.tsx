import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import QuotaCourseCard from "./QuotaCourseCard";
import {
  COURSE_CS232, COURSE_EL395, COURSE_FR205, COURSE_MA211, COURSE_NOT_OFFERED_YEAR, COURSE_NO_TH_NAME, COURSE_TU101,
} from "./quotaFixtures";
import type { QuotaCourse } from "./types";

const renderCard = (course: QuotaCourse, semester = 1) =>
  render(<QuotaCourseCard course={course} academicYear={2568} semester={semester} onSelectRelatedCourse={() => {}} />);

describe("QuotaCourseCard", () => {
  it("UT-UI-11 แสดงส่วนหัวครบ: รหัส ชื่อ หมวดวิชา หน่วยกิต และป้ายในแผนการเรียน", () => {
    const { unmount } = renderCard(COURSE_EL395);
    expect(screen.getByText("EL395")).toBeInTheDocument();
    expect(screen.getByText("ACADEMIC ENGLISH AND STUDY SKILL 2")).toBeInTheDocument();
    expect(screen.getByText("ศึกษาทั่วไป")).toBeInTheDocument();
    expect(screen.getByText("3.0 หน่วยกิต")).toBeInTheDocument();
    expect(screen.queryByText("ในแผนการเรียน")).not.toBeInTheDocument();
    unmount();

    renderCard(COURSE_MA211);
    expect(screen.getByText("MA211")).toBeInTheDocument();
    expect(screen.getByText("วิชาเฉพาะ")).toBeInTheDocument();
    expect(screen.getByText("ในแผนการเรียน")).toBeInTheDocument();
  });

  it("UT-UI-12 แสดงชื่อไทยเมื่อมี และไม่แสดงอะไรเลยเมื่อเป็น null", () => {
    const { unmount } = renderCard(COURSE_EL395);
    expect(screen.getByText("ภาษาอังกฤษเชิงวิชาการและทักษะการศึกษา 2")).toBeInTheDocument();
    unmount();

    const { container } = renderCard(COURSE_NO_TH_NAME);
    expect(container).not.toHaveTextContent("null");
    expect(container.querySelectorAll("article > p")).toHaveLength(0);
  });

  it("REQUIRED แสดงทั้ง 4 ส่วน", () => {
    renderCard(COURSE_EL395);
    expect(screen.getByText("เงื่อนไขและข้อกำหนดสำคัญ", { selector: "h4" })).toBeInTheDocument();
    expect(screen.getByText("ช่วงเวลายื่นคำร้อง")).toBeInTheDocument();
    expect(screen.getByText("ช่องทางการขอโควตา")).toBeInTheDocument();
    expect(screen.getByText("ช่องทางติดต่อคณะ / ภาควิชา")).toBeInTheDocument();
  });

  it("UT-UI-22 NOT_REQUIRED แสดงกล่องไม่ต้องขอโควตา และไม่แสดงส่วนของ REQUIRED", () => {
    renderCard(COURSE_CS232);
    const notice = screen.getByText("รายวิชานี้ไม่ต้องขอโควตา").closest("[data-status]");
    expect(notice).toHaveAttribute("data-status", "NOT_REQUIRED");
    expect(screen.queryByText("เงื่อนไขและข้อกำหนดสำคัญ")).not.toBeInTheDocument();
    expect(screen.queryByText("ช่วงเวลายื่นคำร้อง")).not.toBeInTheDocument();
    expect(screen.queryByText("ช่องทางการขอโควตา")).not.toBeInTheDocument();
  });

  it("UT-UI-23 NOT_OFFERED เปิดเฉพาะภาค 1 ขณะดูภาค 2", () => {
    renderCard(COURSE_FR205, 2);
    expect(screen.getByText("วิชานี้เปิดสอนเฉพาะภาคเรียนที่ 1")).toBeInTheDocument();
    expect(screen.getByText(/ไม่ได้เปิดการเรียนการสอนในภาคเรียนที่ 2\/2568/)).toBeInTheDocument();
    expect(screen.getByText("วิชานี้เปิดสอนเฉพาะภาคเรียนที่ 1").closest("[data-status]")).toHaveAttribute("data-status", "NOT_OFFERED");
  });

  it("UT-UI-24 NOT_OFFERED ไม่เปิดเลยทั้งปี", () => {
    renderCard(COURSE_NOT_OFFERED_YEAR);
    expect(screen.getByText("วิชานี้ไม่เปิดสอนในปีการศึกษา 2568")).toBeInTheDocument();
  });

  it("UT-UI-25 NO_DATA", () => {
    renderCard(COURSE_TU101);
    expect(
      screen.getByText("ยังไม่มีข้อมูลช่องทางขอโควตาของรายวิชานี้ กรุณาติดต่อคณะ/ภาควิชาเจ้าของวิชา"),
    ).toBeInTheDocument();
  });
});
