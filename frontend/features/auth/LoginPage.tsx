"use client";

import { useCallback } from "react";
import { isAuthDemo } from "./api";
import { useLogin } from "./hooks/useLogin";
import AuthShell from "./components/AuthShell";
import LoginForm from "./components/LoginForm";
import AccessDenied from "./components/AccessDenied";
import AccountLocked from "./components/AccountLocked";

// หน้านี้เลือก component ตามสถานะ ส่วนเงื่อนไข login อยู่ใน hook
export default function LoginPage() {
  const login = useLogin();
  const { reset } = login;
  const unlock = useCallback(() => reset(true), [reset]);

  return (
    <AuthShell>
      <div className="w-full max-w-107.5">
        {isAuthDemo() && <p className="pb-2.5 text-center text-[11px] text-[#7d6843]">โหมดตัวอย่าง · ใช้บัญชีสมมติสำหรับทดสอบ</p>}
        {login.view === "denied" ? <AccessDenied onBack={() => login.reset()} />
          : login.view === "locked" ? <AccountLocked deadline={login.lockedUntil} onComplete={unlock} />
          : <LoginForm {...login} />}
      </div>
    </AuthShell>
  );
}
