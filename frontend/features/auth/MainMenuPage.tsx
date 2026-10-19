"use client";

import Link from "next/link";
import { useCurrentUser } from "./hooks/useCurrentUser";
import AuthShell from "./components/AuthShell";
import AuthIcon from "./components/AuthIcon";
import UserNavbar from "./components/UserNavbar";

const menus = [
  { title: "จัดตารางเรียนจำลอง", description: "เพิ่ม / ลดวิชา และเปลี่ยนกลุ่มเรียนในตารางเรียนจำลอง", icon: "calendar", href: "/" },
  { title: "ตรวจสอบเงื่อนไขรายวิชา", description: "ตรวจสอบเงื่อนไขก่อนวางแผนลงทะเบียนเรียน", icon: "shield" },
  { title: "บันทึกวิชาที่เคยเรียนผ่าน", description: "จัดการรายวิชาที่ผ่านแล้วเพื่อประกอบการวางแผน", icon: "book" },
  { title: "ดูวิชาเสริมแนะนำ", description: "สำรวจรายวิชาเพิ่มเติมที่สนใจ", icon: "sparkle" },
  { title: "ค้นหาช่องทางขอโควตา", description: "ค้นหาข้อมูลและช่องทางติดต่อเพื่อขอโควตารายวิชา", icon: "search" },
] as const;

export default function MainMenuPage() {
  const { profile, error, retry } = useCurrentUser();

  return (
    <AuthShell account={<UserNavbar profile={profile} />}>
      {!profile ? (
        <div className="w-full max-w-105 text-center">
          {error ? (
            <div role="alert">
              <h1 className="text-[21px] font-bold">โหลดข้อมูลนักศึกษาไม่สำเร็จ</h1>
              <p className="mt-1 text-[13px] text-[#687d9d]">กรุณาลองใหม่อีกครั้ง</p>
              <button type="button" className="mt-8 flex min-h-11.5 w-full items-center justify-center gap-2.25 rounded-[15px] border-0 bg-[#d4151e] px-4 py-2.75 text-[14px] font-bold text-white shadow-[0_4px_7px_#d4151e20] transition-colors duration-150 hover:bg-[#b91018] disabled:opacity-65" onClick={retry}>ลองใหม่</button>
            </div>
          ) : <p role="status">กำลังตรวจสอบการเข้าสู่ระบบ…</p>}
        </div>
      ) : (
        <div className="w-full max-w-250 pt-3.75 pb-7.5">
          <p className="text-[12px] font-bold text-[#bc1826]">วางแผนวันนี้ เรียนอย่างมั่นใจ</p>
          <h1 className="my-1.25 text-[34px] font-extrabold tracking-[-0.8px] max-[440px]:text-[29px]">เมนูหลัก</h1>
          <p className="mt-1 text-[13px] text-[#687d9d]">ยินดีต้อนรับ {profile.firstName} เลือกสิ่งที่ต้องการทำเพื่อเริ่มวางแผนการเรียน</p>
          <div className="mt-8 grid grid-cols-3 gap-4.5 max-[760px]:grid-cols-2 max-[440px]:grid-cols-1">
            {menus.map((menu) => {
              const content = (
                <>
                  <span className="grid size-12.5 place-items-center rounded-[15px] bg-[#fff0f1] text-[#ce1724]"><AuthIcon name={menu.icon} width={27} height={27} /></span>
                  <h2 className="mt-4.25 mb-1.75 text-[17px] font-bold">{menu.title}</h2>
                  <p className="mb-4.5 text-[12px] text-[#71819c]">{menu.description}</p>
                  <span className="mt-auto flex items-center gap-1.75 text-[12px] font-bold text-[#c91725] group-disabled:text-[#7c8aa1]">
                    {"href" in menu ? <>เริ่มจัดตาราง <AuthIcon name="arrow" width={17} height={17} /></> : "เร็ว ๆ นี้"}
                  </span>
                </>
              );
              // ใช้ class ชุดเดียวกันให้การ์ดเมนูมี layout ตรงกันทั้งลิงก์และปุ่ม
              const cardClassName = "group flex min-h-[235px] flex-col items-start rounded-[20px] border border-[#e3eaf4] bg-white p-[25px] text-left text-inherit no-underline shadow-[0_8px_20px_#2d426705] disabled:bg-[#ffffffba]";
              return "href" in menu ? (
                <Link href={menu.href} key={menu.title} className={`${cardClassName} hover:border-[#f3acb2] hover:shadow-[0_10px_25px_#c4151d0a]`}>{content}</Link>
              ) : (
                <button type="button" key={menu.title} className={cardClassName} disabled>{content}</button>
              );
            })}
          </div>
          <p className="mt-6.25 text-[12px] text-[#7a88a2]">ระบบช่วยวางแผนการเรียนเท่านั้น กรุณาตรวจสอบข้อมูลและลงทะเบียนจริงผ่าน REG-TU</p>
        </div>
      )}
    </AuthShell>
  );
}
