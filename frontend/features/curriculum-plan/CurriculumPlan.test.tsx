import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { fetchCourses } from "../courses/api";
import { fetchTimetable } from "../timetable/api";
import Timetable from "../timetable/Timetable";
import { buildTimetable, findCourse } from "../timetable/testFixtures";
import type { Timetable as TimetableData } from "../timetable/types";
import { applyPlan, getPlans } from "./api";
import type { ApplyPlanResponse, StudyPlanList } from "./types";

vi.mock("../timetable/api", () => ({ fetchTimetable: vi.fn(), addTimetableEntry: vi.fn() }));
vi.mock("../courses/api", () => ({ fetchCourses: vi.fn() }));
vi.mock("./api", () => ({ getPlans: vi.fn(), applyPlan: vi.fn() }));

const CURRICULUM = "หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ (ฉบับปรับปรุง พ.ศ. 2566)";

const YEAR_2_PLANS: StudyPlanList = {
  department: "วิทยาการคอมพิวเตอร์",
  studyYear: 2,
  semester: 1,
  plans: [
    {
      planId: 12,
      curriculumName: CURRICULUM,
      studyYear: 2,
      semester: 1,
      planType: null,
      totalCredits: 6,
      courses: [
        { courseCode: "CS111", courseName: "OBJECT-ORIENTED CONCEPTS AND PROGRAMMING", category: "MAJOR", credits: 3 },
        { courseCode: "MA211", courseName: "CALCULUS 1", category: "MAJOR", credits: 3 },
      ],
    },
  ],
  minors: [],
};

const YEAR_3_SEM1_PLANS: StudyPlanList = {
  department: "วิทยาการคอมพิวเตอร์",
  studyYear: 3,
  semester: 1,
  plans: [
    {
      planId: 21,
      curriculumName: CURRICULUM,
      studyYear: 3,
      semester: 1,
      planType: "SPECIAL_PROJECT",
      totalCredits: 3,
      courses: [{ courseCode: "CS180", courseName: "DISCRETE STRUCTURES", category: "MAJOR", credits: 3 }],
    },
    {
      planId: 22,
      curriculumName: CURRICULUM,
      studyYear: 3,
      semester: 1,
      planType: "CO_OP",
      totalCredits: 3,
      courses: [{ courseCode: "CS111", courseName: "OBJECT-ORIENTED CONCEPTS AND PROGRAMMING", category: "MAJOR", credits: 3 }],
    },
  ],
  minors: [
    {
      minorId: 3,
      curriculumName: CURRICULUM,
      minorName: "วิทยาการข้อมูล",
      totalCredits: 3,
      courses: [{ courseCode: "ST216", courseName: "STATISTICS FOR SOCIAL SCIENCE 1", category: "FREE_ELECTIVE", credits: 3 }],
    },
    {
      minorId: 4,
      curriculumName: CURRICULUM,
      minorName: "ปัญญาประดิษฐ์",
      totalCredits: 3,
      courses: [{ courseCode: "LAS101", courseName: "CRITICAL THINKING", category: "GENERAL_EDUCATION", credits: 3 }],
    },
  ],
};

const YEAR_3_SEM2_PLANS_WITH_MINOR: StudyPlanList = {
  department: "วิทยาการคอมพิวเตอร์",
  studyYear: 3,
  semester: 2,
  plans: [
    {
      planId: 31,
      curriculumName: CURRICULUM,
      studyYear: 3,
      semester: 2,
      planType: "SPECIAL_PROJECT",
      totalCredits: 3,
      courses: [{ courseCode: "MA211", courseName: "CALCULUS 1", category: "MAJOR", credits: 3 }],
    },
    {
      planId: 32,
      curriculumName: CURRICULUM,
      studyYear: 3,
      semester: 2,
      planType: "CO_OP",
      totalCredits: 3,
      courses: [{ courseCode: "TU101", courseName: "THAILAND, ASEAN, AND THE WORLD", category: "GENERAL_EDUCATION", credits: 3 }],
    },
  ],
  minors: [
    {
      minorId: 3,
      curriculumName: CURRICULUM,
      minorName: "วิทยาการข้อมูล",
      totalCredits: 3,
      courses: [{ courseCode: "ST216", courseName: "STATISTICS FOR SOCIAL SCIENCE 1", category: "FREE_ELECTIVE", credits: 3 }],
    },
  ],
};

const YEAR_3_SEM2_PLANS_WITHOUT_MINOR3: StudyPlanList = {
  ...YEAR_3_SEM2_PLANS_WITH_MINOR,
  minors: [
    {
      minorId: 5,
      curriculumName: CURRICULUM,
      minorName: "เดฟออปส์",
      totalCredits: 3,
      courses: [{ courseCode: "TU106", courseName: "CREATIVITY AND COMMUNICATION", category: "GENERAL_EDUCATION", credits: 3 }],
    },
  ],
};

