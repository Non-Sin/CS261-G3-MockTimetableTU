import type { DayOfWeek } from "../courses/types";
import type { TimetableEntry } from "./types";

// ลำดับวันสำหรับแสดงแถวในตารางเรียน
const DAYS: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

// ช่วงเริ่มต้นของ grid เมื่อยังไม่มีวิชา หรือมีวิชาอยู่ในช่วงมาตรฐาน
const DEFAULT_FIRST_DAY = 0;
const DEFAULT_LAST_DAY = 4;
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 17;

// แปลงเวลา HH:mm เป็นนาทีเพื่อคำนวณขอบเขตของ grid
const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// คืนวันและชั่วโมงที่ grid ต้องแสดง โดยขยายช่วงเมื่อมีคาบนอกช่วงมาตรฐาน
export const getGridRange = (entries: TimetableEntry[]) => {
  const slots = entries.flatMap((entry) => entry.schedules);
  const dayIndexes = slots.map((slot) => DAYS.indexOf(slot.dayOfWeek));

  const firstDay = Math.min(DEFAULT_FIRST_DAY, ...dayIndexes);
  const lastDay = Math.max(DEFAULT_LAST_DAY, ...dayIndexes);

  const startHour = Math.min(
    DEFAULT_START_HOUR,
    ...slots.map((slot) => Math.floor(toMinutes(slot.startTime) / 60)),
  );

  const endHour = Math.max(
    DEFAULT_END_HOUR,
    ...slots.map((slot) => Math.ceil(toMinutes(slot.endTime) / 60)),
  )

  return {
    days: DAYS.slice(firstDay, lastDay + 1),
    hours: Array.from(
      { length: endHour - startHour},
      (_, index) => startHour + index,
    ),
  };
}
