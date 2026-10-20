import { redirect } from "next/navigation";

export default function Page() {
  // รองรับลิงก์เก่า ให้ใช้หน้าจัดตารางและ header ชุดเดียวที่ /
  redirect("/");
}
