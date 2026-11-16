import type { DayOfWeek, ScheduleSlot } from "../courses/types";

export type InterestGroup =
  "LANGUAGE" | "PSYCHOLOGY" | "SOCIETY" | "SCIENCE" | "MEDIA";
export type TimeSlot = "MORNING" | "AFTERNOON" | "EVENING";
export type ElectiveTag =
  | "NO_ATTENDANCE"
  | "NO_EXAM"
  | "NO_GROUP_WORK"
  | "KIND_INSTRUCTOR"
  | "NO_PREREQUISITE"
  | "EASY_GRADE";

export type ElectiveSearchParams = {
  academicYear: number;
  currentSemester: number;
  q?: string;
  semester?: 1 | 2;
  day?: DayOfWeek;
  timeSlot?: TimeSlot;
  group?: InterestGroup;
  excludeConflicts?: boolean;
};

export type ElectiveSummary = {
  courseCode: string;
  courseName: string;
  courseNameTh: string;
  credits: number;
  group: InterestGroup;
  requiresQuota: boolean;
  offeredSemesters: number[];
  tags: ElectiveTag[];
};

export type ElectiveSection = {
  sectionId: number;
  sectionNo: string;
  semester: number;
  instructor: string | null;
  schedules: ScheduleSlot[];
  selectable: boolean;
  inTimetable: boolean;
  conflictWith: string[];
};

export type ElectiveDetail = ElectiveSummary & {
  description: string[];
  sections: ElectiveSection[];
};

// ค่าของตัวกรองเท่านั้น ภาคของตารางปัจจุบันรับมาจาก useTimetable แยกกัน
export type ElectiveFilters = {
  semester: "" | "1" | "2";
  day: "" | DayOfWeek;
  timeSlot: "" | TimeSlot;
  group: "" | InterestGroup;
  excludeConflicts: boolean;
};
