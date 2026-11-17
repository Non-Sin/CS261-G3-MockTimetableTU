// ข้อมูลจำลองตามหัวข้อ 7 ของ US7-T11 (ใช้เฉพาะในเทสต์)
import type { QuotaCourse, QuotaSearchResponse } from "./types";

const base = {
  courseNameTh: null,
  category: "MAJOR",
  credits: 3,
  inMyTimetable: false,
  offeredSemesters: [1, 2],
  conditions: [],
  rounds: [],
  channels: [],
  contacts: [],
} as const;

const make = (overrides: Partial<QuotaCourse> & Pick<QuotaCourse, "courseCode" | "courseName" | "quotaStatus">): QuotaCourse => ({
  ...base,
  conditions: [],
  rounds: [],
  channels: [],
  contacts: [],
  offeredSemesters: [1, 2],
  ...overrides,
});

export const COURSE_EL395 = make({
  courseCode: "EL395",
  courseName: "ACADEMIC ENGLISH AND STUDY SKILL 2",
  courseNameTh: "ภาษาอังกฤษเชิงวิชาการและทักษะการศึกษา 2",
  category: "GENERAL_EDUCATION",
  quotaStatus: "REQUIRED",
  conditions: [
    {
      text: "ต้องสอบได้วิชา EL295 Academic English and Study Skill 1 (ภาษาอังกฤษเชิงวิชาการและทักษะการศึกษา 1)",
      relatedCourseCode: "EL295",
    },
  ],
  rounds: [
    { roundNo: 1, label: "คำร้องช่วงต้น", startDate: "2025-08-04", endDate: "2025-08-08", endTime: null },
    { roundNo: 2, label: "คำร้องรอบสอง", startDate: "2025-08-18", endDate: "2025-08-21", endTime: null },
  ],
  channels: [
    { channelType: "QUOTA_SYSTEM", label: "ผ่านเว็บไซต์ระบบโควตา LITU", url: "https://quota-litu.web.app/login", note: null },
  ],
  contacts: [
    {
      organizationName: "สถาบันภาษา มหาวิทยาลัยธรรมศาสตร์ (LITU)",
      label: "Facebook: สถาบันภาษา มหาวิทยาลัยธรรมศาสตร์",
      url: "https://www.facebook.com/litu.thammasat",
    },
  ],
});

export const COURSE_EL295 = make({
  courseCode: "EL295",
  courseName: "ACADEMIC ENGLISH AND STUDY SKILL 1",
  courseNameTh: "ภาษาอังกฤษเชิงวิชาการและทักษะการศึกษา 1",
  category: "GENERAL_EDUCATION",
  quotaStatus: "REQUIRED",
});

export const COURSE_MA211 = make({
  courseCode: "MA211",
  courseName: "CALCULUS 1",
  courseNameTh: "แคลคูลัส 1",
  category: "MAJOR",
  inMyTimetable: true,
  quotaStatus: "REQUIRED",
  rounds: [{ roundNo: 1, label: null, startDate: null, endDate: "2025-08-20", endTime: "15:00" }],
  channels: [{ channelType: "ONLINE_FORM", label: "ผ่าน Google Form", url: "https://forms.gle/NWTyPnsVWtyDak3W8", note: null }],
  contacts: [
    {
      organizationName: "ภาควิชาคณิตศาสตร์และสถิติ คณะวิทยาศาสตร์และเทคโนโลยี",
      label: "Facebook: ภาควิชาคณิตศาสตร์และสถิติ มธ.",
      url: "https://www.facebook.com/mathstat.thammasat",
    },
  ],
});

export const COURSE_NO_TH_NAME = make({
  courseCode: "XX101",
  courseName: "NO THAI NAME",
  quotaStatus: "REQUIRED",
  courseNameTh: null,
});

export const COURSE_NO_CHIP = make({
  courseCode: "XX102",
  courseName: "NO CHIP",
  quotaStatus: "REQUIRED",
  conditions: [{ text: "ต้องได้รับอนุมัติจากอาจารย์ผู้สอน", relatedCourseCode: null }],
});

export const COURSE_MULTI_CHANNELS = make({
  courseCode: "SA201",
  courseName: "MULTI CHANNELS",
  quotaStatus: "REQUIRED",
  channels: [
    { channelType: "QUOTA_SYSTEM", label: "ผ่านเว็บไซต์ระบบโควตาคณะ", url: "https://quota.socanth.tu.ac.th/", note: null },
    { channelType: "FACULTY_OFFICE", label: "ยื่นเอกสารที่คณะ", url: null, note: "ห้องบริการการศึกษา ชั้น 2" },
  ],
});

export const COURSE_CONTACT_NO_URL = make({
  courseCode: "XX103",
  courseName: "CONTACT NO URL",
  quotaStatus: "REQUIRED",
  contacts: [{ organizationName: "งานบริการการศึกษา", label: "ติดต่อที่ห้องธุรการ", url: null }],
});

export const COURSE_NO_ROUNDS = make({ courseCode: "XX104", courseName: "NO ROUNDS", quotaStatus: "REQUIRED", rounds: [] });

export const COURSE_CS232 = make({
  courseCode: "CS232",
  courseName: "COMPUTER ORGANIZATION AND ARCHITECTURE",
  courseNameTh: "สถาปัตยกรรมและโครงสร้างระบบคอมพิวเตอร์",
  quotaStatus: "NOT_REQUIRED",
  offeredSemesters: [1],
});

export const COURSE_FR205 = make({
  courseCode: "FR205",
  courseName: "FRENCH FOR EVERYDAY LIFE",
  category: "FREE_ELECTIVE",
  quotaStatus: "NOT_OFFERED",
  offeredSemesters: [1],
});

export const COURSE_NOT_OFFERED_YEAR = make({
  courseCode: "XX105",
  courseName: "NOT OFFERED ALL YEAR",
  quotaStatus: "NOT_OFFERED",
  offeredSemesters: [],
});

export const COURSE_TU101 = make({
  courseCode: "TU101",
  courseName: "THAILAND, ASEAN, AND THE WORLD",
  category: "GENERAL_EDUCATION",
  quotaStatus: "NO_DATA",
  offeredSemesters: [1],
});

export const searchResponse = (courses: QuotaCourse[], overrides: Partial<QuotaSearchResponse> = {}): QuotaSearchResponse => ({
  academicYear: 2568,
  semester: 1,
  query: null,
  mine: false,
  total: courses.length,
  courses,
  ...overrides,
});

export const SEARCH_EMPTY = searchResponse([], { query: "DM201" });

export const MY_TIMETABLE_COURSES = ["MA211", "LAS101"];
