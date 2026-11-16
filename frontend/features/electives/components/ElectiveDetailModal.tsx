import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { DAY_NAMES } from "@/features/courses/dayNames";
import type { Timetable } from "@/features/timetable/types";
import { fetchElectiveDetail } from "../api";
import type { ElectiveDetail, ElectiveSection } from "../types";
import ElectiveBadges from "./ElectiveBadges";

type ElectiveDetailModalProps = {
  courseCode: string;
  academicYear: number;
  currentSemester: number;
  timetable: Timetable | null;
  addDisabled: boolean;
  onAddSection: (sectionId: number) => Promise<Timetable>;
  onAdded: (
    course: ElectiveDetail,
    section: ElectiveSection,
    updated: Timetable,
  ) => void;
  onTimetableChanged: () => void;
  onOpenQuota: () => void;
  onClose: () => void;
};

type DetailResult = {
  key: string;
  course: ElectiveDetail | null;
  error: string | null;
};

export default function ElectiveDetailModal({
  courseCode,
  academicYear,
  currentSemester,
  timetable,
  addDisabled,
  onAddSection,
  onAdded,
  onTimetableChanged,
  onOpenQuota,
  onClose,
}: ElectiveDetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const activeRef = useRef(true);
  const savingRef = useRef(false);
  const [result, setResult] = useState<DetailResult | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const requestKey = JSON.stringify([
    courseCode,
    academicYear,
    currentSemester,
    reloadVersion,
  ]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    activeRef.current = true;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      activeRef.current = false;
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    fetchElectiveDetail(courseCode, academicYear, currentSemester)
      .then((course) => {
        if (!ignore) setResult({ key: requestKey, course, error: null });
      })
      .catch((error: unknown) => {
        if (ignore) return;
        const message =
          error instanceof ApiError && error.status === 404
            ? "ไม่พบรายละเอียดวิชาเสรีนี้"
            : "โหลดรายละเอียดวิชาไม่สำเร็จ กรุณาลองใหม่";
        setResult({ key: requestKey, course: null, error: message });
      });
    return () => {
      ignore = true;
    };
  }, [courseCode, academicYear, currentSemester, reloadVersion, requestKey]);

  const current = result?.key === requestKey ? result : null;
  const course = current?.course;
  const sections = [...(course?.sections ?? [])].sort(
    (a, b) => a.semester - b.semester || a.sectionNo.localeCompare(b.sectionNo),
  );
  const availableSections = sections.filter(
    (section) =>
      section.selectable &&
      section.semester === currentSemester &&
      !section.inTimetable,
  );
  // เลือกตัวที่ผู้ใช้กดถ้ายังใช้ได้ ไม่เช่นนั้นใช้ Sec แรกที่เลือกได้ แม้มีหลายตัวเลือก
  const selectedSection =
    availableSections.find(
      (section) => section.sectionId === selectedSectionId,
    ) ?? availableSections[0];
  const alreadyAdded =
    sections.some((section) => section.inTimetable) ||
    Boolean(
      timetable?.entries.some((entry) => entry.courseCode === courseCode),
    );
  const creditLimitExceeded = Boolean(
    course &&
    timetable &&
    timetable.totalCredits + course.credits > timetable.maxCredits,
  );
  const cannotAdd =
    !course ||
    !selectedSection ||
    !timetable ||
    alreadyAdded ||
    creditLimitExceeded ||
    addDisabled ||
    saving;

  async function addSelectedSection() {
    if (cannotAdd || !course || !selectedSection || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setAddError(null);
    try {
      const updated = await onAddSection(selectedSection.sectionId);
      // ปิด modal หรือเปลี่ยนเมนูไปแล้ว ไม่เปิดข้อความจากหน้าก่อนหน้าขึ้นมาอีก
      if (activeRef.current) onAdded(course, selectedSection, updated);
    } catch (error) {
      if (!activeRef.current) return;
      setAddError(
        error instanceof ApiError ? error.message : "เพิ่มวิชาไม่สำเร็จ กรุณาลองใหม่",
      );
      // ข้อมูลบนหน้าจออาจเก่ากว่าอีกแท็บ โหลดตารางและ flags ของ Sec ใหม่ แต่คงข้อความ API ไว้
      if (
        error instanceof ApiError &&
        (error.status === 409 || error.status === 404)
      ) {
        onTimetableChanged();
        setReloadVersion((value) => value + 1);
      }
    } finally {
      savingRef.current = false;
      if (activeRef.current) setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="elective-detail-title"
      className="m-auto max-h-[90svh] w-[calc(100%_-_2rem)] max-w-3xl overflow-y-auto rounded-3xl border-0 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div>
        <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4 sm:px-7">
          <h2 id="elective-detail-title" className="font-bold">
            รายละเอียดวิชาเสรี
          </h2>
          <button
            type="button"
            aria-label="ปิดรายละเอียดวิชา"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full border border-slate-200 bg-white text-lg text-slate-500 hover:bg-slate-100"
          >
            ×
          </button>
        </header>

        <div className="space-y-5 p-5 sm:p-7">
          {!current && <p role="status">กำลังโหลดรายละเอียดวิชา…</p>}
          {current?.error && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
            >
              <p>{current.error}</p>
              <button
                type="button"
                onClick={() => setReloadVersion((value) => value + 1)}
                className="mt-2 rounded-lg bg-white px-3 py-2 font-bold"
              >
                ลองใหม่
              </button>
            </div>
          )}
          {addError && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
            >
              {addError}
            </p>
          )}

          {course && (
            <>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-3xl font-extrabold tracking-tight text-[#c91725]">
                    {course.courseCode}
                  </h3>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                    เลือกเสรี
                  </span>
                  {course.offeredSemesters.length === 1 && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                      เปิดเฉพาะเทอม {course.offeredSemesters[0]}
                    </span>
                  )}
                  <span className="ml-auto rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">
                    {course.credits.toFixed(1)} หน่วยกิต
                  </span>
                </div>
                <p className="mt-2 font-bold">{course.courseName}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {course.courseNameTh}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <ElectiveBadges course={course} />
                {course.requiresQuota && (
                  <button
                    type="button"
                    onClick={onOpenQuota}
                    className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    ค้นหาช่องทางขอโควตา →
                  </button>
                )}
              </div>

              <fieldset disabled={saving}>
                <legend className="mb-3 font-bold">
                  กลุ่มเรียนและตารางเรียน (Sections)
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {sections.map((section) => {
                    const disabled =
                      !section.selectable ||
                      section.semester !== currentSemester ||
                      section.inTimetable ||
                      alreadyAdded;
                    const selected =
                      selectedSection?.sectionId === section.sectionId;
                    return (
                      <label
                        key={section.sectionId}
                        className={`rounded-2xl border p-4 text-xs ${disabled ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400" : selected ? "cursor-pointer border-red-500 bg-red-50/40" : "cursor-pointer border-slate-200 hover:border-red-300"}`}
                      >
                        <span className="flex flex-wrap items-center gap-2 font-bold">
                          <input
                            type="radio"
                            name="elective-section"
                            value={section.sectionId}
                            aria-label={`Sec ${section.sectionNo} ภาคเรียนที่ ${section.semester}`}
                            checked={selected && !alreadyAdded}
                            disabled={disabled}
                            onChange={() =>
                              setSelectedSectionId(section.sectionId)
                            }
                            className="accent-red-600"
                          />
                          Sec {section.sectionNo}
                          <span className="ml-auto rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-600">
                            ภาคเรียนที่ {section.semester}
                          </span>
                        </span>
                        {section.semester !== currentSemester && (
                          <p className="mt-2">
                            (ตารางเรียนปัจจุบันคือภาคเรียนที่ {currentSemester})
                          </p>
                        )}
                        {section.inTimetable && (
                          <p className="mt-2 font-bold text-emerald-700">
                            เพิ่มแล้ว
                          </p>
                        )}
                        <div className="mt-3 space-y-1.5 leading-relaxed">
                          {section.schedules.length === 0 && (
                            <p>ไม่ระบุวันและเวลาเรียน</p>
                          )}
                          {section.schedules.map((slot, index) => (
                            <div key={`${slot.dayOfWeek}-${index}`}>
                              <p>
                                วัน{DAY_NAMES[slot.dayOfWeek]} {slot.startTime} -{" "}
                                {slot.endTime} น.
                              </p>
                              <p>ห้องเรียน: {slot.room ?? "ไม่ระบุ"}</p>
                            </div>
                          ))}
                          <p>ผู้สอน: {section.instructor ?? "ไม่ระบุ"}</p>
                        </div>
                        {section.conflictWith.length > 0 && (
                          <p className="mt-3 rounded-lg bg-amber-50 p-2 text-amber-800">
                            เวลาเรียนชนกับ {section.conflictWith.join(", ")}{" "}
                            (ยังเพิ่มลงตารางได้)
                          </p>
                        )}
                      </label>
                    );
                  })}
                </div>
                {sections.length === 0 && (
                  <p className="text-sm text-slate-500">
                    ไม่มี Sec ที่เปิดสอนในปีการศึกษานี้
                  </p>
                )}
              </fieldset>

              <section
                aria-labelledby="elective-reviews-title"
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <h3 id="elective-reviews-title" className="font-bold">
                  รายละเอียดวิชา &amp; รีวิวจากรุ่นพี่
                </h3>
                {course.description.length > 0 ? (
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed marker:text-red-500">
                    {course.description.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    ยังไม่มีรายละเอียดวิชา
                  </p>
                )}
              </section>
            </>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-7">
          {alreadyAdded && (
            <p className="mr-auto text-sm font-bold text-emerald-700">
              อยู่ในตารางแล้ว
            </p>
          )}
          <button
            type="button"
            onClick={addSelectedSection}
            disabled={cannotAdd}
            className="rounded-xl bg-[#c91725] px-5 py-3 text-sm font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? "กำลังเพิ่มวิชา…" : "+ เพิ่มลงตาราง"}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
