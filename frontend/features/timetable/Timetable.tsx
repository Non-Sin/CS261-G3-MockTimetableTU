"use client"

import { mockTimetable } from "./mockData"
import { getGridRange } from "./gridRange"
import type { DayOfWeek } from "../courses/types"
import type { TimetableEntry, TimeConflict } from "./types";
import { useState } from "react";
import { mockCourses } from "../courses/mockData";
import type { Course, CourseCategory } from "../courses/types";

// แปลงรหัสวันจากข้อมูลตารางให้เป็นชื่อภาษาไทยสำหรับแสดงในหน้าเว็บ
const dayNames: Record<DayOfWeek, string> = {
  MONDAY: "จันทร์",
  TUESDAY: "อังคาร",
  WEDNESDAY: "พุธ",
  THURSDAY: "พฤหัสบดี",
  FRIDAY: "ศุกร์",
  SATURDAY: "เสาร์",
  SUNDAY: "อาทิตย์",
};

// แปลงเวลา HH:mm เป็นจำนวนนาที เพื่อใช้คำนวณช่วงเวลาและตรวจเวลาชน
const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// ตรวจทุกคู่รายวิชา แล้วคืนรายการที่เรียนวันเดียวกันและมีช่วงเวลาทับกัน
const findConflicts = (entries: TimetableEntry[]): TimeConflict[] =>
  entries.flatMap((entry, index) =>
    entries.slice(index + 1).flatMap((otherEntry) =>
      entry.schedules.flatMap((firstSlot) =>
        otherEntry.schedules.flatMap((secondSlot) => {
          const overlaps =
            firstSlot.dayOfWeek === secondSlot.dayOfWeek &&
            toMinutes(firstSlot.startTime) < toMinutes(secondSlot.endTime) &&
            toMinutes(secondSlot.startTime) < toMinutes(firstSlot.endTime);

          if (!overlaps) return [];

          return [{
            dayOfWeek: firstSlot.dayOfWeek,
            overlapStart:
              firstSlot.startTime >= secondSlot.startTime
                ? firstSlot.startTime
                : secondSlot.startTime,
            overlapEnd:
              firstSlot.endTime <= secondSlot.endTime
                ? firstSlot.endTime
                : secondSlot.endTime,
            courseCodes: [entry.courseCode, otherEntry.courseCode],
          }];
        }),
      ),
    ),
  );

