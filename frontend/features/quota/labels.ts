import type { CourseCategory } from "@/features/courses/types";

// ข้อความหมวดวิชาชุดเดียวกับ US1 (CourseSearchPanel); MINOR มีใน type ของทีมแต่ไม่อยู่ใน Spec ของ US7
export const CATEGORY_LABELS: Record<CourseCategory, string> = {
  MAJOR: "วิชาเฉพาะ",
  GENERAL_EDUCATION: "ศึกษาทั่วไป",
  FREE_ELECTIVE: "วิชาเลือกเสรี",
  MINOR: "วิชาโท",
};

// ใช้เป็นข้อความสำรองเมื่อช่องทางไม่มี label
export const CHANNEL_FALLBACK_LABELS = {
  ONLINE_FORM: "ฟอร์มออนไลน์",
  QUOTA_SYSTEM: "เว็บไซต์ระบบโควตา",
  FACULTY_OFFICE: "ยื่นเอกสารที่คณะ/ภาควิชา",
  INSTRUCTOR: "ติดต่ออาจารย์ผู้สอนโดยตรง",
  OTHER: "ช่องทางอื่น",
} as const;

// ลิงก์ภายนอกเปิดได้เฉพาะ https:// (Spec บังคับตอน seed; ตรวจซ้ำฝั่ง UI เพื่อกัน javascript: ฯลฯ)
export const isSafeUrl = (url: string | null): url is string => !!url && url.startsWith("https://");

export const hostnameOf = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

export const EXTERNAL_LINK_PROPS = { target: "_blank", rel: "noopener noreferrer" } as const;
