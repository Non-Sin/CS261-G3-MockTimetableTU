import type { ElectiveTag, InterestGroup } from "./types";

export const INTEREST_GROUPS: InterestGroup[] = [
  "LANGUAGE",
  "PSYCHOLOGY",
  "SOCIETY",
  "SCIENCE",
  "MEDIA",
];

export const INTEREST_GROUP_LABELS: Record<InterestGroup, string> = {
  LANGUAGE: "หมวดภาษาและการสื่อสาร",
  PSYCHOLOGY: "หมวดจิตวิทยาและพฤติกรรมศาสตร์",
  SOCIETY: "หมวดสังคม วัฒนธรรม และสุขภาพ",
  SCIENCE: "หมวดวิทยาศาสตร์และเทคโนโลยี",
  MEDIA: "หมวดสื่อ สารสนเทศ และภาพยนตร์",
};

export const TAG_LABELS: Record<ElectiveTag, string> = {
  NO_ATTENDANCE: "ไม่เช็คชื่อ",
  NO_EXAM: "ไม่มีสอบ",
  NO_GROUP_WORK: "ไม่มีงานกลุ่ม",
  KIND_INSTRUCTOR: "อาจารย์ใจดี",
  NO_PREREQUISITE: "ไม่มีพื้นฐานเรียนได้",
  EASY_GRADE: "เก็บ A ง่าย",
};

export const TAG_STYLES: Record<ElectiveTag, string> = {
  NO_ATTENDANCE: "border-red-200 bg-red-50 text-red-700",
  NO_EXAM: "border-red-200 bg-red-50 text-red-700",
  NO_GROUP_WORK: "border-orange-200 bg-orange-50 text-orange-700",
  KIND_INSTRUCTOR: "border-blue-200 bg-blue-50 text-blue-700",
  NO_PREREQUISITE: "border-purple-200 bg-purple-50 text-purple-700",
  EASY_GRADE: "border-emerald-200 bg-emerald-50 text-emerald-700",
};
