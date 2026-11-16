import AuthIcon from "@/features/auth/components/AuthIcon";
import { DAY_NAMES } from "@/features/courses/dayNames";
import type { DayOfWeek } from "@/features/courses/types";
import { INTEREST_GROUPS, INTEREST_GROUP_LABELS } from "../labels";
import type {
  ElectiveFilters as FilterValues,
  InterestGroup,
  TimeSlot,
} from "../types";

export const EMPTY_FILTERS: FilterValues = {
  semester: "",
  day: "",
  timeSlot: "",
  group: "",
  excludeConflicts: false,
};
const DAYS: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];
const selectStyle =
  "mt-2 w-full rounded-xl border border-transparent bg-slate-100 px-3 py-3 text-sm font-medium text-slate-600";

type ElectiveFiltersProps = {
  searchInput: string;
  filters: FilterValues;
  count: number;
  loading: boolean;
  onSearchInputChange: (value: string) => void;
  onSearch: () => void;
  onFiltersChange: (filters: FilterValues) => void;
};

export default function ElectiveFilters({
  searchInput,
  filters,
  count,
  loading,
  onSearchInputChange,
  onSearch,
  onFiltersChange,
}: ElectiveFiltersProps) {
  return (
    <section
      aria-label="ค้นหาและกรองวิชาเสรี"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
    >
      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
      >
        <label className="flex flex-1 items-center gap-3 rounded-2xl bg-slate-100 px-4">
          <AuthIcon name="search" className="shrink-0 text-slate-400" />
          <span className="sr-only">ค้นหาด้วยรหัสวิชา หรือชื่อวิชา</span>
          <input
            value={searchInput}
            onChange={(event) => onSearchInputChange(event.target.value)}
            placeholder="ค้นหาด้วยรหัสวิชา หรือชื่อวิชา เช่น PY200"
            className="min-w-0 flex-1 bg-transparent py-3.5 text-sm outline-none"
          />
        </label>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#c91725] px-7 py-3 font-bold text-white hover:bg-red-800"
        >
          <AuthIcon name="search" width={18} height={18} /> ค้นหาวิชา
        </button>
      </form>

      <div className="mt-6 grid gap-4 text-xs font-bold text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
        <label>
          กรองตามวันเรียน
          <select
            className={selectStyle}
            value={filters.day}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                day: event.target.value as FilterValues["day"],
              })
            }
          >
            <option value="">ทุกวันเรียน</option>
            {DAYS.map((day) => (
              <option key={day} value={day}>
                วัน{DAY_NAMES[day]}
              </option>
            ))}
          </select>
        </label>
        <label>
          กรองตามช่วงเวลาเรียน
          <select
            className={selectStyle}
            value={filters.timeSlot}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                timeSlot: event.target.value as "" | TimeSlot,
              })
            }
          >
            <option value="">ทุกช่วงเวลา</option>
            <option value="MORNING">เช้า (08:00 - 12:30)</option>
            <option value="AFTERNOON">บ่าย (13:30 - 16:30)</option>
            <option value="EVENING">เย็น (16:30 - 19:30)</option>
          </select>
        </label>
        <label>
          หมวดหมู่วิชา
          <select
            className={selectStyle}
            value={filters.group}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                group: event.target.value as "" | InterestGroup,
              })
            }
          >
            <option value="">ทั้งหมด (ทุกหมวดหมู่)</option>
            {INTEREST_GROUPS.map((group) => (
              <option key={group} value={group}>
                {INTEREST_GROUP_LABELS[group]}
              </option>
            ))}
          </select>
        </label>
        <label>
          ภาคเรียนที่ต้องการค้นหา
          <select
            className={selectStyle}
            value={filters.semester}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                semester: event.target.value as FilterValues["semester"],
              })
            }
          >
            <option value="">ทุกภาคเรียน (ทั้งหมด)</option>
            <option value="1">ภาคเรียนที่ 1</option>
            <option value="2">ภาคเรียนที่ 2</option>
          </select>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
          <input
            type="checkbox"
            className="size-4 accent-emerald-600"
            checked={filters.excludeConflicts}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                excludeConflicts: event.target.checked,
              })
            }
          />
          แสดงเฉพาะวิชาที่ไม่ชนกับตารางปัจจุบัน
        </label>
        <p aria-live="polite" className="text-xs text-slate-500">
          {loading ? "กำลังค้นหาวิชา…" : `แสดงทั้งหมด ${count} วิชาแนะนำ`}
        </p>
      </div>
    </section>
  );
}
