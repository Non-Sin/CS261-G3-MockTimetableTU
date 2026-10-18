import { apiFetch } from "@/lib/api";
import type { AddTimetableEntryRequest, Timetable } from "./types";

export type TimetableQuery = {
  academicYear: number;
  semester: number;
};

// Service อ่านตารางตามภาคเรียน/ปีการศึกษาจาก query parameters ของ API Spec
// Timetable ที่ได้กลับมามี entries, totalCredits, maxCredits และ conflicts สำหรับหน้า UI
export const fetchTimetable = ({ academicYear, semester }: TimetableQuery) => {
  const params = new URLSearchParams({
    academicYear: String(academicYear),
    semester: String(semester),
  });

  return apiFetch<Timetable>(`/api/timetable?${params.toString()}`);
};

// ส่ง sectionId ที่ผู้ใช้เลือกเป็น JSON body; backend เป็นผู้บันทึกและคำนวณ
// จากนั้นคืน Timetable ฉบับอัปเดตให้ UI ใช้แทนข้อมูลก่อนหน้า
export const addTimetableEntry = (request: AddTimetableEntryRequest) =>
  apiFetch<Timetable>("/api/timetable/entries", {
    method: "POST",
    body: JSON.stringify(request),
  });
