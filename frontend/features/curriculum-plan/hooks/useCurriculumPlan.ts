import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import type { Timetable } from "@/features/timetable/types";
import { applyPlan, getPlans } from "../api";
import type {
  ApplyPlanRequest,
  ApplyPlanResponse,
  PlanSemester,
  PlanType,
  SkippedPlanCourse,
  StudyPlanList,
  StudyYear,
} from "../types";

type UseCurriculumPlanOptions = {
  academicYear: number;
  onApplyTimetable: (timetable: Timetable) => void;
};

type KeyedValue<T> = { key: string; value: T };

const toUserErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError && error.message && !error.message.startsWith("HTTP ")) {
    return error.message;
  }
  return fallback;
};

export const useCurriculumPlan = ({
  academicYear,
  onApplyTimetable,
}: UseCurriculumPlanOptions) => {
  const [isOpen, setIsOpen] = useState(false);
  const [studyYear, setStudyYear] = useState<StudyYear | null>(null);
  const [semester, setSemester] = useState<PlanSemester | null>(null);
  const [selectedCurriculum, setSelectedCurriculum] = useState<string | null>(null);
  const [selectedPlanType, setSelectedPlanType] = useState<PlanType | null>(null);
  const [selectedMinorId, setSelectedMinorId] = useState<number | null>(null);

  const [loadedPlans, setLoadedPlans] = useState<KeyedValue<StudyPlanList> | null>(null);
  const [plansErrorState, setPlansErrorState] = useState<KeyedValue<string> | null>(null);
  const [plansRetryTick, setPlansRetryTick] = useState(0);

  const [loadedPreview, setLoadedPreview] = useState<KeyedValue<ApplyPlanResponse> | null>(null);
  const [previewErrorState, setPreviewErrorState] = useState<KeyedValue<string> | null>(null);
  const [previewRetryTick, setPreviewRetryTick] = useState(0);

  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [conflictItems, setConflictItems] = useState<SkippedPlanCourse[]>([]);

  const lastPreviewKeyRef = useRef<string | null>(null);
  const confirmingRef = useRef(false);

  const resetModalState = () => {
    setStudyYear(null);
    setSemester(null);
    setSelectedCurriculum(null);
    setSelectedPlanType(null);
    setSelectedMinorId(null);
    setLoadedPlans(null);
    setPlansErrorState(null);
    setLoadedPreview(null);
    setPreviewErrorState(null);
    setConfirming(false);
    setConfirmError(null);
    lastPreviewKeyRef.current = null;
    confirmingRef.current = false;
  };

  const openModal = () => {
    resetModalState();
    setIsOpen(true);
  };

  const closeModal = () => {
    if (confirmingRef.current) return;
    setIsOpen(false);
    resetModalState();
  };

  const selectStudyYear = (nextYear: StudyYear) => {
    if (nextYear === studyYear) return;
    setStudyYear(nextYear);
    if (nextYear <= 2) {
      setSelectedPlanType(null);
      setSelectedMinorId(null);
    }
    setConfirmError(null);
    lastPreviewKeyRef.current = null;
  };

  const selectSemester = (nextSemester: PlanSemester) => {
    if (nextSemester === semester) return;
    setSemester(nextSemester);
    setConfirmError(null);
    lastPreviewKeyRef.current = null;
  };

  const selectCurriculum = (curriculumName: string) => {
    if (curriculumName === selectedCurriculum) return;
    setSelectedCurriculum(curriculumName);
    setSelectedMinorId(null);
    setConfirmError(null);
    lastPreviewKeyRef.current = null;
  };

  const selectPlanType = (nextType: PlanType) => {
    if (nextType === selectedPlanType) return;
    setSelectedPlanType(nextType);
    setConfirmError(null);
    lastPreviewKeyRef.current = null;
  };

  const selectMinorId = (nextMinorId: number | null) => {
    if (nextMinorId === selectedMinorId) return;
    setSelectedMinorId(nextMinorId);
    setConfirmError(null);
    lastPreviewKeyRef.current = null;
  };

  const plansKey =
    isOpen && studyYear !== null && semester !== null
      ? `${studyYear}:${semester}:${plansRetryTick}`
      : null;

  // โหลดรายการแผนเมื่อผู้ใช้เลือกทั้งชั้นปีและภาคเรียนครบ
  useEffect(() => {
    if (!plansKey || studyYear === null || semester === null) return;
    let ignore = false;

    getPlans({ studyYear, semester })
      .then((data) => {
        if (ignore) return;
        setLoadedPlans({ key: plansKey, value: data });
        setPlansErrorState(null);

        const curricula = Array.from(new Set(data.plans.map((p) => p.curriculumName)));
        const nextCurriculum =
          selectedCurriculum && curricula.includes(selectedCurriculum)
            ? selectedCurriculum
            : (curricula[0] ?? null);

        const nextMinors =
          studyYear >= 3
            ? data.minors.filter((m) => !nextCurriculum || m.curriculumName === nextCurriculum)
            : [];

        if (selectedMinorId !== null && !nextMinors.some((m) => m.minorId === selectedMinorId)) {
          setSelectedMinorId(null);
        }
      })
      .catch((error: unknown) => {
        if (ignore) return;
        setPlansErrorState({
          key: plansKey,
          value: toUserErrorMessage(error, "โหลดแผนการเรียนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"),
        });
      });

    return () => {
      ignore = true;
    };
    // โหลดใหม่เมื่อเปลี่ยน plansKey (studyYear / semester / retry) เท่านั้น
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plansKey]);

  const validPlanList =
    plansKey !== null && loadedPlans?.key === plansKey ? loadedPlans.value : null;
  const plansError =
    plansKey !== null && plansErrorState?.key === plansKey ? plansErrorState.value : null;
  const plansLoading = plansKey !== null && validPlanList === null && plansError === null;

  const curricula = validPlanList
    ? Array.from(new Set(validPlanList.plans.map((p) => p.curriculumName)))
    : [];

  const activeCurriculum =
    selectedCurriculum && curricula.includes(selectedCurriculum)
      ? selectedCurriculum
      : (curricula[0] ?? null);

  const plansInCurriculum = validPlanList
    ? validPlanList.plans.filter((p) => p.curriculumName === activeCurriculum)
    : [];

  const requiresPlanType = plansInCurriculum.some((p) => p.planType !== null);

  const activePlan =
    plansInCurriculum.length === 0
      ? null
      : requiresPlanType
        ? selectedPlanType
          ? (plansInCurriculum.find((p) => p.planType === selectedPlanType) ?? null)
          : null
        : plansInCurriculum[0];

  const availableMinors =
    studyYear !== null && studyYear >= 3 && validPlanList !== null
      ? validPlanList.minors.filter(
          (m) => !activeCurriculum || m.curriculumName === activeCurriculum,
        )
      : [];

  const effectiveMinorId =
    selectedMinorId !== null && availableMinors.some((m) => m.minorId === selectedMinorId)
      ? selectedMinorId
      : null;

  const activeMinor =
    effectiveMinorId !== null
      ? (availableMinors.find((m) => m.minorId === effectiveMinorId) ?? null)
      : null;

  const previewKey =
    isOpen && activePlan
      ? `${activePlan.planId}:${effectiveMinorId ?? "none"}:${academicYear}:${previewRetryTick}`
      : null;

  // เรียก preview (dryRun: true) อัตโนมัติเมื่อเลือกค่าที่จำเป็นครบ
  useEffect(() => {
    if (!previewKey || !activePlan) return;
    if (lastPreviewKeyRef.current === previewKey) return;
    lastPreviewKeyRef.current = previewKey;

    let ignore = false;

    const request: ApplyPlanRequest = {
      planId: activePlan.planId,
      academicYear,
      dryRun: true,
      ...(effectiveMinorId !== null ? { minorId: effectiveMinorId } : {}),
    };

    applyPlan(request)
      .then((response) => {
        if (ignore) return;
        setLoadedPreview({ key: previewKey, value: response });
        setPreviewErrorState(null);
      })
      .catch((error: unknown) => {
        if (ignore) return;
        setPreviewErrorState({
          key: previewKey,
          value: toUserErrorMessage(error, "ไม่สามารถคำนวณวิชาแนะนำได้ กรุณาลองใหม่อีกครั้ง"),
        });
      });

    return () => {
      ignore = true;
      if (lastPreviewKeyRef.current === previewKey) {
        lastPreviewKeyRef.current = null;
      }
    };
  }, [previewKey, activePlan, effectiveMinorId, academicYear]);

  const preview =
    previewKey !== null && loadedPreview?.key === previewKey ? loadedPreview.value : null;
  const previewError =
    previewKey !== null && previewErrorState?.key === previewKey ? previewErrorState.value : null;
  const previewLoading = previewKey !== null && preview === null && previewError === null;

  const retryPlans = () => {
    setPlansErrorState(null);
    setPlansRetryTick((tick) => tick + 1);
  };

  const retryPreview = () => {
    lastPreviewKeyRef.current = null;
    setPreviewErrorState(null);
    setPreviewRetryTick((tick) => tick + 1);
  };

  const confirmPlan = async () => {
    if (!activePlan || !preview || previewLoading || previewError || confirmingRef.current) {
      return;
    }

    confirmingRef.current = true;
    setConfirming(true);
    setConfirmError(null);

    const request: ApplyPlanRequest = {
      planId: activePlan.planId,
      academicYear,
      dryRun: false,
      ...(effectiveMinorId !== null ? { minorId: effectiveMinorId } : {}),
    };

    try {
      const response = await applyPlan(request);
      if (response.timetable) {
        onApplyTimetable(response.timetable);
      }
      const conflicts = response.skipped.filter((item) => item.reason === "TIME_CONFLICT");
      setIsOpen(false);
      resetModalState();
      if (conflicts.length > 0) {
        setConflictItems(conflicts);
      }
    } catch (error: unknown) {
      setConfirmError(
        toUserErrorMessage(error, "เพิ่มวิชาตามแผนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"),
      );
    } finally {
      confirmingRef.current = false;
      setConfirming(false);
    }
  };

  const dismissConflictDialog = () => setConflictItems([]);

  return {
    isOpen,
    openModal,
    closeModal,
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
    conflictItems,
    selectStudyYear,
    selectSemester,
    selectCurriculum,
    selectPlanType,
    selectMinorId,
    retryPlans,
    retryPreview,
    confirmPlan,
    dismissConflictDialog,
  };
};
