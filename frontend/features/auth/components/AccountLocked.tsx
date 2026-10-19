import { useCountdown } from "../hooks/useCountdown";
import AuthIcon from "./AuthIcon";
import { ACCOUNT_TU_URL } from "./AuthShell";

export default function AccountLocked({ deadline, onComplete }: { deadline: number; onComplete: () => void }) {
  const { minutes, seconds } = useCountdown(deadline, onComplete);
  return (
    <section className="w-full overflow-hidden rounded-[25px] border border-[#e3ebf5] bg-white px-7.5 py-8.5 text-center shadow-[0_12px_30px_#263e5f08] max-[440px]:px-5.5 max-[440px]:py-6.5" aria-labelledby="locked-title">
      <span className="mb-4 inline-grid size-15.5 place-items-center rounded-[19px] border border-[#ffe1e4] bg-[#fff2f3] text-[#de1525] shadow-[inset_0_2px_4px_#d7192010]">
        <AuthIcon name="lock" width={32} height={32} />
      </span>
      <p className="mx-auto mb-2.5 table rounded-full bg-[#ffeaee] px-2.75 py-1 text-[11px] font-bold text-[#cf1833]">ตรวจพบความพยายามเข้าสู่ระบบผิดพลาด 5 ครั้ง</p>
      <h1 id="locked-title" className="mt-2.5 mb-1 text-[23px] leading-[1.4] font-extrabold tracking-[-0.5px] max-[440px]:text-[21px]">ระงับการเข้าสู่ระบบชั่วคราว</h1>
      <p className="mt-1 text-[13px] text-[#687d9d]">เพื่อความปลอดภัยของข้อมูลบัญชีนักศึกษา ระบบได้ระงับการใช้งานชั่วคราวเป็นเวลา 15 นาที</p>
      <div className="mt-6 rounded-[17px] border border-[#ffd2da] bg-[linear-gradient(#fff6f7,#fff)] p-5">
        <p className="mb-4.5 flex items-center gap-1.75 text-left text-[12px]"><AuthIcon name="clock" width={16} height={16} /> ระบบจะปลดการระงับอัตโนมัติในอีก</p>
        <div role="timer" aria-label="เวลาที่เหลือในการระงับบัญชี" className="flex items-start justify-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <strong className="block min-w-21.25 rounded-[13px] border border-[#ffd4dc] bg-white px-2.5 py-2 text-[36px] leading-[1.4] font-extrabold tabular-nums">{minutes}</strong>
            <span className="text-[11px] text-[#687b9b]">นาที</span>
          </div>
          <b aria-hidden="true" className="pt-2.5 text-[27px] text-[#ff849a]">:</b>
          <div className="flex flex-col items-center gap-1">
            <strong className="block min-w-21.25 rounded-[13px] border border-[#ffd4dc] bg-white px-2.5 py-2 text-[36px] leading-[1.4] font-extrabold text-[#ef2650] tabular-nums">{seconds}</strong>
            <span className="text-[11px] text-[#687b9b]">วินาที</span>
          </div>
        </div>
      </div>
      <div className="mt-4.5 flex items-center justify-between gap-2.5 rounded-[15px] border border-[#ffe29a] bg-[#fffcf1] p-3.5 text-left text-[11px] max-[440px]:flex-col max-[440px]:items-start">
        <div><strong>หากท่านลืมรหัสผ่าน</strong><p className="text-[#7483a0]">สามารถเปลี่ยนรหัสผ่านเพื่อเข้าใช้งานใหม่</p></div>
        <a href={ACCOUNT_TU_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-[#ffe3a8] bg-white px-2 py-1.25 font-semibold whitespace-nowrap text-[#c31822] no-underline">accounts.tu.ac.th <AuthIcon name="external" width={12} height={12} /></a>
      </div>
      <p className="mt-5.5 text-[11px] text-[#6c7e9d]">ยังคงพบปัญหาการเข้าสู่ระบบ? <a href="https://github.com/Non-Sin/CS261-G3-MockTimetableTU/issues" target="_blank" rel="noreferrer" className="text-[#ca1724] no-underline">ติดต่อผู้ดูแล / แจ้งปัญหา</a></p>
    </section>
  );
}
