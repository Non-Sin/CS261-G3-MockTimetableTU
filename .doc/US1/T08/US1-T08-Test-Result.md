# US1-T08 ผลการทดสอบ Unit Test และ API (Postman)

Oct 14, 2026 · @Non

## สรุปผล

| ชุดทดสอบ | ผล |
| --- | --- |
| Unit test backend (`./mvnw clean test`) | **ผ่าน 74/74** (15 test class) |
| Postman (newman) 25 request | **ผ่าน 31/31 assertion** ไม่มี request ล้ม |
| Test case ของการ์ด US1 (TC1–8) ที่ทดสอบผ่าน API | ผ่านครบ ยกเว้น TC5 ที่ผลคาดหวังใน UAT ต่างจาก Spec (ดูหัวข้อ "ข้อที่ต้องตัดสิน") |

**User story:** US1 เพิ่มวิชาเข้าไปในตารางเรียนจำลอง · branch `feature/US1-T09-develop-dao-entity`

## สภาพแวดล้อม

| หัวข้อ | ค่า |
| --- | --- |
| วันที่รัน | 2026-10-14 |
| Java / Spring Boot | 21.0.9 / 4.1.1 |
| Unit test DB | DAO test ใช้ Testcontainers `mcr.microsoft.com/mssql/server:2025-latest` (start 58 วินาที) · `BackendApplicationTests` ใช้ SQL Server จาก `docker compose` |
| Postman | newman 6.2.1 (`npx -y newman@6.2.1`) · Node 24.21.0 |
| Backend ตอนรัน Postman | `./mvnw spring-boot:run` ที่ `http://localhost:8080` กับ DB ของ `docker compose` |
| ข้อมูล | seed `db/seed/V20261014_2010__seed_courses_2568_1.sql` (2568/1 มี 8 วิชา) · นักศึกษา demo `6609000000` (`app.timetable.demo-student-id`) เริ่มจากตารางว่าง |

## Unit Test

คำสั่ง `cd backend && ./mvnw clean test` ต้องเปิด Docker และ `docker compose up -d sqlserver db-init` ก่อน

| Test class | ชั้น | Tests | ผ่าน | เวลา (s) |
| --- | --- | --- | --- | --- |
| `course.CourseControllerTest` | Controller | 7 | 7 | 4.138 |
| `timetable.TimetableControllerTest` | Controller | 8 | 8 | 1.422 |
| `course.CourseServiceTest` | Service | 4 | 4 | 1.366 |
| `timetable.TimetableServiceTest` | Service | 12 | 12 | 0.653 |
| `course.dto.CourseResponseTest` | DTO / JSON | 3 | 3 | 1.690 |
| `timetable.dto.TimetableResponseTest` | DTO / JSON | 6 | 6 | 0.744 |
| `course.CourseRepositoryTest` | DAO (US1-T12) | 5 | 5 | 73.06 * |
| `course.SectionRepositoryTest` | DAO (US1-T12) | 5 | 5 | 2.521 |
| `timetable.TimetableRepositoryTest` | DAO (US1-T12) | 4 | 4 | 1.554 |
| `timetable.TimetableEntryRepositoryTest` | DAO (US1-T12) | 5 | 5 | 1.347 |
| `SchemaConstraintTest` | DAO (US1-T12) | 5 | 5 | 2.607 |
| `common.exception.GlobalExceptionHandlerTest` | common | 2 | 2 | 0.439 |
| `common.student.DemoStudentProviderTest` | common | 1 | 1 | 0.032 |
| `item.ItemControllerTest` | ตัวอย่างเดิม | 6 | 6 | 1.797 |
| `BackendApplicationTests` | context | 1 | 1 | 23.94 |
| **รวม** | | **74** | **74** | |

\* รวมเวลา start SQL Server container ครั้งแรก ผลรายกรณีของ DAO อยู่ใน [US1-T12 DAO Unit Test Result](../T12/US1-T12-DAO-Unit-Test-Result.md)

**สิ่งที่ unit test ของ service และ controller ครอบคลุม**

