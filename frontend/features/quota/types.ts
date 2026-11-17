// ต้องตรงกับ quota.dto ฝั่ง backend (US7-DTO-API-Spec)
import type { CourseCategory } from "@/features/courses/types";

export type QuotaStatus = "REQUIRED" | "NOT_REQUIRED" | "NO_DATA" | "NOT_OFFERED";

export type QuotaChannelType = "ONLINE_FORM" | "QUOTA_SYSTEM" | "FACULTY_OFFICE" | "INSTRUCTOR" | "OTHER";

export type QuotaCondition = {
  text: string;
  relatedCourseCode: string | null; // ชิปรหัสวิชาที่กดได้
};

export type QuotaRound = {
  roundNo: number;
  label: string | null; // เช่น "คำร้องช่วงต้น"
  startDate: string | null; // ISO yyyy-MM-dd (ค.ศ.) null = กำหนดส่งวันเดียว
  endDate: string; // ISO yyyy-MM-dd (ค.ศ.)
  endTime: string | null; // HH:mm
};

export type QuotaChannel = {
  channelType: QuotaChannelType;
  label: string;
  url: string | null; // null = ไม่มีลิงก์ (เช่น ยื่นที่คณะ)
  note: string | null;
};

export type QuotaContact = {
  organizationName: string;
  label: string;
  url: string | null;
};

export type QuotaCourse = {
  courseCode: string;
  courseName: string;
  courseNameTh: string | null;
  category: CourseCategory;
  credits: number;
  inMyTimetable: boolean;
  quotaStatus: QuotaStatus;
  offeredSemesters: number[];
  conditions: QuotaCondition[]; // [] เมื่อไม่ใช่ REQUIRED
  rounds: QuotaRound[];
  channels: QuotaChannel[];
  contacts: QuotaContact[];
};

export type QuotaSearchResponse = {
  academicYear: number;
  semester: number;
  query: string | null;
  mine: boolean;
  total: number;
  courses: QuotaCourse[];
};

export type QuotaTerm = { academicYear: number; semester: 1 | 2 };

export type QuotaSearchQuery = QuotaTerm & { q?: string; mine?: boolean };

export type QuotaErrorCode = "QUOTA_SEARCH_QUERY_REQUIRED";