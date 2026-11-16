import { apiFetch } from "@/lib/api";
import type {
  ApplyPlanRequest,
  ApplyPlanResponse,
  StudyPlanList,
  StudyPlanQuery,
} from "./types";

export const getPlans = ({ studyYear, semester }: StudyPlanQuery) => {
  const params = new URLSearchParams({
    studyYear: String(studyYear),
    semester: String(semester),
  });

  return apiFetch<StudyPlanList>(`/api/study-plans?${params.toString()}`);
};

export const applyPlan = (request: ApplyPlanRequest) =>
  apiFetch<ApplyPlanResponse>("/api/timetable/apply-plan", {
    method: "POST",
    body: JSON.stringify(request),
  });
