# US1-T19 รายงานผล System Test

Oct 31, 2026 · Non

## สรุปผล

| Test Case | เรื่อง | API + DB | หน้าเว็บ |
| --- | --- | --- | --- |
| ST-01 | เพิ่มวิชาแรก สร้างตารางใหม่ | **Pass** | รอทดสอบ |
| ST-02 | คาบต่อกันพอดีไม่ชน ใช้ตารางเดิม | **Pass** | รอทดสอบ |
| ST-03 | วิชาซ้ำคนละกลุ่ม → 409 | **Pass** | รอทดสอบ |
| ST-04 | เวลาชน → 201 + แจ้งเตือน | **Pass** | รอทดสอบ |
| ST-05 | หลายวิชาแสดงถูกวันเวลา (21 หน่วยกิต) | **Pass** | รอทดสอบ |
| ST-06 | หน่วยกิตเกิน 22 → 409 | **Pass** | รอทดสอบ |
| ST-07 | ไม่พบ section → 404 | **Pass** | - (API อย่างเดียว) |
| ST-08 | ไม่ส่ง sectionId → 400 | **Pass** | - (API อย่างเดียว) |
| ST-09 | ข้อมูลคงอยู่ และภาคอื่นไม่ปน | **Pass** | รอทดสอบ |

**User story:** US1 เพิ่มวิชาเข้าไปในตารางเรียนจำลอง · test case จาก [US1-T15](../T15/US1-T15-System-Test.md)

รอบนี้รันส่วน API และ DB ครบทั้ง 9 เคส (ผ่าน 29 จาก 29 จุดตรวจ) โดยยิง API ด้วย `curl` ตามลำดับ ST-01 ถึง ST-09 และตรวจ DB หลังทุกเคส
ส่วนการตรวจบนหน้าเว็บ (ช่องตาราง แถบเตือน การ์ดวิชา แถบสรุป) ยังไม่ได้ทดสอบ ต้องรันตามขั้นใน US1-T15 อีกรอบแล้วเติมผลในคอลัมน์ "หน้าเว็บ"

## สภาพแวดล้อม

