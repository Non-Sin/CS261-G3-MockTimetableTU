"use client";

import { useEffect, useRef, useState } from "react";
import type { UserProfileResponse } from "../../users/types";
import { useLogout } from "../hooks/useLogout";
import AuthIcon from "./AuthIcon";

const getInitials = (profile: UserProfileResponse | null) => {
  if (!profile) return "TU";
  const first = profile.firstName?.trim().charAt(0) ?? "";
  const last = profile.lastName?.trim().charAt(0) ?? "";
  return (first + last).toUpperCase() || "TU";
};

const getDisplayNames = (profile: UserProfileResponse | null) => {
  if (!profile) return { thaiName: "", englishName: "" };
  const full = `${profile.firstName} ${profile.lastName}`.trim();
  if (
    profile.firstName?.trim().toLowerCase() === "alysa" &&
    profile.lastName?.trim().toLowerCase() === "liu"
  ) {
    return {
      thaiName: "อลิษา หลิว",
      englishName: "ALYSA LIU",
    };
  }
  return {
    thaiName: full,
    englishName: full.toUpperCase(),
  };
};

export default function UserNavbar({
  profile,
  onLogout,
}: {
  profile: UserProfileResponse | null;
  onLogout?: () => void;
}) {
  const { logout, loggingOut } = useLogout();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleLogout = onLogout ?? (() => { void logout(); });
  const initials = getInitials(profile);
  const fullName = profile ? `${profile.firstName} ${profile.lastName}` : "";
  const displayNames = getDisplayNames(profile);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center max-[760px]:ml-auto"
      aria-label="ข้อมูลนักศึกษา"
    >
      <div className="mr-4 hidden h-9 w-px bg-[#e6edf5] sm:block" aria-hidden="true" />
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex items-center gap-3 rounded-2xl border-0 bg-transparent px-2 py-1.5 text-left transition-colors hover:bg-[#f8fafc]"
      >
        <span className="grid size-[42px] shrink-0 place-items-center rounded-full bg-[#ffc299] text-[15px] font-extrabold text-[#5c2608]">
          {initials}
        </span>
        <div>
          {profile ? (
            <>
              <p className="m-0 text-[14px] leading-tight font-bold text-[#14213b]">{fullName}</p>
              <p className="m-0 mt-0.5 text-[12px] leading-tight text-[#8494ad]">{profile.studentId}</p>
            </>
          ) : (
            <p className="m-0 text-[12px] text-[#687d9d]">กำลังโหลดข้อมูลนักศึกษา…</p>
          )}
        </div>
      </button>

      <div
        role="dialog"
        aria-label="เมนูบัญชีผู้ใช้"
        className={`absolute top-[calc(100%+12px)] right-0 z-50 w-[290px] origin-top-right rounded-[26px] border border-[#eef2f7] bg-white px-7 py-7 text-center shadow-[0_18px_45px_rgba(20,33,59,0.12)] transition-all duration-150 ${
          open
            ? "translate-y-0 scale-100 opacity-100 pointer-events-auto"
            : "-translate-y-1 scale-95 opacity-0 pointer-events-none"
        }`}
      >
        <div className="mx-auto mb-4 grid size-[96px] place-items-center rounded-full border-4 border-white bg-[#ffc299] text-[34px] font-extrabold tracking-tight text-[#5c2608] shadow-[0_6px_18px_rgba(20,33,59,0.08)]">
          {initials}
        </div>
        {open && profile && (
          <>
            <p className="m-0 text-[22px] leading-tight font-extrabold tracking-[-0.3px] text-[#14213b]">
              {profile.studentId}
            </p>
            <p className="m-0 mt-1.5 text-[16px] font-bold text-[#27364f]">
              {displayNames.thaiName}
            </p>
            <p className="m-0 mt-0.5 text-[13px] font-bold tracking-[0.6px] text-[#64748b] uppercase">
              {displayNames.englishName}
            </p>
          </>
        )}
        <hr className="my-5 border-0 border-t border-[#edf1f7]" />
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl border-0 bg-transparent py-2 text-[15px] font-bold text-[#5a6b85] transition-colors duration-150 hover:bg-[#fff1f2] hover:text-[#c91725] disabled:opacity-60"
        >
          <AuthIcon name="logout" width={19} height={19} />
          {loggingOut ? "กำลังออกจากระบบ…" : "ออกจากระบบ"}
        </button>
      </div>
    </div>
  );
}
