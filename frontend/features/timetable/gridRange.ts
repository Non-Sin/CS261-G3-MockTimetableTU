import type { DayOfWeek } from "../courses/types";

// ขอบเขตวันและเวลาของ Grid ตาม API Spec ไม่ได้อนุมานจากวิชาที่เลือก
// ตารางจึงมีหน้าตา/ช่วงเวลาเดิมแม้ยังไม่มีข้อมูล และจุดแก้ spec อยู่รวมกันในไฟล์นี้
export const GRID_DAYS: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

export const GRID_START_HOUR = 8;
export const GRID_END_HOUR = 21;

// สร้างคอลัมน์รายชั่วโมง โดย 20:00 คือช่วง 20:00–21:00
export const GRID_HOURS = Array.from(
  { length: GRID_END_HOUR - GRID_START_HOUR },
  (_, index) => GRID_START_HOUR + index,
);
