"use client";

import type { Timetable } from "@/features/timetable/types";
import { useCurriculumPlan } from "../hooks/useCurriculumPlan";
import CurriculumPlanModal from "./CurriculumPlanModal";
import PlanConflictDialog from "./PlanConflictDialog";

type CurriculumPlanLauncherProps = {
  academicYear: number;
  disabled?: boolean;
  onApplyTimetable: (timetable: Timetable) => void;
};

const CurriculumPlanLauncher = ({
  academicYear,
  disabled = false,
  onApplyTimetable,
}: CurriculumPlanLauncherProps) => {
  const plan = useCurriculumPlan({
    academicYear,
    onApplyTimetable,
  });

  return (
    <>
      <section className="flex flex-col gap-4 rounded-2xl border border-[#f5d5d7] bg-gradient-to-r from-[#fff5f5] via-[#fff8f8] to-[#fff4f2] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
        <div className="flex items-start gap-4 sm:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#c91725] text-white shadow-sm">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                จัดตารางเรียนตามเล่มหลักสูตร
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                ★ ฟีเจอร์แนะนำ
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm">
              จำลองตารางเรียนตามแผนการศึกษาแนะนำของแต่ละชั้นปีและภาคเรียน ช่วยให้วางแผนลงทะเบียนได้สะดวกและรวดเร็วยิ่งขึ้น
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={plan.openModal}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#c91725] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#b01320] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
        >
          <span>จัดตามแผนหลักสูตร</span>
          <span aria-hidden="true">→</span>
        </button>
      </section>

      <CurriculumPlanModal
        isOpen={plan.isOpen}
        academicYear={academicYear}
        studyYear={plan.studyYear}
        semester={plan.semester}
        curricula={plan.curricula}
        activeCurriculum={plan.activeCurriculum}
        requiresPlanType={plan.requiresPlanType}
        selectedPlanType={plan.selectedPlanType}
        availableMinors={plan.availableMinors}
        effectiveMinorId={plan.effectiveMinorId}
        activeMinor={plan.activeMinor}
        validPlanList={plan.validPlanList}
        activePlan={plan.activePlan}
        plansLoading={plan.plansLoading}
        plansError={plan.plansError}
        preview={plan.preview}
        previewLoading={plan.previewLoading}
        previewError={plan.previewError}
        confirming={plan.confirming}
        confirmError={plan.confirmError}
        onClose={plan.closeModal}
        onSelectStudyYear={plan.selectStudyYear}
        onSelectSemester={plan.selectSemester}
        onSelectCurriculum={plan.selectCurriculum}
        onSelectPlanType={plan.selectPlanType}
        onSelectMinorId={plan.selectMinorId}
        onRetryPlans={plan.retryPlans}
        onRetryPreview={plan.retryPreview}
        onConfirm={plan.confirmPlan}
      />

      <PlanConflictDialog
        conflicts={plan.conflictItems}
        onDismiss={plan.dismissConflictDialog}
      />
    </>
  );
};

export default CurriculumPlanLauncher;
