// ชุดรหัสวันตามรูปแบบข้อมูลของรายวิชาและตารางเรียน
export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

// หมวดวิชาที่ใช้จัดประเภทและกรองรายวิชา
export type CourseCategory =
  | "MAJOR"
  | "GENERAL_EDUCATION"
  | "FREE_ELECTIVE";

// คาบเรียนหนึ่งช่วง พร้อมวัน เวลา และห้องเรียน
export type ScheduleSlot = {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  room: string;
};

// กลุ่มเรียนของรายวิชา ซึ่งอาจมีหลายคาบในสัปดาห์
export type Section = {
  sectionId: number;
  sectionNo: string;
  instructor: string;
  schedules: ScheduleSlot[];
};

// ข้อมูลรายวิชาและกลุ่มเรียนที่เปิดสอน
export type Course = {
  courseCode: string;
  courseName: string;
  category: CourseCategory;
  credits: number;
  sections: Section[];
};
