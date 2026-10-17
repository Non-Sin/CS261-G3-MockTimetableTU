# US1-T08 ผลการทดสอบ Unit Test และ API (Postman)

Oct 15, 2026 · @Non

## สรุปผล

| ชุดทดสอบ | ผล |
| --- | --- |
| Unit test backend (`./mvnw clean test`) | **ผ่าน 74/74** (15 test class) |
| Postman (newman) 25 request | **ผ่าน 32/32 assertion** ไม่มี request ล้ม |
| Test case ของการ์ด US1 (TC1–8) ที่ทดสอบผ่าน API | ผ่านครบ (TC5 เดิมผลคาดหวังใน UAT ต่างจาก Spec ทีมตัดสินแล้ว ดูหัวข้อ "ข้อที่ต้องตัดสิน") |

**User story:** US1 เพิ่มวิชาเข้าไปในตารางเรียนจำลอง · branch `feature/US1-T08-develop-api-dto` (merge seed ล่าสุดจาก `feature/US1-T09-develop-dao-entity` แล้ว)

## สภาพแวดล้อม

| หัวข้อ | ค่า |
| --- | --- |
| วันที่รัน | 2026-10-15 |
| Java / Spring Boot | 21.0.9 / 4.1.1 |
| Unit test DB | DAO test ใช้ Testcontainers `mcr.microsoft.com/mssql/server:2025-latest` (start 62 วินาที) · `BackendApplicationTests` ใช้ SQL Server จาก `docker compose` |
| Postman | newman 6.2.1 (`npx -y newman@6.2.1`) · Node 24.21.0 |
| Backend ตอนรัน Postman | `./mvnw spring-boot:run` ที่ `http://localhost:8080` กับ DB ของ `docker compose` ที่ล้างใหม่ (`docker compose down -v`) แล้ว Flyway รัน `V1`, `V20261014_1940` และ seed `V20261014_2010` |
| ข้อมูล | seed ตาม UI Prototype (ด้านล่าง) · นักศึกษา demo `6609000000` (`app.timetable.demo-student-id`) เริ่มจากตารางว่าง |

### ข้อมูล seed ภาค 2568/1 (9 วิชา ตาม "พบ 9 รายวิชา" ใน Figma)

| วิชา | Sec | วัน เวลา | ห้อง | ที่มา |
| --- | --- | --- | --- | --- |
| CS180 Introduction to User Interface and User Experience | 820001 | จ. 13:30–16:30 | LC5-S202 | UI Prototype |
| MA211 Calculus 1 | 020001 | อ./พฤ. 09:30–11:00 | SC-3015 | UI Prototype |
| CS111 Object-Oriented Concepts | 030001 | อ./พฤ. 11:00–12:30 | LC3-121 | UI Prototype |
| LAS101 Critical Thinking, Reading, and Writing | 780004 | พ. 09:30–12:30 | SC-1026 | UI Prototype |
| TU101 Thailand, ASEAN, and the World | 900001 | พ. 13:30–16:30 | SC-1058 | UI Prototype |
| TU106 Creativity and Communication | 540001 | พฤ. 13:30–16:30 | LC2-203 | UI Prototype |
| TU109 Innovation and Entrepreneurial Mindset | 780001 | พ. 09:30–12:30 | SC3-413 | UI Prototype (ชนกับ LAS101) |
| CS111 Object-Oriented Concepts | 030002 | จ./ศ. 09:30–11:00 | LC3-122 | เพิ่มสำหรับ TC8 |
| ST216 Statistics for Social Science 1 | 040001 | อ. 13:30–16:30 | SC2-105 | เพิ่มสำหรับ TC7 |
| JP171 Japanese 1 (เลือกเสรี) | 920001 | ศ. 13:30–16:30 | LC2-204 | เพิ่มให้มีครบ 3 หมวด |

ทุกวิชา 3 หน่วยกิต 7 วิชาตาม Prototype รวม 21 หน่วยกิต ภาคอื่น: CS111 และ CS223 (2568/2), MA211 (2567/1)

## Unit Test

คำสั่ง `cd backend && ./mvnw clean test` ต้องเปิด Docker และ `docker compose up -d sqlserver db-init` ก่อน unit test ไม่ใช้ข้อมูลจาก seed (DAO test ใช้ fixture ของตัวเอง ส่วน service/controller/DTO ใช้ mock) จึงไม่ได้รับผลจากการแก้ seed

