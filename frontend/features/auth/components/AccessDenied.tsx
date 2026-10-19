import AuthIcon from "./AuthIcon";
import { REG_TU_URL } from "./AuthShell";

export default function AccessDenied({ onBack }: { onBack: () => void }) {
  return (
    <section className="w-full overflow-hidden rounded-[25px] border border-[#e3ebf5] bg-white px-7.5 py-8.5 text-center shadow-[0_12px_30px_#263e5f08] max-[440px]:px-5.5 max-[440px]:py-6.5" aria-labelledby="denied-title">
      <span className="mb-4 inline-grid size-15.5 place-items-center rounded-[19px] border border-[#ffe1e4] bg-[#fff2f3] text-[#de1525] shadow-[inset_0_2px_4px_#d7192010]">
        <AuthIcon name="shield" width={32} height={32} />
      </span>
      <p className="mx-auto mb-2.5 table rounded-full bg-[#ffeaee] px-2.75 py-1 text-[11px] font-bold text-[#cf1833]">Access Denied</p>
      <h1 id="denied-title" className="mt-2.5 mb-1 text-[23px] leading-[1.4] font-extrabold tracking-[-0.5px] max-[440px]:text-[21px]">ไม่สามารถเข้าใช้งานระบบได้</h1>
      <p className="mt-1 text-[13px] text-[#687d9d]">ระบบนี้เปิดให้ใช้งานเฉพาะนักศึกษาสาขาวิทยาการคอมพิวเตอร์ มหาวิทยาลัยธรรมศาสตร์เท่านั้น</p>
      <button type="button" className="mt-8 flex min-h-11.5 w-full items-center justify-center gap-2.25 rounded-[15px] border-0 bg-[#d4151e] px-4 py-2.75 text-[14px] font-bold text-white shadow-[0_4px_7px_#d4151e20] transition-colors duration-150 hover:bg-[#b91018] disabled:opacity-65" onClick={onBack}>
        กลับสู่หน้าเข้าสู่ระบบ <AuthIcon name="arrow" width={18} height={18} />
      </button>
      <a href={REG_TU_URL} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1.25 text-[12px] text-[#ce1826]">ไปยัง REG-TU <AuthIcon name="external" width={13} height={13} /></a>
    </section>
  );
}
