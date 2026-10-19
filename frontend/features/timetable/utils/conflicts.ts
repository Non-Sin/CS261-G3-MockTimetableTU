import type { DayOfWeek } from "../../courses/types";
import type { TimetableEntry, TimeConflict } from "../types";
import { toMinutes } from "./time";

export type ConflictGroup = {
  dayOfWeek: DayOfWeek;
  overlapStart: string;
  overlapEnd: string;
  courseCodes: Set<string>;
  courses: TimetableEntry[];
};

// รับ entries จาก hook (ปัจจุบันถูกสร้างจาก mock; ภายหลังมาจาก API) แล้วตรวจทุกคู่
// เปรียบเทียบทุกคาบของแต่ละคู่ เพราะวิชาหนึ่งมีได้หลายวัน/หลายช่วงในสัปดาห์
export const findConflicts = (entries: TimetableEntry[]): TimeConflict[] =>
  entries.flatMap((entry, index) =>
    entries.slice(index + 1).flatMap((otherEntry) =>
      entry.schedules.flatMap((firstSlot) =>
        otherEntry.schedules.flatMap((secondSlot) => {
          const overlaps =
            // เงื่อนไขช่วงแบบ half-open: คาบที่คาบหนึ่งจบตรงกับอีกคาบเริ่มถือว่าไม่ชน
            firstSlot.dayOfWeek === secondSlot.dayOfWeek &&
            toMinutes(firstSlot.startTime) < toMinutes(secondSlot.endTime) &&
            toMinutes(secondSlot.startTime) < toMinutes(firstSlot.endTime);

          if (!overlaps) return [];

          return [{
            dayOfWeek: firstSlot.dayOfWeek,
            overlapStart:
              firstSlot.startTime >= secondSlot.startTime
                ? firstSlot.startTime
                : secondSlot.startTime,
            overlapEnd:
              firstSlot.endTime <= secondSlot.endTime
                ? firstSlot.endTime
                : secondSlot.endTime,
            courseCodes: [entry.courseCode, otherEntry.courseCode],
          }];
        }),
      ),
    ),
  );

// รวมผลชนจาก findConflicts ที่มีวันและขอบเขตเวลาเดียวกัน ให้ Grid วาดเป็นกลุ่มเดียว
// Set เก็บรหัสวิชาไม่ซ้ำ เมื่อมีหลายคู่ชนในช่วงเดียวกัน; courses ใช้รายละเอียดวิชาในการวาด
// การจัดกลุ่มอาศัยช่วงที่ตรงกันพอดี เพื่อให้แต่ละกลุ่มแทนบล็อกเวลาเดียวที่แสดงบน Grid
export const groupConflicts = (
  entries: TimetableEntry[],
  conflicts: TimeConflict[],
): ConflictGroup[] =>
  conflicts
    .reduce<Omit<ConflictGroup, "courses">[]>((groups, conflict) => {
      const group = groups.find(
        (item) =>
          item.dayOfWeek === conflict.dayOfWeek &&
          item.overlapStart === conflict.overlapStart &&
          item.overlapEnd === conflict.overlapEnd,
      );

      if (group) {
        conflict.courseCodes.forEach((code) => group.courseCodes.add(code));
      } else {
        groups.push({
          dayOfWeek: conflict.dayOfWeek,
          overlapStart: conflict.overlapStart,
          overlapEnd: conflict.overlapEnd,
          courseCodes: new Set(conflict.courseCodes),
        });
      }

      return groups;
    }, [])
    .map((group) => ({
      ...group,
      courses: entries.filter((entry) => group.courseCodes.has(entry.courseCode)),
    }));
