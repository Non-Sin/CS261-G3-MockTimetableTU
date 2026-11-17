import type { QuotaStatus } from "./types";

type QuotaStatusNoticeProps = {
  status: Exclude<QuotaStatus, "REQUIRED">;
  courseCode: string;
  academicYear: number;
  semester: number;
  // ภาคเรียนที่วิชาเปิดสอนในปีการศึกษาเดียวกัน (ใช้เฉพาะ NOT_OFFERED)
  offeredSemesters: number[];
};

const TONES = {
  NOT_REQUIRED: "border-emerald-200 bg-emerald-50 text-emerald-900",
  NOT_OFFERED: "border-amber-200 bg-amber-50 text-amber-900",
  NO_DATA: "border-slate-200 bg-slate-50 text-slate-700",
} as const;

// data-status ให้เทสต์ตรวจสถานะได้โดยไม่ต้องพึ่งสี
const QuotaStatusNotice = ({ status, courseCode, academicYear, semester, offeredSemesters }: QuotaStatusNoticeProps) => {
  let title: string | null = null;
  let description: string;

  if (status === "NOT_REQUIRED") {
    title = "รายวิชานี้ไม่ต้องขอโควตา";
    description = "สามารถลงทะเบียนเรียนผ่านระบบ REG-TU ในช่วงเวลาลงทะเบียนเรียนตามปกติ โดยไม่ต้องยื่นคำร้องขอโควตา";
  } else if (status === "NOT_OFFERED" && offeredSemesters.length > 0) {
    const semesters = offeredSemesters.join(" และ ");
    title = `วิชานี้เปิดสอนเฉพาะภาคเรียนที่ ${semesters}`;
    // ภาคที่เปิดสอนอยู่หลังภาคที่ดูอยู่ = ปีเดียวกัน ไม่เช่นนั้นต้องรอปีการศึกษาถัดไป
    const when = offeredSemesters.some((s) => s > semester) ? `ปีการศึกษา ${academicYear}` : "ปีการศึกษาถัดไป";
    description = `รายวิชา ${courseCode} ไม่ได้เปิดการเรียนการสอนในภาคเรียนที่ ${semester}/${academicYear} จึงไม่มีรอบการยื่นขอโควตาสำหรับภาคเรียนนี้ สามารถวางแผนลงทะเบียนได้ในภาคเรียนที่ ${semesters} ของ${when}`;
  } else if (status === "NOT_OFFERED") {
    title = `วิชานี้ไม่เปิดสอนในปีการศึกษา ${academicYear}`;
    description = `รายวิชา ${courseCode} ไม่มีกลุ่มเรียนที่เปิดสอนในปีการศึกษา ${academicYear} จึงไม่มีรอบการยื่นขอโควตา`;
  } else {
    description = "ยังไม่มีข้อมูลช่องทางขอโควตาของรายวิชานี้ กรุณาติดต่อคณะ/ภาควิชาเจ้าของวิชา";
  }

  return (
    <div data-status={status} className={`rounded-xl border p-4 ${TONES[status]}`}>
      {title && <h4 className="text-[15px] font-bold">{title}</h4>}
      <p className={`text-[13px] ${title ? "mt-1" : ""}`}>{description}</p>
    </div>
  );
};

export default QuotaStatusNotice;
