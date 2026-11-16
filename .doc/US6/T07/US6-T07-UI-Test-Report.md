# US6-T07 — UI และรายงานผล Unit Test

- วันที่ตรวจ: 16 พฤศจิกายน 2026
- Branch: `feature/US6-T07-develop-ui`
- Base: `develop` รุ่น `f14584a` (มี UI จัดตามแผนหลักสูตร US8 แล้ว)

## เอกสารอ้างอิงและข้อกำหนดที่ใช้

- [US6-T05 DTO & API Spec](../T05/US6-DTO%20%26%20API%20Spec.md) และ prototype 4 ภาพใน [ui-prototype](../T05/ui-prototype/)
- [US6-T11 ใน PR #96 รุ่น eb76a34](https://github.com/Non-Sin/CS261-G3-MockTimetableTU/blob/eb76a346fdeb92722be796122fa1611e8bd5b9fc/.doc/US6/T11/US6-T11-design-unit-test-ui.md) ซึ่งได้รับ Approve แต่ยังไม่ merge ขณะเริ่มงานนี้
- [US6-T06 รายละเอียด](../T06/US6-T06-Sequence-Diagram-Detail.md) และ [เพิ่มวิชา](../T06/US6-T06-Sequence-Diagram-AddEntry.md)

ข้อกำหนดที่ต้องแยกให้ชัด:

1. ใช้ dropdown วัน ช่วงเวลา หมวดหมู่ ภาคเรียน และ checkbox ไม่ชนตาราง ตาม prototype/T05 ไม่เพิ่ม dropdown รูปแบบการเรียนหรือวิธีวัดผล ซึ่ง T05 ตัดออกแล้ว
2. เลือก Sec แรกที่ `selectable && !inTimetable` ตามลำดับ semester/sectionNo แม้มีหลายตัวเลือก ตาม T11 รุ่นแก้รีวิว ซึ่งใหม่กว่าข้อความเลือกอัตโนมัติเฉพาะตัวเลือกเดียวใน T05
3. หน่วยกิตเกินปิดปุ่มเพิ่มล่วงหน้าและไม่แสดงคำเตือน ตาม `UT-UI-US6-06` ของ T11; ถ้า request ที่ส่งได้ถูก API ปฏิเสธภายหลังเพราะข้อมูลเปลี่ยน จึงแสดง `409 detail` ใน modal ตาม T05
4. เวลาเรียนชนไม่ปิดปุ่มเพิ่ม แสดงคำเตือนของ Sec และผล conflicts ที่ backend ตอบกลับ

## สิ่งที่พัฒนา

- ใช้เมนู `electives` ใน header เดิม แทนหน้ารอพัฒนา และคงหน้าตารางเป็นค่าเริ่มต้น
- เพิ่ม `frontend/features/electives/`: types, API adapter, search hook, filters, card, native dialog และหน้าแนะนำ ใช้ Tailwind โดยไม่เพิ่ม production dependency
- รายการแบ่ง 5 หมวด นับจำนวนจาก response และโหลดรายละเอียดเมื่อเปิด modal
- ส่งตัวกรองไป API ตามสัญญา ไม่เขียนอัลกอริทึมกรองคาบ/ตรวจเวลาชนซ้ำใน browser
- เพิ่ม `TimetableWorkspace` ให้หน้าแนะนำและหน้าตารางใช้ `useTimetable` ชุดเดียวกัน; ใช้ `addSection(sectionId)` ร่วมกันและอัปเดตตารางจากผล POST
- ปุ่มขอโควตาสลับไปเมนู quota เดิม ซึ่งยังเป็นหน้ารอพัฒนา
- รองรับ loading, error/retry, empty/reset, Sec ต่างภาค, วิชาที่เพิ่มแล้ว, ป้องกันกดซ้ำ, ข้อมูล null และ response เก่าที่ตอบช้า
- Native dialog รองรับ Escape, ปิดผ่านฉากหลัง, scroll บนมือถือ และคืน focus ให้การ์ดเดิมเมื่อปิด

ไฟล์เดิมที่ปรับประกอบ:

- `MainMenuPage`: แสดง workspace และจำกัด placeholder เหลือเมนู quota
- `Timetable`: แยกส่วนแสดงผลเป็น `TimetableContent`; default component ยังใช้งานเดี่ยวและรัน tests เดิมได้
- `useTimetable`: เพิ่มฟังก์ชันบันทึก Section ร่วมกัน คงพฤติกรรม error ของหน้าตารางเดิม
- `ScheduleSlot.room`: รับ `string | null` ตาม T05; CourseCard/TimetableGrid แสดง "ไม่ระบุ" เมื่อไม่มีห้อง
- `CurriculumPlanModal`: เติมชื่อหมวด MINOR ที่ขาดและถอดตัวแปรที่ไม่ได้ใช้จาก destructuring เพื่อแก้ TypeScript/lint เดิม โดยไม่เปลี่ยน flow จัดตามหลักสูตร
- `MainMenuPage.test.tsx`: ย้าย mock จาก Timetable มาที่ Workspace เพื่อคงการแยกทดสอบ session/navbar

## ผลตรวจอัตโนมัติ

รันจาก `frontend/`:

| คำสั่ง | ผลสุดท้าย |
|---|---|
| `npm run test -- --reporter=dot` | PASS — 19 files, 202 tests |
| `npm run lint` | PASS — ไม่มี error หรือ warning |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS — exit code 0 พร้อม security warning ของ Next.js ที่ระบุด้านล่าง |
| `git diff --check` | PASS |

Tests ใหม่ 44 เคสอยู่ใน 3 ไฟล์:

| ไฟล์ | จำนวน | ขอบเขต |
|---|---:|---|
| `features/electives/ElectivesPage.test.tsx` | 30 | T11 ทั้ง 7 หัวข้อและกรณีขอบของ UI |
| `features/electives/api.test.ts` | 8 | Query parameters, Bearer token, detail URL, รายการว่าง, 404, 401 และ network error |
| `features/electives/ElectivesWorkspace.test.tsx` | 6 | เมนูเดิม, state ตารางร่วม, POST ผ่าน adapter เดิม, รักษาภาคเรียน, ขอโควตา และ AuthGuard |

## Traceability กับ T11

| T11 | สิ่งที่ตรวจ | ผล |
|---|---|---|
| UT-UI-US6-01 | ค้นหารหัส FR205 / ชื่อ PSYCHOLOGY ผ่านปุ่มหรือ Enter และแสดง response | PASS |
| UT-UI-US6-02 | ตัวกรองแต่ละตัวและทุกตัวร่วมกัน ส่งค่าถูกต้อง โดย currentSemester ไม่เปลี่ยนตาม dropdown กรองภาค | PASS |
| UT-UI-US6-03 | รายละเอียด/รีวิว หลายคาบ Sec แรกเรียงตามเลข เลือก Sec อื่นได้ ต่างภาคปิดเลือก และปิด modal/คืน focus | PASS |
| UT-UI-US6-04 | เพิ่ม Sec ที่เลือก ปิด modal แสดงข้อความสำเร็จ โหลดรายการใหม่ และอัปเดตตารางร่วม | PASS |
| UT-UI-US6-05 | Sec ที่มี conflictWith ยังเพิ่มได้ และผล conflicts แสดง warning หลังเพิ่ม | PASS |
| UT-UI-US6-06 | 21+3 เกิน 22 ปิดปุ่ม ไม่เรียก handler และไม่เตือนล่วงหน้า; 19+3 เท่ากับ 22 ยังเพิ่มได้ | PASS |
| UT-UI-US6-07 | SA240 แสดง empty state และดูทั้งหมดล้างคำค้น/ตัวกรอง | PASS |
| IT-UI-API-US6-26 ที่อ้างใน T11 | ตรวจส่วน UI ว่าหน่วยกิตเกินไม่เรียก handler; ยังไม่ใช่ผล integration กับ backend จริง | PASS เฉพาะขอบเขต UI |

กรณีเพิ่มเติม: ผลค้นหาเก่าตอบช้า, retry list/detail, network error ตอนเพิ่ม, 409 ทั้งสอง code, วิชาที่มี Sec ในตารางแล้ว, ไม่มี Sec, ตารางยังไม่พร้อม, รีวิว/คาบว่าง, null fields, กดซ้ำ และปิด modal/เปลี่ยนเมนูระหว่างรอ POST

## ตรวจผ่าน browser ด้วยข้อมูลจำลอง

ใช้ production build ร่วมกับ HTTP preview proxy ชั่วคราวและ fixture เฉพาะ tests (FR205/PY250) ไม่ใช้บัญชี TU จริง ไม่เรียก TU API และไม่เขียนฐานข้อมูลจริง:

- Desktop 1280×900: ตรวจ header เดิม ตัวกรอง การ์ดแบ่งหมวด และ modal 2 คอลัมน์
- Mobile 390×844: ตรวจการ์ด/ตัวกรองเรียงแนวตั้ง modal เลื่อนได้ และ Sec ต่างภาคเป็นสีจาง/disabled
- FR205: เปิด modal แล้ว Sec 260001 ถูกเลือกแม้ข้อมูล fixture ส่ง Sec 260002 มาก่อน
- Escape: ปิด modal แล้ว focus กลับไปที่ปุ่มอ่านรีวิว FR205
- SA240: แสดง "ไม่พบรีวิววิชานี้" และปุ่มดูทั้งหมด
- เปลี่ยนเป็น Sec 260002 แล้วเพิ่ม: แสดงข้อความสำเร็จ สลับกลับหน้าตารางพบ FR205 Sec 260002, ห้อง SC3-M11 และหน่วยกิต 3/22
- ระหว่างผู้ใช้ลอง preview พบตัวจำลองยังไม่มี DELETE และสร้าง entryId ซ้ำ จึงแก้เฉพาะ proxy ชั่วคราวนอก repository ให้รองรับลบรายวิชา/ที่เลือก/ทั้งหมดและ ID ไม่ซ้ำ ตรวจบนสำเนาข้อมูลผ่านแล้ว โดยคงวิชาของผู้ใช้ไว้ครบ ไม่ใช่การเปลี่ยน implementation ลบของระบบจริง

ภาพประกอบถูกเก็บเป็น artifact ท้องถิ่นนอก repository; production server และ proxy ที่เปิดเพื่อการตรวจนี้ปิดหลังตรวจเสร็จ โดยไม่ปิด dev server เดิมบน port 3000

## ข้อจำกัดและข้อสังเกต

- T07 ยืนยันพฤติกรรม UI ด้วย mocked API boundary และ browser preview ข้อมูลจำลองเท่านั้น ยังไม่ได้ยืนยัน HTTP/SQL/JWT ของระบบจริงครบ flow เพราะ implementation US6 API/DAO ยังไม่อยู่ใน develop รุ่นที่ใช้เริ่มงาน ต้องตรวจร่วมกับ T08/T09 ในงาน integration ต่อไป
- ไม่ใช้ข้อมูลจำลองเป็น fallback ในหน้า production: เมื่อ API ใช้งานไม่ได้ UI แสดง error และลองใหม่ได้
- ช่วงตรวจ build พบ Google Fonts ถูก sandbox จำกัดการเชื่อมต่อ และ CSS worker ของ Turbopack หยุดก่อนเชื่อมต่อ; ล้างเฉพาะ generated build/cache แล้วรันภายนอก sandbox จึง compile ได้ โดยคง `.next/dev` ของ server เดิมไว้
- Next.js แจ้งว่าเวอร์ชันปัจจุบันมี security advisory และหยุดด้วย `SecurityFatalError` หลัง compile; รันซ้ำตามข้อความแล้วคำสั่งจบ exit code 0 แต่คำเตือนยังอยู่ งานนี้ไม่ได้อัปเกรด dependency และควรติดตามแก้แยกต่างหาก
- ไม่มีการเปลี่ยน backend, migration, API contract หรือการตั้งค่า `.env` จากงานนี้

## ลำดับอ่านโค้ด

1. `features/electives/types.ts` — รูปแบบข้อมูลที่รับจาก T05
2. `features/electives/api.ts` — แปลงตัวกรองเป็น URL
3. `features/electives/ElectivesPage.tsx` — state ของหน้าและการประกอบส่วนต่าง ๆ
4. `features/electives/hooks/useElectiveSearch.ts` — โหลดรายการและข้าม response เก่า
5. `features/electives/components/` — ตัวกรอง การ์ด ป้าย และ modal
6. `features/timetable/TimetableWorkspace.tsx` → `hooks/useTimetable.ts` — ข้อมูลตารางชุดเดียวและการเพิ่ม Section
7. Tests ทั้ง 3 ไฟล์ — เทียบพฤติกรรมกับ T11
