import type { CourseCategory } from "@/features/courses/types";
import type { Timetable } from "@/features/timetable/types";

export type StudyPlanCourse = {
  courseCode: string;
  courseName: string;
  category: CourseCategory;
  credits: number;
};

export type PlanType = "SPECIAL_PROJECT" | "CO_OP";

export type StudyPlan = {
  planId: number;
  curriculumName: string;
  studyYear: number;
  semester: number;
  planType: PlanType | null;
  totalCredits: number;
  courses: StudyPlanCourse[];
};

export type StudyMinor = {
  minorId: number;
  /** 1 รายการต่อ 1 วิชาโท × 1 แผน วิชาโทเดียวกันมีได้ 2 รายการ UI กรองตามแผนที่เลือก */
  planType: PlanType;
  curriculumName: string;
  minorName: string;
  totalCredits: number;
  courses: StudyPlanCourse[];
};

export type StudyPlanList = {
  department: string;
  studyYear: number;
  semester: number;
  plans: StudyPlan[];
  minors: StudyMinor[];
};

export type StudyYear = 1 | 2 | 3 | 4;
export type PlanSemester = 1 | 2;

export type StudyPlanQuery = {
  studyYear: StudyYear;
  semester: PlanSemester;
};

export type ApplyPlanRequest = {
  planId: number;
  minorId?: number | null;
  academicYear: number;
  dryRun?: boolean;
};

export type PlanCourseSource = "PLAN" | "MINOR";

export type PlanSkipReason =
  | "COURSE_ALREADY_IN_TIMETABLE"
  | "NO_SECTION_AVAILABLE"
  | "CREDIT_LIMIT_EXCEEDED"
  | "TIME_CONFLICT";

export type AddedPlanCourse = StudyPlanCourse & {
  source: PlanCourseSource;
  sectionId: number;
  sectionNo: string;
};

export type SkippedPlanCourse = StudyPlanCourse & {
  source: PlanCourseSource;
  reason: PlanSkipReason;
  message: string;
  conflictWith?: string[];
  existingSectionNo?: string;
  currentCredits?: number;
  maxCredits?: number;
};

export type ApplyPlanResponse = {
  planId: number;
  minorId: number | null;
  dryRun: boolean;
  added: AddedPlanCourse[];
  skipped: SkippedPlanCourse[];
  timetable: Timetable | null;
};
