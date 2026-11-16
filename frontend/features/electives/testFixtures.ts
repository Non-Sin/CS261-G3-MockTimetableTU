import type { ElectiveDetail, ElectiveSummary } from "./types";
import type { Timetable } from "../timetable/types";

// ข้อมูลเฉพาะ unit tests ตามตัวอย่าง T05 ไม่ใช้แทน response จริงในหน้าเว็บ
export const frenchSummary: ElectiveSummary = {
  courseCode: "FR205",
  courseName: "FRENCH FOR EVERYDAY LIFE",
  courseNameTh: "ภาษาฝรั่งเศสในชีวิตประจำวัน",
  credits: 3,
  group: "LANGUAGE",
  requiresQuota: true,
  offeredSemesters: [1],
  tags: ["KIND_INSTRUCTOR", "NO_PREREQUISITE"],
};

export const psychologySummary: ElectiveSummary = {
  courseCode: "PY250",
  courseName: "PSYCHOLOGY OF PERSONALITY AND ADJUSTMENT",
  courseNameTh: "จิตวิทยาบุคลิกภาพและการปรับตน",
  credits: 3,
  group: "PSYCHOLOGY",
  requiresQuota: false,
  offeredSemesters: [1, 2],
  tags: ["NO_ATTENDANCE", "NO_GROUP_WORK"],
};

export const frenchDetail: ElectiveDetail = {
  ...frenchSummary,
  description: ["เรียนภาษาฝรั่งเศสระดับ A2 ไม่มีพื้นฐานเรียนได้", "มีแบบฝึกหัดในชั้นเรียน"],
  // ตั้งใจส่ง Sec 260002 มาก่อน เพื่อพิสูจน์ว่าการเลือกเริ่มต้นเรียงตาม sectionNo
  sections: [
    {
      sectionId: 602,
      sectionNo: "260002",
      semester: 1,
      instructor: "อาจารย์คนที่สอง",
      selectable: true,
      inTimetable: false,
      conflictWith: [],
      schedules: [
        {
          dayOfWeek: "TUESDAY",
          startTime: "16:30",
          endTime: "18:00",
          room: "SC3-M11",
        },
      ],
    },
    {
      sectionId: 601,
      sectionNo: "260001",
      semester: 1,
      instructor: "อาจารย์คนแรก",
      selectable: true,
      inTimetable: false,
      conflictWith: [],
      schedules: [
        {
          dayOfWeek: "TUESDAY",
          startTime: "16:30",
          endTime: "18:00",
          room: "SC3-M10",
        },
        {
          dayOfWeek: "THURSDAY",
          startTime: "16:30",
          endTime: "18:00",
          room: "SC3-M10",
        },
      ],
    },
  ],
};

export const psychologyDetail: ElectiveDetail = {
  ...psychologySummary,
  description: ["เรียนรู้เรื่องบุคลิกภาพและการปรับตัว", "ไม่มีงานกลุ่ม"],
  sections: [
    {
      sectionId: 611,
      sectionNo: "820001",
      semester: 1,
      instructor: "อาจารย์จิตวิทยา",
      selectable: true,
      inTimetable: false,
      conflictWith: ["CS111"],
      schedules: [
        {
          dayOfWeek: "MONDAY",
          startTime: "13:30",
          endTime: "16:30",
          room: "LC1-201",
        },
      ],
    },
    {
      sectionId: 640,
      sectionNo: "230001",
      semester: 2,
      instructor: null,
      selectable: false,
      inTimetable: false,
      conflictWith: [],
      schedules: [
        {
          dayOfWeek: "TUESDAY",
          startTime: "09:30",
          endTime: "12:30",
          room: null,
        },
      ],
    },
  ],
};

export const emptyTimetable: Timetable = {
  academicYear: 2568,
  semester: 1,
  entries: [],
  totalCredits: 0,
  maxCredits: 22,
  conflicts: [],
  updatedAt: null,
};

export function timetableWithCourse(
  course: ElectiveDetail,
  sectionId: number,
): Timetable {
  const section = course.sections.find((item) => item.sectionId === sectionId)!;
  return {
    ...emptyTimetable,
    totalCredits: course.credits,
    updatedAt: "2026-11-16T00:00:00Z",
    entries: [
      {
        entryId: 900,
        courseCode: course.courseCode,
        courseName: course.courseName,
        category: "FREE_ELECTIVE",
        credits: course.credits,
        sectionId,
        sectionNo: section.sectionNo,
        schedules: section.schedules,
        conflictWith: [],
      },
    ],
  };
}

// jsdom ยังไม่ทำงานของ native dialog; จำลองเฉพาะ open/close สำหรับ component tests
export function installDialogMock() {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = false;
    },
  });
}
