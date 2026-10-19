# Integration Test Cases: US1 - ระหว่าง UI กับ API (UI & API Integration)

เอกสารฉบับนี้อธิบายกรณีการทดสอบแบบผสมผสาน (Integration Test) ระหว่างฝั่งหน้าบ้าน (UI Components จาก Figma) และฝั่ง API Endpoints สำหรับ User Story 1 (ตาม Task US1-T13) โดยอ้างอิง [US1 DTO & API Spec](../T05/US1-DTO%20&%20API%20Spec.md), สถาปัตยกรรมจาก US1-T06, [UAT (US1-T16)](../T16/US1-T16-UAT.md) และชุดข้อมูลทดสอบ (Seed Data) `db/seed/V20261014_2010__seed_courses_2568_1.sql`

---

## 1. ขอบเขต

ทดสอบการทำงานร่วมกันระหว่างหน้าค้นหา/ตารางเรียน (ช่องค้นหา Prefix, ปุ่ม `+ เพิ่มวิชา`, Grid ตารางเรียน) กับ API ของ User Story 1

| Endpoint | Path | ใช้กับ |
| --- | --- | --- |
| 1 | `GET /api/courses` | ค้นหาและกรองรายวิชา (Prefix Search) |
| 2 | `POST /api/timetable/entries` | เพิ่มรายวิชาลงตารางเรียนจำลอง |
| 3 | `GET /api/timetable` | โหลดข้อมูลตารางเรียนเมื่อเข้าหน้าเว็บ |

- **สิ่งที่ตรวจในทุก case:** (ก) request ที่ UI ส่งออกไป (method, URL, query parameters, request body), (ข) การตอบสนองและการอัปเดตสถานะของ UI หลังได้รับ response
- **กติกาจาก API Spec ที่ใช้เป็นเกณฑ์:**
  - เวลาเรียนชน **ไม่ใช่ error** — `POST` ยังตอบ `201 Created` แต่ `conflicts` ไม่ว่าง และ UI แสดงแถบเตือน
  - หน่วยกิตเกิน `maxCredits` (22) ตอบ `409 CREDIT_LIMIT_EXCEEDED` — UI **ไม่แสดงข้อความแจ้งเตือน** วิชาไม่ถูกเพิ่มและตารางคงเดิม (ตามข้อสรุปของทีม)
  - วิชาที่อยู่ในตารางแล้ว (ไม่ว่ากลุ่มไหน) ตอบ `409 COURSE_ALREADY_IN_TIMETABLE` — ฝั่ง UI ไม่แสดงปุ่ม `+ เพิ่มวิชา` ตั้งแต่แรก
  - ลำดับการตรวจของ `POST`: body (400) → หา section (404) → วิชาซ้ำ (409) → หน่วยกิต (409) → บันทึกและคำนวณ `conflicts` (201)
- **นอกขอบเขต:** การลบวิชา (เป็นของ US2), การจัดการหน้าจอ Login (US3), การตรวจสอบระบบฐานข้อมูลเชิงลึก (US1-T14)

---

## 2. Precondition และข้อมูลทดสอบ

- **ปีการศึกษา/ภาคการศึกษา:** ใช้ `academicYear=2568` และ `semester=1` ตาม Seed Data (seed มีกลุ่มเรียนของ 2568/2 และ 2567/1 ด้วย ใช้ตรวจการกรองปี/ภาค)
- **ชุดข้อมูล A (รายวิชา):** 9 วิชาของ 2568/1 ทุกวิชา 3 หน่วยกิต เช่น `CS111` (กลุ่ม 030001 อังคาร/พฤหัส 11:00–12:30 และ 030002), `CS180`, `ST216` (Statistics for Social Science 1) ใช้ทดสอบ Prefix Search และ `CS223` ซึ่งเปิดเฉพาะ 2568/2
- **ชุดข้อมูล B (ตารางว่าง):** นักศึกษาที่ยังไม่มีตารางของ 2568/1 — `GET /api/timetable` ได้ `entries: []`, `conflicts: []`, `totalCredits: 0`, `updatedAt: null`
- **ชุดข้อมูล C (เวลาชน):** ตารางมี `TU109` Sec 780001 (พุธ 09:30–12:30) แล้ว จะเพิ่ม `LAS101` Sec 780004 (พุธ 09:30–12:30)
- **ชุดข้อมูล D (หน่วยกิตใกล้เต็ม):** ตารางมี 7 วิชาตาม UI Prototype รวม 21 / 22 หน่วยกิต (CS180, MA211, CS111 030001, LAS101, TU101, TU106, TU109) จะเพิ่ม `ST216` (3 หน่วยกิต → 24)
- **ชุดข้อมูล E (วิชาซ้ำ):** ตารางมี `CS111` Sec 030001 แล้ว จะเพิ่ม `CS111` Sec 030002

