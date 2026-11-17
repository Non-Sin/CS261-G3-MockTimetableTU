type QuotaEmptyStateProps = {
  // คำค้นหรือรหัสวิชาที่ไม่พบ; ว่าง/null = ติ๊ก "เฉพาะวิชาในแผนของฉัน" แล้วไม่มีผล
  query?: string | null;
};

const QuotaEmptyState = ({ query }: QuotaEmptyStateProps) => (
  <div className="rounded-2xl border border-[#e3ebf5] bg-white px-6 py-12 text-center shadow-sm">
    <span aria-hidden="true" className="mx-auto grid size-14 place-items-center rounded-full bg-[#fff0f1] text-[22px] text-[#c91725]">
      ⌕
    </span>
    <h3 className="mt-4 text-[18px] font-extrabold text-[#14213b]">ไม่พบข้อมูลช่องทางขอโควตาสำหรับวิชานี้</h3>
    <p className="mt-1 text-[13px] text-[#687d9d]">
      {query
        ? `ยังไม่มีข้อมูลช่องทางการขอโควตา สำหรับรายวิชา ${query} ในระบบ`
        : "ไม่พบรายวิชาในแผนการเรียนของคุณที่มีข้อมูลการขอโควตา"}
    </p>
  </div>
);

export default QuotaEmptyState;
