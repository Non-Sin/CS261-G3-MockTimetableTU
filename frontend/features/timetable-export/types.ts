import type { RefObject } from "react";

// สถานะของปุ่ม PNG ระหว่างการส่งออกภาพ
export type ExportStatus = "idle" | "exporting" | "error";

// ข้อมูลที่กล่องตารางของ US1 ส่งให้ปุ่ม PNG
export type ExportPngButtonProps = {
  targetRef: RefObject<HTMLElement | null>;
  academicYear: number;
  semester: number;
  hasConflicts: boolean;
};