const PREVIEW_RESPONSE: ApplyPlanResponse = {
  planId: 12,
  minorId: null,
  dryRun: true,
  added: [
    {
      courseCode: "CS111",
      courseName: "OBJECT-ORIENTED CONCEPTS AND PROGRAMMING",
      category: "MAJOR",
      credits: 3,
      source: "PLAN",
      sectionId: 101,
      sectionNo: "030001",
    },
    {
      courseCode: "MA211",
      courseName: "CALCULUS 1",
      category: "MAJOR",
      credits: 3,
      source: "PLAN",
      sectionId: 102,
      sectionNo: "020001",
    },
  ],
  skipped: [],
  timetable: null,
};

const renderTimetablePage = async (timetable: TimetableData = buildTimetable([])) => {
  vi.mocked(fetchTimetable).mockResolvedValue(timetable);
  render(<Timetable />);
  await waitFor(() => expect(screen.queryByText("กำลังโหลดตารางเรียน…")).not.toBeInTheDocument());
};

const openPlanModal = async () => {
  const button = screen.getByRole("button", { name: "จัดตามแผนหลักสูตร" });
  await userEvent.click(button);
  return within(screen.getByRole("dialog", { name: "จัดตารางเรียนตามแผนหลักสูตร" }));
};

const timetableBox = () =>
  within(screen.getByRole("heading", { name: "ตารางเรียนจำลอง" }).closest("section")!);

