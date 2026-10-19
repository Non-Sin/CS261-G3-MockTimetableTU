import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { fetchCourses } from "../courses/api";
import { fetchTimetable } from "../timetable/api";
import Timetable from "../timetable/Timetable";
import {
  buildTimetable,
  findCourse,
  LAS101_TU109_CONFLICTS,
  SIX_COURSES,
} from "../timetable/testFixtures";
import type { Timetable as TimetableData } from "../timetable/types";
import { timetableDeleteApi } from "./api";

vi.mock("../timetable/api", () => ({ fetchTimetable: vi.fn(), addTimetableEntry: vi.fn() }));
vi.mock("../courses/api", () => ({ fetchCourses: vi.fn() }));
vi.mock("./api", () => ({
  timetableDeleteApi: {
    removeEntry: vi.fn(),
    removeEntries: vi.fn(),
  },
}));

const timetableBox = () =>
  within(screen.getByRole("heading", { name: "ตารางเรียนจำลอง" }).closest("section")!);
const addedCoursesSection = () =>
  within(screen.getByRole("heading", { name: "วิชาที่เพิ่มแล้ว" }).closest("section")!);

const addedCard = (courseCode: string) =>
  addedCoursesSection()
    .getAllByRole("article")
    .find((article) => within(article).queryByText(courseCode, { selector: "p" }))!;

const checkboxOf = (courseCode: string) =>
  addedCoursesSection().getByRole("checkbox", { name: `เลือกวิชา ${courseCode}` });

const renderTimetable = async (timetable: TimetableData) => {
  vi.mocked(fetchTimetable).mockResolvedValue(timetable);
  render(<Timetable />);
  await waitFor(() =>
    expect(screen.queryByText("กำลังโหลดตารางเรียน…")).not.toBeInTheDocument(),
  );
};

