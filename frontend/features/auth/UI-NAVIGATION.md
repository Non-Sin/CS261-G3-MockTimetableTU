# ปรับ UI ตามข้อเสนอแนะ — 20 ตุลาคม 2026

Branch: `codex/ui-navigation-feedback`

## 1. ใช้โครงหน้าร่วมกัน

`components/AuthShell.tsx` ดูแลแถบเตือน โลโก้ เมนู ข้อมูลนักศึกษา และ footer

- เปลี่ยน `REG_TU_URL` เป็น `https://vnweb68.reg.tu.ac.th/registrar/home` ที่เดียว ทุกลิงก์ REG-TU ใน auth ใช้ค่านี้
- ตัดชื่อมหาวิทยาลัยออกจากคำบรรยายใต้โลโก้ตามภาพ
- เพิ่ม prop `navigation` สำหรับส่งเมนูมาแสดงใน header
- เพิ่ม `contentLayout`: `centered` สำหรับฟอร์ม Login และ `workspace` สำหรับหน้าจัดตารางที่เริ่มเนื้อหาจากด้านบน
- หน้าจอเล็กแยกเมนูเป็นอีกแถวและเลื่อนแนวนอนได้

เหตุผล: header ของหน้า Login และหน้าจัดตารางใช้ component เดียวกัน จึงแก้ดีไซน์และลิงก์ได้จากจุดเดียว

## 2. ใช้ตารางเป็นหน้าแรกหลัง Login

- `hooks/useLogin.ts`: สำเร็จแล้ว `router.replace("/")`
- `app/page.tsx`: เรียก `MainMenuPage` ซึ่งตอนนี้จัดเมนูไว้ใน header และเปิดเนื้อหาตารางเป็นค่าเริ่มต้น
- `app/dashboard/page.tsx`: redirect มาที่ `/` เพื่อรองรับลิงก์เก่า
- `MainMenuPage` เรียก `useCurrentUser` และรอ profile สำเร็จก่อน mount `Timetable`

เหตุผล: ลดขั้นตอนจากหน้าเมนูการ์ดไปหน้าตาราง และใช้ profile ชุดเดียวแสดงชื่อกับรหัสนักศึกษาด้านขวาแทน DEMO badge

การตรวจ session นี้เป็นการควบคุม UI ฝั่ง client ส่วนการบังคับสิทธิ์ API เป็นหน้าที่ backend

## 3. ย้ายเมนูขึ้น header

`components/AppNavigation.tsx` กำหนดรายการเมนูและชื่อที่ใช้แสดง:

1. จัดตารางเรียนจำลอง
2. ดูวิชาเสรีแนะนำ
3. ค้นหาช่องทางขอโควตา

`activeSection` เก็บเมนูปัจจุบัน และ `aria-current="page"` ระบุปุ่มที่กำลังใช้งาน

ใช้ `hidden` ซ่อนตารางเมื่อสลับเมนู เพื่อคงภาคเรียนและข้อมูลที่โหลดไว้ เมื่อกลับมาจัดตารางจะไม่เริ่ม state ใหม่

เมนูวิชาเสรีและขอโควตาแสดงหน้ารอพัฒนา ยังไม่มีการเพิ่ม API ของฟังก์ชันเหล่านี้ ส่วนเมนูประวัติการเรียนถูกนำออกตามคำขอเพิ่มเติม

บัญชีตัวอย่างใน `demoApi.ts` เปลี่ยนชื่อเป็น **สมชาย ใจดี** ส่วนชื่อของผู้ใช้จริงยังใช้ข้อมูลที่ API ตอบกลับมา

## 4. แยกเนื้อหาตารางจากโครงหน้า

`features/timetable/Timetable.tsx` เหลือเนื้อหาตาราง รายการวิชา และส่วนค้นหา โดยตัด header และแถบเตือนชุดเก่าออก

เหตุผล: ป้องกัน header ซ้ำและใช้ layout เดียวกันทั้งระบบ การเพิ่ม ลบ ตรวจเวลาชน และ export ยังคงใช้ component/hook ของตารางเดิม

## 5. การตรวจเงื่อนไขรายวิชา

นำการ์ดตรวจเงื่อนไขออกจากเมนูหลัก ตามข้อเสนอให้แสดงผลเป็น popup ระหว่างเพิ่มวิชา เมื่อ API ตรวจเงื่อนไขพร้อมจึงเชื่อมผลจริงเข้าจุดเพิ่มวิชาใน `useTimetable.addCourse`

รอบนี้ยังไม่ได้สร้าง popup ตรวจเงื่อนไข เนื่องจากยังไม่มีข้อมูลเงื่อนไขหรือ API ที่รองรับใน flow เพิ่มวิชาปัจจุบัน

## ผลตรวจ UI ก่อนเปิด containers

