"use client";

import { useState } from "react";
import AuthIcon from "@/features/auth/components/AuthIcon";
import type { Timetable } from "@/features/timetable/types";
import ElectiveCard from "./components/ElectiveCard";
import ElectiveDetailModal from "./components/ElectiveDetailModal";
import ElectiveFilters, { EMPTY_FILTERS } from "./components/ElectiveFilters";
import { useElectiveSearch } from "./hooks/useElectiveSearch";
import { INTEREST_GROUPS, INTEREST_GROUP_LABELS } from "./labels";
import type {
  ElectiveDetail,
  ElectiveFilters as FilterValues,
  ElectiveSection,
} from "./types";

type ElectivesPageProps = {
  academicYear: number;
  currentSemester: number;
  timetable: Timetable | null;
  timetableError: boolean;
  addDisabled: boolean;
  onRetryTimetable: () => void;
  onAddSection: (sectionId: number) => Promise<Timetable>;
  onTimetableChanged: () => void;
  onOpenQuota: () => void;
};

export default function ElectivesPage({
  academicYear,
  currentSemester,
  timetable,
  timetableError,
  addDisabled,
  onRetryTimetable,
  onAddSection,
  onTimetableChanged,
  onOpenQuota,
}: ElectivesPageProps) {
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FilterValues>(EMPTY_FILTERS);
  const [selectedCourseCode, setSelectedCourseCode] = useState<string | null>(
    null,
  );
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [notice, setNotice] = useState<{
    message: string;
    hasConflicts: boolean;
  } | null>(null);
  const search = useElectiveSearch(
    {
      academicYear,
      currentSemester,
      q: query,
      semester:
        filters.semester === ""
          ? undefined
          : (Number(filters.semester) as 1 | 2),
      day: filters.day || undefined,
      timeSlot: filters.timeSlot || undefined,
      group: filters.group || undefined,
      excludeConflicts: filters.excludeConflicts,
    },
    refreshVersion,
  );

  function resetSearch() {
    setSearchInput("");
    setQuery("");
    setFilters(EMPTY_FILTERS);
    setRefreshVersion((value) => value + 1);
  }

  function showAdded(
    course: ElectiveDetail,
    section: ElectiveSection,
    updated: Timetable,
  ) {
    setSelectedCourseCode(null);
    setNotice({
      message: `เพิ่ม ${course.courseCode} Sec ${section.sectionNo} ลงตารางแล้ว`,
      hasConflicts: updated.conflicts.length > 0,
    });
    // กรองไม่ชนตารางต้องใช้ตารางฉบับใหม่ รวมถึงกรณีเพิ่มวิชาที่ทำให้วิชาอื่นชนด้วย
    setRefreshVersion((value) => value + 1);
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-500">
        ตารางปัจจุบัน: ภาคเรียนที่ {currentSemester} ปีการศึกษา {academicYear}
      </p>
      {timetableError && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          โหลดตารางปัจจุบันไม่สำเร็จ ยังเพิ่มวิชาไม่ได้
          <button
            type="button"
            onClick={onRetryTimetable}
            className="ml-3 rounded-lg bg-white px-3 py-2 font-bold"
          >
            ลองโหลดตารางใหม่
          </button>
        </div>
      )}
      {notice && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <div className="flex items-center justify-between gap-3">
            <p role="status">{notice.message}</p>
            <button
              type="button"
              aria-label="ปิดข้อความเพิ่มวิชาสำเร็จ"
              onClick={() => setNotice(null)}
              className="px-2 text-lg"
            >
              ×
            </button>
          </div>
          {notice.hasConflicts && (
            <p
              role="alert"
              className="mt-3 rounded-lg bg-amber-50 p-3 text-amber-800"
            >
              มีเวลาเรียนซ้อนทับกับตารางปัจจุบัน กรุณาตรวจสอบในหน้าจัดตารางเรียน
            </p>
          )}
        </div>
      )}

      <ElectiveFilters
        searchInput={searchInput}
        filters={filters}
        count={search.courses.length}
        loading={search.loading}
        onSearchInputChange={setSearchInput}
        onSearch={() => {
          setQuery(searchInput.trim());
          setRefreshVersion((value) => value + 1);
        }}
        onFiltersChange={setFilters}
      />

      {search.loading && (
        <p role="status" className="py-8 text-center text-sm text-slate-500">
          กำลังโหลดวิชาเสรีแนะนำ…
        </p>
      )}
      {search.error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-red-700"
        >
          <p>โหลดวิชาเสรีแนะนำไม่สำเร็จ กรุณาลองใหม่</p>
          <button
            type="button"
            onClick={search.retry}
            className="mt-3 rounded-xl bg-white px-4 py-2 font-bold"
          >
            ลองใหม่
          </button>
        </div>
      )}
      {!search.loading && !search.error && search.courses.length === 0 && (
        <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-red-50 text-[#c91725]">
            <AuthIcon name="search" width={34} height={34} />
          </span>
          <h2 className="mt-5 text-2xl font-extrabold">ไม่พบรีวิววิชานี้</h2>
          <p className="mt-2 text-sm text-slate-500">
            {query
              ? `ยังไม่มีข้อมูลหรือรีวิวสำหรับรายวิชา ${query} ที่ตรงกับเงื่อนไขนี้`
              : "ไม่พบวิชาเสรีที่ตรงกับเงื่อนไขนี้"}
          </p>
          <button
            type="button"
            onClick={resetSearch}
            className="mt-7 rounded-xl bg-[#c91725] px-5 py-3 text-sm font-bold text-white hover:bg-red-800"
          >
            ดูวิชาเสรีแนะนำทั้งหมด
          </button>
        </section>
      )}

      {INTEREST_GROUPS.map((group) => {
        const courses = search.courses.filter(
          (course) => course.group === group,
        );
        if (courses.length === 0) return null;
        return (
          <section key={group} aria-labelledby={`elective-group-${group}`}>
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <h2
                id={`elective-group-${group}`}
                className="flex items-center gap-2 text-lg font-extrabold"
              >
                <AuthIcon name="book" className="shrink-0 text-[#c91725]" />
                {INTEREST_GROUP_LABELS[group]}
              </h2>
              <span className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-500">
                {courses.length} วิชา
              </span>
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {courses.map((course) => (
                <ElectiveCard
                  key={course.courseCode}
                  course={course}
                  onOpen={(code) => {
                    setNotice(null);
                    setSelectedCourseCode(code);
                  }}
                />
              ))}
            </div>
          </section>
        );
      })}

      {selectedCourseCode && (
        <ElectiveDetailModal
          key={`${academicYear}/${currentSemester}/${selectedCourseCode}`}
          courseCode={selectedCourseCode}
          academicYear={academicYear}
          currentSemester={currentSemester}
          timetable={timetable}
          addDisabled={addDisabled}
          onAddSection={onAddSection}
          onAdded={showAdded}
          onTimetableChanged={() => {
            onTimetableChanged();
            setRefreshVersion((value) => value + 1);
          }}
          onClose={() => setSelectedCourseCode(null)}
          onOpenQuota={() => {
            setSelectedCourseCode(null);
            onOpenQuota();
          }}
        />
      )}
    </div>
  );
}
