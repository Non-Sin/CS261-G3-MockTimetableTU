import { DAY_NAMES } from "../../courses/dayNames";
import {
  GRID_DAYS,
  GRID_END_HOUR,
  GRID_HOURS,
  GRID_START_HOUR,
} from "../gridRange";
import type { TimetableEntry, TimeConflict } from "../types";
import { groupConflicts } from "../utils/conflicts";
import { toMinutes } from "../utils/time";

type TimetableGridProps = {
  entries: TimetableEntry[];
  conflicts: TimeConflict[];
  totalCredits: number;
  maxCredits: number;
};

// รับข้อมูลที่ hook คำนวณแล้วผ่าน props: entries เป็นคาบที่จะวาด, conflicts เป็นผลตรวจเวลาชน
// และหน่วยกิตใช้แสดงสรุปด้านบน/ล่าง; component นี้รับผิดชอบการจัดวางและแสดงผลเท่านั้น
const TimetableGrid = ({
  entries,
  conflicts,
  totalCredits,
  maxCredits,
}: TimetableGridProps) => {
  // รวมคู่เวลาชนที่ช่วงตรงกันพอดีให้เป็นกลุ่มเดียวสำหรับวาดแถบสีแดงทับบล็อกวิชา
  const conflictGroups = groupConflicts(entries, conflicts);
  // คอลัมน์พื้นหลังและหัวชั่วโมงใช้จำนวนช่องเดียวกัน เพื่อให้แนวเส้นเวลาเรียงตรงกัน
  const trackStyle = {
    gridTemplateColumns: `repeat(${GRID_HOURS.length}, minmax(72px, 1fr))`,
  };
  const timelineStart = GRID_START_HOUR * 60;
  const timelineMinutes = (GRID_END_HOUR - GRID_START_HOUR) * 60;

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold">ตารางเรียนจำลอง</h2>
        <p className="text-sm text-slate-600">
          หน่วยกิต {totalCredits} / {maxCredits}
        </p>
      </div>

      {entries.length === 0 && (
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
          ยังไม่มีวิชาในตาราง ค้นหารายวิชาด้านล่างแล้วกด “เพิ่มวิชา” เพื่อเริ่มจัดตาราง
        </p>
      )}

      {entries.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {entries.map((entry) => (
            <span
              key={entry.courseCode}
              className="rounded-full border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800"
            >
              {entry.courseCode}
            </span>
          ))}

          {conflicts.length > 0 && (
            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
              ⚠ ชนกัน: {Array.from(
                new Set(conflicts.flatMap((conflict) => conflict.courseCodes)),
              ).join(" และ ")}
            </span>
          )}
        </div>
      )}

      <div className="mt-6 overflow-x-auto">
        <div className="min-w-200 space-y-2">
          <div className="grid grid-cols-[64px_1fr] gap-2">
            <div className="self-center text-center text-xs text-slate-400">
              วัน \ เวลา
            </div>
            <div className="grid gap-2" style={trackStyle}>
              {GRID_HOURS.map((hour) => (
                <div
                  key={hour}
                  className="rounded-lg bg-slate-100 py-2 text-center text-xs font-semibold text-slate-500"
                >
                  {String(hour).padStart(2, "0")}:00
                </div>
              ))}
            </div>
          </div>

          {GRID_DAYS.map((day) => (
            <div key={day} className="grid grid-cols-[64px_1fr] gap-2">
              <div className="flex min-h-16 flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold">
                {DAY_NAMES[day]}
                <span className="text-[10px] text-slate-400">{day.slice(0, 3)}</span>
              </div>

              <div className="relative min-h-16">
                <div
                  className="pointer-events-none absolute inset-0 z-0 grid gap-2"
                  style={trackStyle}
                >
                  {GRID_HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="rounded-xl border border-slate-100 bg-slate-50"
                    />
                  ))}
                </div>

                {/* กรองคาบของแต่ละวิชาให้เหลือเฉพาะวันปัจจุบัน แล้วแปลงเวลาเป็นตำแหน่งแนวนอน */}
                {entries.flatMap((entry) =>
                  entry.schedules
                    .filter((slot) => slot.dayOfWeek === day)
                    .map((slot, index) => {
                      const start = toMinutes(slot.startTime);
                      const end = toMinutes(slot.endTime);
                      // left/width เป็นเปอร์เซ็นต์ของช่วง 08:00–21:00 จึงวางคาบตามเวลาจริงได้
                      const left = ((start - timelineStart) / timelineMinutes) * 100;
                      const width = ((end - start) / timelineMinutes) * 100;

                      return (
                        <div
                          key={`${entry.entryId}-${day}-${index}`}
                          className="absolute inset-y-0 z-10 overflow-hidden rounded-lg border border-blue-300 bg-blue-50 px-2 py-1.5 text-[11px] leading-tight text-blue-950"
                          style={{ left: `${left}%`, width: `${width}%` }}
                        >
                          <strong>{entry.courseCode}</strong>
                          <div>{slot.startTime}-{slot.endTime}</div>
                          <div>{slot.room}</div>
                        </div>
                      );
                    }),
                )}

                {/* วาดกลุ่มเวลาชนชั้นบนบล็อกปกติ เพื่อให้ผู้ใช้เห็นช่วงที่ต้องแก้ชัดเจน */}
                {conflictGroups
                  .filter((group) => group.dayOfWeek === day)
                  .map((group) => {
                    const start = toMinutes(group.overlapStart);
                    const end = toMinutes(group.overlapEnd);
                    // ใช้สูตรตำแหน่งเดียวกับคาบปกติ เพื่อให้กรอบชนครอบเฉพาะช่วงที่ทับกัน
                    const left = ((start - timelineStart) / timelineMinutes) * 100;
                    const width = ((end - start) / timelineMinutes) * 100;

                    return (
                      <div
                        key={`${group.dayOfWeek}-${group.overlapStart}-${group.overlapEnd}`}
                        className="absolute inset-y-0 z-20 flex flex-col overflow-hidden rounded-lg border border-red-500 bg-red-50 text-red-950"
                        style={{ left: `${left}%`, width: `${width}%` }}
                      >
                        <div className="shrink-0 bg-red-600 px-2 py-1 text-[9px] font-bold text-white">
                          เวลาชนกัน {group.overlapStart}-{group.overlapEnd} · {group.courses.length} วิชา
                        </div>

                        <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-red-200">
                          {group.courses.map((entry) => {
                            const slot = entry.schedules.find(
                              (item) =>
                                item.dayOfWeek === day &&
                                toMinutes(item.startTime) < end &&
                                toMinutes(item.endTime) > start,
                            );

                            if (!slot) return null;

                            return (
                              <div
                                key={entry.entryId}
                                className="min-w-0 px-2 py-1 text-[9px] leading-tight"
                              >
                                <strong>{entry.courseCode}</strong>
                                <div>{group.overlapStart}-{group.overlapEnd}</div>
                                <div>{slot.room}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <p className="text-sm font-semibold text-rose-600">
          วิชาในตารางเรียน: {entries.length} วิชา ({totalCredits.toFixed(1)} หน่วยกิต)
        </p>
      </div>
    </section>
  );
};

export default TimetableGrid;