| กฎ / พฤติกรรม | Test |
| --- | --- |
| ตารางที่ยังไม่มีตอบตารางว่าง `updatedAt: null` | `getTimetable_none_returnsEmptyTimetable`, `getMyTimetable_empty_returnsNullUpdatedAt` |
| คาบต่อกันพอดีไม่ชน (TC4) | `getTimetable_backToBackSlots_noConflict` |
| เวลาชนไม่ block และคืน `conflicts` + `conflictWith` (TC5) | `addEntry_overlappingCourse_savesAndReturnsConflict`, `getTimetable_overlappingCourses_returnsConflictsAndConflictWith` |
| 1 รายการต่อ 1 คู่ต่อ 1 วัน | `getTimetable_pairOverlapsOnTwoDays_returnsOneConflictPerDaySortedByDay` |
| 21 + 3 เกิน 22 → 409 (TC7) และ 21 + 1 = 22 ผ่าน | `addEntry_overCreditLimit_throws409CreditLimitExceeded`, `addEntry_reachingExactlyMaxCredits_isAllowed` |
| วิชาเดิมคนละกลุ่ม → 409 (TC8) และตรวจก่อนหน่วยกิต | `addEntry_sameCourseOtherSection_...`, `addEntry_duplicateCourseAtCreditLimit_reportsDuplicateFirst` |
| วิชาแรกของภาคสร้างตารางใหม่พร้อม `updatedAt` (ไม่มีเศษวินาที) | `addEntry_firstEntryOfTerm_createsTimetableFromSectionTerm` |
| 404 / 400 และ ProblemDetail พร้อม `code` | `TimetableControllerTest`, `CourseControllerTest` |

## Postman

ไฟล์ในโฟลเดอร์นี้:

- [`US1-T08.postman_collection.json`](./US1-T08.postman_collection.json) collection v2.1 import เข้า Postman ได้ ตัวแปร `baseUrl` ค่าเริ่มต้น `http://localhost:8080` ต้องรันทั้ง collection ตามลำดับ เพราะ request 01 เก็บ `sectionId` จาก `GET /api/courses` ไว้ใช้ต่อ ไม่ hard-code id
- [`US1-T08-newman-cli.txt`](./US1-T08-newman-cli.txt) ผลรันจาก newman

คำสั่งที่ใช้รัน

```bash
cd .doc/US1/T08
npx -y newman@6.2.1 run US1-T08.postman_collection.json
```

| # | Request | Test case | ผลที่คาดหวัง | ผล |
| --- | --- | --- | --- | --- |
| 00 | GET ตาราง 2568/1 | Precondition | 200 ตารางว่าง `updatedAt: null` | PASS |
| 01 | GET รายวิชา 2568/1 | TC1 | 8 วิชาเรียงตามรหัส CS111 มี 2 กลุ่ม คาบเรียงตามวัน เวลา `HH:mm` ไม่มี CS223 | PASS |
| 02 | ค้น `q=cs1` | TC1 | [CS111] | PASS |
| 03 | ค้น `q=CS` | TC1 | [CS111, CS213] ไม่มี ST216 | PASS |
| 04 | ค้น `q=thinking` | TC1 | [LAS101] | PASS |
| 05 | กรอง `GENERAL_EDUCATION` | TC1 | [EL171, LAS101, TU109] | PASS |
| 06 | GET รายวิชา 2568/2 | TC1 | [CS111, CS223] | PASS |
| 07 | ไม่ส่ง `semester` | — | 400 | PASS |
| 08 | `category=SCIENCE` | — | 400 | PASS |
| 09 | POST CS111 030001 | TC2 | 201 ตารางมี CS111 `updatedAt` เป็น ISO 8601 พร้อม offset | PASS |
| 10 | GET ตาราง | TC3 | รหัส ชื่อ อังคาร/พฤหัส 11:00–12:30 ห้อง LC3-121 | PASS |
| 11 | POST MA211 | TC4 | 201 ไม่มีเวลาชน (09:30–11:00 ต่อกับ 11:00 พอดี) | PASS |
| 12 | POST TU109 | — | 201 | PASS |
| 13 | POST LAS101 | TC5 | 201 conflict WEDNESDAY 09:30–12:30 [TU109, LAS101] และ `conflictWith` ชี้หากัน | PASS (ตาม Spec) |
| 14 | POST CS111 030002 | TC8 | 409 `COURSE_ALREADY_IN_TIMETABLE` `courseCode`, `existingSectionNo` และ `detail` ตาม Spec | PASS |
| 15 | GET ตาราง | TC8 | CS111 มีแค่ Sec 030001 | PASS |
| 16–18 | POST CS213, EL171, JP171 | TC6 | 201 หน่วยกิต 15 → 18 → 21 | PASS |
| 19 | GET ตาราง | TC6 | 7 วิชาครบ วันเวลาตรงกับ seed คู่ชนคู่เดียว | PASS |
| 20 | POST ST216 | TC7 | 409 `CREDIT_LIMIT_EXCEEDED` 21 / 3 / 22 และ `detail` ตาม Spec | PASS |
| 21 | GET ตาราง | TC7 | ยัง 21 หน่วยกิต ไม่มี ST216 | PASS |
| 22 | POST section ที่ไม่มีอยู่ | — | 404 | PASS |
| 23 | POST `{}` | — | 400 `errors.sectionId` | PASS |
| 24 | GET ตาราง 2568/2 | — | ตารางว่าง ไม่ปนกับภาค 1 | PASS |