describe("US2-T07 ลบวิชาจากตารางเรียนจำลอง (UI + Unit Test UI)", () => {
  beforeEach(() => {
    vi.mocked(fetchTimetable).mockReset();
    vi.mocked(fetchCourses).mockReset().mockResolvedValue([
      findCourse("CS180"),
      findCourse("MA211"),
      findCourse("CS111"),
    ]);
    vi.mocked(timetableDeleteApi.removeEntry).mockReset();
    vi.mocked(timetableDeleteApi.removeEntries).mockReset();
  });

  it("[TC1] ลบ 1 วิชาด้วยปุ่มลบวิชาของ CS111 ออกจากตาราง โดยไม่กระทบวิชาอื่นที่เหลือ", async () => {
    const initial = buildTimetable(["CS180", "MA211", "CS111"]);
    const cs111Entry = initial.entries.find((entry) => entry.courseCode === "CS111")!;
    vi.mocked(timetableDeleteApi.removeEntry).mockResolvedValue(
      buildTimetable(["CS180", "MA211"]),
    );

    await renderTimetable(initial);
    expect(timetableBox().getByText("หน่วยกิต 9 / 22")).toBeInTheDocument();

    await userEvent.click(within(addedCard("CS111")).getByRole("button", { name: "ลบวิชา" }));

    expect(timetableDeleteApi.removeEntry).toHaveBeenCalledTimes(1);
    expect(timetableDeleteApi.removeEntry).toHaveBeenCalledWith(cs111Entry.entryId);
    await waitFor(() => expect(timetableBox().getByText("หน่วยกิต 6 / 22")).toBeInTheDocument());
    expect(timetableBox().queryByText("CS111")).not.toBeInTheDocument();
    expect(timetableBox().getAllByText("CS180", { selector: "strong" })).toHaveLength(1);
    expect(timetableBox().getAllByText("MA211", { selector: "strong" })).toHaveLength(2);
    expect(addedCoursesSection().queryByText("CS111")).not.toBeInTheDocument();
    expect(addedCoursesSection().getByText("CS180")).toBeInTheDocument();
    expect(addedCoursesSection().getByText("MA211")).toBeInTheDocument();
  });

  it("[TC2] เลือก checkbox มากกว่า 1 วิชา (CS111 และ MA211) แล้วกดลบที่เลือก ลบพร้อมกันโดยไม่กระทบวิชาอื่น", async () => {
    const initial = buildTimetable(["CS180", "MA211", "CS111"]);
    const cs111Id = initial.entries.find((entry) => entry.courseCode === "CS111")!.entryId;
    const ma211Id = initial.entries.find((entry) => entry.courseCode === "MA211")!.entryId;
    vi.mocked(timetableDeleteApi.removeEntries).mockResolvedValue(
      buildTimetable(["CS180"]),
    );

    await renderTimetable(initial);

    await userEvent.click(checkboxOf("CS111"));
    await userEvent.click(checkboxOf("MA211"));
    await userEvent.click(addedCoursesSection().getByRole("button", { name: "ลบที่เลือก (2)" }));

    expect(timetableDeleteApi.removeEntries).toHaveBeenCalledTimes(1);
    expect(timetableDeleteApi.removeEntries).toHaveBeenCalledWith([cs111Id, ma211Id]);
    await waitFor(() => expect(timetableBox().getByText("หน่วยกิต 3 / 22")).toBeInTheDocument());
    expect(timetableBox().queryByText("CS111")).not.toBeInTheDocument();
    expect(timetableBox().queryByText("MA211")).not.toBeInTheDocument();
    expect(timetableBox().getAllByText("CS180", { selector: "strong" })).toHaveLength(1);
    expect(addedCoursesSection().getByRole("button", { name: "ลบที่เลือก" })).toBeDisabled();
  });

  it("[TC3] กดปุ่มลบทั้งหมด แสดงกล่องยืนยันบนหน้าจอ และเมื่อยืนยันจะลบทุกวิชาจนตารางว่าง พร้อมเพิ่มวิชาใหม่ได้", async () => {
    const initial = buildTimetable(["CS111", "MA211"]);
    vi.mocked(timetableDeleteApi.removeEntries).mockResolvedValue(
      buildTimetable([], { updatedAt: "2026-10-19T16:00:00+07:00" }),
    );

    await renderTimetable(initial);

    await userEvent.click(addedCoursesSection().getByRole("button", { name: "ลบทั้งหมด" }));
    const confirmBox = addedCoursesSection().getByRole("region", {
      name: "ยืนยันการลบรายวิชาทั้งหมด",
    });
    expect(confirmBox).toBeInTheDocument();

    await userEvent.click(within(confirmBox).getByRole("button", { name: "ยืนยันลบทั้งหมด" }));

    expect(timetableDeleteApi.removeEntries).toHaveBeenCalledTimes(1);
    expect(timetableDeleteApi.removeEntries).toHaveBeenCalledWith(
      initial.entries.map((entry) => entry.entryId),
    );
    await waitFor(() => expect(timetableBox().getByText("หน่วยกิต 0 / 22")).toBeInTheDocument());
    expect(
      timetableBox().getByText(
        "ยังไม่มีวิชาในตาราง ค้นหารายวิชาด้านล่างแล้วกด “เพิ่มวิชา” เพื่อเริ่มจัดตาราง",
      ),
    ).toBeInTheDocument();
    expect(addedCoursesSection().getByText("ยังไม่มีวิชาในตาราง")).toBeInTheDocument();
    expect(addedCoursesSection().getByRole("button", { name: "ลบทั้งหมด" })).toBeDisabled();
    expect(addedCoursesSection().getByRole("button", { name: "ลบที่เลือก" })).toBeDisabled();
  });

  it("[TC4] ตารางเรียนจำลองว่างเปล่า ปุ่มลบถูกปิดใช้งาน (disabled) และไม่เรียก API", async () => {
    await renderTimetable(buildTimetable([]));

    const deleteSelectedBtn = addedCoursesSection().getByRole("button", { name: "ลบที่เลือก" });
    const deleteAllBtn = addedCoursesSection().getByRole("button", { name: "ลบทั้งหมด" });

    expect(deleteSelectedBtn).toBeDisabled();
    expect(deleteAllBtn).toBeDisabled();
    expect(addedCoursesSection().queryByRole("button", { name: "ลบวิชา" })).not.toBeInTheDocument();

    await userEvent.click(deleteSelectedBtn);
    await userEvent.click(deleteAllBtn);

    expect(timetableDeleteApi.removeEntry).not.toHaveBeenCalled();
    expect(timetableDeleteApi.removeEntries).not.toHaveBeenCalled();
  });

  it("ลบวิชาที่เวลาชนกันออกแล้ว แถบแจ้งเตือนเวลาชนหายไป และปุ่ม PNG กลับมากดได้", async () => {
    const initial = buildTimetable([...SIX_COURSES, "TU109"], {
      conflicts: LAS101_TU109_CONFLICTS,
    });
    const las101Entry = initial.entries.find((entry) => entry.courseCode === "LAS101")!;
    vi.mocked(timetableDeleteApi.removeEntry).mockResolvedValue(
      buildTimetable(SIX_COURSES.filter((code) => code !== "LAS101").concat("TU109")),
    );

    await renderTimetable(initial);
    expect(screen.getByText("ตรวจพบเวลาเรียนซ้อนทับกัน")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "PNG" })).toBeDisabled();

    await userEvent.click(within(addedCard("LAS101")).getByRole("button", { name: "ลบวิชา" }));

    expect(timetableDeleteApi.removeEntry).toHaveBeenCalledWith(las101Entry.entryId);
    await waitFor(() =>
      expect(screen.queryByText("ตรวจพบเวลาเรียนซ้อนทับกัน")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "PNG" })).toBeEnabled();
  });

  it("ระหว่างรอลบวิชา ปุ่มลบทุกปุ่มเป็น disabled กันการกดซ้ำ", async () => {
    const initial = buildTimetable(["CS180", "CS111"]);
    let finishDelete!: (data: TimetableData) => void;
    vi.mocked(timetableDeleteApi.removeEntry).mockReturnValue(
      new Promise((resolve) => {
        finishDelete = resolve;
      }),
    );

    await renderTimetable(initial);

    const deleteCs180Btn = within(addedCard("CS180")).getByRole("button", { name: "ลบวิชา" });
    await userEvent.click(deleteCs180Btn);

    await waitFor(() => expect(deleteCs180Btn).toBeDisabled());
    expect(addedCoursesSection().getByRole("button", { name: "ลบทั้งหมด" })).toBeDisabled();

    await userEvent.click(deleteCs180Btn);
    finishDelete(buildTimetable(["CS111"]));

    await waitFor(() => expect(timetableBox().getByText("หน่วยกิต 3 / 22")).toBeInTheDocument());
    expect(timetableDeleteApi.removeEntry).toHaveBeenCalledTimes(1);
  });

  it("เมื่อ API ตอบ 404 (ข้อมูลบนหน้าจอเก่า) แสดงข้อความแจ้งเตือนและโหลดตารางล่าสุดใหม่", async () => {
    const initial = buildTimetable(["CS180", "CS111"]);
    vi.mocked(timetableDeleteApi.removeEntry).mockRejectedValue(
      new ApiError({ status: 404, detail: "ไม่พบวิชาในตารางเรียนของคุณ" }),
    );

    await renderTimetable(initial);
    vi.mocked(fetchTimetable).mockResolvedValue(buildTimetable(["CS111"]));

    await userEvent.click(within(addedCard("CS180")).getByRole("button", { name: "ลบวิชา" }));

    expect(
      await screen.findByText("ข้อมูลตารางเรียนมีการเปลี่ยนแปลง กำลังโหลดข้อมูลล่าสุด"),
    ).toBeInTheDocument();
    await waitFor(() => expect(fetchTimetable).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(timetableBox().getByText("หน่วยกิต 3 / 22")).toBeInTheDocument());
  });

  it("เมื่อลบวิชาไม่สำเร็จ (network/500 error) แสดงข้อความให้ลองใหม่ และกดลบซ้ำจนสำเร็จได้", async () => {
    const initial = buildTimetable(["CS180", "CS111"]);
    vi.mocked(timetableDeleteApi.removeEntry)
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(buildTimetable(["CS111"]));

    await renderTimetable(initial);

    await userEvent.click(within(addedCard("CS180")).getByRole("button", { name: "ลบวิชา" }));
    expect(await screen.findByText("ลบวิชาไม่สำเร็จ กรุณาลองใหม่")).toBeInTheDocument();
    expect(within(addedCard("CS180")).getByRole("button", { name: "ลบวิชา" })).toBeEnabled();

    await userEvent.click(within(addedCard("CS180")).getByRole("button", { name: "ลบวิชา" }));
    await waitFor(() => expect(timetableBox().getByText("หน่วยกิต 3 / 22")).toBeInTheDocument());
    expect(screen.queryByText("ลบวิชาไม่สำเร็จ กรุณาลองใหม่")).not.toBeInTheDocument();
  });
});
