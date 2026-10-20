"use client";

import { useState } from "react";
import Timetable from "../timetable/Timetable";
import { useCurrentUser } from "./hooks/useCurrentUser";
import AuthGuard from "./components/AuthGuard";
import AuthShell from "./components/AuthShell";
import AuthIcon from "./components/AuthIcon";
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

              {/* รอ profile สำเร็จก่อนโหลดตาราง และคง component ไว้เมื่อสลับเมนูเพื่อรักษาภาคเรียนที่เลือก */}
              <div hidden={activeSection !== "timetable"}>
                <Timetable />
              </div>

              {activeSection !== "timetable" && (
                <section aria-labelledby="feature-pending-title" className="rounded-2xl border border-[#e3ebf5] bg-white px-6 py-14 text-center shadow-sm">
                  <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-[#fff0f1] text-[#c91725]">
                    <AuthIcon name={selectedSection.icon} width={28} height={28} />
                  </span>
                  <h2 id="feature-pending-title" className="text-[20px] font-bold">เมนูนี้อยู่ระหว่างพัฒนา</h2>
                  <p className="mx-auto mt-2 max-w-md text-[13px] text-[#687d9d]">ฟังก์ชัน{selectedSection.label}จะเปิดให้ใช้งานเร็ว ๆ นี้ ระหว่างนี้คุณสามารถวางแผนตารางเรียนได้ตามปกติ</p>
                  <button type="button" onClick={() => setActiveSection("timetable")} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#d4151e] px-5 py-3 font-bold text-white hover:bg-[#b91018]">
                    <AuthIcon name="calendar" width={18} height={18} /> กลับไปจัดตารางเรียน
                  </button>
                </section>
              )}
            </div>
          )}
        </AuthShell>
      </InactivityTimer>
    </AuthGuard>
  );
}
