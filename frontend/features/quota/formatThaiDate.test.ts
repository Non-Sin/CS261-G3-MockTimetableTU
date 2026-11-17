import { afterEach, describe, expect, it, vi } from "vitest";
import { formatThaiDate, formatThaiSingleDate } from "./formatThaiDate";

describe("formatThaiDate", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("UT-UTIL-01 แปลงวันที่เดี่ยวเป็นภาษาไทย พ.ศ.", () => {
    expect(formatThaiDate(null, "2025-08-20")).toBe("20 สิงหาคม 2568");
    expect(formatThaiSingleDate("2025-08-20")).toBe("20 สิงหาคม 2568");
  });

  it("UT-UTIL-02 ช่วงวันที่ในเดือนและปีเดียวกัน", () => {
    expect(formatThaiDate("2025-08-04", "2025-08-08")).toBe("4 - 8 สิงหาคม 2568");
  });

  it("UT-UTIL-03 ช่วงวันที่คนละเดือนในปีเดียวกัน", () => {
    expect(formatThaiDate("2025-08-28", "2025-09-02")).toBe("28 สิงหาคม - 2 กันยายน 2568");
  });

  it("UT-UTIL-04 ช่วงวันที่ข้ามปี ค.ศ.", () => {
    expect(formatThaiDate("2025-12-28", "2026-01-05")).toBe("28 ธันวาคม 2568 - 5 มกราคม 2569");
  });

  it("UT-UTIL-05 ไม่เกิด Timezone Shift ในเครื่องที่ timezone ติดลบ", () => {
    const original = process.env.TZ;
    process.env.TZ = "America/Los_Angeles"; // UTC-7/-8: new Date("2025-08-04") จะกลายเป็นวันที่ 3
    try {
      expect(formatThaiSingleDate("2025-08-04")).toBe("4 สิงหาคม 2568");
      expect(formatThaiDate("2025-08-04", "2025-08-08")).toBe("4 - 8 สิงหาคม 2568");
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });

  it("วันเริ่มเท่ากับวันสิ้นสุดแสดงเป็นวันเดียว", () => {
    expect(formatThaiDate("2025-08-04", "2025-08-04")).toBe("4 สิงหาคม 2568");
  });
});
