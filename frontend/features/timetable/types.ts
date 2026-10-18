import type {
  CourseCategory,
  DayOfWeek,
  ScheduleSlot,
} from "@/features/courses/types";

// Snapshot ของวิชา/section ที่ผู้ใช้เพิ่มลงตาราง; schedules มาจาก section ที่เลือก
// UI ใช้ข้อมูลนี้วาด Grid และรายการวิชา โดยไม่ต้องกลับไปค้นรายละเอียดจาก Course อีกครั้ง
export type TimetableEntry = {
  entryId: number;
  courseCode: string;
  courseName: string;
  category: CourseCategory;
  credits: number;
  sectionId: number;
  sectionNo: string;
  schedules: ScheduleSlot[];
  conflictWith: string[];
};

// ผลลัพธ์จากการตรวจเวลาชน มีรูปแบบเดียวกับ conflicts ใน Timetable API response
export type TimeConflict = {
  dayOfWeek: DayOfWeek;
  overlapStart: string;
  overlapEnd: string;
  courseCodes: string[];
};

// รูปแบบ response หลักของตารางจาก backend; ใช้เป็นแหล่งข้อมูลให้ Grid/สรุปหน่วยกิต/คำเตือน
export type Timetable = {
  academicYear: number;
  semester: number;
  entries: TimetableEntry[];
  totalCredits: number;
  maxCredits: number;
  conflicts: TimeConflict[];
  updatedAt: string | null;
};

// Body ที่ frontend ส่งไป endpoint เพิ่มรายการตาราง; backend ระบุวิชาจาก sectionId
export type AddTimetableEntryRequest  = {
  sectionId: number;
};

// รหัสข้อผิดพลาดตาม API ที่ frontend ใช้เลือกข้อความหรือพฤติกรรมตอบสนองเฉพาะกรณี
export type TimetableErrorCode =
  | "COURSE_ALREADY_IN_TIMETABLE"
  | "CREDIT_LIMIT_EXCEEDED";