// หน้าจัดตารางเรียนจำลอง ใช้ state ฝั่ง frontend ระหว่างที่ backend ยังไม่พร้อม
const Timetable = () => {
  // เก็บวิชาในตาราง ข้อความค้นหา ตัวกรอง และสถานะการแสดงคำเตือน
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [addError, setAddError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CourseCategory | "ALL">("ALL");
  const [selectedSectionIds, setSelectedSectionIds] = useState<Record<string, number>>({});
  const [academicYear, setAcademicYear] = useState(2568);
  const [semester, setSemester] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [conflictAlertDismissed, setConflictAlertDismissed] = useState(false);

  // กรองรายวิชาตามรหัสหรือชื่อ และหมวดวิชาที่ผู้ใช้เลือก
  const filteredCourses = mockCourses.filter((course) => {
    const search = query.trim().toLowerCase();

    const matchesQuery =
      course.courseCode.toLowerCase().startsWith(search) ||
      course.courseName.toLowerCase().includes(search);

    const matchesCategory =
      categoryFilter === "ALL" || course.category === categoryFilter;

    return matchesQuery && matchesCategory;
  });

  // รวมหน่วยกิตจากวิชาที่เพิ่มอยู่ในตารางปัจจุบัน
  const totalCredits = entries.reduce(
    (total, entry) => total + entry.credits,
    0
  );

  // เพิ่มกลุ่มเรียนที่เลือก ถ้าวิชาไม่ซ้ำและหน่วยกิตไม่เกินกำหนด
  const handleAddCourse = (course: Course, sectionId: number) => {
    const section = course.sections.find((item) => item.sectionId === sectionId,);

    if (!section) return;

    if (entries.some((entry) => entry.courseCode === course.courseCode)) {
      setAddError(`${course.courseCode} อยู่ในตารางแล้ว`);
      return;
    }

    if (totalCredits + course.credits > mockTimetable.maxCredits) {
      setAddError(`เพิ่มแล้วจะเกิน ${mockTimetable.maxCredits} หน่วยกิต`);
      return;
    }

    const newEntry: TimetableEntry = {
      entryId: section.sectionId,
      courseCode: course.courseCode,
      courseName: course.courseName,
      category: course.category,
      credits: course.credits,
      sectionId: section.sectionId,
      sectionNo: section.sectionNo,
      schedules: section.schedules,
      conflictWith: [],
    };

    setAddError(null);
    setConflictAlertDismissed(false);
    setEntries((currentEntries) => [...currentEntries, newEntry]);
  }

  // กำหนดวันและช่วงชั่วโมงที่ grid ต้องแสดงตามวิชาในตาราง
  const { days, hours } = getGridRange(entries);

  const trackStyle = {
    gridTemplateColumns: `repeat(${hours.length}, minmax(72px, 1fr))`,
  };

  const timelineStart = hours[0] * 60;
  const timelineMinutes = hours.length * 60;

  // คำนวณเวลาชนจากวิชาในตาราง แล้วจัดกลุ่มผลลัพธ์เพื่อวาดบล็อกบน grid
  // คำนวณเวลาชนและจัดกลุ่มผลลัพธ์เพื่อใช้แสดงคำเตือนกับบล็อกบน grid
  const conflicts = findConflicts(entries);
  const conflictGroups = conflicts.reduce<
    Array<{
      dayOfWeek: DayOfWeek;
      overlapStart: string;
      overlapEnd: string;
      courseCodes: Set<string>;
    }>
  >((groups, conflict) => {
    const group = groups.find(
      (item) =>
        item.dayOfWeek === conflict.dayOfWeek &&
        item.overlapStart === conflict.overlapStart &&
        item.overlapEnd === conflict.overlapEnd
    );

    if (group) {
      conflict.courseCodes.forEach((code) => group.courseCodes.add(code));
    } else {
      groups.push({
        dayOfWeek: conflict.dayOfWeek,
        overlapStart: conflict.overlapStart,
        overlapEnd: conflict.overlapEnd,
        courseCodes: new Set(conflict.courseCodes),
      });
    }

    return groups;
  }, []).map((group) => ({
    ...group,
    courses: entries.filter((entry) => group.courseCodes.has(entry.courseCode)),
  }));

  return (
    <>
        <main className="min-h-screen bg-[#fffdfa] text-slate-800">
          {/* แจ้งผู้ใช้ว่าหน้านี้เป็นระบบจำลอง ไม่ใช่การลงทะเบียนจริง */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-red-700 px-3 py-3 text-center text-xs font-semibold text-white sm:justify-between sm:px-6 sm:text-sm">
              <span>⚠ คำเตือนสำคัญ</span>
              <span>ระบบนี้ใช้ช่วยวางแผนการเรียนเท่านั้น</span>
              <span>ไม่สามารถใช้ลงทะเบียนจริงได้</span>
          </div>

          <div className="mx-auto w-full max-w-7xl space-y-4 px-3 py-4 sm:px-5 lg:px-8">
            <header className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-lg font-extrabold">
                  MockTimetable<span className="text-rose-500">TU</span>
                </h1>
                <p className="text-xs text-slate-500">ระบบช่วยจัดตารางเรียน</p>
              </div>
              <span className="self-start rounded-full bg-slate-100 px-3 py-2 text-xs sm:self-auto">
                DEMO · ข้อมูลจำลอง
              </span>
            </header>

            {/* แสดงคำเตือนเมื่อมีรายวิชาที่เวลาเรียนซ้อนทับกัน */}
            {conflicts.length > 0 && !conflictAlertDismissed && (
                <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-600 font-bold text-white"
                    >
                      !
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <h3 className="font-bold">ตรวจพบเวลาเรียนซ้อนทับกัน</h3>
                        <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                          ต้องจัดใหม่
                        </span>

                      </div>


                      <p className="mt-2 text-xs font-semibold">เวลาเรียนชนกัน</p>

                      {conflicts.map((conflict, index) => (
                        <p key={`${conflict.dayOfWeek}-${index}`} className="mt-2 text-xs">
                          {conflict.courseCodes.join(" และ ")}
                          {" · "}
                          {dayNames[conflict.dayOfWeek]} {conflict.overlapStart}-{conflict.overlapEnd}
                        </p>
                      ))}

                      <p className="mt-2 text-xs text-red-700">
                        กรุณาสลับกลุ่มเรียนหรือเลือกรายวิชาอื่น
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="ปิดคำเตือนเวลาเรียนชน"
                      onClick={() => setConflictAlertDismissed(true)}
                      className="shrink-0 rounded-lg p-1 text-red-500 hover:bg-red-100"
                    >
                      ×
                    </button>
                </div>
              )}

            {/* ตารางรายสัปดาห์ แถบรายวิชา และสรุปจำนวนวิชากับหน่วยกิต */}
            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-bold">ตารางเรียนจำลอง</h2>
                <p className="text-sm text-slate-600">
                  หน่วยกิต {totalCredits} / {mockTimetable.maxCredits}
                </p>
              </div>

              {entries.length === 0 && (
                  <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                    ยังไม่มีวิชาในตาราง ค้นหารายวิชาด้านล่างแล้วกด “เพิ่มวิชา” เพื่อเริ่มจัดตาราง
                  </p>
              )}

              {/* แสดงป้ายรายวิชาและสรุปวิชาที่ชนกันเหนือ grid */}
              {entries.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {entries.map((entry) => (
                    <span
                      key={entry.courseCode}
                      className="rounded-full border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800"
                    >
                      {entry.courseCode}
                    </span>
                  ))}

                  {conflicts.length > 0 && (
                    <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                      ⚠ ชนกัน:{" "}
                      {Array.from(
                        new Set(conflicts.flatMap((conflict) => conflict.courseCodes))
                      ).join(" และ ")}
                    </span>
                  )}
                </div>
              )}

              {/* Grid เลื่อนแนวนอนได้ เพื่อให้ช่วงเวลาอ่านได้บนหน้าจอแคบ */}
              <div className="mt-6 overflow-x-auto">
                  <div className="min-w-200 space-y-2">
                    <div className="grid grid-cols-[64px_1fr] gap-2">
                      <div className="self-center text-center text-xs text-slate-400">
                        วัน \ เวลา
                      </div>

                      <div className="grid gap-2" style={trackStyle}>
                        {hours.map((hour) => (
                          <div
                            key={hour}
                            className="rounded-lg bg-slate-100 py-2 text-center text-xs font-semibold text-slate-500"
                          >
                            {String(hour).padStart(2, "0")}:00
                          </div>
                        ))}
                      </div>
                    </div>

                    {days.map((day) => (
                      <div key={day} className="grid grid-cols-[64px_1fr] gap-2">
                        <div className="flex min-h-16 flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold">
                          {dayNames[day]}
                          <span className="text-[10px] text-slate-400">{day.slice(0, 3)}</span>
                        </div>

                        <div className="relative min-h-16">
                          <div className="absolute inset-0 z-0 grid gap-2 pointer-events-none" style={trackStyle}>
                            {hours.map((hour) => (
                              <div
                                key={hour}
                                className="rounded-xl border border-slate-100 bg-slate-50"
                              >
                              </div>
                            ))}
                          </div>

                          {entries.flatMap((entry) =>
                            entry.schedules.filter((slot) => slot.dayOfWeek === day).map((slot, index) => {
                              const start = toMinutes(slot.startTime);
                              const end = toMinutes(slot.endTime);
                              const left = ((start - timelineStart) / timelineMinutes) * 100;
                              const width = ((end - start) / timelineMinutes) * 100;

                              return (
                                <div
                                  key={`${entry.entryId} - ${day} - ${index}`}
                                  className="absolute inset-y-0 z-10 overflow-hidden rounded-lg border px-2 py-1.5 text-[11px] leading-tight border-blue-300 bg-blue-50 text-blue-950"
                                  style={{left: `${left}%`, width: `${width}%`}}
                                >
                                  <strong>{entry.courseCode}</strong>
                                  <div>{slot.startTime}-{slot.endTime}</div>
                                  <div>{slot.room}</div>
                                </div>
                              )
                            })
                          )}
                          {/* วาดบล็อกแดงทับเฉพาะช่วงเวลาที่รายวิชาเรียนซ้อนกัน */}
                          {conflictGroups
                            .filter((group) => group.dayOfWeek === day)
                            .map((group) => {
                              const start = toMinutes(group.overlapStart);
                              const end = toMinutes(group.overlapEnd);
                              const left = ((start - timelineStart) / timelineMinutes) * 100;
                              const width = ((end - start) / timelineMinutes) * 100;

                              return  (
                                <div
                                  key={`${group.dayOfWeek}-${group.overlapStart}-${group.overlapEnd}`}
                                  className="absolute inset-y-0 z-20 flex flex-col overflow-hidden rounded-lg border border-red-500 bg-red-50 text-red-950"
                                  style={{ left: `${left}%`, width: `${width}%`}}
                                >
                                  <div className="shrink-0 bg-red-600 px-2 py-1 text-[9px] font-bold text-white">
                                    เวลาชนกัน {group.overlapStart}-{group.overlapEnd} · {group.courses.length} วิชา
                                  </div>

                                  <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-red-200">
                                    {group.courses.map((entry) => {
                                      const slot = entry.schedules.find(
                                        (item) =>
                                          item.dayOfWeek === day &&
                                          toMinutes(item.startTime) < end &&
                                          toMinutes(item.endTime) > start
                                      );

                                      if (!slot) return null;

                                      return (
                                        <div
                                          key={entry.entryId}
                                          className="min-w-0 px-2 py-1 text-[9px] leading-tight"
                                        >
                                          <strong>{entry.courseCode}</strong>
                                          <div>{group.overlapStart}-{group.overlapEnd}</div>
                                          <div>{slot.room}</div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="text-sm font-semibold text-rose-600">
                    วิชาในตารางเรียน: {entries.length} วิชา ({totalCredits.toFixed(1)} หน่วยกิต)
                  </p>
                </div>
            </section>

            {/* รายการวิชาที่เพิ่มแล้ว พร้อมรายละเอียดและปุ่มนำออกจากตาราง */}
            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
              <h2 className="text-xl font-bold">วิชาที่เพิ่มแล้ว</h2>
               {entries.length === 0 ? (
                <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                  ยังไม่มีวิชาในตาราง
                </p>
               ) : (
                <div className="mt-4 space-y-3">
                  {entries.map((entry) => (
                    <article
                      key={entry.courseCode}
                      className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-bold">{entry.courseCode}</p>
                        <p className="text-sm text-slate-600">{entry.courseName}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Sec {entry.sectionNo} · {entry.credits} หน่วยกิต
                        </p>

                        {entry.schedules.map((slot, index) => (
                          <p
                            key={`${slot.dayOfWeek}-${index}`}
                            className="mt-1 text-xs text-slate-500"
                          >
                            {dayNames[slot.dayOfWeek]} {slot.startTime}-{slot.endTime}
                            {" · ห้อง"}
                            {slot.room}
                          </p>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setConflictAlertDismissed(false);
                          setEntries((currentEntries) =>
                            currentEntries.filter((item) => item.courseCode !== entry.courseCode)
                          );
                        }}
                        className="self-start rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 sm:self-auto"
                      >
                        ลบวิชา
                      </button>
                    </article>
                  ))}
                </div>
               )}
            </section>

            {/* ค้นหา กรอง และเลือกกลุ่มเรียนเพื่อเพิ่มวิชาเข้าตาราง */}
            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-bold">ค้นหารายวิชา</h2>

                <div className="flex flex-wrap gap-2">
                    <select
                      value={semester}
                      onChange={(event) => setSemester(Number(event.target.value))}
                      aria-label="ภาคเรียน"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value={1}>ภาคเรียน 1</option>
                    </select>

                    <select
                      value={academicYear}
                      onChange={(event) => setAcademicYear(Number(event.target.value))}
                      aria-label="ปีการศึกษา"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value={2568}>ปีการศึกษา 2568</option>
                    </select>
                </div>
              </div>

              <form
                className="mt-4 flex flex-col gap-2 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  setQuery(searchInput);
                }}
              >
                <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="ค้นหารหัสหรือชื่อวิชา"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-rose-400"
                />

                <button
                  type="submit"
                  className="rounded-xl bg-rose-500 px-5 py-3 text-sm font-semibold text-white"
                >
                  ค้นหา
                </button>
              </form>

               <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value as CourseCategory | "ALL")}
                aria-label="กรองตามหมวดวิชา"
                className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
               >
                <option value="ALL">ทุกหมวดวิชา</option>
                <option value="MAJOR">วิชาเฉพาะ</option>
                <option value="GENERAL_EDUCATION">ศึกษาทั่วไป</option>
                <option value="FREE_ELECTIVE">วิชาเลือกเสรี</option>
               </select>

              {addError && (
                <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {addError}
                </p>
              )}

              <div className="mt-4 space-y-3">
                <p className="mt-4 text-sm text-slate-500">
                  พบ {filteredCourses.length} รายวิชา
                </p>
                {filteredCourses.length === 0 ? (
                  <p className="mt-4 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
                    ไม่พบรายวิชาที่ตรงกับคำที่ค้นหาหรือหมวดที่เลือก
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {filteredCourses.map((course) => {
                    const alreadyAdded = entries.some(
                      (entry) => entry.courseCode === course.courseCode,
                    );
                    const selectedSectionId = selectedSectionIds[course.courseCode] ?? course.sections[0]?.sectionId;

                    const selectedSection = course.sections.find(
                      (section) => section.sectionId === selectedSectionId,
                    );

                    return (
                      <article
                        key={course.courseCode}
                        className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="font-bold">{course.courseCode}</p>
                          <p className="text-sm text-slate-600">{course.courseName}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {course.credits} หน่วยกิต
                          </p>
                          {selectedSection && (
                            <div className="mt-2 space-y-1 text-xs text-slate-500">
                              <p>ผู้สอน: {selectedSection.instructor}</p>

                              {selectedSection.schedules.map((slot, index) => (
                                <p key={`${slot.dayOfWeek}-${index}`}>
                                  {dayNames[slot.dayOfWeek]} {slot.startTime}-{slot.endTime}
                                  {" · ห้อง"}
                                  {slot.room}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {course.sections.length > 1 ? (
                            <select
                              value={selectedSectionId ?? ""}
                              onChange={(event) => setSelectedSectionIds((current) => ({
                                ...current,
                                [course.courseCode]: Number(event.target.value),
                              }))}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            >
                              {course.sections.map((section) => (
                                <option key={section.sectionId} value={section.sectionId}>
                                  Sec {section.sectionNo}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                              Sec {selectedSection?.sectionNo}
                            </span>
                          )}

                          <button
                            type="button"
                            disabled={alreadyAdded}
                            onClick={() => {
                              if (selectedSectionId !== undefined) {
                                handleAddCourse(course, selectedSectionId);
                              }
                            }}
                            className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-emerald-600"
                          >
                            {alreadyAdded ? "เพิ่มแล้ว" : "+ เพิ่มวิชา"}
                          </button>
                        </div>
                      </article>
                    )
                  })}
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
    </>
  )
}
export default Timetable
