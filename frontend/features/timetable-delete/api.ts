import { apiFetch } from "@/lib/api";
import type { Timetable } from "@/features/timetable/types";

// DELETE ไม่ส่ง body ต่อ entryIds เข้า URL แทน (US2-T05 DTO & API Spec)
export const timetableDeleteApi = {
  removeEntry: (entryId: number) =>
    apiFetch<Timetable>(`/api/timetable/entries/${entryId}`, { method: "DELETE" }),
  removeEntries: (entryIds: number[]) =>
    apiFetch<Timetable>(`/api/timetable/entries?entryIds=${entryIds.join(",")}`, {
      method: "DELETE",
    }),
};
