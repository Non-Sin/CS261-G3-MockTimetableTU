import { useState } from "react";
import type { Course, CourseCategory } from "../types";
import { matchesCourseQuery } from "../courseSearch";
import { mockCourses } from "../mockData";
import CourseCard from "./CourseCard";

type CourseSearchPanelProps = {
  addedCourseCodes: string[];
  addError: string | null;
  onAddCourse: (course: Course, sectionId: number) => void;
};

// รับรหัสวิชาที่อยู่ในตารางและ callback สำหรับเพิ่มจากหน้าหลัก Timetable
// แหล่งข้อมูลรายการในปัจจุบันคือ mockCourses ใน mockData.ts; เมื่อ backend พร้อม
// จุดนี้เปลี่ยนไปโหลดผ่าน features/courses/api.ts โดย CourseCard ยังรับ Course รูปแบบเดิมได้
const CourseSearchPanel = ({
  addedCourseCodes,
  addError,
  onAddCourse,
}: CourseSearchPanelProps) => {
  // searchInput คือข้อความที่กำลังพิมพ์ ส่วน query คือคำค้นที่ส่งใช้หลัง submit
  // แยกกันเพื่อให้ผู้ใช้พิมพ์ได้ก่อน และค้นหาเมื่อกดปุ่ม/Enter เท่านั้น
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  // state เหล่านี้ควบคุมตัวกรองและกลุ่มเรียนที่เลือก; academicYear/semester
  // แสดงตัวเลือกสำหรับ API query ในอนาคต แม้ข้อมูล mock ตอนนี้มีชุดเดียว
  const [categoryFilter, setCategoryFilter] = useState<CourseCategory | "ALL">("ALL");
  const [selectedSectionIds, setSelectedSectionIds] = useState<Record<string, number>>({});
  const [academicYear, setAcademicYear] = useState(2568);
  const [semester, setSemester] = useState(1);

  // กรองข้อมูลต้นทางในฝั่ง client ด้วยกฎค้นหาและหมวด ก่อนส่งผลไปวาดเป็น CourseCard
  const filteredCourses = mockCourses.filter((course) => {
    const matchesQuery = matchesCourseQuery(course, query);
    const matchesCategory =
      categoryFilter === "ALL" || course.category === categoryFilter;

    return matchesQuery && matchesCategory;
  });

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold">ค้นหารายวิชา</h2>

        <div className="flex flex-wrap gap-2">
          <select
            value={semester}
            onChange={(event) => setSemester(Number(event.target.value))}
            aria-label="ภาคเรียน"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value={1}>ภาคเรียน 1</option>
          </select>

          <select
            value={academicYear}
            onChange={(event) => setAcademicYear(Number(event.target.value))}
            aria-label="ปีการศึกษา"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value={2568}>ปีการศึกษา 2568</option>
          </select>
        </div>
      </div>

      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          // เก็บคำค้นที่ submit เพื่อให้ผลกรองอัปเดตจาก filteredCourses
          setQuery(searchInput);
        }}
      >
        <input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="ค้นหารหัสหรือชื่อวิชา"
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-rose-400"
        />

        <button
          type="submit"
          className="rounded-xl bg-rose-500 px-5 py-3 text-sm font-semibold text-white"
        >
          ค้นหา
        </button>
      </form>

      <select
        value={categoryFilter}
        onChange={(event) =>
          setCategoryFilter(event.target.value as CourseCategory | "ALL")
        }
        aria-label="กรองตามหมวดวิชา"
        className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
      >
        <option value="ALL">ทุกหมวดวิชา</option>
        <option value="MAJOR">วิชาเฉพาะ</option>
        <option value="GENERAL_EDUCATION">ศึกษาทั่วไป</option>
        <option value="FREE_ELECTIVE">วิชาเลือกเสรี</option>
      </select>

      {addError && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {addError}
        </p>
      )}

      <div className="mt-4 space-y-3">
        <p className="mt-4 text-sm text-slate-500">
          พบ {filteredCourses.length} รายวิชา
        </p>
        {filteredCourses.length === 0 ? (
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
            ไม่พบรายวิชาที่ตรงกับคำที่ค้นหาหรือหมวดที่เลือก
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {/* ส่งข้อมูลวิชาและ section ที่ผู้ใช้เลือกให้การ์ดแสดง/เพิ่มเข้าตาราง */}
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.courseCode}
                course={course}
                alreadyAdded={addedCourseCodes.includes(course.courseCode)}
                selectedSectionId={
                  selectedSectionIds[course.courseCode] ?? course.sections[0]?.sectionId
                }
                onSectionChange={(courseCode, sectionId) =>
                  setSelectedSectionIds((current) => ({
                    ...current,
                    [courseCode]: sectionId,
                  }))
                }
                onAdd={onAddCourse}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default CourseSearchPanel;
