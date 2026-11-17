import type { FormEvent } from "react";

export type QuotaSearchSubmit = { q: string; mine: boolean };

type QuotaSearchBarProps = {
  value: string;
  mine: boolean;
  // วิชาในตารางเรียนของภาคนี้ (ใช้ทำป้าย checkbox); ว่าง = ปิด checkbox
  myCourseCodes: string[];
  onValueChange: (value: string) => void;
  onMineChange: (mine: boolean) => void;
  onSearch: (submit: QuotaSearchSubmit) => void;
  onClear: () => void;
};

// ช่องค้นหาแบบ controlled: parent ถือ value/mine เพื่อให้ตั้งค่าจากภายนอกได้ (เช่น กดชิปรหัสวิชา)
// Spec กำหนด q ยาวไม่เกิน 50 ตัวอักษร จึงจำกัดที่ช่องกรอกล่วงหน้า
const QuotaSearchBar = ({
  value,
  mine,
  myCourseCodes,
  onValueChange,
  onMineChange,
  onSearch,
  onClear,
}: QuotaSearchBarProps) => {
  const hasPlan = myCourseCodes.length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch({ q: value.trim(), mine });
  };

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[#e3ebf5] bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            maxLength={50}
            onChange={(event) => onValueChange(event.target.value)}
            placeholder="ค้นหาด้วยรหัสวิชา หรือชื่อวิชา เช่น MA211"
            aria-label="ค้นหาด้วยรหัสวิชา หรือชื่อวิชา"
            className="w-full rounded-xl border border-[#e3ebf5] bg-[#f7f9fc] py-3 pl-4 pr-10 text-[14px] outline-none focus:border-[#d4151e]"
          />
          {value && (
            <button
              type="button"
              aria-label="ล้างคำค้น"
              onClick={onClear}
              className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-[#687d9d] hover:bg-[#e3ebf5]"
            >
              <span aria-hidden="true">×</span>
            </button>
          )}
        </div>
        <button
          type="submit"
          className="rounded-xl bg-[#d4151e] px-6 py-3 text-[14px] font-bold text-white hover:bg-[#b91018]"
        >
          ค้นหาข้อมูล
        </button>
      </div>

      <label
        className={`mt-3 inline-flex items-center gap-2 rounded-xl border border-[#e3ebf5] bg-[#f7f9fc] px-3 py-2 text-[12px] font-semibold text-[#14213b] ${
          hasPlan ? "cursor-pointer" : "cursor-not-allowed opacity-60"
        }`}
      >
        <input
          type="checkbox"
          checked={mine}
          disabled={!hasPlan}
          onChange={(event) => onMineChange(event.target.checked)}
          className="size-4 accent-[#d4151e]"
        />
        {hasPlan ? `เฉพาะวิชาในแผนของฉัน (${myCourseCodes.join(", ")})` : "เฉพาะวิชาในแผนของฉัน"}
      </label>
    </form>
  );
};

export default QuotaSearchBar;
