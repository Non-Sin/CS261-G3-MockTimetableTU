import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AddedCoursesList from "../timetable/components/AddedCoursesList";
import { buildTimetable } from "../timetable/testFixtures";

const THREE_COURSES = ["CS180", "MA211", "CS111"];

const cardOf = (courseCode: string) =>
  screen.getAllByRole("article").find((article) =>
    within(article).queryByText(courseCode, { selector: "p" }),
  )!;

const checkboxOf = (courseCode: string) =>
  screen.getByRole("checkbox", { name: `เลือกวิชา ${courseCode}` });

describe("AddedCoursesList (US2-T07 Unit Test UI)", () => {
  const onRemove = vi.fn();
  const onRemoveMultiple = vi.fn();

  beforeEach(() => {
    onRemove.mockReset().mockResolvedValue(true);
    onRemoveMultiple.mockReset().mockResolvedValue(true);
  });

  it("[TC4] ตารางว่างเปล่า ปุ่มลบที่เลือกและปุ่มลบทั้งหมดถูกปิดใช้งาน (disabled) และไม่มีปุ่มลบวิชา", () => {
    render(
      <AddedCoursesList
        entries={[]}
        onRemove={onRemove}
        onRemoveMultiple={onRemoveMultiple}
      />,
    );

    expect(screen.getByText("ยังไม่มีวิชาในตาราง")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ลบที่เลือก" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "ลบทั้งหมด" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "ลบวิชา" })).not.toBeInTheDocument();
  });

  it("[TC1] กดปุ่มลบวิชาของรายวิชาเดียว ส่ง entryId ของวิชานั้นไปยัง onRemove", async () => {
    const { entries } = buildTimetable(THREE_COURSES);
    render(
      <AddedCoursesList
        entries={entries}
        onRemove={onRemove}
        onRemoveMultiple={onRemoveMultiple}
      />,
    );

    const cs111Entry = entries.find((entry) => entry.courseCode === "CS111")!;
    await userEvent.click(within(cardOf("CS111")).getByRole("button", { name: "ลบวิชา" }));

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith(cs111Entry.entryId);
    expect(onRemoveMultiple).not.toHaveBeenCalled();
  });

  it("[TC2] เลือก checkbox หลายวิชาแล้วกดลบที่เลือก ส่ง entryIds ที่ติ๊กไปยัง onRemoveMultiple และล้าง checkbox หลังลบสำเร็จ", async () => {
    const { entries } = buildTimetable(THREE_COURSES);
    render(
      <AddedCoursesList
        entries={entries}
        onRemove={onRemove}
        onRemoveMultiple={onRemoveMultiple}
      />,
    );

    const deleteSelectedButton = () => screen.getByRole("button", { name: /^ลบที่เลือก/ });
    expect(deleteSelectedButton()).toBeDisabled();

    await userEvent.click(checkboxOf("CS111"));
    await userEvent.click(checkboxOf("MA211"));

    expect(deleteSelectedButton()).toBeEnabled();
    expect(deleteSelectedButton()).toHaveTextContent("ลบที่เลือก (2)");

    await userEvent.click(deleteSelectedButton());

    const cs111Id = entries.find((entry) => entry.courseCode === "CS111")!.entryId;
    const ma211Id = entries.find((entry) => entry.courseCode === "MA211")!.entryId;
    expect(onRemoveMultiple).toHaveBeenCalledTimes(1);
    expect(onRemoveMultiple).toHaveBeenCalledWith([cs111Id, ma211Id]);
    await waitFor(() => expect(checkboxOf("CS111")).not.toBeChecked());
    expect(checkboxOf("MA211")).not.toBeChecked();
  });

  it("ติ๊ก checkbox แล้วยกเลิกติ๊กทั้งหมด ปุ่มลบที่เลือกกลับเป็น disabled", async () => {
    const { entries } = buildTimetable(["CS111", "MA211"]);
    render(
      <AddedCoursesList
        entries={entries}
        onRemove={onRemove}
        onRemoveMultiple={onRemoveMultiple}
      />,
    );

    await userEvent.click(checkboxOf("CS111"));
    expect(screen.getByRole("button", { name: "ลบที่เลือก (1)" })).toBeEnabled();

    await userEvent.click(checkboxOf("CS111"));
    expect(screen.getByRole("button", { name: "ลบที่เลือก" })).toBeDisabled();
  });

  it("[TC3] กดปุ่มลบทั้งหมด แสดงกล่องยืนยันบนหน้าจอ กดยกเลิกจะปิดกล่องโดยไม่ลบ และกดยืนยันจะส่ง entryIds ทุกวิชา", async () => {
    const { entries } = buildTimetable(["CS111", "MA211"]);
    render(
      <AddedCoursesList
        entries={entries}
        onRemove={onRemove}
        onRemoveMultiple={onRemoveMultiple}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "ลบทั้งหมด" }));

    const confirmBox = screen.getByRole("region", { name: "ยืนยันการลบรายวิชาทั้งหมด" });
    expect(confirmBox).toBeInTheDocument();
    expect(within(confirmBox).getByText("ยืนยันการลบรายวิชาทั้งหมดหรือไม่?")).toBeInTheDocument();
    expect(within(confirmBox).getByText(/CS111, MA211/)).toBeInTheDocument();

    // กดยกเลิก: กล่องยืนยันหายไป และไม่มีการเรียกฟังก์ชันลบ
    await userEvent.click(within(confirmBox).getByRole("button", { name: "ยกเลิก" }));
    expect(screen.queryByRole("region", { name: "ยืนยันการลบรายวิชาทั้งหมด" })).not.toBeInTheDocument();
    expect(onRemoveMultiple).not.toHaveBeenCalled();

    // กดลบทั้งหมดอีกครั้ง แล้วกดยืนยันลบทั้งหมด
    await userEvent.click(screen.getByRole("button", { name: "ลบทั้งหมด" }));
    await userEvent.click(screen.getByRole("button", { name: "ยืนยันลบทั้งหมด" }));

    expect(onRemoveMultiple).toHaveBeenCalledTimes(1);
    expect(onRemoveMultiple).toHaveBeenCalledWith(entries.map((entry) => entry.entryId));
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "ยืนยันการลบรายวิชาทั้งหมด" })).not.toBeInTheDocument(),
    );
  });

  it("ระหว่างกำลังลบ (deleteStatus = deleting) ปุ่มลบและ checkbox ทั้งหมดถูกปิดใช้งานกันกดซ้ำ", () => {
    const { entries } = buildTimetable(["CS111", "MA211"]);
    render(
      <AddedCoursesList
        entries={entries}
        deleteStatus="deleting"
        onRemove={onRemove}
        onRemoveMultiple={onRemoveMultiple}
      />,
    );

    expect(screen.getByRole("button", { name: /^ลบที่เลือก/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "ลบทั้งหมด" })).toBeDisabled();
    screen.getAllByRole("button", { name: "ลบวิชา" }).forEach((button) => {
      expect(button).toBeDisabled();
    });
    screen.getAllByRole("checkbox").forEach((checkbox) => {
      expect(checkbox).toBeDisabled();
    });
  });

  it("แสดงข้อความแจ้งเตือนเมื่อ deleteError ไม่เป็นค่าว่าง", () => {
    const { entries } = buildTimetable(["CS111"]);
    render(
      <AddedCoursesList
        entries={entries}
        deleteStatus="error"
        deleteError="ลบวิชาไม่สำเร็จ กรุณาลองใหม่"
        onRemove={onRemove}
        onRemoveMultiple={onRemoveMultiple}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("ลบวิชาไม่สำเร็จ กรุณาลองใหม่");
  });
});
