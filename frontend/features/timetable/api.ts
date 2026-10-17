import { apiFetch } from "@/lib/api";
import type { AddTimetableEntryRequest, Timetable } from "./types";

// เรียก API ตารางเรียนจำลองของนักศึกษาที่ใช้งานอยู่ ตาม US1-T05
export const timetableApi = {
  get: (academicYear: number, semester: number) =>
    apiFetch<Timetable>(`/api/timetable?academicYear=${academicYear}&semester=${semester}`),
  addEntry: (data: AddTimetableEntryRequest) =>
    apiFetch<Timetable>("/api/timetable/entries", { method: "POST", body: JSON.stringify(data) }),
};
