"use client";

import { useState } from "react";
import TimetableWorkspace from "../timetable/TimetableWorkspace";
import { useCurrentUser } from "./hooks/useCurrentUser";
import AuthGuard from "./components/AuthGuard";
import AuthShell from "./components/AuthShell";
import InactivityTimer from "./components/InactivityTimer";
import AppNavigation, { APP_SECTIONS, type AppSection } from "./components/AppNavigation";
import UserNavbar from "./components/UserNavbar";

export default function MainMenuPage({ inactivityTimeoutMs }: { inactivityTimeoutMs?: number } = {}) {
  const { profile, error, retry } = useCurrentUser();
  // หน้าจัดตารางเป็นค่าเริ่มต้น เมนูที่เหลืออยู่ใน header เดียวกัน
  const [activeSection, setActiveSection] = useState<AppSection>("timetable");
  const selectedSection = APP_SECTIONS.find((section) => section.id === activeSection)!;

  return (
    <AuthGuard>
      <InactivityTimer timeoutMs={inactivityTimeoutMs}>
        <AuthShell
          contentLayout="workspace"
          account={<UserNavbar profile={profile} />}
          navigation={<AppNavigation activeSection={activeSection} onSelect={setActiveSection} disabled={!profile} />}
        >
          {!profile ? (
            <div className="mx-auto w-full max-w-105 py-12 text-center">
              {error ? (
                <div role="alert">
                  <h1 className="text-[21px] font-bold">โหลดข้อมูลนักศึกษาไม่สำเร็จ</h1>
                  <p className="mt-1 text-[13px] text-[#687d9d]">กรุณาลองใหม่อีกครั้ง</p>
                  <button type="button" className="mt-6 min-h-11.5 rounded-[15px] bg-[#d4151e] px-6 py-3 text-[14px] font-bold text-white hover:bg-[#b91018]" onClick={retry}>ลองใหม่</button>
                </div>
              ) : <p role="status">กำลังตรวจสอบการเข้าสู่ระบบ…</p>}
            </div>
          ) : (
            <div className="mx-auto w-full max-w-7xl space-y-5">
              <div>
                <p className="text-[12px] font-semibold text-[#bc1826]">วางแผนวันนี้ เรียนอย่างมั่นใจ</p>
                <h1 className="mt-1 text-[26px] font-extrabold tracking-[-0.5px] sm:text-[30px]">{selectedSection.label}</h1>
                <p className="mt-1 text-[13px] text-[#687d9d]">ยินดีต้อนรับ {profile.firstName} {selectedSection.description}</p>
              </div>

              <TimetableWorkspace activeSection={activeSection} onOpenQuota={() => setActiveSection("quota")} />
            </div>
          )}
        </AuthShell>
      </InactivityTimer>
    </AuthGuard>
  );
}
