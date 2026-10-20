"use client";

import type { ReactNode } from "react";
import CourseSearchPanel from "../courses/components/CourseSearchPanel";
import AddedCoursesList from "./components/AddedCoursesList";
import ConflictAlert from "./components/ConflictAlert";
import TimetableGrid from "./components/TimetableGrid";
import { useTimetable } from "./hooks/useTimetable";

// หน้าหลักประกอบแต่ละส่วนและส่งข้อมูล/เหตุการณ์ต่อกัน โดยไม่ถือกฎคำนวณตารางไว้ใน JSX
const Timetable = ({ account }: { account?: ReactNode } = {}) => {
  // useTimetable รวม state และการคำนวณไว้; ค่าที่ได้ด้านล่างถูกส่งเป็น props ให้ส่วนแสดงผล
  const {
    timetable,
    loadError,
    reload,
    entries,
    addError,
    deleteStatus,
    deleteError,
    conflictAlertDismissed,
    totalCredits,
    maxCredits,
    academicYear,
    semester,
    selectedAcademicYear,
    selectedSemester,
    conflicts,
    addDisabled,
    addCourse,
    removeCourse,
    removeCourses,
    dismissConflictAlert,
    setAcademicYear,
    setSemester,
  } = useTimetable();

  return (
    <main className="min-h-screen bg-[#fffdfa] text-slate-800">
      {/* แจ้งผู้ใช้ว่าหน้านี้เป็นระบบจำลอง ไม่ใช่การลงทะเบียนจริง */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-red-700 px-3 py-3 text-center text-xs font-semibold text-white sm:justify-between sm:px-6 sm:text-sm">
        <span>⚠ คำเตือนสำคัญ</span>
        <span>ระบบนี้ใช้ช่วยวางแผนการเรียนเท่านั้น</span>
        <span>ไม่สามารถใช้ลงทะเบียนจริงได้</span>
      </div>

      <div className="mx-auto w-full max-w-7xl space-y-4 px-3 py-4 sm:px-5 lg:px-8">
        <header className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-extrabold">
              MockTimetable<span className="text-rose-500">TU</span>
            </h1>
            <p className="text-xs text-slate-500">ระบบช่วยจัดตารางเรียน</p>
          </div>
          {account ?? (
            <span className="self-start rounded-full bg-slate-100 px-3 py-2 text-xs sm:self-auto">
              DEMO · ข้อมูลจำลอง
            </span>
          )}
        </header>

        {/* สถานะการโหลดตารางจาก GET /api/timetable */}
        {loadError && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            โหลดตารางเรียนไม่สำเร็จ
            <button
              type="button"
              onClick={reload}
              className="rounded-lg bg-white px-3 py-1 font-semibold text-red-700 hover:bg-red-100"
            >
              ลองใหม่
            </button>
          </div>
        )}
        {!timetable && !loadError && (
          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">กำลังโหลดตารางเรียน…</p>
        )}

        {/* conflicts ใช้แสดงคำเตือน; ปุ่มปิดส่ง callback กลับไปเปลี่ยน state ใน hook */}
        <ConflictAlert
          conflicts={conflicts}
          dismissed={conflictAlertDismissed}
          onDismiss={dismissConflictAlert}
        />

        {/* Grid รับ entries และผลชนชุดเดียวกัน เพื่อวาดวิชาและไฮไลต์ช่วงที่ทับกัน */}
        <TimetableGrid
          entries={entries}
          conflicts={conflicts}
          totalCredits={totalCredits}
          maxCredits={maxCredits}
          academicYear={academicYear}
          semester={semester}
        />

        {/* รายการวิชาที่เพิ่มแล้ว รองรับลบรายวิชา ลบที่เลือกด้วย checkbox และลบทั้งหมดพร้อมกล่องยืนยัน (US2) */}
        <AddedCoursesList
          entries={entries}
          deleteStatus={deleteStatus}
          deleteError={deleteError}
          onRemove={removeCourse}
          onRemoveMultiple={removeCourses}
        />

        {/* รหัสที่อยู่ในตารางทำให้ปุ่มของวิชานั้นแสดงสถานะเพิ่มแล้ว; การเพิ่มส่งกลับเข้า hook */}
        <CourseSearchPanel
          addedCourseCodes={entries.map((entry) => entry.courseCode)}
          addError={addError}
          addDisabled={addDisabled}
          totalCredits={totalCredits}
          maxCredits={maxCredits}
          academicYear={selectedAcademicYear}
          semester={selectedSemester}
          onAcademicYearChange={setAcademicYear}
          onSemesterChange={setSemester}
          onAddCourse={addCourse}
        />
      </div>
    </main>
  );
};

export default Timetable;
