import { DAY_NAMES } from "../../courses/dayNames";
import type { TimeConflict } from "../types";

type ConflictAlertProps = {
  conflicts: TimeConflict[];
  dismissed: boolean;
  onDismiss: () => void;
};

// รับผลตรวจจาก useTimetable ผ่าน Timetable; ไม่คำนวณการชนซ้ำใน component นี้
// callback onDismiss ส่งการกดปิดกลับไปให้ hook เปลี่ยนสถานะการแสดงคำเตือน
const ConflictAlert = ({
  conflicts,
  dismissed,
  onDismiss,
}: ConflictAlertProps) => {
  // ไม่มีปัญหา หรือผู้ใช้ปิดข้อความแล้ว ให้ไม่สร้างแถบเตือนในหน้า
  if (conflicts.length === 0 || dismissed) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800"
    >
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-600 font-bold text-white"
      >
        !
      </span>

      <div className="min-w-0 flex-1">
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h3 className="font-bold">ตรวจพบเวลาเรียนซ้อนทับกัน</h3>
          <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
            ต้องจัดใหม่
          </span>
        </div>

        <p className="mt-2 text-xs font-semibold">เวลาเรียนชนกัน</p>
        {/* แสดงทุกคู่ชนพร้อมชื่อวันภาษาไทยที่มาจากตัวแปลง DAY_NAMES */}
        {conflicts.map((conflict, index) => (
          <p key={`${conflict.dayOfWeek}-${index}`} className="mt-2 text-xs">
            {conflict.courseCodes.join(" และ ")} · {DAY_NAMES[conflict.dayOfWeek]}{" "}
            {conflict.overlapStart}-{conflict.overlapEnd}
          </p>
        ))}

        <p className="mt-2 text-xs text-red-700">
          กรุณาสลับกลุ่มเรียนหรือเลือกรายวิชาอื่น
        </p>
      </div>

      <button
        type="button"
        aria-label="ปิดคำเตือนเวลาเรียนชน"
        onClick={onDismiss}
        className="shrink-0 rounded-lg p-1 text-red-500 hover:bg-red-100"
      >
        ×
      </button>
    </div>
  );
};

export default ConflictAlert;
