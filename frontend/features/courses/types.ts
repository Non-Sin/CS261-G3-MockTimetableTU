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

// รูปแบบข้อมูลหนึ่งคาบจาก Course/Timetable API; startTime/endTime ใช้รูป HH:mm
// รายการนี้ถูกใช้ทั้งแสดงรายละเอียดใน CourseCard และวางตำแหน่งใน TimetableGrid
export type ScheduleSlot = {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  room: string;
};

// Section ที่ผู้ใช้เลือกเพิ่ม: หนึ่ง section อาจมีหลาย ScheduleSlot หลายวัน
// CourseCard ส่ง sectionId กลับไปยัง hook; hook นำ schedules ของ section นี้ลงตาราง
export type Section = {
  sectionId: number;
  sectionNo: string;
  instructor: string;
  schedules: ScheduleSlot[];
};

// รูปแบบกลางของข้อมูลวิชา ใช้ร่วมกันได้ทั้งข้อมูลจำลองและ response จาก courses API
export type Course = {
  courseCode: string;
  courseName: string;
  category: CourseCategory;
  credits: number;
  sections: Section[];
};
