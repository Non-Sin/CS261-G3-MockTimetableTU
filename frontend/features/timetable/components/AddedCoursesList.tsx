import { useState } from "react";
import { DAY_NAMES } from "../../courses/dayNames";
import type { DeleteStatus } from "../../timetable-delete/types";
import type { TimetableEntry } from "../types";

type AddedCoursesListProps = {
  entries: TimetableEntry[];
  deleteStatus?: DeleteStatus;
  deleteError?: string | null;
  onRemove?: (entryId: number) => Promise<boolean> | void;
  onRemoveMultiple?: (entryIds: number[]) => Promise<boolean> | void;
};

// entries ถูกส่งมาจาก hook ผ่าน Timetable; รายการนี้แสดง section และคาบที่เลือกไว้
// รองรับการลบรายวิชาเดียว, เลือกหลายวิชาด้วย checkbox เพื่อลบพร้อมกัน และการลบทั้งหมดพร้อมกล่องยืนยันบนหน้าจอ
const AddedCoursesList = ({
  entries,
  deleteStatus = "idle",
  deleteError = null,
  onRemove,
  onRemoveMultiple,
}: AddedCoursesListProps) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [confirmingClearAll, setConfirmingClearAll] = useState(false);

  const validIdSet = new Set(entries.map((entry) => entry.entryId));
  const activeSelectedIds = selectedIds.filter((id) => validIdSet.has(id));

  const isEmpty = entries.length === 0;
  const isDeleting = deleteStatus === "deleting";
  const canDeleteSingle = Boolean(onRemove) && !isEmpty && !isDeleting;
  const canDeleteSelected =
    Boolean(onRemoveMultiple) && !isEmpty && activeSelectedIds.length > 0 && !isDeleting;
  const canDeleteAll = Boolean(onRemoveMultiple) && !isEmpty && !isDeleting;

  const toggleSelect = (entryId: number) => {
    setSelectedIds((current) =>
      current.includes(entryId)
        ? current.filter((id) => id !== entryId)
        : [...current, entryId],
    );
  };

  const handleRemoveSingle = async (entryId: number) => {
    if (!onRemove || isDeleting) return;
    setConfirmingClearAll(false);
    const result = await onRemove(entryId);
    if (result !== false) {
      setSelectedIds([]);
    }
  };

  const handleRemoveSelected = async () => {
    if (!onRemoveMultiple || activeSelectedIds.length === 0 || isDeleting) return;
    setConfirmingClearAll(false);
    const result = await onRemoveMultiple(activeSelectedIds);
    if (result !== false) {
      setSelectedIds([]);
    }
  };

  const handleConfirmClearAll = async () => {
    if (!onRemoveMultiple || isEmpty || isDeleting) return;
    const allIds = entries.map((entry) => entry.entryId);
    const result = await onRemoveMultiple(allIds);
    setConfirmingClearAll(false);
    if (result !== false) {
      setSelectedIds([]);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold">วิชาที่เพิ่มแล้ว</h2>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRemoveSelected}
            disabled={!canDeleteSelected}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
          >
            {activeSelectedIds.length > 0
              ? `ลบที่เลือก (${activeSelectedIds.length})`
              : "ลบที่เลือก"}
          </button>

          <button
            type="button"
            onClick={() => setConfirmingClearAll(true)}
            disabled={!canDeleteAll}
            className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:text-sm"
          >
            ลบทั้งหมด
          </button>
        </div>
      </div>

      {deleteError && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {deleteError}
        </p>
      )}

      {confirmingClearAll && !isEmpty && (
        <div
          role="region"
          aria-label="ยืนยันการลบรายวิชาทั้งหมด"
          className="mt-4 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm font-bold text-red-800">
              ยืนยันการลบรายวิชาทั้งหมดหรือไม่?
            </p>
            <p className="mt-1 text-xs text-red-700">
              รายวิชาทั้ง {entries.length} วิชา ({entries.map((entry) => entry.courseCode).join(", ")}) จะถูกลบออกจากตารางเรียนจำลอง
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirmClearAll}
              disabled={isDeleting}
              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
            >
              ยืนยันลบทั้งหมด
            </button>
            <button
              type="button"
              onClick={() => setConfirmingClearAll(false)}
              disabled={isDeleting}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {isEmpty ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
          ยังไม่มีวิชาในตาราง
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {entries.map((entry) => {
            const isChecked = activeSelectedIds.includes(entry.entryId);

            return (
              <article
                key={entry.courseCode}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    aria-label={`เลือกวิชา ${entry.courseCode}`}
                    checked={isChecked}
                    disabled={isDeleting}
                    onChange={() => toggleSelect(entry.entryId)}
                    className="mt-1 h-4 w-4 cursor-pointer rounded border-slate-300 text-rose-600 focus:ring-rose-500 disabled:cursor-not-allowed"
                  />

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
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveSingle(entry.entryId)}
                  disabled={!canDeleteSingle}
                  className="self-start rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
                >
                  ลบวิชา
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default AddedCoursesList;
