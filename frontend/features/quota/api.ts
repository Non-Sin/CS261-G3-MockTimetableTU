import { apiFetch } from "@/lib/api";
import type { QuotaCourse, QuotaSearchQuery, QuotaSearchResponse, QuotaTerm } from "./types";

// GET /api/quota/courses: ต้องมี q ที่ไม่ว่าง หรือ mine=true อย่างน้อยหนึ่งอย่าง ไม่เช่นนั้น backend ตอบ 400
// (ฝั่ง UI จึงไม่เรียกเมื่อทั้งสองอย่างว่าง) ไม่ส่ง q ว่าง และส่ง mine เฉพาะเมื่อเป็น true
export const searchQuotaCourses = (query: QuotaSearchQuery) => {
  const params = new URLSearchParams({
    academicYear: String(query.academicYear),
    semester: String(query.semester),
  });
  const q = query.q?.trim();

  if (q) params.set("q", q);
  if (query.mine) params.set("mine", "true");

  return apiFetch<QuotaSearchResponse>(`/api/quota/courses?${params.toString()}`);
};

// GET /api/quota/courses/{courseCode}: ใช้ตอนกดชิปรหัสวิชาในเงื่อนไข; วิชาที่ไม่มีในระบบตอบ 404
export const getCourseQuota = (courseCode: string, term: QuotaTerm) => {
  const params = new URLSearchParams({
    academicYear: String(term.academicYear),
    semester: String(term.semester),
  });

  return apiFetch<QuotaCourse>(
    `/api/quota/courses/${encodeURIComponent(courseCode)}?${params.toString()}`,
  );
};