| Test class | ชั้น | Tests | ผ่าน | เวลา (s) |
| --- | --- | --- | --- | --- |
| `course.CourseControllerTest` | Controller | 7 | 7 | 3.080 |
| `timetable.TimetableControllerTest` | Controller | 8 | 8 | 1.359 |
| `course.CourseServiceTest` | Service | 4 | 4 | 2.261 |
| `timetable.TimetableServiceTest` | Service | 12 | 12 | 0.514 |
| `course.dto.CourseResponseTest` | DTO / JSON | 3 | 3 | 0.870 |
| `timetable.dto.TimetableResponseTest` | DTO / JSON | 6 | 6 | 0.645 |
| `course.CourseRepositoryTest` | DAO (US1-T12) | 5 | 5 | 81.17 * |
| `course.SectionRepositoryTest` | DAO (US1-T12) | 5 | 5 | 1.442 |
| `timetable.TimetableRepositoryTest` | DAO (US1-T12) | 4 | 4 | 1.365 |
| `timetable.TimetableEntryRepositoryTest` | DAO (US1-T12) | 5 | 5 | 1.107 |
| `SchemaConstraintTest` | DAO (US1-T12) | 5 | 5 | 1.420 |
| `common.exception.GlobalExceptionHandlerTest` | common | 2 | 2 | 0.510 |
| `common.student.DemoStudentProviderTest` | common | 1 | 1 | 0.019 |
| `item.ItemControllerTest` | ตัวอย่างเดิม | 6 | 6 | 1.539 |
| `BackendApplicationTests` | context | 1 | 1 | 26.74 |
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
| 01 | GET รายวิชา 2568/1 | TC1 | 9 วิชาเรียงตามรหัส CS111 มี 2 กลุ่ม คาบเรียงตามวัน เวลา `HH:mm` MA211 Sec 020001 ห้อง SC-3015 ไม่มี CS223 | PASS |
| 02 | ค้น `q=cs1` | TC1 | [CS111, CS180] | PASS |
| 03 | ค้น `q=CS` | TC1 | [CS111, CS180] ไม่มี ST216 | PASS |
| 04 | ค้น `q=thinking` | TC1 | [LAS101] | PASS |
| 05 | กรอง `GENERAL_EDUCATION` | TC1 | [LAS101, TU101, TU106, TU109] | PASS |
| 06 | GET รายวิชา 2568/2 | TC1 | [CS111, CS223] | PASS |
| 07 | ไม่ส่ง `semester` | — | 400 | PASS |
| 08 | `category=SCIENCE` | — | 400 | PASS |
| 09 | POST CS111 030001 | TC2 | 201 ตารางมี CS111 `updatedAt` เป็น ISO 8601 พร้อม offset | PASS |
| 10 | GET ตาราง | TC3 | รหัส ชื่อ (Object-Oriented Concepts) อังคาร/พฤหัส 11:00–12:30 ห้อง LC3-121 | PASS |
| 11 | POST MA211 | TC4 | 201 ไม่มีเวลาชน (09:30–11:00 ต่อกับ 11:00 พอดี) | PASS |
| 12 | POST TU109 | — | 201 | PASS |
| 13 | POST LAS101 | TC5 | 201 conflict WEDNESDAY 09:30–12:30 [TU109, LAS101] และ `conflictWith` ชี้หากัน | PASS (ตาม Spec) |
| 14 | POST CS111 030002 | TC8 | 409 `COURSE_ALREADY_IN_TIMETABLE` `courseCode`, `existingSectionNo` และ `detail` ตาม Spec | PASS |
| 15 | GET ตาราง | TC8 | CS111 มีแค่ Sec 030001 | PASS |
| 16–18 | POST CS180, TU101, TU106 | TC6 | 201 หน่วยกิต 15 → 18 → 21 | PASS |
| 19 | GET ตาราง | TC6 | 7 วิชาตาม UI Prototype ครบ วันเวลาตรงกับ Prototype คู่ชนคู่เดียว | PASS |
| 20 | POST ST216 | TC7 | 409 `CREDIT_LIMIT_EXCEEDED` 21 / 3 / 22 และ `detail` ตาม Spec | PASS |
| 21 | GET ตาราง | TC7 | ยัง 21 หน่วยกิต ไม่มี ST216 | PASS |
| 22 | POST section ที่ไม่มีอยู่ | — | 404 | PASS |
| 23 | POST `{}` | — | 400 `errors.sectionId` | PASS |
| 24 | GET ตาราง 2568/2 | — | ตารางว่าง ไม่ปนกับภาค 1 | PASS |

เวลาตอบเฉลี่ย 114 ms (สูงสุด 621 ms คือ request แรกหลัง start) รวม 5 วินาที หลังรัน request 19 ตารางของนักศึกษา demo ตรงกับหน้า "ตารางที่มีวิชาชน" ใน UI Prototype (7 วิชา 21 / 22 หน่วยกิต TU109 ชนกับ LAS101)

**ก่อนรันซ้ำ** ต้องล้างตารางของนักศึกษา demo เพราะยังไม่มี API ลบ (US2) ถ้าไม่ล้าง request 00 จะล้ม

```bash
docker exec sqlserver bash -c '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -d appdb -Q "DELETE FROM timetable WHERE student_id = N'"'"'6609000000'"'"'"'
```

(Git Bash ให้ใส่ `MSYS_NO_PATHCONV=1` นำหน้า) หลังรันครั้งนี้ล้างข้อมูลแล้ว DB ของ compose ไม่มีตารางเรียนค้าง

### ประวัติการรัน

