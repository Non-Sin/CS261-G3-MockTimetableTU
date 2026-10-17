import type {
  CourseCategory,
  DayOfWeek,
  ScheduleSlot,
} from "@/features/courses/types";

// ข้อมูลรายวิชาและกลุ่มเรียนหนึ่งรายการที่ถูกเพิ่มลงในตาราง
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

// รายละเอียดช่วงเวลาที่รายวิชาอย่างน้อยสองวิชาเรียนทับกันในวันเดียวกัน
export type TimeConflict = {
  dayOfWeek: DayOfWeek;
  overlapStart: string;
  overlapEnd: string;
  courseCodes: string[];
};

// ข้อมูลตารางเรียนรวมวิชา หน่วยกิต และผลตรวจเวลาชน
export type Timetable = {
  academicYear: number;
  semester: number;
  entries: TimetableEntry[];
  totalCredits: number;
  maxCredits: number;
  conflicts: TimeConflict[];
  updatedAt: string | null;
};

// Body สำหรับเพิ่มกลุ่มเรียนลงในตารางตาม API Spec
export type AddTimetableEntryRequest  = {
  sectionId: number;
};

// รหัสข้อผิดพลาดที่ frontend ใช้แยกข้อความตอบกลับจาก API
export type TimetableErrorCode =
  | "COURSE_ALREADY_IN_TIMETABLE"
  | "CREDIT_LIMIT_EXCEEDED";