---

## 3. Test cases: ค้นหาและเพิ่มวิชาสำเร็จ (UI ↔ API)

| ID | UAT | Scenario | ขั้นตอน | ผลที่คาดหวัง |
| --- | --- | --- | --- | --- |
| IT-01 | TC1 | ค้นหารายวิชาด้วย Prefix | พิมพ์คำว่า `CS` ในช่องค้นหา | ส่ง `GET /api/courses?academicYear=2568&semester=1&q=CS`, ได้ 200, หน้าจอแสดงวิชาที่รหัสขึ้นต้นด้วย CS (เช่น CS111, CS180) แต่ **ไม่แสดง** ST216 (คำว่า STATISTICS มี `CS` อยู่ท้ายคำ ไม่ใช่ต้นคำ) และไม่แสดง CS223 (เปิดเฉพาะ 2568/2) |
| IT-02 | TC1 | ค้นหาไม่พบข้อมูล | พิมพ์คำค้นหาที่ไม่มีจริง เช่น `XYZ999` | ส่ง `GET /api/courses?academicYear=2568&semester=1&q=XYZ999`, ได้ 200 พร้อมลิสต์ว่าง (`[]`), UI แสดง Empty State "ไม่พบรายวิชาที่ตรงกับคำที่ค้นหาหรือหมวดที่เลือก" |
| IT-03 | TC2, TC3 | เพิ่มวิชาด้วยปุ่ม `+ เพิ่มวิชา` | ใช้ชุดข้อมูล B คลิกปุ่ม `+ เพิ่มวิชา` ของ CS111 Sec 030001 | ส่ง `POST /api/timetable/entries` body `{ "sectionId": <id ของ CS111 030001> }`, ได้ 201 Created พร้อม `TimetableResponse` ทั้งก้อน (`totalCredits: 3`, `conflicts: []`), **UI อัปเดต Grid (อังคาร/พฤหัส 11:00–12:30), ช่อง "วิชาที่เพิ่มแล้ว" และตัวนับ "หน่วยกิตที่เลือก: 3 / 22" ทันทีโดยไม่เรียก `GET /api/timetable` ซ้ำ** และปุ่มบนการ์ดเปลี่ยนเป็น "เพิ่มแล้ว" |
| IT-20 | TC4 | เพิ่มวิชาที่เวลาเรียนต่อกันพอดี (ไม่ชน) | ตารางมี CS111 Sec 030001 (อังคาร/พฤหัส 11:00–12:30) แล้วคลิก `+ เพิ่มวิชา` ของ MA211 Sec 020001 (อังคาร/พฤหัส 09:30–11:00) | ส่ง `POST /api/timetable/entries`, ได้ 201 โดย `conflicts: []` และ `conflictWith` ว่างทั้งสองวิชา, UI แสดงทั้งสองวิชาต่อกันใน Grid และ **ไม่แสดง** แถบเตือนเวลาชน ("ไม่มีเวลาเรียนซ้อนทับกัน") |
| IT-09 | TC5 | เพิ่มวิชาที่เวลาเรียนชน (เพิ่มได้ แต่มีแจ้งเตือน) | ใช้ชุดข้อมูล C คลิก `+ เพิ่มวิชา` ของ LAS101 Sec 780004 | ส่ง `POST /api/timetable/entries`, ได้ **201 Created** โดย `conflicts` มี 1 รายการ (`WEDNESDAY`, `09:30`–`12:30`, `courseCodes: ["TU109","LAS101"]`) และ `conflictWith` ของทั้งสอง entry ไม่ว่าง, UI เพิ่ม LAS101 ลง Grid, แสดงแถบเตือน "ตรวจพบเวลาเรียนซ้อนทับกัน", บล็อกแดงเวลาชน 09:30 - 12:30 น. และสรุป "เวลาชน: 1 คู่", การ์ดวิชาแสดงป้าย "เวลาชน" / "ชนกับ TU109" |
| IT-04 | TC3, TC6 | โหลดตารางเรียนกรณีมีข้อมูล | ใช้ชุดข้อมูล D เปิดเข้าหน้าเว็บตารางเรียน | ส่ง `GET /api/timetable?academicYear=2568&semester=1`, ได้ 200, UI เรนเดอร์ทั้ง 7 วิชาลง Grid ตรงวันและเวลา, ตัวนับ "21 / 22", "วิชาในตารางเรียน: 7 วิชา (21 หน่วยกิต)" และแถบเตือนเวลาชนของ TU109/LAS101 |
| IT-05 | - | โหลดตารางเรียนกรณีตารางว่าง | ใช้ชุดข้อมูล B เปิดเข้าหน้าเว็บ | ส่ง `GET /api/timetable?academicYear=2568&semester=1`, ได้ 200 (`entries: []`, `totalCredits: 0`, `updatedAt: null`), UI แสดง Grid ว่าง (จ.–ส. 08:00–21:00), "ไม่มีเวลาเรียนซ้อนทับกัน" และพร้อมให้เริ่มเพิ่มวิชา |

