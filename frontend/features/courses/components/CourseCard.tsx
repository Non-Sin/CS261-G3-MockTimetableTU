import type { Course } from "../types";
import { DAY_NAMES } from "../dayNames";

type CourseCardProps = {
  course: Course;
  alreadyAdded: boolean;
  wouldExceedCreditLimit: boolean;
  selectedSectionId?: number;
  onSectionChange: (courseCode: string, sectionId: number) => void;
  onAdd: (course: Course, sectionId: number) => void;
};

// รับ Course หนึ่งรายการจาก CourseSearchPanel (ตอนนี้มาจาก mockCourses)
// แล้วแสดงข้อมูลวิชาและกลุ่มเรียน; callback ส่งการเลือก/การเพิ่มกลับไปยัง parent
const CourseCard = ({
  course,
  alreadyAdded,
  wouldExceedCreditLimit,
  selectedSectionId,
  onSectionChange,
  onAdd,
}: CourseCardProps) => {
  // sectionId ที่เลือกใช้ค้น section เต็ม เพื่อให้รายละเอียดคาบและห้องตรงกับปุ่มเพิ่ม
  const selectedSection = course.sections.find(
    (section) => section.sectionId === selectedSectionId,
  );

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-bold">{course.courseCode}</p>
        <p className="text-sm text-slate-600">{course.courseName}</p>
        <p className="mt-1 text-xs text-slate-500">{course.credits} หน่วยกิต</p>
        {selectedSection && (
          <div className="mt-2 space-y-1 text-xs text-slate-500">
            <p>ผู้สอน: {selectedSection.instructor}</p>
            {selectedSection.schedules.map((slot, index) => (
              <p key={`${slot.dayOfWeek}-${index}`}>
                {DAY_NAMES[slot.dayOfWeek]} {slot.startTime}-{slot.endTime}
                {" · ห้อง"}
                {slot.room}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* แสดงตัวเลือกเฉพาะเมื่อมีหลาย section; วิชา section เดียวไม่ต้องให้เลือกซ้ำ */}
        {course.sections.length > 1 ? (
          <select
            value={selectedSectionId ?? ""}
            onChange={(event) =>
              onSectionChange(course.courseCode, Number(event.target.value))
            }
            aria-label={`เลือกกลุ่มเรียน ${course.courseCode}`}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {course.sections.map((section) => (
              <option key={section.sectionId} value={section.sectionId}>
                Sec {section.sectionNo}
              </option>
            ))}
          </select>
        ) : (
          <span className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Sec {selectedSection?.sectionNo}
          </span>
        )}

        <button
          type="button"
          disabled={alreadyAdded || wouldExceedCreditLimit}
          onClick={() => {
            if (selectedSectionId !== undefined) {
              // ส่งทั้งวิชาและ sectionId ให้ panel แล้วต่อถึง reducer ใน useTimetable
              onAdd(course, selectedSectionId);
            }
          }}
          className={`rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed ${
            alreadyAdded ? "disabled:bg-emerald-600" : "disabled:bg-slate-300"
          }`}
        >
          {alreadyAdded ? "เพิ่มแล้ว" : "+ เพิ่มวิชา"}
        </button>
      </div>
    </article>
  );
};

export default CourseCard;
