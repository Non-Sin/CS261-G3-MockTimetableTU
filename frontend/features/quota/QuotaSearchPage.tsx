"use client";

import QuotaCourseCard from "./QuotaCourseCard";
import QuotaEmptyState from "./QuotaEmptyState";
import QuotaGuide from "./QuotaGuide";
import QuotaSearchBar from "./QuotaSearchBar";
import { useQuotaSearch } from "./useQuotaSearch";

type QuotaSearchPageProps = {
  academicYear: number;
  semester: number;
  // รหัสวิชาในตารางเรียนของภาคนี้ (จาก GET /api/timetable ของ US1)
  myCourseCodes: string[];
};

const SkeletonCard = () => (
  <div className="animate-pulse space-y-3 rounded-2xl border border-[#e3ebf5] bg-white p-6">
    <div className="h-4 w-1/4 rounded bg-slate-100" />
    <div className="h-8 w-1/3 rounded bg-slate-100" />
    <div className="h-24 rounded bg-slate-50" />
  </div>
);

// หน้าค้นหาช่องทางขอโควตา: ไม่ค้นหา -> QuotaGuide; ค้นหาแล้ว -> loading / ผลลัพธ์ / ไม่พบ / error
const QuotaSearchPage = ({ academicYear, semester, myCourseCodes }: QuotaSearchPageProps) => {
  const { input, setInput, mine, changeMine, state, search, clear, selectCourse, retry } = useQuotaSearch({
    academicYear,
    semester,
    myCourseCodes,
  });

  const requestedQuery =
    state.status === "idle" ? "" : state.request.kind === "search" ? state.request.q : state.request.courseCode;

  return (
    <div className="space-y-5 text-[#14213b]">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-[22px] font-extrabold">ค้นหาช่องทางขอโควตา</h2>
        <span className="rounded-full bg-[#d4151e] px-3 py-1 text-[12px] font-bold text-white">
          ภาคเรียนที่ {semester}/{academicYear}
        </span>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-900">
        <p className="font-bold">ข้อควรรู้สำคัญเกี่ยวกับการขอโควตารายวิชา</p>
        <p className="mt-1">
          วิชาที่ต้องขอโควตาอาจมีวิชาที่มีเงื่อนไขเจาะจง เช่น ติดกลุ่มเรียนข้ามคณะ, รายวิชาบังคับก่อน
          เมื่อได้รับอนุมัติผลโควตาแล้ว ผู้เรียนต้องไปกดเพิ่มวิชาตอนลงทะเบียนเรียนในระบบ REG-TU ด้วยตนเองอีกครั้งเสมอ!
        </p>
      </div>

      <QuotaSearchBar
        value={input}
        mine={mine}
        myCourseCodes={myCourseCodes}
        onValueChange={setInput}
        onMineChange={changeMine}
        onSearch={search}
        onClear={clear}
      />

      {state.status === "idle" ? (
        <QuotaGuide />
      ) : (
        <section aria-labelledby="quota-results-title" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="quota-results-title" className="text-[17px] font-bold">
              ช่องทางและรอบเวลายื่นคำร้อง
            </h3>
            {state.status === "success" && (
              <p className="text-[12px] font-semibold text-[#687d9d]">
                พบทั้งหมด {state.total} วิชา
                {state.total > state.courses.length && ` (แสดง ${state.courses.length} วิชาแรก)`}
              </p>
            )}
          </div>

          {state.status === "loading" && (
            <div role="status" aria-label="กำลังโหลดข้อมูลโควตา" className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}

          {state.status === "error" && (
            <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-red-50 p-4 text-[13px] text-red-700">
              <p>ไม่สามารถโหลดข้อมูลโควตาได้ กรุณาลองใหม่อีกครั้ง</p>
              <button
                type="button"
                onClick={retry}
                className="rounded-lg bg-white px-3 py-1 font-bold text-red-700 hover:bg-red-100"
              >
                ลองใหม่
              </button>
            </div>
          )}

          {state.status === "notFound" && <QuotaEmptyState query={requestedQuery} />}

          {state.status === "success" &&
            (state.courses.length === 0 ? (
              <QuotaEmptyState query={requestedQuery} />
            ) : (
              <div className="space-y-4">
                {state.courses.map((course) => (
                  <QuotaCourseCard
                    key={course.courseCode}
                    course={course}
                    academicYear={academicYear}
                    semester={semester}
                    onSelectRelatedCourse={selectCourse}
                  />
                ))}
              </div>
            ))}
        </section>
      )}
    </div>
  );
};

export default QuotaSearchPage;
