import { apiFetch } from "@/lib/api";
import type {
  ElectiveDetail,
  ElectiveSearchParams,
  ElectiveSummary,
} from "./types";

export function fetchElectives(params: ElectiveSearchParams) {
  const query = new URLSearchParams({
    academicYear: String(params.academicYear),
    currentSemester: String(params.currentSemester),
  });
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.semester !== undefined)
    query.set("semester", String(params.semester));
  if (params.day) query.set("day", params.day);
  if (params.timeSlot) query.set("timeSlot", params.timeSlot);
  if (params.group) query.set("group", params.group);
  if (params.excludeConflicts) query.set("excludeConflicts", "true");
  return apiFetch<ElectiveSummary[]>(`/api/electives?${query}`);
}

export function fetchElectiveDetail(
  courseCode: string,
  academicYear: number,
  currentSemester: number,
) {
  const query = new URLSearchParams({
    academicYear: String(academicYear),
    currentSemester: String(currentSemester),
  });
  // รายละเอียดแสดง Sec ทั้งปี ไม่ส่งตัวกรองของหน้ารายการตามไปด้วย
  return apiFetch<ElectiveDetail>(
    `/api/electives/${encodeURIComponent(courseCode)}?${query}`,
  );
}
