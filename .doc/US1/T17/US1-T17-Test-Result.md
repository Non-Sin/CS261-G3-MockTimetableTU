# US1-T17 ผลการทดสอบ Integration Test ระหว่าง UI กับ API

Oct 30, 2026 · @Non

## สรุปผล

| ชุดทดสอบ | ผล |
| --- | --- |
| Vitest IT-10–12 (`TimetableErrorIntegration.test.tsx`) | **ผ่าน 3/3** · ทั้ง frontend (`npx vitest run`) ผ่าน 124/124 ใน 13 ไฟล์ |
| Postman (newman) IT-13–19 18 item (25 HTTP request) | **ผ่าน 24/24 assertion** ไม่มี request ล้ม |
| IT-01–09, IT-20 (UI ↔ API ผ่านหน้าเว็บ) | **ยังไม่ได้รัน** ใน task นี้ (ดู "Case ที่ยังไม่ได้รัน") |

**User story:** US1 ค้นหารายวิชาและเพิ่มลงตารางเรียนจำลอง · branch `test/US1-T17-run-it-ui-api` · test case ตาม [US1-T13 Integration Test Cases](../T13/US1-T13-Integration-Test-Cases.md)

## สภาพแวดล้อม

| หัวข้อ | ค่า |
| --- | --- |
| วันที่รัน | 2026-10-30 |
| Commit ฐาน | `8cff0ff` (main หลัง US5-T20) |
| Frontend test | Vitest 3.2.7 · jsdom · React Testing Library · Node 24.21.0 |
| Postman | newman 6.2.3 (`npx -y newman@6`) |
| Backend ตอนรัน Postman | container `backend` ของ `docker compose` ที่ `http://localhost:8080` · `SPRING_PROFILES_ACTIVE=stub-tu` |
| DB | SQL Server ของ `docker compose` มี seed `V20261014_2010__seed_courses_2568_1.sql` |
| บัญชีทดสอบ | `6609000001` / `Passw0rd!` (บัญชีใน `StubTuApiClient` ดู [US3-T08 Test Result](../../US3/T08/US3-T08-Test-Result.md)) ไม่ใช้บัญชี demo `6609000000` เพราะ collection ลบตาราง 2568/1 ของผู้ใช้ทั้งหมด |

## Vitest: IT-10–12 (Error handling)

ไฟล์ [`frontend/features/timetable/TimetableErrorIntegration.test.tsx`](../../../frontend/features/timetable/TimetableErrorIntegration.test.tsx)

ต่างจาก `Timetable.test.tsx` ที่ mock `api.ts` ทั้งโมดูล ไฟล์นี้ดัก `fetch` ของ browser แทน (`vi.stubGlobal`) จึงทดสอบครบทาง `Timetable` → `useTimetable` → `addTimetableEntry` → `apiFetch` → HTTP request · GET ตอบตารางที่มี CS111 (3 หน่วยกิต) และรายวิชา CS111, CS180 ส่วน POST ให้แต่ละ test กำหนด response เอง

```bash
cd frontend
npx vitest run features/timetable/TimetableErrorIntegration.test.tsx
```

| ID | วิธีจำลอง | สิ่งที่ตรวจ | ผล |
| --- | --- | --- | --- |
| IT-10 | POST ตอบ `400` ProblemDetail (`errors.sectionId`) | request ที่ส่งออก `POST /api/timetable/entries` 1 ครั้ง body `{ sectionId }` ของ CS180 header `Authorization: Bearer <token>` · แสดง "เพิ่มวิชาไม่สำเร็จ กรุณาลองใหม่" ไม่แสดง detail ภาษาอังกฤษจาก backend · ตารางคง "หน่วยกิต 3 / 22" ไม่มี CS180 ใน Grid · หน้าไม่พังและไม่โหลดตารางใหม่ | PASS |
| IT-11 | POST ตอบ `500` แล้วครั้งที่ 2 ตอบ `201` | ครั้งแรกแสดงข้อความ error ตารางคงเดิม ปุ่ม `+ เพิ่มวิชา` กดได้ · กดซ้ำได้ 201 การ์ดเปลี่ยนเป็น "เพิ่มแล้ว" ข้อความ error หายไป ตัวนับเป็น "หน่วยกิต 6 / 22" | PASS |
| IT-12 | `fetch` reject ด้วย `TypeError("Failed to fetch")` (ไม่มี response แบบ offline) | แสดงข้อความ error ตารางคงเดิม ปุ่มกลับมากดได้ ไม่ค้างที่ "กำลังโหลดตารางเรียน…" · กดซ้ำแล้วส่ง POST ใหม่ (รวม 2 ครั้ง) | PASS |

