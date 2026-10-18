import { useEffect, useState } from "react";
import type { Course, CourseCategory } from "../types";
import { fetchCourses } from "../api";
import CourseCard from "./CourseCard";

type CourseSearchPanelProps = {
  addedCourseCodes: string[];
  addError: string | null;
  // กดเพิ่มไม่ได้ชั่วคราว เช่น ตารางยังโหลดไม่เสร็จหรือกำลังบันทึกวิชาก่อนหน้า
  addDisabled: boolean;
  totalCredits: number;
  maxCredits: number;
  academicYear: number;
  semester: number;
  onAcademicYearChange: (academicYear: number) => void;
  onSemesterChange: (semester: number) => void;
  onAddCourse: (course: Course, sectionId: number) => void;
};

// รับรหัสวิชาที่อยู่ในตารางและ callback สำหรับเพิ่มจากหน้าหลัก Timetable
// รายการวิชาโหลดผ่าน GET /api/courses (features/courses/api.ts) ตามภาคเรียน คำค้น และหมวดที่เลือก
const CourseSearchPanel = ({
  addedCourseCodes,
  addError,
  addDisabled,
  totalCredits,
  maxCredits,
  academicYear,
  semester,
  onAcademicYearChange,
  onSemesterChange,
  onAddCourse,
}: CourseSearchPanelProps) => {
  // searchInput คือข้อความที่กำลังพิมพ์ ส่วน query คือคำค้นที่ส่งใช้หลัง submit
  // แยกกันเพื่อให้ผู้ใช้พิมพ์ได้ก่อน และค้นหาเมื่อกดปุ่ม/Enter เท่านั้น
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  // state เหล่านี้เป็นค่าที่ใช้กรองรายการและเลือกกลุ่มเรียนภายใน panel
  const [categoryFilter, setCategoryFilter] = useState<CourseCategory | "ALL">("ALL");
  const [selectedSectionIds, setSelectedSectionIds] = useState<Record<string, number>>({});

  // เก็บรายวิชาคู่กับภาคเรียนที่โหลดมา แสดงเฉพาะของภาคที่เลือกอยู่
  // ตอนเปลี่ยนภาค รายวิชาของภาคเก่าจะไม่ถูกแสดงให้กดเพิ่ม ระหว่างรอหรือเมื่อโหลดภาคใหม่ไม่สำเร็จ
  const termKey = `${academicYear}/${semester}`;
  const [loadedCourses, setLoadedCourses] = useState<{ termKey: string; courses: Course[] } | null>(null);
  const [errorTermKey, setErrorTermKey] = useState<string | null>(null);
  const courses = loadedCourses?.termKey === termKey ? loadedCourses.courses : [];
  const coursesError = errorTermKey === termKey;
  const coursesLoading = loadedCourses?.termKey !== termKey && !coursesError;

  // ค้นหารายวิชาของภาคเรียนที่เลือก ตามคำค้นและหมวดวิชา (backend เป็นคนกรองแบบคำขึ้นต้น)
  // ไม่ใช้ผลของคำค้นเก่าที่ตอบกลับมาช้า
  useEffect(() => {
    let ignore = false;

    fetchCourses({
      academicYear,
      semester,
      q: query,
      category: categoryFilter === "ALL" ? undefined : categoryFilter,
    })
      .then((data) => {
        if (ignore) return;
        setLoadedCourses({ termKey: `${academicYear}/${semester}`, courses: data });
        setErrorTermKey(null);
      })
      .catch(() => {
        if (!ignore) setErrorTermKey(`${academicYear}/${semester}`);
      });

    return () => {
      ignore = true;
    };
  }, [academicYear, semester, query, categoryFilter]);

  // กลุ่มที่เลือกไว้ต้องอยู่ในรายวิชาของภาคปัจจุบัน ไม่งั้นใช้กลุ่มแรก
  // (sectionId ของแต่ละภาคต่างกัน ค่าที่เลือกไว้ในภาคเก่าจึงใช้กับภาคใหม่ไม่ได้)
  const validSectionId = (course: Course) => {
    const selected = selectedSectionIds[course.courseCode];
    return course.sections.some((section) => section.sectionId === selected)
      ? selected
      : course.sections[0]?.sectionId;
  };

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold">ค้นหารายวิชา</h2>

        <div className="flex flex-wrap gap-2">
          <select
            value={semester}
            onChange={(event) => onSemesterChange(Number(event.target.value))}
            aria-label="ภาคเรียน"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            {/* ภาค 1 และ 2 ตาม seed (ไม่รวมภาคฤดูร้อน) */}
            <option value={1}>ภาคเรียน 1</option>
            <option value={2}>ภาคเรียน 2</option>
          </select>

          <select
            value={academicYear}
            onChange={(event) => onAcademicYearChange(Number(event.target.value))}
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
          // เก็บคำค้นที่ submit แล้วโหลดรายการใหม่จาก API
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

      {coursesError && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          โหลดรายวิชาไม่สำเร็จ กรุณาลองใหม่
        </p>
      )}

      {addError && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {addError}
        </p>
      )}

      <div className="mt-4 space-y-3">
        {coursesLoading ? (
          <p className="mt-4 text-sm text-slate-500">กำลังโหลดรายวิชา…</p>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            พบ {courses.length} รายวิชา
          </p>
        )}
        {coursesLoading || coursesError ? null : courses.length === 0 ? (
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
            ไม่พบรายวิชาที่ตรงกับคำที่ค้นหาหรือหมวดที่เลือก
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {/* ส่งข้อมูลวิชาและ section ที่ผู้ใช้เลือกให้การ์ดแสดง/เพิ่มเข้าตาราง */}
            {courses.map((course) => (
              <CourseCard
                key={course.courseCode}
                course={course}
                alreadyAdded={addedCourseCodes.includes(course.courseCode)}
                wouldExceedCreditLimit={
                  totalCredits + course.credits > maxCredits
                }
                addDisabled={addDisabled}
                selectedSectionId={validSectionId(course)}
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
