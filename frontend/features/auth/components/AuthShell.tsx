import type { ReactNode } from "react";
import AuthIcon from "./AuthIcon";

export const REG_TU_URL = "https://reg.tu.ac.th/";
export const ACCOUNT_TU_URL = "https://accounts.tu.ac.th/";

export default function AuthShell({ children, account }: { children: ReactNode; account?: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-[#f7f9fc] font-[Arial,Helvetica,sans-serif] text-[14px] leading-[1.6] text-[#14213b] [&_:is(button,a,input):focus-visible]:outline-[3px] [&_:is(button,a,input):focus-visible]:outline-offset-3 [&_:is(button,a,input):focus-visible]:outline-[#e8a11b] [&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 bg-[#cb171d] px-6 py-2.5 text-[12px] font-bold text-white max-[760px]:gap-x-2 max-[760px]:gap-y-1.5 max-[760px]:px-3.5 max-[760px]:py-[9px] max-[760px]:text-[10px]">
        <span className="inline-flex items-center gap-[5px] rounded-full bg-[#ffd033] px-[11px] py-[3px] text-[#301d0a]"><AuthIcon name="warning" width={14} height={14} /> คำเตือนสำคัญ</span>
        <span>ระบบนี้เป็นเพียงระบบช่วยวางแผนตารางเรียนเท่านั้น</span>
        <strong className="rounded-full bg-white px-3 py-[3px] text-[#c6151d] max-[760px]:px-[7px] max-[760px]:py-0.5 max-[440px]:hidden">ไม่สามารถใช้ลงทะเบียนเรียนจริงได้</strong>
        <a href={REG_TU_URL} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-[5px] rounded-full bg-white px-3 py-[3px] whitespace-nowrap text-[#c6151d] no-underline">ไปยัง REG-TU <AuthIcon name="external" width={12} height={12} /></a>
      </div>
      <header className="flex items-center justify-between gap-5 border-b border-[#eaf0f7] bg-white px-[30px] py-[18px] max-[760px]:flex-wrap max-[760px]:px-[18px] max-[760px]:py-[15px]">
        <div className="flex items-center gap-[13px]">
          <span className="grid size-[42px] shrink-0 place-items-center rounded-[15px] bg-[linear-gradient(135deg,#ff6848,#f51c55)] text-white shadow-[0_4px_10px_#f51c5520]"><AuthIcon name="calendar" width={23} height={23} /></span>
          <div>
            <p className="m-0 text-[20px] font-extrabold tracking-[-0.6px] max-[760px]:text-[18px]">MockTimetable <span className="text-[#d31620]">TU</span></p>
            <p className="mt-px text-[11px] text-[#708099] max-[760px]:text-[9px] max-[440px]:max-w-[245px]">ระบบช่วยวางแผนและจัดตารางเรียนจำลอง มหาวิทยาลัยธรรมศาสตร์</p>
          </div>
        </div>
        {account}
      </header>
      <main className="grid flex-1 place-items-center bg-[radial-gradient(ellipse_at_0_0,#fff0f1_0,transparent_40%),radial-gradient(ellipse_at_100%_100%,#fff9e9_0,transparent_38%)] px-6 py-12 max-[760px]:px-4 max-[760px]:py-8">{children}</main>
      <footer className="flex items-center justify-between gap-5 border-t border-[#e6edf5] bg-white px-7 py-[22px] text-[10px] text-[#71829e] max-[760px]:flex-wrap max-[760px]:gap-2.5 max-[760px]:p-4">
        <p className="m-0 flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-[#ca1522] p-[3px] text-[10px] font-extrabold text-white">TU</span> MockTimetableTU
          <span className="max-[760px]:hidden"> · ระบบช่วยจัดตารางเรียนสำหรับนักศึกษาวิทยาการคอมพิวเตอร์ ภาคปกติ มหาวิทยาลัยธรรมศาสตร์</span>
        </p>
        <nav aria-label="ลิงก์ช่วยเหลือ" className="flex shrink-0 gap-4">
          <a href={REG_TU_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-[3px] text-[#647b9b] no-underline">REG-TU <AuthIcon name="external" width={12} height={12} /></a>
          <a href="https://github.com/Non-Sin/CS261-G3-MockTimetableTU/issues" target="_blank" rel="noreferrer" className="inline-flex items-center gap-[3px] text-[#647b9b] no-underline">แจ้งปัญหา</a>
        </nav>
      </footer>
    </div>
  );
}