| วันที่ | seed | ผล |
| --- | --- | --- |
| 2026-10-14 | ชุดแรก (2568/1 มี 8 วิชา: CS111, CS213, EL171, JP171, LAS101, MA211, ST216, TU109) | ผ่าน 31/31 assertion |
| 2026-10-15 | ตาม UI Prototype (9 วิชา) แก้ request 01, 02, 03, 05, 10, 16–19 ตามข้อมูลใหม่ และเพิ่ม assertion ตรวจ MA211 Sec 020001 ห้อง SC-3015 | **ผ่าน 32/32 assertion** |

## การจับคู่ข้อมูลกับ UAT (US1-T16)

ตอนรัน UAT ใช้รหัสวิชาสมมติ (CS101, CS102, TU100 ฯลฯ) ที่ไม่มีใน seed Postman จึงใช้วิชาใน seed ที่มีเงื่อนไขเดียวกันแทน (2026-10-17 แก้ UAT ให้ใช้ข้อมูลตาม seed แล้ว ตารางนี้จึงเหลือไว้เป็นประวัติ)

| UAT | ข้อมูลใน UAT | ใช้ใน Postman |
| --- | --- | --- |
| TC3, TC4 | CS101 อ./พฤ. 09:30–11:00 และ CS102 อ./พฤ. 11:00–12:30 (ต่อกันพอดี) | MA211 อ./พฤ. 09:30–11:00 และ CS111 อ./พฤ. 11:00–12:30 |
| TC5 | LAS101 อ. 09:30–12:30 ชนกับ CS101/CS102 | LAS101 กับ TU109 พ. 09:30–12:30 |
| TC6 | 3 วิชาไม่ชนกัน | 7 วิชาตาม UI Prototype ใน request 09–19 |
| TC7 | 7 วิชา 21 หน่วยกิต แล้วเพิ่ม TU109 | 7 วิชา 21 หน่วยกิต แล้วเพิ่ม ST216 |
| TC8 | CS101 Sec 020001 แล้วเพิ่ม 020002 | CS111 Sec 030001 แล้วเพิ่ม 030002 |

## ข้อที่ต้องตัดสิน

**TC5 เวลาชน: UAT กับ Spec ขัดกัน** UAT (US1-T16) คาดว่า "ระบบไม่สามารถเพิ่มรายวิชา LAS101 ลงในตารางเรียนจำลองได้" แต่ [US1-T05 DTO & API Spec](../T05/US1-DTO%20&%20API%20Spec.md) ออกแบบตาม Figma ให้ **เพิ่มได้** ตอบ 201 พร้อม `conflicts` แล้ว UI แสดงแถบเตือน backend ทำตาม Spec จึงผ่านเงื่อนไข "ต้องแจ้งเตือนผู้ใช้" แต่ไม่ผ่าน "ไม่สามารถเพิ่มได้" ของ UAT ทีมต้องเลือกว่าจะแก้ UAT ให้ตรง Spec/Figma หรือเปลี่ยน backend ให้ตอบ 409 เมื่อเวลาชน

> **ตัดสินแล้ว (2026-10-17):** วิชาที่เวลาชนให้เพิ่มได้ตาม Spec และแก้ UAT TC5 ให้ตรงแล้ว request 13 จึงผ่านตาม UAT ด้วย นอกจากนี้ทีมสรุปว่าหน่วยกิตเกินไม่แสดงข้อความแจ้งเตือนบนหน้าเว็บ (API ยังตอบ 409 `CREDIT_LIMIT_EXCEEDED`)

**ชื่อวิชาตัวพิมพ์เล็ก-ใหญ่** seed ใช้ชื่อตาม UI Prototype (เช่น `Object-Oriented Concepts`) แต่ตัวอย่าง JSON ใน DTO & API Spec ยังเป็นตัวพิมพ์ใหญ่ (`OBJECT-ORIENTED CONCEPTS`) ไม่กระทบการทำงาน แต่ควรแก้ตัวอย่างใน Spec ให้ตรงกัน

## ข้อจำกัด

- Postman ทดสอบผ่าน API เท่านั้น ส่วนที่เป็น UI ของ TC1–8 (การแสดงบน grid, แถบเตือน, ป้ายบนการ์ดวิชา) ต้องทดสอบตอนทำ frontend
- ยังไม่ได้ทดสอบผ่าน frontend (`/api/*` ที่ Next.js rewrite ไป backend) และยังไม่เห็นผลบน CI
- ไม่ได้ทดสอบการเพิ่มวิชาแรกพร้อมกัน 2 request (อาจได้ 500 จาก unique constraint แทน 409)
- หน่วยกิตทุกวิชาและชื่ออาจารย์ใน seed เป็นค่าที่ตั้งเอง UI Prototype ไม่ได้ระบุ

**เอกสารที่เกี่ยวข้อง:** [DTO & API Spec](../T05/US1-DTO%20&%20API%20Spec.md) · [Sequence Diagram](../T06/US1-T06-Sequence-Diagram.md) · [US1-T12 DAO Unit Test Result](../T12/US1-T12-DAO-Unit-Test-Result.md) · [US1-T16 UAT](../T16/US1-T16-UAT.md)
