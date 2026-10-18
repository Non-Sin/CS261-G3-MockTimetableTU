import { apiFetch } from "@/lib/api";
import type { Course, CourseCategory } from "./types";

export type CourseSearchParams = {
  academicYear: number;
  semester: number;
  q?: string;
  category?: CourseCategory;
};

// Service สำหรับเชื่อม endpoint ค้นหารายวิชาตาม API Spec เมื่อ backend พร้อม
// รับ filters จากหน้าค้นหา, แปลงเป็น query string แล้วส่งผ่าน apiFetch กลาง
// ผลลัพธ์ที่ resolve กลับมาคือ Course[] ซึ่งใช้รูปแบบเดียวกับข้อมูล mock
export const fetchCourses = (filters: CourseSearchParams) => {
  const params = new URLSearchParams({
    academicYear: String(filters.academicYear),
    semester: String(filters.semester),
  });
  const query = filters.q?.trim();

  // ไม่ส่ง q ว่าง; ส่ง category เฉพาะเมื่อเลือกหมวด ไม่เช่นนั้น backend ใช้ค่าทั้งหมด
  if (query) params.set("q", query);
  if (filters.category) params.set("category", filters.category);

  return apiFetch<Course[]>(`/api/courses?${params.toString()}`);
};
