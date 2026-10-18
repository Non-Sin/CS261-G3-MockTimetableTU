"use client"

import { useState } from "react";
import { buildExportFileName, EXPORT_IGNORE_ATTR, exportElementToPng } from "./exportPng";
import type { ExportPngButtonProps, ExportStatus } from "./types";

const ignoreInExport = { [EXPORT_IGNORE_ATTR]: "" };

// ปุ่ม PNG บนหัวกล่องตารางเรียนจำลอง กดแล้วบันทึกกล่องตารางเป็นภาพ
const ExportPngButton = ({ targetRef, academicYear, semester, hasConflicts }: ExportPngButtonProps) => {
  const [status, setStatus] = useState<ExportStatus>("idle");

  // ตารางที่มีเวลาชนไม่อนุญาตให้บันทึกภาพ และกันกดซ้ำระหว่างสร้างภาพ
  const disabled = hasConflicts || status === "exporting";

  const handleClick = async () => {
    setStatus("exporting");

    try {
      if (!targetRef.current) {
        throw new Error("ไม่พบกล่องตารางเรียนจำลอง");
      }

      await exportElementToPng(targetRef.current, buildExportFileName(academicYear, semester));
      setStatus("idle");
    } catch (error) {
      console.error("ส่งออกภาพตารางเรียนไม่สำเร็จ", error);
      setStatus("error");
    }
  };

  return (
    <div className="flex flex-col items-end gap-1" {...ignoreInExport}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        title={hasConflicts ? "แก้เวลาเรียนชนก่อนบันทึกเป็นภาพ" : "บันทึกตารางเรียนเป็นภาพ PNG"}
        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none md:text-sm"
        {...ignoreInExport}
      >
        <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        PNG
      </button>

      {status === "error" && (
        <p role="alert" className="text-xs text-red-600">
          ส่งออกภาพไม่สำเร็จ กรุณาลองใหม่
        </p>
      )}
    </div>
  );
};

export default ExportPngButton;