เวลาตอบเฉลี่ย 72 ms (สูงสุด 462 ms คือ request แรกหลัง start) รวม 3.8 วินาที

**ก่อนรันซ้ำ** ต้องล้างตารางของนักศึกษา demo เพราะยังไม่มี API ลบ (US2) ถ้าไม่ล้าง request 00 จะล้ม

```bash
docker exec sqlserver bash -c '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -d appdb -Q "DELETE FROM timetable WHERE student_id = N'"'"'6609000000'"'"'"'
```

(Git Bash ให้ใส่ `MSYS_NO_PATHCONV=1` นำหน้า) หลังรันครั้งนี้ล้างข้อมูลแล้ว DB ของ compose ไม่มีตารางเรียนค้าง

## การจับคู่ข้อมูลกับ UAT (US1-T16)

UAT ใช้รหัสวิชาสมมติ (CS101, CS102, TU100 ฯลฯ) ที่ไม่มีใน seed Postman จึงใช้วิชาใน seed ที่มีเงื่อนไขเดียวกันแทน

| UAT | ข้อมูลใน UAT | ใช้ใน Postman |
| --- | --- | --- |
| TC3, TC4 | CS101 อ./พฤ. 09:30–11:00 และ CS102 อ./พฤ. 11:00–12:30 (ต่อกันพอดี) | MA211 อ./พฤ. 09:30–11:00 และ CS111 อ./พฤ. 11:00–12:30 |
| TC5 | LAS101 อ. 09:30–12:30 ชนกับ CS101/CS102 | LAS101 กับ TU109 พ. 09:30–12:30 |
| TC6 | 3 วิชาไม่ชนกัน | 7 วิชาใน request 09–19 |
| TC7 | 7 วิชา 21 หน่วยกิต แล้วเพิ่ม TU109 | 7 วิชา 21 หน่วยกิต แล้วเพิ่ม ST216 |
| TC8 | CS101 Sec 020001 แล้วเพิ่ม 020002 | CS111 Sec 030001 แล้วเพิ่ม 030002 |

## ข้อที่ต้องตัดสิน

**TC5 เวลาชน: UAT กับ Spec ขัดกัน** UAT (US1-T16) คาดว่า "ระบบไม่สามารถเพิ่มรายวิชา LAS101 ลงในตารางเรียนจำลองได้" แต่ [US1-T05 DTO & API Spec](../T05/US1-DTO%20&%20API%20Spec.md) ออกแบบตาม Figma ให้ **เพิ่มได้** ตอบ 201 พร้อม `conflicts` แล้ว UI แสดงแถบเตือน backend ทำตาม Spec จึงผ่านเงื่อนไข "ต้องแจ้งเตือนผู้ใช้" แต่ไม่ผ่าน "ไม่สามารถเพิ่มได้" ของ UAT ทีมต้องเลือกว่าจะแก้ UAT ให้ตรง Spec/Figma หรือเปลี่ยน backend ให้ตอบ 409 เมื่อเวลาชน

## ข้อจำกัด

- Postman ทดสอบผ่าน API เท่านั้น ส่วนที่เป็น UI ของ TC1–8 (การแสดงบน grid, แถบเตือน, ป้ายบนการ์ดวิชา) ต้องทดสอบตอนทำ frontend
- ยังไม่ได้ทดสอบผ่าน frontend (`/api/*` ที่ Next.js rewrite ไป backend) และยังไม่เห็นผลบน CI
- ไม่ได้ทดสอบการเพิ่มวิชาแรกพร้อมกัน 2 request (อาจได้ 500 จาก unique constraint แทน 409)

**เอกสารที่เกี่ยวข้อง:** [DTO & API Spec](../T05/US1-DTO%20&%20API%20Spec.md) · [Sequence Diagram](../T06/US1-T06-Sequence-Diagram.md) · [US1-T12 DAO Unit Test Result](../T12/US1-T12-DAO-Unit-Test-Result.md) · [US1-T16 UAT](../T16/US1-T16-UAT.md)
