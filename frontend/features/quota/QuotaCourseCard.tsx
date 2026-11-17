import QuotaChannelBox from "./QuotaChannelBox";
import QuotaConditionBox from "./QuotaConditionBox";
import QuotaContactRow from "./QuotaContactRow";
import QuotaRoundList from "./QuotaRoundList";
import QuotaStatusNotice from "./QuotaStatusNotice";
import { CATEGORY_LABELS } from "./labels";
import type { QuotaCourse } from "./types";

type QuotaCourseCardProps = {
  course: QuotaCourse;
  academicYear: number;
  semester: number;
  onSelectRelatedCourse: (courseCode: string) => void;
};

// หัวการ์ดเหมือนกันทุกสถานะ แล้วเลือกเนื้อหาตาม quotaStatus
// REQUIRED -> 4 ส่วน (เงื่อนไข/รอบ/ช่องทาง/ติดต่อ); สถานะอื่น -> QuotaStatusNotice
const QuotaCourseCard = ({ course, academicYear, semester, onSelectRelatedCourse }: QuotaCourseCardProps) => (
  <article
    data-status={course.quotaStatus}
    aria-label={`${course.courseCode} ${course.courseName}`}
    className="rounded-2xl border border-[#e3ebf5] bg-white p-5 shadow-sm sm:p-6"
  >
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
        <span className="rounded-full bg-teal-50 px-2.5 py-1 text-teal-800">{CATEGORY_LABELS[course.category]}</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{course.credits}.0 หน่วยกิต</span>
      </div>
      {course.inMyTimetable && (
        <span className="rounded-full bg-[#fff0f1] px-2.5 py-1 text-[11px] font-semibold text-[#c91725]">ในแผนการเรียน</span>
      )}
    </div>

    <h3 className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="text-[28px] font-extrabold leading-none text-[#c91725]">{course.courseCode}</span>
      <span className="text-[14px] font-bold uppercase text-[#14213b]">{course.courseName}</span>
    </h3>
    {course.courseNameTh && <p className="mt-1 text-[14px] text-[#687d9d]">{course.courseNameTh}</p>}

    <div className="mt-4 space-y-3 border-t border-[#e3ebf5] pt-4">
      {course.quotaStatus === "REQUIRED" ? (
        <>
          <QuotaConditionBox conditions={course.conditions} onSelectCourse={onSelectRelatedCourse} />
          <div className="grid gap-3 md:grid-cols-2">
            <QuotaRoundList rounds={course.rounds} />
            <QuotaChannelBox channels={course.channels} />
          </div>
          {course.contacts.length > 0 && (
            <section aria-label="ช่องทางติดต่อคณะ / ภาควิชา" className="space-y-2 rounded-xl bg-[#f7f9fc] p-4">
              <h4 className="text-[13px] font-bold text-[#14213b]">ช่องทางติดต่อคณะ / ภาควิชา</h4>
              {course.contacts.map((contact, index) => (
                <QuotaContactRow key={`${contact.organizationName}-${index}`} contact={contact} />
              ))}
            </section>
          )}
        </>
      ) : (
        <QuotaStatusNotice
          status={course.quotaStatus}
          courseCode={course.courseCode}
          academicYear={academicYear}
          semester={semester}
          offeredSemesters={course.offeredSemesters}
        />
      )}
    </div>
  </article>
);

export default QuotaCourseCard;