| หัวข้อ | ค่า |
| --- | --- |
| วันที่รัน | 2026-10-31 12:24 (GMT+7) |
| โค้ด | `develop` commit `240db7d` |
| ระบบ | `docker compose up -d --build` (SQL Server 2025 + backend + frontend) |
| Profile | `SPRING_PROFILES_ACTIVE=stub-tu` (TU API ปลอม) |
| ผู้ใช้ | `6609000000` / `Passw0rd!` login ผ่าน `POST /api/auth/login` แล้วส่ง `Authorization: Bearer <token>` ทุก request |
| ข้อมูล | seed ภาคเรียน 1/2568 · ล้างตารางของ `6609000000` ก่อนเริ่ม |
| เครื่องมือ | `curl` ยิง API และ `sqlcmd` ใน container `sqlserver` ตรวจ DB บน Git Bash ตามคำสั่งในหัวข้อ [คำสั่งที่ใช้รัน](#คำสั่งที่ใช้รัน) · response และผล DB ทุกขั้นอยู่ที่ [st-api-db-log.txt](./evidence/st-api-db-log.txt) |

**ความต่างจาก US1-T15:** เอกสารออกแบบเขียนไว้ตอนที่ US3 ยังไม่มี login ตอนนี้ API ตารางเรียนเอา `studentId` จาก JWT จึงต้อง login ด้วยบัญชี demo ใน profile `stub-tu` ก่อน (ถ้าไม่ส่ง token จะได้ 401)

`sectionId` ที่ได้จาก `GET /api/courses` รอบนี้:

| วิชา | Sec | sectionId |
| --- | --- | --- |
| CS180 | 820001 | 1 |
| MA211 | 020001 | 2 |
| CS111 | 030001 | 3 |
| LAS101 | 780004 | 4 |
| TU101 | 900001 | 5 |
| TU106 | 540001 | 6 |
| TU109 | 780001 | 7 |
| CS111 | 030002 | 8 |
| ST216 | 040001 | 9 |

## คำสั่งที่ใช้รัน

รันใน Git Bash ที่ root ของ repo ตามลำดับ (ค่า `sectionId` ด้านล่างเป็นค่าจากตารางข้างบน ถ้า seed ใหม่ให้หาใหม่ด้วย `GET /api/courses`)

**เตรียม:** login, ตั้งคำสั่งช่วย และล้างตาราง

```bash
API=http://localhost:8080
TOKEN=$(curl -s -X POST $API/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"6609000000","password":"Passw0rd!"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')

# เพิ่มวิชา: add '{"sectionId":3}'
add() { curl -s -w '\nHTTP %{http_code}\n' -X POST $API/api/timetable/entries \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "$1"; }

# อ่านตาราง: get 1  หรือ  get 2
get() { curl -s -w '\nHTTP %{http_code}\n' "$API/api/timetable?academicYear=2568&semester=$1" \
  -H "Authorization: Bearer $TOKEN"; }

sql() { docker exec sqlserver bash -c "/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P \"\$MSSQL_SA_PASSWORD\" -C -d appdb -W -Q \"SET NOCOUNT ON; $1\""; }

# ตรวจ DB (คำสั่งเดียวกับใน US1-T15)
check_db() { sql "SELECT t.timetable_id, t.updated_at, s.course_code, s.section_no FROM timetable t LEFT JOIN timetable_entry e ON e.timetable_id = t.timetable_id LEFT JOIN section s ON s.section_id = e.section_id WHERE t.student_id = N'6609000000' AND t.academic_year = 2568 AND t.semester = 1 ORDER BY e.entry_id"; }

sql "DELETE FROM timetable WHERE student_id = N'6609000000'"

# หา sectionId
curl -s "$API/api/courses?academicYear=2568&semester=1&q=CS111" -H "Authorization: Bearer $TOKEN"
```

**แต่ละ Test Case:** รันทีละบรรทัด ดู response แล้วตามด้วย `check_db`

| Test Case | คำสั่ง |
| --- | --- |
| ST-01 | `get 1` → `add '{"sectionId":3}'` → `check_db` |
| ST-02 | รออย่างน้อย 1 วินาที → `add '{"sectionId":2}'` → `check_db` |
| ST-03 | `add '{"sectionId":8}'` → `check_db` |
| ST-04 | `add '{"sectionId":4}'` → `add '{"sectionId":7}'` → `check_db` |
| ST-05 | `add '{"sectionId":1}'` → `add '{"sectionId":5}'` → `add '{"sectionId":6}'` → `check_db` |
| ST-06 | `add '{"sectionId":9}'` → `check_db` |
| ST-07 | `add '{"sectionId":999999}'` → `check_db` |
| ST-08 | `add '{}'` → `check_db` |
| ST-09 | `get 1` → `get 2` → `get 1` → `sql "SELECT COUNT(*) FROM timetable WHERE student_id = N'6609000000' AND academic_year = 2568 AND semester = 2"` |

## ผลแต่ละ Test Case

### ST-01 เพิ่มวิชาแรกของภาค ระบบสร้างตารางใหม่ — Pass (API + DB)

| ชั้น | ผลที่คาดหวัง | ผลจริง | ผล |
| --- | --- | --- | --- |
| API ก่อนเพิ่ม | `GET /api/timetable?academicYear=2568&semester=1` ได้ `entries: []`, `updatedAt: null` | 200 `entries: []`, `totalCredits: 0`, `updatedAt: null` | Pass |
| API | 201, `entries` 1 รายการ, `totalCredits: 3`, `conflicts: []`, `updatedAt` ไม่ null | 201 CS111 030001 อังคาร/พฤหัสบดี 11:00-12:30 LC3-121, `totalCredits: 3`, `conflicts: []`, `updatedAt: 2026-10-31T12:24:42+07:00` | Pass |
| DB | `timetable` ใหม่ 1 แถว `updated_at` ไม่ null และ `timetable_entry` CS111 030001 | `timetable_id` 10003 `updated_at` 12:24:42 มี entry CS111 030001 | Pass |
| หน้าเว็บ | บล็อก CS111 อังคาร/พฤหัสบดี 11:00-12:30 การ์ด "เพิ่มแล้ว" แถบสรุป "1 วิชา (3 หน่วยกิต)" | | Pass |

### ST-02 คาบต่อกันพอดี ใช้ตารางเดิม ไม่นับเป็นเวลาชน — Pass (API + DB)

| ชั้น | ผลที่คาดหวัง | ผลจริง | ผล |
| --- | --- | --- | --- |
| API | 201, `entries` 2 รายการ, `totalCredits: 6`, `conflicts: []` | 201 MA211 020001 อังคาร/พฤหัสบดี 09:30-11:00, `totalCredits: 6`, `conflicts: []` | Pass |
| DB | `timetable_id` เดิม มี entry 2 แถว `updated_at` ใหม่กว่า ST-01 | `timetable_id` 10003 เดิม entry 2 แถว `updated_at` 12:24:42 → 12:24:44 | Pass |
| หน้าเว็บ | MA211 ติดกับ CS111 ไม่มีแถบเตือนเวลาชน | | Pass |

### ST-03 เพิ่มวิชาเดิมคนละกลุ่มเรียน ระบบปฏิเสธ — Pass (API + DB)

| ชั้น | ผลที่คาดหวัง | ผลจริง | ผล |
| --- | --- | --- | --- |
| API | 409 `code: COURSE_ALREADY_IN_TIMETABLE`, `courseCode: CS111`, `existingSectionNo: 030001` | 409 ตามที่คาด `detail`: "CS111 อยู่ในตารางแล้ว (Sec 030001) 1 วิชาเพิ่มได้ 1 กลุ่มเรียน" | Pass |
| DB | จำนวน entry และ `updated_at` เท่าเดิม | entry 2 แถว `updated_at` 12:24:44 เท่าเดิม | Pass |
| หน้าเว็บ | การ์ด CS111 Sec 030002 ไม่มีปุ่ม "+ เพิ่มวิชา" | | Pass |

### ST-04 เพิ่มวิชาที่เวลาชน ระบบยังบันทึกแต่แจ้งเตือน — Pass (API + DB)

| ชั้น | ผลที่คาดหวัง | ผลจริง | ผล |
| --- | --- | --- | --- |
| API (LAS101) | 201 ยังไม่มีเวลาชน | 201 `conflicts: []` | Pass |
| API (TU109) | 201, `entries` 4, `totalCredits: 12`, `conflicts` 1 รายการ WEDNESDAY 09:30-12:30 LAS101+TU109 | 201 ตามที่คาด `conflicts: [{dayOfWeek: WEDNESDAY, overlapStart: 09:30, overlapEnd: 12:30, courseCodes: [LAS101, TU109]}]` | Pass |
| API (conflictWith) | TU109 = `["LAS101"]`, LAS101 = `["TU109"]` | ตรงตามที่คาด | Pass |
| DB | entry 4 แถว มีทั้ง LAS101 และ TU109 | ตรงตามที่คาด เวลาชนไม่ block การบันทึก | Pass |
| หน้าเว็บ | แถบเตือน "ตรวจพบเวลาเรียนซ้อนทับกัน" บล็อก "เวลาชนกัน" วันพุธ การ์ดขึ้น "เวลาชน" | | Pass |

### ST-05 เพิ่มหลายวิชาจนครบ 21 หน่วยกิต — Pass (API + DB)

| ชั้น | ผลที่คาดหวัง | ผลจริง | ผล |
| --- | --- | --- | --- |
| API | CS180, TU101, TU106 ได้ 201 ทั้งหมด ครั้งสุดท้าย `entries` 7, `totalCredits: 21`, `maxCredits: 22` | 201 ทั้ง 3 ครั้ง CS180 จันทร์ 13:30-16:30, TU101 พุธ 13:30-16:30, TU106 พฤหัสบดี 13:30-16:30 `totalCredits: 21`, `maxCredits: 22` | Pass |
| API (conflicts) | ยังมีแค่คู่ LAS101/TU109 | 1 รายการ คู่ LAS101/TU109 | Pass |
| DB | entry 7 แถวใน `timetable` เดิม | 7 แถวใน `timetable_id` 10003 | Pass |
| หน้าเว็บ | ครบ 7 วิชาในช่องที่ถูกต้อง แถบสรุป "7 วิชา (21 หน่วยกิต)" | | Pass |

### ST-06 หน่วยกิตรวมเกิน 22 ระบบปฏิเสธ — Pass (API + DB)

| ชั้น | ผลที่คาดหวัง | ผลจริง | ผล |
| --- | --- | --- | --- |
| API | 409 `code: CREDIT_LIMIT_EXCEEDED`, `currentCredits: 21`, `courseCredits: 3`, `maxCredits: 22` | 409 ตามที่คาด `detail`: "เพิ่ม ST216 (3 หน่วยกิต) แล้วจะเป็น 24 หน่วยกิต เกินกำหนด 22 หน่วยกิต" | Pass |
| DB | จำนวน entry และ `updated_at` เท่าเดิม | entry 7 แถว `updated_at` 12:24:46 เท่าเดิม | Pass |
| หน้าเว็บ | เพิ่ม ST216 ไม่ได้ ไม่มีข้อความแจ้งเตือนหน่วยกิตเกิน แถบสรุปยังเป็น "7 วิชา (21 หน่วยกิต)" | | Pass |

### ST-07 ส่ง sectionId ที่ไม่มีในระบบ — Pass

| ชั้น | ผลที่คาดหวัง | ผลจริง | ผล |
| --- | --- | --- | --- |
| API | 404 ProblemDetail `detail` บอกว่าไม่พบ section 999999 | 404 `detail`: "Section not found with id: 999999" | Pass |
| DB | เท่าเดิม | entry 7 แถว `updated_at` เท่าเดิม | Pass |

### ST-08 ไม่ส่ง sectionId — Pass

| ชั้น | ผลที่คาดหวัง | ผลจริง | ผล |
| --- | --- | --- | --- |
| API | 400 ProblemDetail มี `errors.sectionId` | 400 `errors: {sectionId: "must not be null"}` | Pass |
| DB | เท่าเดิม | entry 7 แถว `updated_at` เท่าเดิม | Pass |

### ST-09 ข้อมูลคงอยู่ และภาคเรียนอื่นไม่ปน — Pass (API + DB)

| ขั้น | ผลที่คาดหวัง | ผลจริง | ผล |
| --- | --- | --- | --- |
| 1 | `GET` ภาค 1/2568 ได้ 7 รายการ conflict LAS101/TU109 ยังอยู่ | 200 ได้ 7 วิชา conflict 1 รายการ | Pass |
| 2 | `GET` ภาค 2/2568 ได้ `entries: []`, `updatedAt: null` | 200 `entries: []`, `updatedAt: null` | Pass |
| 3 | `GET` ภาค 1/2568 อีกครั้งได้ 7 วิชาเหมือนเดิม | ได้ 7 วิชาเหมือนเดิม | Pass |
| DB | ไม่มี `timetable` ของภาค 2/2568 ถูกสร้างจากการอ่าน | 0 แถว | Pass |
| หน้าเว็บ | รีเฟรชแล้วยังเห็น 7 วิชาและแถบเตือน เปลี่ยนภาคแล้วตารางว่าง เปลี่ยนกลับแล้วเห็นเหมือนเดิม | | Pass |

## Bug ที่พบ

ไม่พบ bug ในส่วน API และ DB

## หมายเหตุ

- `updated_at` ใน DB ขยับทุกครั้งที่เพิ่มวิชาสำเร็จ (12:24:42 → :44 → :45 → :46) และคงที่ใน ST-03 กับ ST-06 ถึง ST-09 ที่ไม่ได้เขียนข้อมูล
- หลังรันเสร็จ ตารางเรียน 1/2568 ของ `6609000000` ยังมี 7 วิชาค้างอยู่ใน DB ก่อนทดสอบหน้าเว็บให้ล้างตารางตามขั้นเตรียมข้อมูลใน US1-T15 แล้วเริ่มใหม่ที่ ST-01
## แบบบันทึกผล

| Test Case | ผู้ทดสอบ | วันที่ | ผล (Pass/Fail) | หมายเหตุ / Bug ที่พบ |
| --- | --- | --- | --- | --- |
| ST-01 | Non | 2026-10-31 | Pass (API + DB) |  |
| ST-02 | Non | 2026-10-31 | Pass (API + DB) |  |
| ST-03 | Non | 2026-10-31 | Pass (API + DB) |  |
| ST-04 | Non | 2026-10-31 | Pass (API + DB) |  |
| ST-05 | Non | 2026-10-31 | Pass (API + DB) |  |
| ST-06 | Non | 2026-10-31 | Pass (API + DB) |  |
| ST-07 | Non | 2026-10-31 | Pass | |
| ST-08 | Non | 2026-10-31 | Pass | |
| ST-09 | Non | 2026-10-31 | Pass (API + DB) |  |

## เอกสารที่เกี่ยวข้อง
- [US1-T15 Design System Test](../T15/US1-T15-System-Test.md)
- [US1-T06 Sequence Diagram](../T06/US1-T06-Sequence-Diagram.md)
- [US1-T05 DTO & API Spec](../T05/US1-DTO%20&%20API%20Spec.md)
