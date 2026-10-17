import { useReducer } from "react";
import type { Course } from "../../courses/types";
import { findConflicts } from "../utils/conflicts";
import { mockTimetable } from "../mockData";
import type { TimetableEntry } from "../types";

type TimetableState = {
  entries: TimetableEntry[];
  addError: string | null;
  conflictAlertDismissed: boolean;
};

type TimetableAction =
  | { type: "add-course"; course: Course; sectionId: number }
  | { type: "remove-course"; courseCode: string }
  | { type: "dismiss-conflict-alert" };

const initialState: TimetableState = {
  entries: [],
  addError: null,
  conflictAlertDismissed: false,
};

// Reducer เป็นจุดเดียวที่เปลี่ยน state ของตาราง: รับ state เดิมกับ action จาก UI
// แล้วคืน state ชุดใหม่ เพื่อให้การเพิ่ม/ลบวิชาและการปิดคำเตือนเปลี่ยนอย่างเป็นระบบ
const timetableReducer = (
  state: TimetableState,
  action: TimetableAction,
): TimetableState => {
  switch (action.type) {
    case "add-course": {
      // action ได้ Course และ sectionId มาจาก CourseCard ผ่าน CourseSearchPanel
      // หา section ก่อน เพราะตารางต้องเก็บเวลา ห้อง และผู้สอนของกลุ่มที่ผู้ใช้เลือกจริง
      const section = action.course.sections.find(
        (item) => item.sectionId === action.sectionId,
      );

      if (!section) return state;

      // หนึ่งรหัสวิชาเพิ่มลงตารางได้ครั้งเดียว จึงตรวจจาก entries ปัจจุบันก่อนสร้างรายการ
      if (state.entries.some((entry) => entry.courseCode === action.course.courseCode)) {
        return {
          ...state,
          addError: `${action.course.courseCode} อยู่ในตารางแล้ว`,
        };
      }

      // คำนวณหน่วยกิตจากรายการปัจจุบันเพื่อเปรียบเทียบกับเพดานใน mockTimetable
      const totalCredits = state.entries.reduce(
        (total, entry) => total + entry.credits,
        0,
      );

      // ตาม API Spec: ไม่เพิ่มวิชาและไม่แสดงข้อความเมื่อหน่วยกิตเกินกำหนด
      if (totalCredits + action.course.credits > mockTimetable.maxCredits) {
        return { ...state, addError: null };
      }

      const newEntry: TimetableEntry = {
        entryId: section.sectionId,
        courseCode: action.course.courseCode,
        courseName: action.course.courseName,
        category: action.course.category,
        credits: action.course.credits,
        sectionId: section.sectionId,
        sectionNo: section.sectionNo,
        schedules: section.schedules,
        conflictWith: [],
      };

      // สร้าง state ใหม่แทนการแก้ array เดิม เพื่อให้ React ตรวจพบการเปลี่ยนแปลง
      // และคำนวณผลชนใหม่จากรายการที่เพิ่มแล้วใน useTimetable
      return {
        entries: [...state.entries, newEntry],
        addError: null,
        conflictAlertDismissed: false,
      };
    }

    case "remove-course":
      // กรองรหัสวิชาที่ผู้ใช้ลบออก ส่วนรายการอื่นยังอยู่เหมือนเดิม
      return {
        ...state,
        entries: state.entries.filter(
          (entry) => entry.courseCode !== action.courseCode,
        ),
        conflictAlertDismissed: false,
      };

    case "dismiss-conflict-alert":
      return { ...state, conflictAlertDismissed: true };

    default:
      return state;
  }
};

// Hook นี้เป็นขอบเขตเชื่อม state กับ UI: Timetable เรียกใช้ แล้วส่งค่าที่คืนให้ลูกแต่ละส่วน
export const useTimetable = () => {
  const [state, dispatch] = useReducer(timetableReducer, initialState);
  // หน่วยกิตเป็นค่าที่คำนวณจาก entries เสมอ จึงไม่เก็บซ้ำใน state ให้เสี่ยงไม่ตรงกัน
  const totalCredits = state.entries.reduce(
    (total, entry) => total + entry.credits,
    0,
  );

  return {
    entries: state.entries,
    addError: state.addError,
    conflictAlertDismissed: state.conflictAlertDismissed,
    totalCredits,
    maxCredits: mockTimetable.maxCredits,
    // ตรวจเวลาชนจากตารางปัจจุบัน; ผลนี้ถูกส่งไปทั้ง ConflictAlert และ TimetableGrid
    conflicts: findConflicts(state.entries),
    // ฟังก์ชันเหล่านี้แปลง event จาก component เป็น action ให้ reducer จัดการ
    addCourse: (course: Course, sectionId: number) =>
      dispatch({ type: "add-course", course, sectionId }),
    removeCourse: (courseCode: string) =>
      dispatch({ type: "remove-course", courseCode }),
    dismissConflictAlert: () => dispatch({ type: "dismiss-conflict-alert" }),
  };
};