```
 ✓ features/timetable/TimetableErrorIntegration.test.tsx (3 tests) 725ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
```

## Postman: IT-13–19 (สัญญา API)

- [`US1-T17.postman_collection.json`](./US1-T17.postman_collection.json) collection v2.1 import เข้า Postman ได้ ตัวแปร `baseUrl` ค่าเริ่มต้น `http://localhost:8080` และ `username` ค่าเริ่มต้น `6609000001`
- ต้องรันทั้ง collection ตามลำดับ เพราะ request ถัดไปใช้ token, `sectionId` และตารางที่ request ก่อนหน้าสร้างไว้
- ไม่ใส่ `sectionId` ตายตัว request 01 อ่านจาก `GET /api/courses` แล้วเก็บเป็นตัวแปร `sec_<รหัสวิชา>_<กลุ่ม>` (เช่น `sec_CS111_030002`) เพราะ `section_id` เป็น IDENTITY ค่าต่างกันในแต่ละ DB
- ผลรันเต็มอยู่ใน [`US1-T17-newman-cli.txt`](./US1-T17-newman-cli.txt)

```bash
# backend ใช้ TU API stub (ใส่ SPRING_PROFILES_ACTIVE=stub-tu ใน .env)
docker compose up -d --build

npx -y newman@6 run .doc/US1/T17/US1-T17.postman_collection.json
```

| # | Request | Case | ผลที่คาดหวัง | ผล |
| --- | --- | --- | --- | --- |
| 00 | POST login `6609000001` | Setup | 200 ได้ token | PASS |
| 01 | GET courses 2568/1 | Setup | 200 ได้ 9 วิชา เก็บ `sectionId` ทุกกลุ่ม | PASS |
| 02 | GET timetable แล้ว DELETE ทุก entry | Setup ชุดข้อมูล B | ตาราง 2568/1 ว่าง | PASS |
| IT-13a | GET `/api/courses?semester=1` | IT-13 | 400 `application/problem+json` | PASS |
| IT-13b | GET `/api/courses?academicYear=2568` | IT-13 | 400 `application/problem+json` | PASS |
| IT-14 | POST entries body `{}` | IT-14 | 400 ProblemDetail มี `errors.sectionId` | PASS |
| IT-15 | POST entries `sectionId: 999999` | IT-15 | 404 ProblemDetail | PASS |
| IT-16a | GET courses 2560/1 | IT-16 | 200 `[]` | PASS |
| IT-16b | GET timetable 2560/1 | IT-16 | 200 `academicYear: 2560`, `semester: 1`, `entries: []`, `conflicts: []`, `totalCredits: 0`, `updatedAt: null` | PASS |
| 03 | POST CS111 030001 | Setup ชุดข้อมูล E | 201 ตารางมี CS111 030001 | PASS |
| IT-17a | POST CS111 030002 (คนละกลุ่ม) | IT-17 | 409 `COURSE_ALREADY_IN_TIMETABLE`, `courseCode: "CS111"`, `existingSectionNo: "030001"` | PASS |
| IT-17b | POST CS111 030001 (กลุ่มเดิม) | IT-17 | 409 เหมือน IT-17a | PASS |
| IT-17c | GET timetable | IT-17 | มี CS111 เพียง 1 entry คือ 030001 | PASS |
| 04 | POST CS180, MA211, LAS101, TU101, TU106, TU109 ทีละวิชา แล้ว GET timetable | Setup ชุดข้อมูล D | ทุก POST ได้ 201 · ตารางมี 7 วิชา `totalCredits: 21`, `maxCredits: 22` | PASS |
| IT-18 | POST CS111 030002 ตอนมี 21 หน่วยกิต | IT-18 | 409 `COURSE_ALREADY_IN_TIMETABLE` ไม่ใช่ `CREDIT_LIMIT_EXCEEDED` | PASS |
| IT-19a | POST ST216 040001 ตอนมี 21 หน่วยกิต | IT-19 | 409 `CREDIT_LIMIT_EXCEEDED`, `currentCredits: 21`, `courseCredits: 3`, `maxCredits: 22` | PASS |
| IT-19b | GET timetable | IT-19 | ยัง 7 วิชา 21 หน่วยกิต ไม่มี ST216 | PASS |
| 99 | GET timetable แล้ว DELETE ทุก entry | Cleanup | ตาราง 2568/1 ว่าง | PASS |

