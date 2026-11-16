import AuthIcon from "@/features/auth/components/AuthIcon";
import type { ElectiveSummary } from "../types";
import ElectiveBadges from "./ElectiveBadges";

type ElectiveCardProps = {
  course: ElectiveSummary;
  onOpen: (courseCode: string) => void;
};

export default function ElectiveCard({ course, onOpen }: ElectiveCardProps) {
  return (
    <article className="h-full">
      {/* ใช้ button ทั้งการ์ดเพื่อให้ Enter/Space เปิดรายละเอียดได้ โดยไม่มี button ซ้อนกัน */}
      <button
        type="button"
        aria-label={`อ่านรีวิว ${course.courseCode}`}
        onClick={() => onOpen(course.courseCode)}
        className="flex h-full w-full flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 text-left transition hover:border-red-300 hover:shadow-md"
      >
        <div className="flex w-full flex-wrap items-center gap-2">
          <h3 className="text-2xl font-extrabold tracking-tight text-[#c91725]">
            {course.courseCode}
          </h3>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
            เลือกเสรี
          </span>
          <span className="ml-auto rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
            {course.credits.toFixed(1)} หน่วยกิต
          </span>
          {course.offeredSemesters.length === 1 && (
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
              เปิดเฉพาะเทอม {course.offeredSemesters[0]}
            </span>
          )}
        </div>
        <div>
          <p className="font-bold text-slate-900">{course.courseName}</p>
          <p className="mt-1 text-xs text-slate-600">{course.courseNameTh}</p>
        </div>
        <ElectiveBadges course={course} />
        <span className="mt-auto flex w-full items-center gap-2 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500">
          <AuthIcon name="book" width={15} height={15} /> อ่านรีวิว
        </span>
      </button>
    </article>
  );
}
