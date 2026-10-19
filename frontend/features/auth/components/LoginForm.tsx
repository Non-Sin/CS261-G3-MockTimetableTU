import { useState } from "react";
import type { useLogin } from "../hooks/useLogin";
import { INVALID_LOGIN_MESSAGE } from "../hooks/useLogin";
import AuthIcon from "./AuthIcon";

type LoginFormProps = Pick<ReturnType<typeof useLogin>, "fields" | "fieldErrors" | "error" | "submitting" | "changeField" | "submit" | "unlocked">;

export default function LoginForm({ fields, fieldErrors, error, submitting, changeField, submit, unlocked }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const credentialsInvalid = error === INVALID_LOGIN_MESSAGE;

  return (
    <section className="w-full overflow-hidden rounded-[25px] border border-[#e3ebf5] bg-white shadow-[0_12px_30px_#263e5f08]" aria-labelledby="login-title">
      <div className="px-[30px] pt-[30px] pb-6 text-center max-[440px]:px-[22px] max-[440px]:py-[26px]">
        <span className={`mb-4 inline-grid size-[62px] place-items-center rounded-[19px] border shadow-[inset_0_2px_4px_#d7192010] ${unlocked ? "border-[#c0f4e2] bg-[#effdf7] text-[#009b76]" : "border-[#ffe1e4] bg-[#fff2f3] text-[#de1525]"}`}>
          <AuthIcon name={unlocked ? "unlock" : "user"} width={32} height={32} />
        </span>
        {unlocked && <p role="status" className="mx-auto mb-2.5 table rounded-full bg-[#e8f9f2] px-[11px] py-1 text-[11px] font-bold text-[#008568]">ครบกำหนดระงับการเข้าใช้งานแล้ว</p>}
        <h1 id="login-title" className="mb-1 text-[24px] leading-[1.4] font-extrabold tracking-[-0.5px] max-[440px]:text-[21px]">{unlocked ? "ปลดการระงับการเข้าสู่ระบบแล้ว" : "Login"}</h1>
        <p className="mt-1 text-[13px] text-[#687d9d]">{unlocked ? "ท่านสามารถกรอกข้อมูลเพื่อเข้าสู่ระบบใหม่อีกครั้งได้แล้ว" : "เข้าใช้งานระบบช่วยจัดตารางเรียน"}</p>
        <div className="mt-5 rounded-2xl border border-[#ffe39b] bg-[#fffbef] p-[15px] text-left text-[12px] leading-[1.8] text-[#573514]">
          <strong>คำแนะนำ:</strong> ใช้ <u className="font-bold text-[#c91822]">Username</u> และ <u className="font-bold text-[#c91822]">Password</u> เดียวกับที่เข้าใช้งานระบบ <strong>REG-TU</strong> ได้เลย
        </div>
      </div>
      <form className="border-t border-[#f0f3f8] px-[30px] pt-[26px] pb-[42px] max-[440px]:px-[22px] max-[440px]:pt-6 max-[440px]:pb-8" noValidate onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        {error && (
          <div role="alert" className="mb-[23px] flex items-start gap-[9px] rounded-[15px] border border-[#ffbfc6] bg-[#fff3f4] p-[15px] text-[12px] text-[#ce1826]">
            <AuthIcon name="warning" width={18} height={18} className="mt-0.5 shrink-0" />
            <div><strong className="block">เข้าสู่ระบบไม่สำเร็จ</strong><p className="mt-px">{error}</p></div>
          </div>
        )}
        <div className="mb-5">
          <label htmlFor="login-username" className="mb-[7px] block text-[13px] font-semibold">ชื่อผู้ใช้งาน (Username)</label>
          <div className="relative flex items-center text-[#8c9cba]">
            <AuthIcon name="user" width={17} height={17} className="pointer-events-none absolute left-3.5" />
            <input
              id="login-username" name="username" autoComplete="username" placeholder="เช่น 6809610000"
              className="h-[46px] w-full rounded-[13px] border border-[#e1e8f3] bg-[#f7f9fc] py-2.5 pr-[45px] pl-10 text-[14px] text-[#1c2b46] placeholder:text-[#8a9bbb] aria-invalid:border-[#ff6b76] aria-invalid:bg-[#fff9f9] disabled:opacity-70"
              value={fields.username} onChange={(event) => changeField("username", event.target.value)}
              disabled={submitting} aria-required="true" aria-invalid={Boolean(fieldErrors.username) || credentialsInvalid}
              aria-describedby={fieldErrors.username ? "username-error" : undefined}
            />
          </div>
          {fieldErrors.username && <p id="username-error" role="alert" className="mt-1.5 text-[12px] text-[#bf1726]">{fieldErrors.username}</p>}
        </div>
        <div className="mb-5">
          <label htmlFor="login-password" className="mb-[7px] block text-[13px] font-semibold">รหัสผ่าน (Password)</label>
          <div className="relative flex items-center text-[#8c9cba]">
            <AuthIcon name="lock" width={17} height={17} className="pointer-events-none absolute left-3.5" />
            <input
              id="login-password" name="password" type={showPassword ? "text" : "password"}
              autoComplete="current-password" placeholder="กรอกรหัสผ่านของคุณ"
              className="h-[46px] w-full rounded-[13px] border border-[#e1e8f3] bg-[#f7f9fc] py-2.5 pr-[45px] pl-10 text-[14px] text-[#1c2b46] placeholder:text-[#8a9bbb] aria-invalid:border-[#ff6b76] aria-invalid:bg-[#fff9f9] disabled:opacity-70"
              value={fields.password} onChange={(event) => changeField("password", event.target.value)}
              disabled={submitting} aria-required="true" aria-invalid={Boolean(fieldErrors.password) || credentialsInvalid}
              aria-describedby={fieldErrors.password ? "password-error" : undefined}
            />
            <button type="button" className="absolute right-1.5 grid size-[34px] place-items-center rounded-[9px] border-0 bg-transparent text-[#8295b4]" aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>
              <AuthIcon name="eye" width={17} height={17} />
            </button>
          </div>
          {fieldErrors.password && <p id="password-error" role="alert" className="mt-1.5 text-[12px] text-[#bf1726]">{fieldErrors.password}</p>}
        </div>
        <button type="submit" className="mt-8 flex min-h-[46px] w-full items-center justify-center gap-[9px] rounded-[15px] border-0 bg-[#d4151e] px-4 py-[11px] text-[14px] font-bold text-white shadow-[0_4px_7px_#d4151e20] transition-colors duration-150 hover:bg-[#b91018] disabled:opacity-65" disabled={submitting}>
          {submitting ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ (Login)"}<AuthIcon name="arrow" width={18} height={18} />
        </button>
      </form>
      <div className="h-[30px] border-t border-[#f2f5f9] bg-[#fafbfd]" />
    </section>
  );
}
