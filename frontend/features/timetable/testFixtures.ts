import { mockCourses } from "../courses/mockData";
import type { TimeConflict, Timetable, TimetableEntry } from "./types";

// ข้อมูลตารางสำหรับ unit test สร้างจากรายวิชาจำลองของ US1 (กลุ่มเรียนแรกของแต่ละวิชา)

// 6 วิชา 18 หน่วยกิต ตามหน้า "ตารางเรียนจำลอง" ใน UI Prototype
export const SIX_COURSES = ["CS180", "MA211", "CS111", "LAS101", "TU101", "TU106"];

// CS102 Sec 030001 เรียนอังคาร/พฤหัสบดี 11:00-12:30 ชนกับ CS111
export const CS111_CS102_CONFLICTS: TimeConflict[] = [
  { dayOfWeek: "TUESDAY", overlapStart: "11:00", overlapEnd: "12:30", courseCodes: ["CS111", "CS102"] },
  { dayOfWeek: "THURSDAY", overlapStart: "11:00", overlapEnd: "12:30", courseCodes: ["CS111", "CS102"] },
];

export const findCourse = (courseCode: string) => {
  const course = mockCourses.find((item) => item.courseCode === courseCode);
  if (!course) throw new Error(`ไม่มี ${courseCode} ในข้อมูลจำลอง`);
  return course;
};

const toEntry = (courseCode: string, index: number): TimetableEntry => {
  const course = findCourse(courseCode);
  const section = course.sections[0];

  return {
    entryId: index + 1,
    courseCode,
    courseName: course.courseName,
    category: course.category,
    credits: course.credits,
    sectionId: section.sectionId,
    sectionNo: section.sectionNo,
    schedules: section.schedules,
    conflictWith: [],
  };
};

// ตารางตามรูปที่ GET /api/timetable ตอบ ค่าเริ่มต้นคือภาค 1/2568
export const buildTimetable = (courseCodes: string[], overrides: Partial<Timetable> = {}): Timetable => {
  const entries = courseCodes.map(toEntry);

  return {
    academicYear: 2568,
    semester: 1,
    entries,
    totalCredits: entries.reduce((total, entry) => total + entry.credits, 0),
    maxCredits: 22,
    conflicts: [],
    updatedAt: entries.length > 0 ? "2026-10-17T10:00:00+07:00" : null,
    ...overrides,
  };
};
