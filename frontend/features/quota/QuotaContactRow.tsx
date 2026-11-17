import { EXTERNAL_LINK_PROPS, isSafeUrl } from "./labels";
import type { QuotaContact } from "./types";

type QuotaContactRowProps = { contact: QuotaContact };

// ชื่อคณะ/ภาควิชาด้านซ้าย; มี url -> ลิงก์ label เปิดแท็บใหม่ด้านขวา; ไม่มี url -> ข้อความเฉยๆ
const QuotaContactRow = ({ contact }: QuotaContactRowProps) => (
  <div className="flex flex-col gap-2 rounded-lg bg-white px-3 py-2 text-[13px] sm:flex-row sm:items-center sm:justify-between">
    <p className="font-bold text-[#14213b]">{contact.organizationName}</p>
    {isSafeUrl(contact.url) ? (
      <a
        href={contact.url}
        {...EXTERNAL_LINK_PROPS}
        className="inline-flex items-center gap-1 rounded-lg border border-[#e3ebf5] bg-[#f7f9fc] px-3 py-1 text-[12px] font-semibold text-[#14213b] hover:bg-[#e3ebf5]"
      >
        {contact.label}
        <span aria-hidden="true">↗</span>
      </a>
    ) : (
      <span className="text-[12px] text-[#687d9d]">{contact.label}</span>
    )}
  </div>
);

export default QuotaContactRow;
