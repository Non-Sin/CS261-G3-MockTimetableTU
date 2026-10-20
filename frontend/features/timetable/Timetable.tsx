"use client";

import CourseSearchPanel from "../courses/components/CourseSearchPanel";
import AddedCoursesList from "./components/AddedCoursesList";
import ConflictAlert from "./components/ConflictAlert";
import TimetableGrid from "./components/TimetableGrid";
import { useTimetable } from "./hooks/useTimetable";

// หน้าหลักประกอบแต่ละส่วนและส่งข้อมูล/เหตุการณ์ต่อกัน โดยไม่ถือกฎคำนวณตารางไว้ใน JSX
const Timetable = () => {
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
    deleteDisabled,
    addCourse,
    removeCourse,
    removeCourses,
    dismissConflictAlert,
    setAcademicYear,
    setSemester,
  } = useTimetable();

  return (
    <div className="space-y-4 text-slate-800">
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

      {/* รายการวิชาที่เพิ่มแล้ว รองรับลบรายวิชา ลบที่เลือก และลบทั้งหมดพร้อมกล่องยืนยัน */}
      <AddedCoursesList
        entries={entries}
        deleteStatus={deleteStatus}
        deleteError={deleteError}
        disabled={deleteDisabled}
        onRemove={removeCourse}
        onRemoveMultiple={removeCourses}
      />

      {/* รหัสที่อยู่ในตารางทำให้ปุ่มวิชานั้นแสดงสถานะเพิ่มแล้ว */}
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
  );
};

export default Timetable;
