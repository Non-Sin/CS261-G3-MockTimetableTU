import type { CourseCategory } from "@/features/courses/types";
import type {
  ApplyPlanResponse,
  PlanSemester,
  PlanSkipReason,
  PlanType,
  StudyMinor,
  StudyPlan,
  StudyPlanList,
  StudyYear,
} from "../types";

const STUDY_YEARS: StudyYear[] = [1, 2, 3, 4];
const SEMESTERS: PlanSemester[] = [1, 2];

const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  SPECIAL_PROJECT: "ทำหัวข้อพิเศษ",
  CO_OP: "สหกิจศึกษา",
};

const CATEGORY_LABELS: Record<CourseCategory, string> = {
  MAJOR: "วิชาเฉพาะ",
  GENERAL_EDUCATION: "ศึกษาทั่วไป",
  FREE_ELECTIVE: "เลือกเสรี",
};

const SKIP_REASON_LABELS: Record<PlanSkipReason, string> = {
  COURSE_ALREADY_IN_TIMETABLE: "อยู่ในตารางแล้ว",
  NO_SECTION_AVAILABLE: "ไม่เปิดสอนในภาคนี้",
  CREDIT_LIMIT_EXCEEDED: "หน่วยกิตเกินกำหนด",
  TIME_CONFLICT: "เวลาเรียนชน",
};

type CurriculumPlanModalProps = {
  isOpen: boolean;
  academicYear: number;
  studyYear: StudyYear | null;
  semester: PlanSemester | null;
  curricula: string[];
  activeCurriculum: string | null;
  requiresPlanType: boolean;
  selectedPlanType: PlanType | null;
  availableMinors: StudyMinor[];
  effectiveMinorId: number | null;
  activeMinor: StudyMinor | null;
  validPlanList: StudyPlanList | null;
  activePlan: StudyPlan | null;
  plansLoading: boolean;
  plansError: string | null;
  preview: ApplyPlanResponse | null;
  previewLoading: boolean;
  previewError: string | null;
  confirming: boolean;
  confirmError: string | null;
  onClose: () => void;
  onSelectStudyYear: (year: StudyYear) => void;
  onSelectSemester: (semester: PlanSemester) => void;
  onSelectCurriculum: (curriculumName: string) => void;
  onSelectPlanType: (planType: PlanType) => void;
  onSelectMinorId: (minorId: number | null) => void;
  onRetryPlans: () => void;
  onRetryPreview: () => void;
  onConfirm: () => void;
};

const buildRecommendationHeading = (
  studyYear: StudyYear | null,
  semester: PlanSemester | null,
  planType: PlanType | null,
  activeMinor: StudyMinor | null,
) => {
  const details: string[] = [];
  if (planType) {
    details.push(`แผน${PLAN_TYPE_LABELS[planType]}`);
  }
  if (activeMinor) {
    details.push(`วิชาโท${activeMinor.minorName}`);
  }
  const suffix = details.length > 0 ? ` (${details.join(" · ")})` : "";
  return `วิชาแนะนำสำหรับ: ชั้นปีที่ ${studyYear} ภาคเรียนที่ ${semester}${suffix}`;
};

