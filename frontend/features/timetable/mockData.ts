import { mockCourses } from "../courses/mockData";
import type { Timetable, TimetableEntry } from "./types";

// เลือกรายวิชาตัวอย่างสำหรับสร้างข้อมูลตารางจำลอง
const selectedCourseCodes = [
  "CS180",
  "MA211",
  "LAS101",
  "TU101",
  "TU106",
  "CS111",
];

// สร้างรายการในตารางจากกลุ่มแรกของแต่ละวิชาที่เลือกไว้
const entries: TimetableEntry[] = mockCourses.filter((course) => selectedCourseCodes.includes(course.courseCode)).map((course, index) => {
  const section = course.sections[0];

  return {
    entryId: index + 1,
    courseCode: course.courseCode,
    courseName: course.courseName,
    category: course.category,
    credits: course.credits,
    sectionId: section.sectionId,
    sectionNo: section.sectionNo,
    schedules: section.schedules,
    conflictWith: [],
  };
});

// ตารางจำลองสำหรับพัฒนาหน้า frontend ระหว่างรอข้อมูลจาก backend
export const mockTimetable: Timetable = {
  academicYear: 2568,
  semester: 1,
  entries,
  totalCredits: entries.reduce((total, entry) => total + entry.credits, 0),
  maxCredits: 22,
  conflicts: [],
  updatedAt: "2026-10-13T11:20:05+07:00",
};
