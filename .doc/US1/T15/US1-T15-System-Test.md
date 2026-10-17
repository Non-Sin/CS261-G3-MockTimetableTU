# US1-T15 Design System Test ตาม Sequence Diagram

## User story
US1: เพิ่มวิชาเข้าไปในตารางเรียนจำลอง

**CoS อ้างอิง:** [ดู CoS ต้นฉบับ](https://trello.com/c/HHEIoRQv)

## Objective
ออกแบบ System Test ของการเพิ่มวิชา ตั้งแต่หน้าเว็บ → API → ฐานข้อมูล ให้ครอบคลุมทุกเส้นทางใน
[Sequence Diagram ของ US1-T06](../T06/US1-T06-Sequence-Diagram.md) และใช้ใน US1-T19 (รัน System Test)

## Scope
ทดสอบ `POST /api/timetable/entries` และ `GET /api/timetable` ทั้งระบบที่รันจริงใน Docker
ครอบคลุมทุกเส้นทางใน Sequence Diagram:

| เส้นทางใน Sequence Diagram | ผล | Test case |
| --- | --- | --- |
| ไม่ส่ง `sectionId` | 400 ProblemDetail พร้อม `errors` | ST-08 |
| ไม่พบ section | 404 ProblemDetail | ST-07 |
| มีวิชานี้ในตารางแล้ว (ไม่ว่ากลุ่มไหน) | 409 `COURSE_ALREADY_IN_TIMETABLE` | ST-03 |
| หน่วยกิตรวมหลังเพิ่มเกิน 22 | 409 `CREDIT_LIMIT_EXCEEDED` | ST-06 |
| เพิ่มสำเร็จ สร้าง `timetable` ใหม่ (วิชาแรกของภาค) | 201 | ST-01 |
| เพิ่มสำเร็จ ใช้ `timetable` เดิม ไม่ชน | 201, `conflicts: []` | ST-02, ST-05 |
| เพิ่มสำเร็จ แต่เวลาชน | 201, `conflicts` ไม่ว่าง | ST-04 |
| อ่านตารางกลับ (`GET /api/timetable`) | ข้อมูลคงอยู่ และภาคอื่นไม่ปน | ST-09 |

## Test Approach
- System Test ใช้ระบบจริงทั้งชุด ไม่ mock: หน้าเว็บ (Next.js) + backend (Spring Boot) + SQL Server รันด้วย `docker compose up -d --build` ตาม README
- ใช้ข้อมูลรายวิชาภาคเรียน 1/2568 ตาม seed `db/seed/V20261014_2010__seed_courses_2568_1.sql` (US1-T09) ซึ่งเป็นภาคเรียนที่ทีมตกลงใช้ ไม่รวมภาคฤดูร้อน
- การแจ้งเตือนบนหน้าเว็บมีเฉพาะกรณีเวลาชน (ST-04) ส่วนหน่วยกิตเกินไม่มีข้อความแจ้งเตือน แต่ระบบไม่อนุญาตให้เพิ่มวิชา (ST-06) ตามข้อสรุปการประชุมทีม
- ผู้ใช้คือนักศึกษา demo `6609000000` จาก `app.timetable.demo-student-id` (ระหว่างที่ US3 ยังไม่มี login)
- Test case ต่อเนื่องกันตามลำดับ ST-01 ถึง ST-09 เพราะสถานะตารางสะสมไปเรื่อย ๆ ต้องล้างตารางก่อนเริ่มทุกครั้ง
- ตรวจผล 3 ชั้นในทุก test case: หน้าเว็บ, API response (ดูใน DevTools แท็บ Network หรือ Postman) และข้อมูลใน DB
- กรณีที่ทำผ่านหน้าเว็บไม่ได้ (ST-03 ส่งกลุ่มซ้ำ, ST-06 หน่วยกิตเกิน, ST-07, ST-08) ให้ยิง API ตรงด้วย Postman หรือ `curl`
- ยังไม่ได้ดำเนินการทดสอบจริง เพราะหน้าเว็บของ US1 (US1-T07) อยู่ระหว่างพัฒนา ข้อความบนหน้าเว็บอาจปรับตาม Implementation จริง

## สภาพแวดล้อมและการเตรียมข้อมูล

| รายการ | ค่า |
| --- | --- |
| เปิดระบบ | `cp .env.example .env` แล้ว `docker compose up -d --build` |
| หน้าเว็บ | http://localhost:3000 |
| API | http://localhost:8080 |
| ภาคเรียน | ปีการศึกษา 2568 ภาคเรียน 1 |
| นักศึกษา | `6609000000` (demo) |

**ล้างตารางก่อนเริ่ม** (ลบ `timetable` แล้ว `timetable_entry` ถูกลบตามด้วย ON DELETE CASCADE):

```bash
docker exec sqlserver bash -c '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -d appdb -Q "DELETE FROM timetable WHERE student_id = N'"'"'6609000000'"'"'"'
```

**หา `sectionId`** ของแต่ละกลุ่มเรียน (ค่า id ขึ้นกับลำดับที่ seed ถูก insert):

```
GET http://localhost:8080/api/courses?academicYear=2568&semester=1&q=CS111
```

**คำสั่งตรวจ DB** (ใช้ในหลาย test case):

```sql
SELECT t.timetable_id, t.updated_at, s.course_code, s.section_no
FROM timetable t
LEFT JOIN timetable_entry e ON e.timetable_id = t.timetable_id
LEFT JOIN section s ON s.section_id = e.section_id
WHERE t.student_id = N'6609000000' AND t.academic_year = 2568 AND t.semester = 1
ORDER BY e.entry_id;
```

**ข้อมูลทดสอบ** (ตาม seed ภาคเรียน 1/2568 ทุกวิชา 3 หน่วยกิต):

| รหัสวิชา | Sec | วัน | เวลา | ใช้ใน |
| --- | --- | --- | --- | --- |
| CS111 | 030001 | อังคาร, พฤหัสบดี | 11:00 - 12:30 | ST-01 |
| MA211 | 020001 | อังคาร, พฤหัสบดี | 09:30 - 11:00 | ST-02 (ต่อกับ CS111 พอดี) |
| CS111 | 030002 | จันทร์, ศุกร์ | 09:30 - 11:00 | ST-03 (วิชาซ้ำคนละกลุ่ม) |
| LAS101 | 780004 | พุธ | 09:30 - 12:30 | ST-04 |
| TU109 | 780001 | พุธ | 09:30 - 12:30 | ST-04 (ชนกับ LAS101) |
| CS180 | 820001 | จันทร์ | 13:30 - 16:30 | ST-05 |
| TU101 | 900001 | พุธ | 13:30 - 16:30 | ST-05 |
| TU106 | 540001 | พฤหัสบดี | 13:30 - 16:30 | ST-05 |
| ST216 | 040001 | อังคาร | 13:30 - 16:30 | ST-06 (เกิน 22 หน่วยกิต) |

## Test Cases

### [ST-01] เพิ่มวิชาแรกของภาค ระบบสร้างตารางใหม่

**Related CoS:** Test Case 1, Test Case 2, Test Case 3

**เส้นทาง:** ส่งครบ → พบ section → ยังไม่มี `timetable` → ไม่ซ้ำ → ไม่เกิน → สร้าง `timetable` + บันทึก entry → 201

**Preconditions:**
- ล้างตารางของนักศึกษา `6609000000` แล้ว
- เปิดหน้าเว็บ เลือกภาคเรียน 1 ปีการศึกษา 2568

**Test Steps:**
1. ตรวจว่าตารางว่าง และ `GET /api/timetable?academicYear=2568&semester=1` ได้ `entries: []`, `updatedAt: null`
2. ค้นหา "CS111" แล้วกด "+ เพิ่มวิชา" ที่ Sec 030001
3. ตรวจหน้าเว็บ, API response และ DB

**Expected Result:**
- หน้าเว็บ: บล็อก CS111 Sec 030001 อยู่ในช่องวันอังคารและพฤหัสบดี 11:00 - 12:30 ห้อง LC3-121 การ์ดวิชาขึ้น "เพิ่มแล้ว" แถบสรุปขึ้น "1 วิชา (3 หน่วยกิต)"
- API: `201 Created` ได้ `TimetableResponse` ที่มี `entries` 1 รายการ, `totalCredits: 3`, `conflicts: []`, `updatedAt` ไม่เป็น null
- DB: มีแถว `timetable` ใหม่ 1 แถว (`updated_at` ไม่เป็น null) และ `timetable_entry` 1 แถวของ CS111 030001

### [ST-02] เพิ่มวิชาที่คาบต่อกันพอดี ใช้ตารางเดิม และไม่นับเป็นเวลาชน

**Related CoS:** Test Case 2, Test Case 4

**เส้นทาง:** พบ `timetable` เดิม → ไม่ซ้ำ → ไม่เกิน → บันทึก entry → 201 (`conflicts: []`)

**Preconditions:**
- ผ่าน ST-01 (มี CS111 030001 ในตาราง)
- จด `timetable_id` และ `updated_at` จาก DB ไว้

**Test Steps:**
1. ค้นหา "MA211" แล้วกด "+ เพิ่มวิชา" ที่ Sec 020001
2. ตรวจหน้าเว็บ, API response และ DB

**Expected Result:**
- หน้าเว็บ: บล็อก MA211 อยู่ช่องวันอังคารและพฤหัสบดี 09:30 - 11:00 ติดกับ CS111 ที่เริ่ม 11:00 ไม่มีแถบเตือนเวลาชน
- API: `201 Created` ได้ `entries` 2 รายการ, `totalCredits: 6`, `conflicts: []`
- DB: `timetable_id` เดิม (ไม่สร้างตารางใหม่) มี `timetable_entry` 2 แถว และ `updated_at` ใหม่กว่าค่าที่จดไว้ (เก็บละเอียดระดับวินาที ให้เว้นอย่างน้อย 1 วินาทีหลัง ST-01)

### [ST-03] เพิ่มวิชาเดิมคนละกลุ่มเรียน ระบบปฏิเสธ

**Related CoS:** Test Case 8

**เส้นทาง:** พบ section → มีวิชานี้ในตารางแล้ว → 409 `COURSE_ALREADY_IN_TIMETABLE`

**Preconditions:**
- ผ่าน ST-02 (มี CS111 030001 และ MA211 ในตาราง)
- จดจำนวนแถว `timetable_entry` และ `updated_at` จาก DB ไว้

**Test Steps:**
1. ค้นหา "CS111" บนหน้าเว็บ แล้วดูการ์ด Sec 030002
2. ส่ง `POST /api/timetable/entries` ด้วย `sectionId` ของ CS111 030002 ผ่าน Postman (กันกรณีส่ง API ตรง)
3. ตรวจ API response และ DB

**Expected Result:**
- หน้าเว็บ: การ์ด CS111 Sec 030002 ไม่มีปุ่ม "+ เพิ่มวิชา" เพราะมี CS111 อยู่ในตารางแล้ว (ตาม US1-T05)
- API: `409 Conflict` ได้ ProblemDetail ที่มี `code: "COURSE_ALREADY_IN_TIMETABLE"`, `courseCode: "CS111"`, `existingSectionNo: "030001"`
- DB: จำนวนแถว `timetable_entry` และ `updated_at` เท่าเดิม (ไม่มีอะไรถูกบันทึก)

### [ST-04] เพิ่มวิชาที่เวลาชน ระบบยังบันทึกแต่แจ้งเตือน

**Related CoS:** Test Case 5

**เส้นทาง:** ไม่ซ้ำ → ไม่เกิน → บันทึก entry → คำนวณเวลาชน → 201 (`conflicts` ไม่ว่าง)

**Preconditions:**
- ผ่าน ST-03 (มี CS111 030001 และ MA211 ในตาราง)

**Test Steps:**
1. เพิ่ม LAS101 Sec 780004 ผ่านหน้าเว็บ
2. เพิ่ม TU109 Sec 780001 ผ่านหน้าเว็บ
3. ตรวจหน้าเว็บ, API response ของการเพิ่ม TU109 และ DB

**Expected Result:**
- หน้าเว็บ: แถบเตือน "ตรวจพบเวลาเรียนซ้อนทับกัน" ระบุ TU109 และ LAS101 วันพุธ 09:30 - 12:30 น. ในช่องวันพุธมีบล็อก "เวลาชนกัน" ครอบทั้งสองวิชา และการ์ด TU109 กับ LAS101 ขึ้น "เวลาชน"
- API: `201 Created` ได้ `entries` 4 รายการ, `totalCredits: 12` และ `conflicts` 1 รายการ: `dayOfWeek: "WEDNESDAY"`, `overlapStart: "09:30"`, `overlapEnd: "12:30"`, `courseCodes` มี LAS101 และ TU109 ส่วน `conflictWith` ของ TU109 คือ `["LAS101"]` และของ LAS101 คือ `["TU109"]`
- DB: มี `timetable_entry` 4 แถว ทั้ง LAS101 และ TU109 ถูกบันทึก (เวลาชนไม่ block)

### [ST-05] เพิ่มหลายวิชาจนครบ 21 หน่วยกิต แสดงทุกวิชาถูกวันเวลา

**Related CoS:** Test Case 3, Test Case 6

**เส้นทาง:** ไม่ซ้ำ → ไม่เกิน → บันทึก entry → 201 (ทำ 3 ครั้ง)

**Preconditions:**
- ผ่าน ST-04 (มี 4 วิชา 12 หน่วยกิต)

**Test Steps:**
1. เพิ่ม CS180 Sec 820001, TU101 Sec 900001 และ TU106 Sec 540001 ผ่านหน้าเว็บทีละวิชา
2. ตรวจหน้าเว็บ, API response ของการเพิ่มครั้งสุดท้าย และ DB

**Expected Result:**
- หน้าเว็บ: แสดงครบ 7 วิชาในช่องที่ถูกต้อง (CS180 จันทร์ 13:30 - 16:30, TU101 พุธ 13:30 - 16:30, TU106 พฤหัสบดี 13:30 - 16:30 และ 4 วิชาเดิมไม่ขยับ) แถบสรุปขึ้น "7 วิชา (21 หน่วยกิต)"
- API: `201 Created` ได้ `entries` 7 รายการ, `totalCredits: 21`, `maxCredits: 22` และ `conflicts` ยังมีแค่คู่ TU109/LAS101
- DB: มี `timetable_entry` 7 แถวใน `timetable` เดิม

### [ST-06] เพิ่มวิชาจนหน่วยกิตรวมเกิน 22 ระบบปฏิเสธ

**Related CoS:** Test Case 7

**เส้นทาง:** ไม่ซ้ำ → หน่วยกิตรวมหลังเพิ่มเกิน 22 → 409 `CREDIT_LIMIT_EXCEEDED`

**Preconditions:**
- ผ่าน ST-05 (มี 7 วิชา 21 หน่วยกิต)
- จดจำนวนแถว `timetable_entry` และ `updated_at` จาก DB ไว้

**Test Steps:**
1. ค้นหา "ST216" บนหน้าเว็บ แล้วลองเพิ่ม Sec 040001
2. ส่ง `POST /api/timetable/entries` ด้วย `sectionId` ของ ST216 040001 ผ่าน Postman (กันกรณีส่ง API ตรง)
3. ตรวจหน้าเว็บ, API response และ DB

**Expected Result:**
- หน้าเว็บ: ไม่สามารถเพิ่ม ST216 ได้ และ**ไม่มีข้อความแจ้งเตือนหน่วยกิตเกิน** ST216 ไม่ปรากฏในตาราง แถบสรุปยังเป็น "7 วิชา (21 หน่วยกิต)"
- API: `409 Conflict` ได้ ProblemDetail ที่มี `code: "CREDIT_LIMIT_EXCEEDED"`, `currentCredits: 21`, `courseCredits: 3`, `maxCredits: 22`
- DB: จำนวนแถว `timetable_entry` และ `updated_at` เท่าเดิม

**หมายเหตุ:** ตามข้อสรุปการประชุมทีม หน่วยกิตเกินไม่มีการแจ้งเตือนบนหน้าเว็บ แต่ไม่อนุญาตให้เพิ่มวิชาแทน ส่วน API ยังตอบ 409 ตาม US1-T05 เพื่อกันการส่ง API ตรง

### [ST-07] ส่ง sectionId ที่ไม่มีในระบบ

**Related CoS:** -

**เส้นทาง:** ส่งครบ → ไม่พบ section → 404

**Preconditions:**
- ผ่าน ST-06

**Test Steps:**
1. ส่ง `POST /api/timetable/entries` ด้วย `{ "sectionId": 999999 }` ผ่าน Postman
2. ตรวจ API response และ DB

**Expected Result:**
- API: `404 Not Found` ได้ ProblemDetail ที่ `detail` บอกว่าไม่พบ section 999999
- DB: จำนวนแถว `timetable_entry` และ `updated_at` เท่าเดิม

### [ST-08] ไม่ส่ง sectionId

**Related CoS:** -

**เส้นทาง:** ไม่ส่ง `sectionId` → 400 (ไม่ถึง service)

**Preconditions:**
- ผ่าน ST-07

**Test Steps:**
1. ส่ง `POST /api/timetable/entries` ด้วย body `{}` ผ่าน Postman
2. ตรวจ API response และ DB

**Expected Result:**
- API: `400 Bad Request` ได้ ProblemDetail ที่มี `errors.sectionId`
- DB: จำนวนแถว `timetable_entry` และ `updated_at` เท่าเดิม

### [ST-09] โหลดหน้าใหม่แล้วข้อมูลยังอยู่ และภาคเรียนอื่นไม่ปน

**Related CoS:** Test Case 3, Test Case 6

**เส้นทาง:** `GET /api/timetable` อ่านตารางจาก DB

**Preconditions:**
- ผ่าน ST-08 (มี 7 วิชา 21 หน่วยกิต)

**Test Steps:**
1. รีเฟรชหน้าเว็บ (ภาคเรียน 1/2568)
2. เปลี่ยนตัวเลือกเป็นภาคเรียน 2 ปีการศึกษา 2568
3. เปลี่ยนกลับเป็นภาคเรียน 1/2568

**Expected Result:**
- ข้อ 1: ตารางแสดง 7 วิชาเหมือนก่อนรีเฟรช แถบเตือนเวลาชน TU109/LAS101 ยังอยู่ `GET /api/timetable?academicYear=2568&semester=1` ได้ `entries` 7 รายการ
- ข้อ 2: ตารางว่าง `GET /api/timetable?academicYear=2568&semester=2` ได้ `entries: []`, `updatedAt: null`
- ข้อ 3: กลับมาเห็น 7 วิชาเหมือนเดิม

## สรุปความครอบคลุม

| Test Case | เรื่องที่ทดสอบ | CoS |
| --- | --- | --- |
| ST-01 | เพิ่มวิชาแรก สร้างตารางใหม่ | 1, 2, 3 |
| ST-02 | คาบต่อกันพอดีไม่ชน ใช้ตารางเดิม | 2, 4 |
| ST-03 | วิชาซ้ำคนละกลุ่ม → 409 | 8 |
| ST-04 | เวลาชน → 201 + แจ้งเตือน | 5 |
| ST-05 | หลายวิชาแสดงถูกวันเวลา (21 หน่วยกิต) | 3, 6 |
| ST-06 | หน่วยกิตเกิน 22 → เพิ่มไม่ได้ ไม่มีแจ้งเตือน (API 409) | 7 |
| ST-07 | ไม่พบ section → 404 | - |
| ST-08 | ไม่ส่ง sectionId → 400 | - |
| ST-09 | ข้อมูลคงอยู่ และภาคอื่นไม่ปน | 3, 6 |

**ข้อจำกัด:** seed ทุกวิชา 3 หน่วยกิต จึงทดสอบกรณีรวมได้ 22 หน่วยกิตพอดี (ต้องยังเพิ่มได้) ไม่ได้ ถ้าต้องการทดสอบขอบนี้ต้องเพิ่มวิชา 1 หน่วยกิตใน seed

## แบบบันทึกผล (ใช้ใน US1-T19)

| Test Case | ผู้ทดสอบ | วันที่ | ผล (Pass/Fail) | หมายเหตุ / Bug ที่พบ |
| --- | --- | --- | --- | --- |
| ST-01 | | | | |
| ST-02 | | | | |
| ST-03 | | | | |
| ST-04 | | | | |
| ST-05 | | | | |
| ST-06 | | | | |
| ST-07 | | | | |
| ST-08 | | | | |
| ST-09 | | | | |

## เอกสารที่เกี่ยวข้อง
- [US1-T06 Sequence Diagram](../T06/US1-T06-Sequence-Diagram.md)
- [US1-T05 DTO & API Spec](../T05/US1-DTO%20&%20API%20Spec.md)
- [US1-T16 User Acceptance Test](../T16/US1-T16-UAT.md)