const CurriculumPlanModal = ({
  isOpen,
  academicYear,
  studyYear,
  semester,
  curricula,
  activeCurriculum,
  requiresPlanType,
  selectedPlanType,
  availableMinors,
  effectiveMinorId,
  activeMinor,
  validPlanList,
  activePlan,
  plansLoading,
  plansError,
  preview,
  previewLoading,
  previewError,
  confirming,
  confirmError,
  onClose,
  onSelectStudyYear,
  onSelectSemester,
  onSelectCurriculum,
  onSelectPlanType,
  onSelectMinorId,
  onRetryPlans,
  onRetryPreview,
  onConfirm,
}: CurriculumPlanModalProps) => {
  if (!isOpen) return null;

  const isEmptyPlans = validPlanList !== null && validPlanList.plans.length === 0;
  const canConfirm = Boolean(activePlan && preview && !previewLoading && !previewError && !confirming);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="จัดตารางเรียนตามแผนหลักสูตร"
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-[#d4151e] via-[#e5531a] to-[#f59e0b]" />
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff0f1] text-[#d4151e]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
              </svg>
            </div>
            <div>
              <h2 id="curriculum-plan-modal-title" className="text-lg font-bold text-slate-900 sm:text-xl">
                จัดตารางเรียนตามเล่มหลักสูตร
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                เลือกชั้นปีและภาคการศึกษาเพื่อจำลองตารางเรียนตามแผนการศึกษาแนะนำของหลักสูตร วท.บ. วิทยาการคอมพิวเตอร์
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="X"
            title="ปิดหน้าต่าง"
            disabled={confirming}
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span aria-hidden="true" className="text-base leading-none font-semibold">
              ×
            </span>
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* ตัวเลือกชั้นปี */}
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-800">เลือกชั้นปี</p>
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-[#d4151e]">
                  จำเป็น
                </span>
              </div>
              <span className="text-xs text-slate-400">
                {activePlan?.curriculumName ?? activeCurriculum ?? "หลักสูตรปรับปรุง พ.ศ. 2566"}
              </span>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {STUDY_YEARS.map((year) => {
                const selected = studyYear === year;
                return (
                  <button
                    key={year}
                    type="button"
                    aria-pressed={selected}
                    disabled={confirming}
                    onClick={() => onSelectStudyYear(year)}
                    className={`flex flex-col items-start rounded-2xl border px-4 py-3 text-left transition ${
                      selected
                        ? "border-[#d4151e] bg-[#fff5f5] ring-1 ring-[#d4151e]/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`text-[11px] font-semibold ${
                        selected ? "text-[#d4151e]" : "text-slate-400"
                      }`}
                    >
                      Year {year}
                    </span>
                    <span className="mt-0.5 text-sm font-bold text-slate-900">
                      ชั้นปีที่ {year}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ตัวเลือกแผนการศึกษา (เฉพาะชั้นปี 3–4) */}
          {requiresPlanType && (
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-900">
                  เลือกแผนการศึกษา / รูปแบบการเรียน (ชั้นปีที่ {studyYear})
                </p>
                <span className="text-xs font-semibold text-amber-700">เลือกได้ 1 แผน</span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(["SPECIAL_PROJECT", "CO_OP"] as PlanType[]).map((planType) => {
                  const selected = selectedPlanType === planType;
                  return (
                    <button
                      key={planType}
                      type="button"
                      aria-pressed={selected}
                      disabled={confirming}
                      onClick={() => onSelectPlanType(planType)}
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
                        selected
                          ? "border-[#c91725] bg-[#fff5f5] text-slate-900 ring-1 ring-[#c91725]/20"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                          selected
                            ? "bg-[#c91725] text-white"
                            : "border border-slate-300 bg-white text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      <span>{PLAN_TYPE_LABELS[planType]}</span>
                    </button>
                  );
                })}
              </div>
              {!selectedPlanType && (
                <p className="mt-2.5 text-xs text-slate-500">
                  กรุณาเลือกแผนการศึกษาเพื่อแสดงรายวิชาแนะนำ
                </p>
              )}
            </div>
          )}

          {/* ตัวเลือกวิชาโท (เฉพาะชั้นปี 3–4 และมีวิชาโทในภาคนั้น) */}
          {studyYear !== null && studyYear >= 3 && availableMinors.length > 0 && (
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-900">เลือกวิชาโท</p>
                <span className="text-xs font-semibold text-slate-500">เลือกได้ 1 อย่าง</span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <button
                  type="button"
                  aria-pressed={effectiveMinorId === null}
                  disabled={confirming}
                  onClick={() => onSelectMinorId(null)}
                  className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-left text-xs font-bold transition sm:text-sm ${
                    effectiveMinorId === null
                      ? "border-[#c91725] bg-[#fff5f5] text-slate-900 ring-1 ring-[#c91725]/20"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                      effectiveMinorId === null
                        ? "bg-[#c91725] text-white"
                        : "border border-slate-300 bg-white text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span className="truncate">ไม่เรียนวิชาโท</span>
                </button>
                {availableMinors.map((minor) => {
                  const selected = effectiveMinorId === minor.minorId;
                  return (
                    <button
                      key={minor.minorId}
                      type="button"
                      aria-pressed={selected}
                      disabled={confirming}
                      onClick={() => onSelectMinorId(minor.minorId)}
                      className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-left text-xs font-bold transition sm:text-sm ${
                        selected
                          ? "border-[#c91725] bg-[#fff5f5] text-slate-900 ring-1 ring-[#c91725]/20"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                          selected
                            ? "bg-[#c91725] text-white"
                            : "border border-slate-300 bg-white text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      <span className="truncate">{minor.minorName}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ตัวเลือกภาคเรียน */}
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-slate-800">เลือกภาคเรียน</p>
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-[#d4151e]">
                จำเป็น
              </span>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-3 sm:max-w-lg">
              {SEMESTERS.map((sem) => {
                const selected = semester === sem;
                return (
                  <button
                    key={sem}
                    type="button"
                    aria-pressed={selected}
                    disabled={confirming}
                    onClick={() => onSelectSemester(sem)}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
                      selected
                        ? "border-[#d4151e] bg-[#fff5f5] text-slate-900 ring-1 ring-[#d4151e]/20"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    ภาคเรียนที่ {sem}
                  </button>
                );
              })}
            </div>
          </div>

          {/* สถานะโหลดแผนการเรียน */}
          {plansLoading && (
            <p role="status" className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              กำลังโหลดแผนการเรียน…
            </p>
          )}

          {/* ข้อผิดพลาดขณะโหลดแผนการเรียน */}
          {plansError && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <span>{plansError}</span>
              <button
                type="button"
                onClick={onRetryPlans}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-100"
              >
                ลองใหม่
              </button>
            </div>
          )}

          {/* กรณีไม่มีแผนการเรียน */}
          {isEmptyPlans && (
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-600">
              ยังไม่มีแผนการเรียนสำหรับชั้นปีนี้
            </p>
          )}

          {/* เลือกหลักสูตร (เมื่อมีมากกว่า 1 หลักสูตร) */}
          {curricula.length > 1 && (
            <div>
              <p className="text-sm font-semibold text-slate-800">หลักสูตร</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {curricula.map((curriculumName) => {
                  const selected = activeCurriculum === curriculumName;
                  return (
                    <button
                      key={curriculumName}
                      type="button"
                      aria-pressed={selected}
                      disabled={confirming}
                      onClick={() => onSelectCurriculum(curriculumName)}
                      className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition sm:text-sm ${
                        selected
                          ? "border-[#c91725] bg-[#fff0f1] text-[#c91725]"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {curriculumName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ส่วนสรุปรายวิชาแนะนำและ preview */}
          {activePlan && (
            <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900">
                  {buildRecommendationHeading(
                    studyYear,
                    semester,
                    selectedPlanType,
                    activeMinor,
                  )}
                </h3>
              </div>

              {previewLoading && (
                <p role="status" className="rounded-xl bg-white p-4 text-sm text-slate-600">
                  กำลังคำนวณรายวิชาและกลุ่มเรียน…
                </p>
              )}

              {previewError && (
                <div
                  role="alert"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                  <span>{previewError}</span>
                  <button
                    type="button"
                    onClick={onRetryPreview}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-100"
                  >
                    ลองใหม่
                  </button>
                </div>
              )}

              {preview && (
                <div className="space-y-4">
                  {/* รายการวิชาที่จะเพิ่มลงตาราง */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500">
                      วิชาที่จะเพิ่มลงตาราง ({preview.added.length} วิชา)
                    </p>
                    {preview.added.length === 0 ? (
                      <p className="mt-2 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-500">
                        ไม่มีวิชาที่เพิ่มลงตารางได้ในแผนนี้
                      </p>
                    ) : (
                      <ul className="mt-2.5 space-y-2.5">
                        {preview.added.map((course) => (
                          <li
                            key={course.courseCode}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-xs"
                          >
                            <div className="flex min-w-0 items-center gap-3.5">
                              <span className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                                {course.courseCode}
                              </span>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <p className="truncate text-sm font-bold text-slate-900">
                                    {course.courseName}
                                  </p>
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                    {CATEGORY_LABELS[course.category]}
                                  </span>
                                  {course.source === "MINOR" && (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                                      วิชาโท
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 text-xs text-slate-500">
                                  กลุ่มเรียน: <span className="font-semibold text-slate-700">Sec {course.sectionNo}</span>
                                </p>
                              </div>
                            </div>
                            <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                              {course.credits.toFixed(1)} หน่วยกิต
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* รายการวิชาที่เพิ่มไม่ได้พร้อมเหตุผล */}
                  {preview.skipped.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-amber-800">
                        วิชาที่เพิ่มไม่ได้ ({preview.skipped.length} วิชา)
                      </p>
                      <ul className="mt-2 space-y-2">
                        {preview.skipped.map((course) => (
                          <li
                            key={course.courseCode}
                            className="rounded-xl border border-amber-200 bg-amber-50/70 p-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-slate-900">
                                  {course.courseCode}
                                </span>
                                {course.source === "MINOR" && (
                                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                                    วิชาโท
                                  </span>
                                )}
                                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                                  {SKIP_REASON_LABELS[course.reason]}
                                </span>
                              </div>
                              <span className="text-xs text-slate-600">
                                {course.credits} หน่วยกิต
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-600">{course.courseName}</p>
                            <p className="mt-1 text-xs font-medium text-amber-900">
                              {course.message}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {confirmError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {confirmError}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/40 px-6 py-4">
          <button
            type="button"
            disabled={confirming}
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ยกเลิก
          </button>

          {activePlan && (
            <button
              type="button"
              disabled={!canConfirm}
              onClick={onConfirm}
              className="inline-flex items-center gap-2 rounded-xl bg-[#e04819] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c83c12] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              <span aria-hidden="true">✓</span>
              <span>{confirming ? "กำลังเพิ่มลงตาราง…" : "เพิ่มลงตารางเรียน"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CurriculumPlanModal;
