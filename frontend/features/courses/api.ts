import { apiFetch } from "@/lib/api";
import type { Course, CourseCategory } from "./types";

export type CourseSearchParams = {
  academicYear: number;
  semester: number;
  q?: string;
  category?: CourseCategory;
};

// ค้นหารายวิชาที่เปิดสอนในภาคเรียนที่เลือก ไม่ส่ง q หรือ category ถ้าไม่ได้กรอง
export const coursesApi = {
  search: ({ academicYear, semester, q, category }: CourseSearchParams) => {
    const params = new URLSearchParams({
      academicYear: String(academicYear),
      semester: String(semester),
    });
    if (q?.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);

    return apiFetch<Course[]>(`/api/courses?${params}`);
  },
};
