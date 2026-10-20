import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { SessionProvider } from "../../auth/session";
import type { Course } from "../../courses/types";
import { timetableDeleteApi } from "../../timetable-delete/api";
import type { DeleteStatus } from "../../timetable-delete/types";
import { addTimetableEntry, fetchTimetable } from "../api";
import type { Timetable } from "../types";

// ภาคเรียนเริ่มต้นตาม seed ที่ทีมตกลง (1/2568) ไม่รวมภาคฤดูร้อน
const DEFAULT_ACADEMIC_YEAR = 2568;
const DEFAULT_SEMESTER = 1;
// ใช้ระหว่างที่ตารางยังโหลดไม่เสร็จ ค่าจริงมาจาก maxCredits ใน response
const DEFAULT_MAX_CREDITS = 22;

// Hook นี้เป็นขอบเขตเชื่อม state กับ UI: Timetable เรียกใช้ แล้วส่งค่าที่คืนให้ลูกแต่ละส่วน
// ตารางมาจาก GET /api/timetable ของภาคเรียนที่เลือก และการเพิ่ม/ลบวิชาบันทึกผ่าน /api/timetable/entries
export const useTimetable = () => {
  const [academicYear, setAcademicYearState] = useState(DEFAULT_ACADEMIC_YEAR);
  const [semester, setSemesterState] = useState(DEFAULT_SEMESTER);
  // null = กำลังโหลดตารางของภาคเรียนที่เลือก
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [addingSectionId, setAddingSectionId] = useState<number | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<DeleteStatus>("idle");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [conflictAlertDismissed, setConflictAlertDismissed] = useState(false);
  // ภาคเรียนที่เลือกล่าสุด ใช้ตรวจผล POST/DELETE ที่ตอบกลับหลังผู้ใช้เปลี่ยนภาคไปแล้ว
  const selectedTermRef = useRef({ academicYear: DEFAULT_ACADEMIC_YEAR, semester: DEFAULT_SEMESTER });
  // นับครั้งที่เอาผล POST/DELETE ขึ้นจอ GET ที่เริ่มก่อนหน้านั้นถือว่าเก่ากว่า จึงไม่ใช้ผล
  const writeCountRef = useRef(0);

  // ล้างข้อมูลตารางเรียนที่เก็บใน client ทันทีเมื่อออกจากระบบหรือเซสชันหมดอายุ (US4)
  useEffect(() => {
    return SessionProvider.subscribe(() => {
      if (!SessionProvider.isAuthenticated()) {
        setTimetable(null);
      }
    });
  }, []);

  // โหลดตารางใหม่ทุกครั้งที่เปลี่ยนภาคเรียน และไม่ใช้ผลของภาคเก่าที่ตอบกลับมาช้า
  // รวมถึงผล GET ที่ตอบหลังการเพิ่ม/ลบวิชา (เช่น สลับภาค 1 → 2 → 1 ระหว่างรอ หรือ reload หลัง 404)
  useEffect(() => {
    let ignore = false;
    const writeCountAtStart = writeCountRef.current;
    const isStale = () => ignore || writeCountRef.current !== writeCountAtStart;

    fetchTimetable({ academicYear, semester })
      .then((data) => {
        if (isStale()) return;
        setTimetable(data);
        setLoadError(false);
      })
      .catch(() => {
        if (!isStale()) setLoadError(true);
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
    setDeleteError(null);
    setDeleteStatus("idle");
    setAcademicYearState(nextAcademicYear);
    setSemesterState(nextSemester);
  };

  const reload = () => setReloadKey((key) => key + 1);

  // ตารางทั้งก้อนที่ POST/DELETE ตอบมาใหม่กว่า GET ที่ยังค้างอยู่ จึงนับไว้ให้ useEffect ข้ามผลนั้น
  const showWriteResult = (updated: Timetable) => {
    writeCountRef.current += 1;
    setTimetable(updated);
    setConflictAlertDismissed(false);
  };

  // เพิ่มกลุ่มเรียนที่เลือก แล้วใช้ตารางทั้งก้อนที่ backend ตอบกลับมา (รวมผลตรวจเวลาชน)
  const addCourse = async (_course: Course, sectionId: number) => {
    setAddingSectionId(sectionId);
    setAddError(null);

    try {
      const updated = await addTimetableEntry({ sectionId });
      // ผู้ใช้เปลี่ยนภาคไปแล้วระหว่างรอ: วิชาถูกบันทึกในภาคเดิมแล้ว แต่ไม่เอาตารางภาคเดิมมาทับหน้าจอ
      const { academicYear: currentYear, semester: currentSemester } = selectedTermRef.current;
      if (updated.academicYear !== currentYear || updated.semester !== currentSemester) return;

      showWriteResult(updated);
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

  // ลบ 1 วิชา หรือลบหลายวิชา/ทั้งหมด แล้วแทนที่ state ตารางด้วย response จาก backend ทันที
  // คืน true เมื่อ checkbox ที่ติ๊กไว้ใช้ต่อไม่ได้ (ลบสำเร็จ หรือ 404) ให้ AddedCoursesList ล้าง ตาม US2-T06
  const executeDelete = async (request: () => Promise<Timetable>): Promise<boolean> => {
    setDeleteStatus("deleting");
    setDeleteError(null);

    try {
      const updated = await request();
      const { academicYear: currentYear, semester: currentSemester } = selectedTermRef.current;
      if (updated.academicYear === currentYear && updated.semester === currentSemester) {
        showWriteResult(updated);
      }
      setDeleteStatus("idle");
      return true;
    } catch (error) {
      setDeleteStatus("error");
      // 404 แปลว่าข้อมูลบนหน้าจอเก่า (เช่น ถูกลบจากอีกแท็บไปแล้ว) แจ้งผู้ใช้ โหลดตารางล่าสุดใหม่ และให้เลือกใหม่
      if (error instanceof ApiError && error.status === 404) {
        setDeleteError("ตารางเรียนมีการเปลี่ยนแปลงจากที่อื่น กรุณาตรวจตารางล่าสุดแล้วเลือกวิชาที่จะลบอีกครั้ง");
        reload();
        return true;
      }
      // ข้อผิดพลาดอื่นเก็บ checkbox ไว้ กดลบซ้ำได้ทันที
      setDeleteError("ลบวิชาไม่สำเร็จ กรุณาลองใหม่");
      return false;
    }
  };

  const removeCourse = (entryId: number) =>
    executeDelete(() => timetableDeleteApi.removeEntry(entryId));

  const removeCourses = (entryIds: number[]) => {
    if (entryIds.length === 0) return Promise.resolve(false);
    return executeDelete(() => timetableDeleteApi.removeEntries(entryIds));
  };

  return {
    timetable,
    loadError,
    reload,
    entries: timetable?.entries ?? [],
    addError,
    deleteStatus,
    deleteError,
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
    // กดเพิ่มไม่ได้ระหว่างโหลดตาราง หรือระหว่างรอผลเพิ่ม/ลบวิชาก่อนหน้า
    // ให้มีคำขอแก้ตารางทีละคำขอ ผลที่ตอบทีหลังจะได้ไม่ใช่ตารางที่เก่ากว่า
    addDisabled: timetable === null || addingSectionId !== null || deleteStatus === "deleting",
    // ปุ่มลบปิดระหว่างรอผลเพิ่มวิชา ด้วยเหตุผลเดียวกัน
    deleteDisabled: addingSectionId !== null,
    addCourse,
    removeCourse,
    removeCourses,
    dismissConflictAlert: () => setConflictAlertDismissed(true),
  };
};
