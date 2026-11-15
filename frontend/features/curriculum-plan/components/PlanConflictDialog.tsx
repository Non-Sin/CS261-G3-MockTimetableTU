import type { SkippedPlanCourse } from "../types";

type PlanConflictDialogProps = {
  conflicts: SkippedPlanCourse[];
  onDismiss: () => void;
};

const PlanConflictDialog = ({ conflicts, onDismiss }: PlanConflictDialogProps) => {
  if (conflicts.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-conflict-dialog-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-lg font-bold text-red-600"
          >
            !
          </span>
          <div>
            <h2 id="plan-conflict-dialog-title" className="text-base font-bold text-slate-900">
              ตรวจพบเวลาเรียนซ้อนทับกัน ไม่สามารถเพิ่มได้
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              รายวิชาต่อไปนี้เวลาเรียนชนกับวิชาในตาราง จึงไม่ถูกเพิ่มลงตารางเรียน
            </p>
          </div>
        </div>

        <ul className="mt-4 space-y-2">
          {conflicts.map((item) => (
            <li
              key={item.courseCode}
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              <p className="font-bold">
                {item.courseCode} · {item.courseName}
              </p>
              <p className="mt-1 text-xs">{item.message}</p>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-xl bg-[#d4151e] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#b91018]"
          >
            ตกลง
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanConflictDialog;
