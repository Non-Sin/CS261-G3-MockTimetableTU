import { DAY_NAMES } from "../../courses/dayNames";
import type { TimetableEntry } from "../types";

type AddedCoursesListProps = {
  entries: TimetableEntry[];
  // ไม่ส่งมา = ยังลบไม่ได้ (รอ API ลบวิชาของ US2) ปุ่มลบจะเป็น disabled
  onRemove?: (courseCode: string) => void;
};

// entries ถูกส่งมาจาก hook ผ่าน Timetable; รายการนี้แสดง section และคาบที่เลือกไว้
// เมื่อกดลบจะส่ง courseCode กลับผ่าน onRemove เพื่อให้ reducer เอารายการออกจาก state
const AddedCoursesList = ({ entries, onRemove }: AddedCoursesListProps) => (
  <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
    <h2 className="text-xl font-bold">วิชาที่เพิ่มแล้ว</h2>
    {entries.length === 0 ? (
      <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
        ยังไม่มีวิชาในตาราง
      </p>
    ) : (
      <div className="mt-4 space-y-3">
        {entries.map((entry) => (
          <article
            key={entry.courseCode}
            className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-bold">{entry.courseCode}</p>
              <p className="text-sm text-slate-600">{entry.courseName}</p>
              <p className="mt-1 text-xs text-slate-500">
                Sec {entry.sectionNo} · {entry.credits} หน่วยกิต
              </p>

              {/* วิชาหนึ่งอาจมีหลายคาบ จึงแสดงทุก ScheduleSlot ไม่ใช่เฉพาะวันเดียว */}
              {entry.schedules.map((slot, index) => (
                <p
                  key={`${slot.dayOfWeek}-${index}`}
                  className="mt-1 text-xs text-slate-500"
                >
                  {DAY_NAMES[slot.dayOfWeek]} {slot.startTime}-{slot.endTime}
                  {" · ห้อง"}
                  {slot.room}
                </p>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onRemove?.(entry.courseCode)}
              disabled={!onRemove}
              title={onRemove ? undefined : "ลบวิชาจะใช้ได้เมื่อ US2 เชื่อมกับ API"}
              className="self-start rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
            >
              ลบวิชา
            </button>
          </article>
        ))}
      </div>
    )}
  </section>
);

export default AddedCoursesList;