---

## 4. Test cases: สถานะปุ่มและข้อจำกัดทางธุรกิจผ่าน UI

| ID | UAT | Scenario | ขั้นตอน | ผลที่คาดหวัง |
| --- | --- | --- | --- | --- |
| IT-06 | TC7 | หน่วยกิตเกิน `maxCredits` | ใช้ชุดข้อมูล D คลิกปุ่ม `+ เพิ่มวิชา` ของ ST216 | ปุ่ม **ยังคลิกได้ตามปกติ** (ไม่ Disabled), UI ส่ง `POST /api/timetable/entries` 1 ครั้ง, API ตอบ `409` `code: CREDIT_LIMIT_EXCEEDED`, UI **ไม่แสดงข้อความแจ้งเตือนใดๆ**, ไม่เพิ่ม ST216 ลง Grid, ตัวนับยังเป็น "21 / 22" และการ์ด ST216 ยังแสดงปุ่ม `+ เพิ่มวิชา` |
| IT-07 | - | กันการกดปุ่มเพิ่มซ้ำระหว่างรอ Response | หน่วงเวลาตอบกลับของ API (เช่น ใช้ Network Throttling) แล้วคลิกรัวๆ ที่ปุ่ม `+ เพิ่มวิชา` | มี Request ออกไปครั้งเดียว, ปุ่มอยู่ในสถานะ Disabled ระหว่างโหลด, กลับเป็นปกติเมื่อเสร็จสิ้น |
| IT-08 | TC8 | วิชาที่อยู่ในตารางแล้ว (ทดสอบผ่าน UI) | ใช้ชุดข้อมูล E ค้นหา `CS111` แล้วดูการ์ดทั้งสองกลุ่ม | การ์ด Sec 030001 แสดงป้าย "เพิ่มแล้ว", การ์ด Sec 030002 **ไม่แสดงปุ่ม `+ เพิ่มวิชา`**, จึงไม่มี `POST` ออกไป และตารางยังมี CS111 เพียง 1 กลุ่ม (กรณียิง API ตรงแยกไปที่ IT-17) |

---

## 5. Test cases: Error Handling (UI ↔ API)

ใช้ Mock / ดัก response (เช่น MSW หรือ DevTools) เพื่อจำลองสถานการณ์ที่สร้างจาก UI ปกติไม่ได้

| ID | Scenario | วิธีสร้างสถานการณ์ | ผลที่คาดหวัง |
| --- | --- | --- | --- |
| IT-10 | 400 Bad Request | Mock ให้ `POST /api/timetable/entries` ตอบ 400 ProblemDetail | UI แสดงข้อความ Error ทั่วไป, ตารางคงเดิม และหน้าเว็บไม่พัง (Graceful Handling) |
| IT-11 | 500 Internal Server Error | Mock ให้ API ตอบ 500 | UI แสดงข้อความแจ้งข้อผิดพลาด, ตารางคงเดิม, ผู้ใช้สามารถลองกดทำรายการใหม่ได้ |
| IT-12 | Network Timeout / ล่ม | ตัดการเชื่อมต่อ (DevTools Offline) ระหว่างกดเพิ่มวิชา | ระบบจัดการ Network Error, แสดงข้อความแจ้งเตือนสถานะเครือข่าย, ปุ่มกลับมากดได้ และสถานะหน้าจอไม่ค้าง |