```
┌─────────────────────────┬──────────────────┬──────────────────┐
│                         │         executed │           failed │
├─────────────────────────┼──────────────────┼──────────────────┤
│              iterations │                1 │                0 │
│                requests │               25 │                0 │
│            test-scripts │               18 │                0 │
│      prerequest-scripts │                1 │                0 │
│              assertions │               24 │                0 │
└─────────────────────────┴──────────────────┴──────────────────┘
```

> request 25 ตัวมาจาก 18 item ใน collection รวมกับ request ที่ script ส่งเอง (POST 6 วิชาใน request 04 และ DELETE ใน request 02, 99 เมื่อตารางไม่ว่าง)

## การจับคู่กับ US1-T13 และ UAT (US1-T16)

| Integration Test Case | UAT | ทดสอบด้วย | ผล |
| --- | --- | --- | --- |
| IT-10, IT-11, IT-12 | - | Vitest | PASS |
| IT-13, IT-14, IT-15, IT-16 | - | Postman | PASS |
| IT-17, IT-18 | TC8 | Postman | PASS |
| IT-19 | TC7 | Postman | PASS |
| IT-01–09, IT-20 | TC1–TC8 | — | ยังไม่ได้รัน |

## Case ที่ยังไม่ได้รัน

Unit test เดิมใน `Timetable.test.tsx` (US1-T10) ครอบคลุมบางส่วนแบบ mock `api.ts` เช่น โหลดตาราง (IT-04), กดเพิ่มแล้วใช้ตารางจาก response (IT-03), แถบเตือนเวลาชน (IT-09) และ 409 หน่วยกิตเกิน แต่ไม่ได้ต่อกับ backend จริง จึงไม่นับแทน IT เหล่านี้

## ข้อสังเกต

**IT-06 ไม่ตรงกับ UI ปัจจุบัน** เอกสาร US1-T13 IT-06 คาดว่าปุ่ม `+ เพิ่มวิชา` ของ ST216 ตอนมี 21 หน่วยกิต "ยังคลิกได้ตามปกติ (ไม่ Disabled)" และ UI ส่ง POST แล้วได้ 409 แต่ `CourseCard.tsx` ปิดปุ่มเมื่อเพิ่มแล้วจะเกิน `maxCredits` (`wouldExceedCreditLimit`) และ `Timetable.test.tsx` ทดสอบว่าปุ่มกดไม่ได้และไม่มี POST ออกไป ผลที่ผู้ใช้เห็นเหมือนกัน (ไม่มีข้อความเตือน ตารางไม่เปลี่ยน) แต่ตอนรัน IT-06 ผ่านหน้าเว็บจะไม่เห็น request 409 ต้องตกลงกันว่าจะแก้เอกสาร T13 หรือแก้ UI ส่วนสัญญา API 409 `CREDIT_LIMIT_EXCEEDED` ตรวจแล้วใน IT-19

## ข้อจำกัด

- IT-10–12 ทดสอบใน jsdom โดยจำลอง response ไม่ได้ต่อ backend จริง ยืนยันว่า UI จัดการ error ได้ตามที่เอกสารกำหนด แต่ไม่ได้ยืนยันว่า backend จะตอบ 400/500 ในสถานการณ์จริงแบบเดียวกัน
- Postman ใช้ TU API stub (`stub-tu`) สำหรับ login เท่านั้น API ของรายวิชาและตารางเรียนเป็นของจริงทั้งหมด
- Collection ลบตาราง 2568/1 ของ `username` ทั้งตอนเริ่มและตอนจบ ห้ามตั้งเป็นบัญชีที่มีข้อมูลที่ต้องการเก็บไว้