อัปเดต assertion และ mock ของชุดทดสอบเดิมให้ตรงกับหน้าแรกและ URL ใหม่ ไม่มีการเพิ่ม test cases หรือรัน unit tests ในรอบแก้ UI นี้

- `npm run lint`: ผ่าน
- `npx tsc --noEmit`: ผ่าน
- Preview ด้วยบัญชีสมมติ: Login ไป `/` และแสดงชื่อกับรหัสบน header
- ข้อมูลตารางและรายวิชาใน preview โหลดไม่ได้ เนื่องจาก backend ที่ `localhost:8080` ปฏิเสธการเชื่อมต่อ (`ECONNREFUSED`)
- ยังไม่ได้รัน production build หรือทดสอบ API จริงรอบนี้

## เชื่อม UI กับ containers เพื่อทดสอบ (20 ตุลาคม 2026)

production frontend ใช้ API ของ backend ส่วน backend เปิด profile `stub-tu` เพื่อจำลอง TU Login API

- บัญชีทดสอบ: `6609000001` / `Passw0rd!` ชื่อ **สมชาย ใจดี** (ข้อมูลจาก `StubTuApiClient`)
- auth mock (`next dev` ที่ตั้ง `NEXT_PUBLIC_AUTH_MODE=mock`) ใช้บัญชีและรหัสผ่านชุดเดียวกับ stub ดู `demoApi.ts`
- `features/auth/session.ts` (`SessionProvider`) เป็นที่เก็บ token ที่เดียว ทั้ง auth และ `lib/api.ts` ใช้ร่วมกัน และแจ้ง listener (`AuthGuard`, `useTimetable`) ทุกครั้งที่ session เปลี่ยน
- `lib/api.ts` แนบ `Authorization: Bearer ...` จาก session ให้ API ของตาราง รายวิชา และการลบ โดยคง header ที่ caller ระบุเองไว้
- ไม่แนบ token ใน session ไปกับ request Login และไม่อ่าน browser storage ตอน server render
- เพิ่ม regression tests ครอบคลุม GET/POST/DELETE, ไม่มี token, header ที่ระบุเอง และ Login

ใช้ Compose project เดิม `cs261-g3-mocktimetabletu-pr45` เพื่อใช้ SQL volume เดิม ไม่สร้างฐานข้อมูลอีกชุด ทดสอบได้ด้วย PowerShell จากโฟลเดอร์หลัก:

```powershell
$env:SPRING_PROFILES_ACTIVE = 'stub-tu'
docker compose -p cs261-g3-mocktimetabletu-pr45 up -d --build
```

URL หน้าเว็บ: `http://localhost:3000/login`

### ผลหลังเปิด containers

- frontend และ backend build ใน Docker ผ่าน (backend Dockerfile ใช้ `-DskipTests`)
- frontend: `npm test -- --reporter=dot` ผ่าน **98 tests / 10 files**, lint และ TypeScript ผ่าน
- `frontend` เปิดพอร์ต 3000, `backend` เปิดพอร์ต 8080, `sqlserver` healthy ที่พอร์ต 1433
- `db-init` จบด้วย exit code 0 ตามการออกแบบ
- Login ผ่าน backend ด้วยบัญชี stub แล้วเห็น **สมชาย ใจดี / 6609000001**
- เมนู header มีตาราง วิชาเสรี และขอโควตา ไม่มีเมนูประวัติการเรียน
- โหลดตารางและรายวิชา 9 รายการจาก backend ได้
- เพิ่ม CS111 แล้วแสดง 1 วิชา / 3 หน่วยกิต และบล็อกเรียนตามเวลา
- refresh แล้วยังเข้าสู่ระบบและโหลด CS111 ที่บันทึกไว้ได้
- ลบเฉพาะ CS111 ที่เพิ่มเพื่อทดสอบสำเร็จ คืนตารางบัญชีทดสอบเป็น 0 วิชาตามก่อนเริ่ม
- ยังไม่ได้ทดสอบ TU API จริง รอบนี้ใช้ profile `stub-tu`

## ปรับรายละเอียดการ์ดในตาราง

- `TimetableGrid.tsx` กำหนดคลาส Tailwind สีประจำวัน: จันทร์เหลือง อังคารชมพู พุธเขียว พฤหัสบดีส้ม ศุกร์ฟ้า และเสาร์ม่วง
- เพิ่มป้าย `Sec` โดยอ่าน `entry.sectionNo` จึงแสดงกลุ่มเรียนที่เลือกจริง พร้อมเก็บเลขศูนย์ด้านหน้า
- หัวการ์ดใช้ `flex-wrap` ให้ป้ายขึ้นบรรทัดใหม่เมื่อพื้นที่แคบ การ์ดปกติยังใช้สีฟ้า ส่วนการ์ดเวลาชนใช้สีแดงเดิม
- หลังปรับสีและป้าย: lint, TypeScript และ production frontend build ใน Docker ผ่าน และตรวจการแสดงผลบนเว็บแล้ว