---

## 6. Test cases: สัญญา API (ยิงตรง / Postman Contract Testing)

| ID | Request | ผลที่คาดหวัง |
| --- | --- | --- |
| IT-13 | `GET /api/courses` โดยไม่ระบุ `academicYear` หรือ `semester` (เช่น `GET /api/courses?semester=1`) | 400 Bad Request (ProblemDetail) |
| IT-14 | `POST /api/timetable/entries` ส่ง Body `{}` (ไม่ส่ง `sectionId`) | 400 Bad Request (ProblemDetail พร้อม `errors`) |
| IT-15 | `POST /api/timetable/entries` ด้วย `sectionId` ที่ไม่มีอยู่ (เช่น `999999`) | 404 Not Found (ProblemDetail) |
| IT-16 | `GET /api/courses?academicYear=2560&semester=1` และ `GET /api/timetable?academicYear=2560&semester=1` (ปี/ภาคที่ไม่มีข้อมูลใน seed) | ทั้งสองตอบ **200 OK** ไม่ใช่ 400/404 — `/api/courses` ได้ `[]`, `/api/timetable` ได้ตารางว่าง (`academicYear: 2560`, `semester: 1`, `entries: []`, `conflicts: []`, `totalCredits: 0`, `updatedAt: null`) |
| IT-17 | ใช้ชุดข้อมูล E แล้ว `POST /api/timetable/entries` ด้วย `sectionId` ของ CS111 Sec 030002 (และทำซ้ำด้วย Sec 030001) | 409 Conflict `code: COURSE_ALREADY_IN_TIMETABLE`, `courseCode: "CS111"`, `existingSectionNo: "030001"`, `GET /api/timetable` ภายหลังยังมี CS111 เพียง 1 entry |
| IT-18 | ตารางมี 7 วิชาของชุดข้อมูล D (21 หน่วยกิต ซึ่งมี CS111 030001) แล้ว `POST` CS111 Sec 030002 | 409 `code: COURSE_ALREADY_IN_TIMETABLE` (ไม่ใช่ `CREDIT_LIMIT_EXCEEDED`) เพราะตรวจวิชาซ้ำก่อนหน่วยกิต |
| IT-19 | ใช้ชุดข้อมูล D แล้ว `POST` ST216 Sec 040001 | 409 `code: CREDIT_LIMIT_EXCEEDED`, `currentCredits: 21`, `courseCredits: 3`, `maxCredits: 22` และตารางไม่เปลี่ยน |

---

## 7. ตาราง Mapping กับ UAT (Traceability Matrix)

| Integration Test Case | UAT Mapping | คำอธิบายความสอดคล้อง |
| :--- | :--- | :--- |
| **IT-01, IT-02** | UAT TC1 | ค้นหารายวิชาด้วย Prefix และแสดงผลลัพธ์ (รวมกรณีไม่พบ) ผ่านหน้า UI |
| **IT-03** | UAT TC2, TC3 | เพิ่มวิชาและอัปเดต Grid ทันทีจาก Response ของ POST พร้อมแสดงรหัส ชื่อ วัน และเวลาถูกต้อง |
| **IT-04** | UAT TC3, TC6 | โหลดตารางที่มีหลายวิชาและแสดงแต่ละวิชาตรงวันและเวลา |
| **IT-20** | UAT TC4 | เวลาเรียนต่อกันพอดี (09:30–11:00 กับ 11:00–12:30) ไม่นับเป็นชน |
| **IT-09** | UAT TC5 | เวลาเรียนชนยังเพิ่มได้ (`201` + `conflicts`) และ UI แจ้งเตือน |
| **IT-06, IT-19** | UAT TC7 | หน่วยกิตเกิน `maxCredits` ไม่ถูกเพิ่ม (`409 CREDIT_LIMIT_EXCEEDED`) และ UI ไม่แสดงข้อความแจ้งเตือน |
| **IT-08, IT-17, IT-18** | UAT TC8 | 1 วิชาเพิ่มได้ 1 กลุ่มเรียน: UI ซ่อนปุ่ม ส่วน API ยิงตรงตอบ `409 COURSE_ALREADY_IN_TIMETABLE` |
| **IT-05, IT-07, IT-10 – IT-16** | - | กรณีเสริมนอก UAT: ตารางว่าง, กันกดซ้ำ, error handling และสัญญา API |