describe("US8-T07 UI + Unit Test UI การจัดตารางตามแผนหลักสูตร (ตาม US8-T11)", () => {
  beforeEach(() => {
    vi.mocked(fetchTimetable).mockReset().mockResolvedValue(buildTimetable([]));
    vi.mocked(fetchCourses).mockReset().mockResolvedValue([findCourse("CS111"), findCourse("MA211")]);
    vi.mocked(getPlans).mockReset();
    vi.mocked(applyPlan).mockReset();
  });

  it("[UT-UI-01] เปิดหน้าต่างจัดตารางตามแผน มีตัวเลือกชั้นปี ภาคเรียน ปุ่มยกเลิก และปุ่ม X", async () => {
    await renderTimetablePage();

    const trigger = screen.getByRole("button", { name: "จัดตามแผนหลักสูตร" });
    expect(trigger).toBeEnabled();

    await userEvent.click(trigger);

    const dialog = within(screen.getByRole("dialog", { name: "จัดตารางเรียนตามแผนหลักสูตร" }));
    for (const year of [1, 2, 3, 4]) {
      expect(dialog.getByRole("button", { name: `ชั้นปีที่ ${year}` })).toBeInTheDocument();
    }
    expect(dialog.getByRole("button", { name: "ภาคเรียนที่ 1" })).toBeInTheDocument();
    expect(dialog.getByRole("button", { name: "ภาคเรียนที่ 2" })).toBeInTheDocument();
    expect(dialog.getByRole("button", { name: "ยกเลิก" })).toBeInTheDocument();
    expect(dialog.getByRole("button", { name: "X" })).toBeInTheDocument();
    expect(getPlans).not.toHaveBeenCalled();
  });

  it("[UT-UI-02] เลือกชั้นปี/ภาคเรียนแล้วโหลดแผนและ preview อัตโนมัติ แสดง loading และไม่ส่งซ้ำ", async () => {
    let resolvePreview!: (value: ApplyPlanResponse) => void;
    vi.mocked(getPlans).mockResolvedValue(YEAR_2_PLANS);
    vi.mocked(applyPlan).mockImplementation(
      () => new Promise<ApplyPlanResponse>((resolve) => { resolvePreview = resolve; }),
    );

    await renderTimetablePage();
    const dialog = await openPlanModal();

    await userEvent.click(dialog.getByRole("button", { name: "ชั้นปีที่ 2" }));
    await userEvent.click(dialog.getByRole("button", { name: "ภาคเรียนที่ 1" }));

    await waitFor(() => expect(getPlans).toHaveBeenCalledWith({ studyYear: 2, semester: 1 }));
    await waitFor(() =>
      expect(applyPlan).toHaveBeenCalledWith({ planId: 12, academicYear: 2568, dryRun: true }),
    );
    expect(dialog.getByText("กำลังคำนวณรายวิชาและกลุ่มเรียน…")).toBeInTheDocument();

    await act(async () => {
      resolvePreview(PREVIEW_RESPONSE);
    });

    expect(await dialog.findByText("วิชาแนะนำสำหรับ: ชั้นปีที่ 2 ภาคเรียนที่ 1")).toBeInTheDocument();
    expect(dialog.getByText("CS111")).toBeInTheDocument();
    expect(dialog.getByText(/Sec 030001/)).toBeInTheDocument();

    // กดตัวเลือกเดิมซ้ำต้องไม่ยิง preview ซ้ำ
    await userEvent.click(dialog.getByRole("button", { name: "ชั้นปีที่ 2" }));
    await userEvent.click(dialog.getByRole("button", { name: "ภาคเรียนที่ 1" }));
    expect(applyPlan).toHaveBeenCalledTimes(1);
  });

  it("[UT-UI-03] ไม่มีแผนการเรียนที่ตรงกับตัวเลือก แสดงข้อความว่างและไม่เรียก preview", async () => {
    vi.mocked(getPlans).mockResolvedValue({
      department: "วิทยาการคอมพิวเตอร์",
      studyYear: 1,
      semester: 2,
      plans: [],
      minors: [],
    });

    await renderTimetablePage();
    const dialog = await openPlanModal();

    await userEvent.click(dialog.getByRole("button", { name: "ชั้นปีที่ 1" }));
    await userEvent.click(dialog.getByRole("button", { name: "ภาคเรียนที่ 2" }));

    expect(await dialog.findByText("ยังไม่มีแผนการเรียนสำหรับชั้นปีนี้")).toBeInTheDocument();
    expect(applyPlan).not.toHaveBeenCalled();
    expect(dialog.queryByRole("button", { name: "เพิ่มลงตารางเรียน" })).not.toBeInTheDocument();
    expect(dialog.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("[UT-UI-04] ชั้นปีที่ 3–4 เลือกแผนการศึกษาและวิชาโทได้ และเปลี่ยนกลับเป็นปี 2 จะซ่อนและล้างตัวเลือก", async () => {
    vi.mocked(getPlans).mockImplementation(async ({ studyYear, semester }) =>
      studyYear === 3 ? YEAR_3_SEM1_PLANS : { ...YEAR_2_PLANS, studyYear, semester },
    );
    vi.mocked(applyPlan).mockResolvedValue({
      planId: 22,
      minorId: 3,
      dryRun: true,
      added: [
        {
          courseCode: "CS111",
          courseName: "OBJECT-ORIENTED CONCEPTS AND PROGRAMMING",
          category: "MAJOR",
          credits: 3,
          source: "PLAN",
          sectionId: 201,
          sectionNo: "030001",
        },
        {
          courseCode: "ST216",
          courseName: "STATISTICS FOR SOCIAL SCIENCE 1",
          category: "FREE_ELECTIVE",
          credits: 3,
          source: "MINOR",
          sectionId: 202,
          sectionNo: "040001",
        },
      ],
      skipped: [],
      timetable: null,
    });

    await renderTimetablePage();
    const dialog = await openPlanModal();

    await userEvent.click(dialog.getByRole("button", { name: "ชั้นปีที่ 3" }));
    await userEvent.click(dialog.getByRole("button", { name: "ภาคเรียนที่ 1" }));

    expect(await dialog.findByRole("button", { name: "ทำหัวข้อพิเศษ" })).toBeInTheDocument();
    expect(dialog.getByRole("button", { name: "สหกิจศึกษา" })).toBeInTheDocument();
    expect(dialog.getByText("กรุณาเลือกแผนการศึกษาเพื่อแสดงรายวิชาแนะนำ")).toBeInTheDocument();
    expect(dialog.getByRole("button", { name: "ไม่เรียนวิชาโท" })).toHaveAttribute("aria-pressed", "true");
    // ยังไม่เลือกแผน จึงยังไม่เรียก preview
    expect(applyPlan).not.toHaveBeenCalled();

    await userEvent.click(dialog.getByRole("button", { name: "สหกิจศึกษา" }));
    await waitFor(() =>
      expect(applyPlan).toHaveBeenCalledWith({ planId: 22, academicYear: 2568, dryRun: true }),
    );

    await userEvent.click(dialog.getByRole("button", { name: "วิทยาการข้อมูล" }));
    await waitFor(() =>
      expect(applyPlan).toHaveBeenLastCalledWith({
        planId: 22,
        minorId: 3,
        academicYear: 2568,
        dryRun: true,
      }),
    );
    expect(
      await dialog.findByText("วิชาแนะนำสำหรับ: ชั้นปีที่ 3 ภาคเรียนที่ 1 (แผนสหกิจศึกษา · วิชาโทวิทยาการข้อมูล)"),
    ).toBeInTheDocument();

    // เปลี่ยนกลับเป็นชั้นปีที่ 2 → ซ่อนและล้างตัวเลือกแผน/วิชาโท
    await userEvent.click(dialog.getByRole("button", { name: "ชั้นปีที่ 2" }));
    await waitFor(() => expect(getPlans).toHaveBeenLastCalledWith({ studyYear: 2, semester: 1 }));
    expect(dialog.queryByRole("button", { name: "สหกิจศึกษา" })).not.toBeInTheDocument();
    expect(dialog.queryByRole("button", { name: "ไม่เรียนวิชาโท" })).not.toBeInTheDocument();
    expect(await dialog.findByText("วิชาแนะนำสำหรับ: ชั้นปีที่ 2 ภาคเรียนที่ 1")).toBeInTheDocument();
  });

  it("[UT-UI-05] แสดง preview ครบทั้งรายการ added, skipped ครบ 4 เหตุผล, ป้ายวิชาโท และยังไม่เปลี่ยนตาราง", async () => {
    vi.mocked(getPlans).mockResolvedValue(YEAR_3_SEM1_PLANS);
    vi.mocked(applyPlan).mockResolvedValue({
      planId: 21,
      minorId: 3,
      dryRun: true,
      added: [
        {
          courseCode: "CS180",
          courseName: "DISCRETE STRUCTURES",
          category: "MAJOR",
          credits: 3,
          source: "PLAN",
          sectionId: 301,
          sectionNo: "010001",
        },
        {
          courseCode: "ST216",
          courseName: "STATISTICS FOR SOCIAL SCIENCE 1",
          category: "FREE_ELECTIVE",
          credits: 3,
          source: "MINOR",
          sectionId: 302,
          sectionNo: "040001",
        },
      ],
      skipped: [
        {
          courseCode: "TU100",
          courseName: "CIVIC EDUCATION",
          category: "GENERAL_EDUCATION",
          credits: 3,
          source: "PLAN",
          reason: "COURSE_ALREADY_IN_TIMETABLE",
          existingSectionNo: "780002",
          message: "TU100 อยู่ในตารางแล้ว (Sec 780002)",
        },
        {
          courseCode: "CS223",
          courseName: "COMPUTER ARCHITECTURE",
          category: "MAJOR",
          credits: 3,
          source: "PLAN",
          reason: "NO_SECTION_AVAILABLE",
          message: "CS223 ไม่เปิดสอนในภาคเรียนนี้",
        },
        {
          courseCode: "CS284",
          courseName: "SOFTWARE ENGINEERING",
          category: "MAJOR",
          credits: 3,
          source: "MINOR",
          reason: "TIME_CONFLICT",
          conflictWith: ["CS180"],
          message: "CS284 ทุกกลุ่มเรียนเวลาชนกับ CS180",
        },
        {
          courseCode: "TU109",
          courseName: "INNOVATION",
          category: "GENERAL_EDUCATION",
          credits: 3,
          source: "PLAN",
          reason: "CREDIT_LIMIT_EXCEEDED",
          currentCredits: 21,
          maxCredits: 22,
          message: "TU109 เกินเพดาน 22 หน่วยกิต",
        },
      ],
      timetable: null,
    });

    await renderTimetablePage(buildTimetable([]));
    const dialog = await openPlanModal();

    await userEvent.click(dialog.getByRole("button", { name: "ชั้นปีที่ 3" }));
    await userEvent.click(dialog.getByRole("button", { name: "ภาคเรียนที่ 1" }));
    await userEvent.click(await dialog.findByRole("button", { name: "ทำหัวข้อพิเศษ" }));
    await userEvent.click(dialog.getByRole("button", { name: "วิทยาการข้อมูล" }));

    expect(await dialog.findByText("วิชาที่จะเพิ่มลงตาราง (2 วิชา)")).toBeInTheDocument();
    expect(dialog.getByText(/Sec 010001/)).toBeInTheDocument();
    expect(dialog.getByText("วิชาที่เพิ่มไม่ได้ (4 วิชา)")).toBeInTheDocument();
    expect(dialog.getByText("TU100 อยู่ในตารางแล้ว (Sec 780002)")).toBeInTheDocument();
    expect(dialog.getByText("CS223 ไม่เปิดสอนในภาคเรียนนี้")).toBeInTheDocument();
    expect(dialog.getByText("CS284 ทุกกลุ่มเรียนเวลาชนกับ CS180")).toBeInTheDocument();
    expect(dialog.getByText("TU109 เกินเพดาน 22 หน่วยกิต")).toBeInTheDocument();
    expect(dialog.getAllByText("วิชาโท")).toHaveLength(2);
    // ตารางเดิมยังว่าง (preview ไม่เปลี่ยนตาราง)
    expect(timetableBox().getByText("หน่วยกิต 0 / 22")).toBeInTheDocument();
  });

  it("[UT-UI-06] วิชาที่อยู่ในตารางแล้วไม่ถูกเพิ่มซ้ำทั้งใน preview และหลังยืนยัน", async () => {
    const initial = buildTimetable(["CS111"]);
    const updated = buildTimetable(["CS111", "MA211"]);
    vi.mocked(getPlans).mockResolvedValue(YEAR_2_PLANS);
    vi.mocked(applyPlan)
      .mockResolvedValueOnce({
        planId: 12,
        minorId: null,
        dryRun: true,
        added: [PREVIEW_RESPONSE.added[1]],
        skipped: [
          {
            courseCode: "CS111",
            courseName: "OBJECT-ORIENTED CONCEPTS AND PROGRAMMING",
            category: "MAJOR",
            credits: 3,
            source: "PLAN",
            reason: "COURSE_ALREADY_IN_TIMETABLE",
            existingSectionNo: "030001",
            message: "CS111 อยู่ในตารางแล้ว (Sec 030001)",
          },
        ],
        timetable: null,
      })
      .mockResolvedValueOnce({
        planId: 12,
        minorId: null,
        dryRun: false,
        added: [PREVIEW_RESPONSE.added[1]],
        skipped: [
          {
            courseCode: "CS111",
            courseName: "OBJECT-ORIENTED CONCEPTS AND PROGRAMMING",
            category: "MAJOR",
            credits: 3,
            source: "PLAN",
            reason: "COURSE_ALREADY_IN_TIMETABLE",
            existingSectionNo: "030001",
            message: "CS111 อยู่ในตารางแล้ว (Sec 030001)",
          },
        ],
        timetable: updated,
      });

    await renderTimetablePage(initial);
    const dialog = await openPlanModal();
    await userEvent.click(dialog.getByRole("button", { name: "ชั้นปีที่ 2" }));
    await userEvent.click(dialog.getByRole("button", { name: "ภาคเรียนที่ 1" }));

    expect(await dialog.findByText("CS111 อยู่ในตารางแล้ว (Sec 030001)")).toBeInTheDocument();
    expect(dialog.getByText("วิชาที่จะเพิ่มลงตาราง (1 วิชา)")).toBeInTheDocument();

    await userEvent.click(dialog.getByRole("button", { name: "เพิ่มลงตารางเรียน" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "จัดตารางเรียนตามแผนหลักสูตร" })).not.toBeInTheDocument(),
    );
    expect(timetableBox().getByText("หน่วยกิต 6 / 22")).toBeInTheDocument();
    expect(timetableBox().getAllByText("CS111", { selector: "span" })).toHaveLength(1);
  });

  it("[UT-UI-07] แสดงหน้าต่างเตือนเวลาชนหลังยืนยันและปิดได้ด้วยปุ่มตกลง", async () => {
    const existing = buildTimetable(["LAS101"]);
    const conflictMessage = "CS301 ชนกับ RE468 วันจันทร์ 09:30–12:30";

    vi.mocked(getPlans).mockResolvedValue(YEAR_2_PLANS);
    vi.mocked(applyPlan)
      .mockResolvedValueOnce({
        planId: 12,
        minorId: null,
        dryRun: true,
        added: [],
        skipped: [
          {
            courseCode: "CS301",
            courseName: "SOFTWARE DESIGN",
            category: "MAJOR",
            credits: 3,
            source: "PLAN",
            reason: "TIME_CONFLICT",
            conflictWith: ["RE468"],
            message: conflictMessage,
          },
        ],
        timetable: null,
      })
      .mockResolvedValueOnce({
        planId: 12,
        minorId: null,
        dryRun: false,
        added: [],
        skipped: [
          {
            courseCode: "CS301",
            courseName: "SOFTWARE DESIGN",
            category: "MAJOR",
            credits: 3,
            source: "PLAN",
            reason: "TIME_CONFLICT",
            conflictWith: ["RE468"],
            message: conflictMessage,
          },
        ],
        timetable: existing,
      });

    await renderTimetablePage(existing);
    const dialog = await openPlanModal();
    await userEvent.click(dialog.getByRole("button", { name: "ชั้นปีที่ 2" }));
    await userEvent.click(dialog.getByRole("button", { name: "ภาคเรียนที่ 1" }));

    expect(await dialog.findByText(conflictMessage)).toBeInTheDocument();
    expect(screen.queryByText("ตรวจพบเวลาเรียนซ้อนทับกัน ไม่สามารถเพิ่มได้")).not.toBeInTheDocument();
    expect(applyPlan).toHaveBeenCalledTimes(1);

    await userEvent.click(dialog.getByRole("button", { name: "เพิ่มลงตารางเรียน" }));

    expect(applyPlan).toHaveBeenLastCalledWith({ planId: 12, academicYear: 2568, dryRun: false });
    const conflictDialog = await screen.findByRole("dialog", {
      name: "ตรวจพบเวลาเรียนซ้อนทับกัน ไม่สามารถเพิ่มได้",
    });
    expect(within(conflictDialog).getByText(conflictMessage)).toBeInTheDocument();
    expect(timetableBox().getByText("หน่วยกิต 3 / 22")).toBeInTheDocument();
    expect(timetableBox().queryByText("CS301")).not.toBeInTheDocument();

    await userEvent.click(within(conflictDialog).getByRole("button", { name: "ตกลง" }));
    expect(
      screen.queryByRole("dialog", { name: "ตรวจพบเวลาเรียนซ้อนทับกัน ไม่สามารถเพิ่มได้" }),
    ).not.toBeInTheDocument();
    expect(applyPlan).toHaveBeenCalledTimes(2);
  });

  it("[UT-UI-08] ปิดหน้าต่างได้ทั้งปุ่มยกเลิกและปุ่ม X โดยไม่บันทึก", async () => {
    vi.mocked(getPlans).mockResolvedValue(YEAR_2_PLANS);
    vi.mocked(applyPlan).mockResolvedValue(PREVIEW_RESPONSE);

    await renderTimetablePage();

    // รอบที่ 1: ปิดด้วย ยกเลิก
    const dialog1 = await openPlanModal();
    await userEvent.click(dialog1.getByRole("button", { name: "ชั้นปีที่ 2" }));
    await userEvent.click(dialog1.getByRole("button", { name: "ภาคเรียนที่ 1" }));
    await dialog1.findByText("วิชาที่จะเพิ่มลงตาราง (2 วิชา)");
    await userEvent.click(dialog1.getByRole("button", { name: "ยกเลิก" }));
    expect(screen.queryByRole("dialog", { name: "จัดตารางเรียนตามแผนหลักสูตร" })).not.toBeInTheDocument();

    // รอบที่ 2: ปิดด้วย X
    const dialog2 = await openPlanModal();
    await userEvent.click(dialog2.getByRole("button", { name: "ชั้นปีที่ 2" }));
    await userEvent.click(dialog2.getByRole("button", { name: "ภาคเรียนที่ 1" }));
    await dialog2.findByText("วิชาที่จะเพิ่มลงตาราง (2 วิชา)");
    await userEvent.click(dialog2.getByRole("button", { name: "X" }));
    expect(screen.queryByRole("dialog", { name: "จัดตารางเรียนตามแผนหลักสูตร" })).not.toBeInTheDocument();

    expect(applyPlan).not.toHaveBeenCalledWith(expect.objectContaining({ dryRun: false }));
    expect(timetableBox().getByText("หน่วยกิต 0 / 22")).toBeInTheDocument();
  });

  it("[UT-UI-09] แสดงผลเมื่อไม่มีวิชาเพิ่มได้ (added ว่าง) พร้อมเหตุผลที่ข้ามและไม่ขึ้น error", async () => {
    vi.mocked(getPlans).mockResolvedValue(YEAR_2_PLANS);
    vi.mocked(applyPlan).mockResolvedValue({
      planId: 12,
      minorId: null,
      dryRun: true,
      added: [],
      skipped: [
        {
          courseCode: "CS111",
          courseName: "OBJECT-ORIENTED CONCEPTS AND PROGRAMMING",
          category: "MAJOR",
          credits: 3,
          source: "PLAN",
          reason: "NO_SECTION_AVAILABLE",
          message: "CS111 ไม่เปิดสอนในภาคเรียนนี้",
        },
      ],
      timetable: null,
    });

    await renderTimetablePage();
    const dialog = await openPlanModal();
    await userEvent.click(dialog.getByRole("button", { name: "ชั้นปีที่ 2" }));
    await userEvent.click(dialog.getByRole("button", { name: "ภาคเรียนที่ 1" }));

    expect(await dialog.findByText("วิชาที่จะเพิ่มลงตาราง (0 วิชา)")).toBeInTheDocument();
    expect(dialog.getByText("ไม่มีวิชาที่เพิ่มลงตารางได้ในแผนนี้")).toBeInTheDocument();
    expect(dialog.getByText("CS111 ไม่เปิดสอนในภาคเรียนนี้")).toBeInTheDocument();
    expect(dialog.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("[UT-UI-10] กดเพิ่มลงตารางเรียน ปิดปุ่มระหว่างรอ กันกดซ้ำ และอัปเดตตารางจาก confirm response", async () => {
    let resolveConfirm!: (value: ApplyPlanResponse) => void;
    const confirmedTimetable = buildTimetable(["CS111", "MA211"]);
    vi.mocked(getPlans).mockResolvedValue(YEAR_2_PLANS);
    vi.mocked(applyPlan)
      .mockResolvedValueOnce(PREVIEW_RESPONSE)
      .mockImplementationOnce(
        () => new Promise<ApplyPlanResponse>((resolve) => { resolveConfirm = resolve; }),
      );

    await renderTimetablePage();
    const dialog = await openPlanModal();
    await userEvent.click(dialog.getByRole("button", { name: "ชั้นปีที่ 2" }));
    await userEvent.click(dialog.getByRole("button", { name: "ภาคเรียนที่ 1" }));
    await dialog.findByText("วิชาที่จะเพิ่มลงตาราง (2 วิชา)");

    const confirmBtn = dialog.getByRole("button", { name: "เพิ่มลงตารางเรียน" });
    await userEvent.click(confirmBtn);

    expect(confirmBtn).toBeDisabled();
    expect(confirmBtn).toHaveTextContent("กำลังเพิ่มลงตาราง…");
    await userEvent.click(confirmBtn);
    expect(applyPlan).toHaveBeenCalledTimes(2); // 1 preview + 1 confirm

    await act(async () => {
      resolveConfirm({
        ...PREVIEW_RESPONSE,
        dryRun: false,
        timetable: confirmedTimetable,
      });
    });

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "จัดตารางเรียนตามแผนหลักสูตร" })).not.toBeInTheDocument(),
    );
    expect(timetableBox().getByText("หน่วยกิต 6 / 22")).toBeInTheDocument();
    expect(timetableBox().getByText("CS111", { selector: "span" })).toBeInTheDocument();
    expect(timetableBox().getByText("MA211", { selector: "span" })).toBeInTheDocument();
  });

  it("[UT-UI-11] จัดการ error ขณะโหลดแผนหรือขอ preview และ retry สำเร็จ", async () => {
    vi.mocked(getPlans)
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(YEAR_2_PLANS);
    vi.mocked(applyPlan)
      .mockRejectedValueOnce(new ApiError({ status: 500, detail: "Internal server error" }))
      .mockResolvedValueOnce(PREVIEW_RESPONSE);

    await renderTimetablePage();
    const dialog = await openPlanModal();

    await userEvent.click(dialog.getByRole("button", { name: "ชั้นปีที่ 2" }));
    await userEvent.click(dialog.getByRole("button", { name: "ภาคเรียนที่ 1" }));

    // error ตอนโหลดแผน
    expect(await dialog.findByRole("alert")).toHaveTextContent("โหลดแผนการเรียนไม่สำเร็จ");
    expect(dialog.queryByText(/Error:|TypeError/)).not.toBeInTheDocument();
    await userEvent.click(dialog.getByRole("button", { name: "ลองใหม่" }));

    // โหลดแผนสำเร็จ แต่ preview ล้มเหลว
    expect(await dialog.findByRole("alert")).toHaveTextContent("Internal server error");
    expect(dialog.queryByText("CS111")).not.toBeInTheDocument();
    await userEvent.click(dialog.getByRole("button", { name: "ลองใหม่" }));

    expect(await dialog.findByText("วิชาที่จะเพิ่มลงตาราง (2 วิชา)")).toBeInTheDocument();
    expect(dialog.getByText("CS111")).toBeInTheDocument();
  });

  it("[UT-UI-12] จัดการ error ขณะเพิ่มวิชาลงตาราง คงตารางเดิม และ retry สำเร็จ", async () => {
    const existing = buildTimetable(["CS180"]);
    const updated = buildTimetable(["CS180", "CS111", "MA211"]);
    vi.mocked(getPlans).mockResolvedValue(YEAR_2_PLANS);
    vi.mocked(applyPlan)
      .mockResolvedValueOnce(PREVIEW_RESPONSE)
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({ ...PREVIEW_RESPONSE, dryRun: false, timetable: updated });

    await renderTimetablePage(existing);
    const dialog = await openPlanModal();
    await userEvent.click(dialog.getByRole("button", { name: "ชั้นปีที่ 2" }));
    await userEvent.click(dialog.getByRole("button", { name: "ภาคเรียนที่ 1" }));
    await dialog.findByText("วิชาที่จะเพิ่มลงตาราง (2 วิชา)");

    await userEvent.click(dialog.getByRole("button", { name: "เพิ่มลงตารางเรียน" }));

    expect(await dialog.findByRole("alert")).toHaveTextContent("เพิ่มวิชาตามแผนไม่สำเร็จ");
    expect(timetableBox().getByText("หน่วยกิต 3 / 22")).toBeInTheDocument();
    expect(timetableBox().getByText("CS180", { selector: "span" })).toBeInTheDocument();

    const retryBtn = dialog.getByRole("button", { name: "เพิ่มลงตารางเรียน" });
    expect(retryBtn).toBeEnabled();
    await userEvent.click(retryBtn);

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "จัดตารางเรียนตามแผนหลักสูตร" })).not.toBeInTheDocument(),
    );
    expect(timetableBox().getByText("หน่วยกิต 9 / 22")).toBeInTheDocument();
  });

  it("[UT-UI-13] เปลี่ยนภาคเรียนแล้วคง planType และคง/ล้าง minorId ตามวิชาโทของภาคใหม่", async () => {
    // กรณีที่ 1: ภาค 2 ยังมี minorId: 3
    vi.mocked(getPlans).mockImplementation(async ({ semester }) =>
      semester === 1 ? YEAR_3_SEM1_PLANS : YEAR_3_SEM2_PLANS_WITH_MINOR,
    );
    vi.mocked(applyPlan).mockResolvedValue({
      planId: 32,
      minorId: 3,
      dryRun: true,
      added: [],
      skipped: [],
      timetable: null,
    });

    await renderTimetablePage();
    const dialog1 = await openPlanModal();
    await userEvent.click(dialog1.getByRole("button", { name: "ชั้นปีที่ 3" }));
    await userEvent.click(dialog1.getByRole("button", { name: "ภาคเรียนที่ 1" }));
    await userEvent.click(await dialog1.findByRole("button", { name: "สหกิจศึกษา" }));
    await userEvent.click(dialog1.getByRole("button", { name: "วิทยาการข้อมูล" }));
    await waitFor(() =>
      expect(applyPlan).toHaveBeenLastCalledWith({
        planId: 22,
        minorId: 3,
        academicYear: 2568,
        dryRun: true,
      }),
    );

    await userEvent.click(dialog1.getByRole("button", { name: "ภาคเรียนที่ 2" }));
    await waitFor(() =>
      expect(applyPlan).toHaveBeenLastCalledWith({
        planId: 32,
        minorId: 3,
        academicYear: 2568,
        dryRun: true,
      }),
    );
    expect(
      await dialog1.findByText("วิชาแนะนำสำหรับ: ชั้นปีที่ 3 ภาคเรียนที่ 2 (แผนสหกิจศึกษา · วิชาโทวิทยาการข้อมูล)"),
    ).toBeInTheDocument();
    await userEvent.click(dialog1.getByRole("button", { name: "ยกเลิก" }));

    // กรณีที่ 2: ภาค 2 ไม่มี minorId: 3 → ล้างกลับเป็น ไม่เรียนวิชาโท และไม่ส่ง minorId เดิม
    vi.mocked(getPlans).mockImplementation(async ({ semester }) =>
      semester === 1 ? YEAR_3_SEM1_PLANS : YEAR_3_SEM2_PLANS_WITHOUT_MINOR3,
    );
    vi.mocked(applyPlan).mockClear();

    const dialog2 = await openPlanModal();
    await userEvent.click(dialog2.getByRole("button", { name: "ชั้นปีที่ 3" }));
    await userEvent.click(dialog2.getByRole("button", { name: "ภาคเรียนที่ 1" }));
    await userEvent.click(await dialog2.findByRole("button", { name: "สหกิจศึกษา" }));
    await userEvent.click(dialog2.getByRole("button", { name: "วิทยาการข้อมูล" }));
    await waitFor(() =>
      expect(applyPlan).toHaveBeenLastCalledWith({
        planId: 22,
        minorId: 3,
        academicYear: 2568,
        dryRun: true,
      }),
    );

    await userEvent.click(dialog2.getByRole("button", { name: "ภาคเรียนที่ 2" }));
    await waitFor(() =>
      expect(applyPlan).toHaveBeenLastCalledWith({
        planId: 32,
        academicYear: 2568,
        dryRun: true,
      }),
    );
    expect(dialog2.getByRole("button", { name: "ไม่เรียนวิชาโท" })).toHaveAttribute("aria-pressed", "true");
    expect(
      await dialog2.findByText("วิชาแนะนำสำหรับ: ชั้นปีที่ 3 ภาคเรียนที่ 2 (แผนสหกิจศึกษา)"),
    ).toBeInTheDocument();
  });
});
