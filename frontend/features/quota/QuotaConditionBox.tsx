import type { QuotaCondition } from "./types";

type QuotaConditionBoxProps = {
  conditions: QuotaCondition[];
  // กดชิปรหัสวิชาที่อ้างถึง เพื่อให้หน้าหลักดึงช่องทางขอโควตาของวิชานั้น
  onSelectCourse: (courseCode: string) => void;
};

const QuotaConditionBox = ({ conditions, onSelectCourse }: QuotaConditionBoxProps) => (
  <section aria-label="เงื่อนไขและข้อกำหนดสำคัญ" className="rounded-xl border border-amber-200 bg-amber-50 p-4">
    <h4 className="text-[13px] font-bold text-amber-900">เงื่อนไขและข้อกำหนดสำคัญ</h4>

    {conditions.length === 0 ? (
      <p className="mt-2 rounded-lg bg-white px-3 py-2 text-[13px] text-amber-900">
        ไม่มีเงื่อนไข สามารถยื่นขอโควตาได้ตามกำหนดเวลา
      </p>
    ) : (
      <ul className="mt-2 space-y-2">
        {conditions.map((condition) => (
          <li
            key={`${condition.relatedCourseCode ?? ""}-${condition.text}`}
            className="flex flex-wrap items-center gap-2 rounded-lg bg-white px-3 py-2 text-[13px] text-amber-900"
          >
            <span>{condition.text}</span>
            {/* ไม่มี relatedCourseCode = ข้อความล้วน ไม่แสดงชิป */}
            {condition.relatedCourseCode && (
              <button
                type="button"
                onClick={() => onSelectCourse(condition.relatedCourseCode!)}
                className="rounded-md bg-[#fff0f1] px-2 py-0.5 text-[12px] font-bold text-[#c91725] hover:bg-[#ffdfe2]"
              >
                {condition.relatedCourseCode}
              </button>
            )}
          </li>
        ))}
      </ul>
    )}
  </section>
);

export default QuotaConditionBox;
