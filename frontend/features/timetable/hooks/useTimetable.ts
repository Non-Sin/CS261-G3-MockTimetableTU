import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import type { Course } from "../../courses/types";
import { addTimetableEntry, fetchTimetable } from "../api";
import type { Timetable } from "../types";

// ภาคเรียนเริ่มต้นตาม seed ที่ทีมตกลง (1/2568) ไม่รวมภาคฤดูร้อน
const DEFAULT_ACADEMIC_YEAR = 2568;
const DEFAULT_SEMESTER = 1;
// ใช้ระหว่างที่ตารางยังโหลดไม่เสร็จ ค่าจริงมาจาก maxCredits ใน response
const DEFAULT_MAX_CREDITS = 22;

// Hook นี้เป็นขอบเขตเชื่อม state กับ UI: Timetable เรียกใช้ แล้วส่งค่าที่คืนให้ลูกแต่ละส่วน
// ตารางมาจาก GET /api/timetable ของภาคเรียนที่เลือก และการเพิ่มวิชาบันทึกผ่าน POST /api/timetable/entries
export const useTimetable = () => {
  const [academicYear, setAcademicYearState] = useState(DEFAULT_ACADEMIC_YEAR);
  const [semester, setSemesterState] = useState(DEFAULT_SEMESTER);
  // null = กำลังโหลดตารางของภาคเรียนที่เลือก
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [addingSectionId, setAddingSectionId] = useState<number | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [conflictAlertDismissed, setConflictAlertDismissed] = useState(false);
  // ภาคเรียนที่เลือกล่าสุด ใช้ตรวจผล POST ที่ตอบกลับหลังผู้ใช้เปลี่ยนภาคไปแล้ว
  const selectedTermRef = useRef({ academicYear: DEFAULT_ACADEMIC_YEAR, semester: DEFAULT_SEMESTER });

  // โหลดตารางใหม่ทุกครั้งที่เปลี่ยนภาคเรียน และไม่ใช้ผลของภาคเก่าที่ตอบกลับมาช้า
  useEffect(() => {
    let ignore = false;

    fetchTimetable({ academicYear, semester })
      .then((data) => {
        if (ignore) return;
        setTimetable(data);
        setLoadError(false);
      })
      .catch(() => {
        if (!ignore) setLoadError(true);
      });

    return () => {
      ignore = true;
    };
  }, [academicYear, semester, reloadKey]);

  // เปลี่ยนภาคเรียน: ล้างตารางเดิมระหว่างโหลดใหม่ ไม่ให้เห็นวิชาของภาคก่อนหน้า
  // เลือกค่าเดิมซ้ำไม่ต้องทำอะไร ไม่งั้นตารางจะถูกล้างแต่ไม่มีการโหลดใหม่ (ค่าใน useEffect ไม่เปลี่ยน)
  const changeTerm = (nextAcademicYear: number, nextSemester: number) => {
    if (nextAcademicYear === academicYear && nextSemester === semester) return;
    selectedTermRef.current = { academicYear: nextAcademicYear, semester: nextSemester };
    setTimetable(null);
    setAddError(null);
    setAcademicYearState(nextAcademicYear);
    setSemesterState(nextSemester);
  };

  const reload = () => setReloadKey((key) => key + 1);

  // เพิ่มกลุ่มเรียนที่เลือก แล้วใช้ตารางทั้งก้อนที่ backend ตอบกลับมา (รวมผลตรวจเวลาชน)
  const addCourse = async (_course: Course, sectionId: number) => {
    setAddingSectionId(sectionId);
    setAddError(null);

    try {
      const updated = await addTimetableEntry({ sectionId });
      // ผู้ใช้เปลี่ยนภาคไปแล้วระหว่างรอ: วิชาถูกบันทึกในภาคเดิมแล้ว แต่ไม่เอาตารางภาคเดิมมาทับหน้าจอ
      const { academicYear: currentYear, semester: currentSemester } = selectedTermRef.current;
      if (updated.academicYear !== currentYear || updated.semester !== currentSemester) return;

      setTimetable(updated);
      setConflictAlertDismissed(false);
    } catch (error) {
      // หน่วยกิตเกินหรือวิชาซ้ำ: ไม่แสดงข้อความตามที่ทีมตกลง แค่โหลดตารางล่าสุดให้ปุ่มกลับมาถูกสถานะ
      if (error instanceof ApiError && error.status === 409) {
        reload();
      } else {
        setAddError("เพิ่มวิชาไม่สำเร็จ กรุณาลองใหม่");
      }
    } finally {
      setAddingSectionId(null);
    }
  };

  return {
    timetable,
    loadError,
    reload,
    entries: timetable?.entries ?? [],
    addError,
    conflictAlertDismissed,
    totalCredits: timetable?.totalCredits ?? 0,
    maxCredits: timetable?.maxCredits ?? DEFAULT_MAX_CREDITS,
    // ปีและภาคในชื่อไฟล์ PNG มาจากตารางที่แสดงอยู่ ไม่ใช่ค่าที่กำลังเลือก
    academicYear: timetable?.academicYear ?? academicYear,
    semester: timetable?.semester ?? semester,
    selectedAcademicYear: academicYear,
    selectedSemester: semester,
    setAcademicYear: (value: number) => changeTerm(value, semester),
    setSemester: (value: number) => changeTerm(academicYear, value),
    // ผลตรวจเวลาชนมาจาก backend ส่งต่อให้ทั้ง ConflictAlert และ TimetableGrid
    conflicts: timetable?.conflicts ?? [],
    // กดเพิ่มไม่ได้ระหว่างโหลดตารางหรือระหว่างรอผลการเพิ่มวิชาก่อนหน้า
    addDisabled: timetable === null || addingSectionId !== null,
    addCourse,
    dismissConflictAlert: () => setConflictAlertDismissed(true),
  };
};
