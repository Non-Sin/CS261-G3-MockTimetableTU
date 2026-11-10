# US1-T18 ผลการทดสอบ Integration Test ระหว่าง API กับ DAO

Oct 31, 2026 · @Non

## สรุปผล

| ชุดทดสอบ | ผล |
| --- | --- |
| JUnit IT-API-DAO-01–05 (`TimetableApiDaoIntegrationTest`) | **ผ่าน 5/5** |
| Backend ทั้งหมด (`./mvnw test`) | **ผ่าน 191/191** ใน 32 test class ไม่มี failure/error/skip |

**User story:** US1 ค้นหารายวิชาและเพิ่มลงตารางเรียนจำลอง · branch `test/US1-T18-run-it-api-dao` · test case ตาม [US1-T14 Integration Test Cases (API & DAO)](../T14/US1-T14-design-it-api-dao.md)

## สภาพแวดล้อม

| หัวข้อ | ค่า |
| --- | --- |
| วันที่รัน | 2026-10-31 |
| Commit ฐาน | `af4539e` (เพิ่ม `TimetableApiDaoIntegrationTest` บน main `240db7d`) |
| Backend test | JUnit 5 · Spring Boot 4.1.1 (`@SpringBootTest` + MockMvc) · OpenJDK 21.0.10 · Maven 3.10.0 |
| DB | SQL Server 2025 (`mcr.microsoft.com/mssql/server:2025-latest`, Database version 17.0) สร้างใหม่ทุกครั้งด้วย Testcontainers · Docker 29.8.2 |
| Schema และข้อมูล | Flyway รัน `db/migration` และ `db/seed` ครบ 5 ไฟล์ ใช้รายวิชา 1/2568 จาก `V20261014_2010__seed_courses_2568_1.sql` |
| บัญชีทดสอบ | `6609000099` สร้าง JWT ด้วย `JwtService` จริง ไม่ผ่าน login (ไม่ต้องใช้ TU API) ไม่ใช้บัญชี demo `6609000000` |

## JUnit: IT-API-DAO-01–05

ไฟล์ [`backend/src/test/java/.../timetable/TimetableApiDaoIntegrationTest.java`](../../../backend/src/test/java/th/ac/tu/cs261/group3/backend/timetable/TimetableApiDaoIntegrationTest.java)

ต่างจาก `TimetableControllerTest` (mock `TimetableService`) และ `TimetableServiceTest` (mock repository) ไฟล์นี้ไม่ mock อะไรเลย request วิ่งครบทาง security filter (JWT) → `TimetableController` → `TimetableService` → `SectionRepository` / `TimetableRepository` / `TimetableEntryRepository` → SQL Server

- ไม่ใส่ `@Transactional` ที่ test ให้ service commit จริง แล้วนับแถวใน `timetable` และ `timetable_entry` ด้วย `JdbcTemplate` ก่อนและหลังยิง request
- ไม่ใส่ `sectionId` ตายตัว หาจาก `course_code` + `section_no` ของ 2568/1 เพราะ `section_id` เป็น IDENTITY
- เตรียม pre-condition (วิชาที่มีอยู่ในตารางแล้ว) ผ่าน `POST /api/timetable/entries` เดียวกันและตรวจว่าได้ `201` ก่อน
- ลบตารางของ `6609000099` ทั้งก่อนและหลังทุกเคส (`timetable_entry` ลบตามด้วย `ON DELETE CASCADE`) ลำดับการรันเคสจึงไม่มีผล
- ผลรันอยู่ใน [`US1-T18-mvnw-cli.txt`](./US1-T18-mvnw-cli.txt)

```bash
# ต้องเปิด Docker ไว้ ไม่ต้อง docker compose up
cd backend
./mvnw test -Dtest=TimetableApiDaoIntegrationTest
```

| ID | Pre-condition | Request | สิ่งที่ตรวจ | ผล |
| --- | --- | --- | --- | --- |
| IT-API-DAO-01 | ยังไม่มีตาราง 2568/1 (`timetable` 0 แถว) | POST CS111 030001 | `201` · `academicYear: 2568`, `semester: 1` · `entries` 1 รายการคือ CS111 030001 · `totalCredits: 3` · `conflicts: []` · `updatedAt` ไม่ว่าง · DB: `timetable` 1 แถว, `timetable_entry` 1 แถว และ `section_id` ตรงกับที่ส่งไป | PASS |
| IT-API-DAO-02 | มี CS111 030001 | POST CS111 030002 | `409` · `code: COURSE_ALREADY_IN_TIMETABLE`, `courseCode: "CS111"`, `existingSectionNo: "030001"` · DB: `timetable_entry` ไม่เพิ่ม, `timetable` ยัง 1 แถว | PASS |
| IT-API-DAO-03 | มี CS180, MA211, CS111, LAS101, TU101, TU106, TU109 (7 วิชา 21 หน่วยกิต) | POST ST216 040001 | `409` · `code: CREDIT_LIMIT_EXCEEDED`, `currentCredits: 21`, `courseCredits: 3`, `maxCredits: 22` · DB: `timetable_entry` ยัง 7 แถว | PASS |
| IT-API-DAO-04 | มี LAS101 780004 (พุธ 09:30–12:30) | POST TU109 780001 (พุธ 09:30–12:30) | `201` · `entries` 2 รายการ · `conflicts` 1 รายการ `dayOfWeek: WEDNESDAY`, `overlapStart: "09:30"`, `overlapEnd: "12:30"`, `courseCodes: ["LAS101", "TU109"]` · DB: `timetable_entry` +1 แถว | PASS |
| IT-API-DAO-05 | ยังไม่มีตาราง | POST `sectionId` = `MAX(section_id) + 1000` | `404` ProblemDetail `status: 404`, `detail: "Section not found with id: <id>"` · DB: ไม่มีแถวใหม่ทั้ง `timetable` และ `timetable_entry` | PASS |

```
[INFO] Running th.ac.tu.cs261.group3.backend.timetable.TimetableApiDaoIntegrationTest
[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 21.41 s -- in th.ac.tu.cs261.group3.backend.timetable.TimetableApiDaoIntegrationTest
[INFO]
[INFO] Results:
[INFO]
[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0
[INFO]
[INFO] BUILD SUCCESS
```

> เวลา 21 วินาทีส่วนใหญ่เป็นการเปิด SQL Server container และ Spring context ตัวเทสต์เองใช้ 0.05–1.0 วินาทีต่อเคส

## การจับคู่กับ US1-T14 และ UAT (US1-T16)

| Integration Test Case | UAT | ทดสอบด้วย | ผล |
| --- | --- | --- | --- |
| IT-API-DAO-01 | Test case ที่ 2 | JUnit | PASS |
| IT-API-DAO-02 | Test case ที่ 8 | JUnit | PASS |
| IT-API-DAO-03 | Test case ที่ 7 | JUnit | PASS |
| IT-API-DAO-04 | Test case ที่ 5 | JUnit | PASS |
| IT-API-DAO-05 | - | JUnit | PASS |

## ข้อสังเกต

**ลำดับ "วิชาซ้ำก่อนหน่วยกิต" ยืนยันจาก IT-API-DAO-02 ตอนหน่วยกิตยังไม่เต็มเท่านั้น** เคสที่ตารางมี 21 หน่วยกิตแล้วเพิ่มวิชาซ้ำ (ต้องได้ `COURSE_ALREADY_IN_TIMETABLE` ไม่ใช่ `CREDIT_LIMIT_EXCEEDED`) ไม่อยู่ในเอกสาร T14 แต่ทดสอบแล้วผ่าน API จริงใน [US1-T17 IT-18](../T17/US1-T17-Test-Result.md) และใน `TimetableServiceTest`

**IT-API-DAO-05 ตรวจ "ไม่ติดต่อ DAO ส่วนอื่น" จากผลใน DB** เอกสาร T14 ระบุว่าเมื่อไม่พบ section จะไม่เรียก DAO ตัวอื่นต่อ test นี้ใช้ repository จริงจึงนับการเรียกไม่ได้ ตรวจได้แค่ว่าไม่มีแถวใหม่ใน `timetable` และ `timetable_entry` ส่วนการไม่เรียก `save` ตรวจแบบ mock อยู่ใน `TimetableServiceTest`

## ข้อจำกัด

- ไม่ผ่าน login จริง ใช้ JWT ที่สร้างจาก `JwtService` ตัวเดียวกับที่ backend ใช้ จึงยืนยันว่า token ผ่าน `JwtAuthenticationFilter` และ studentId ไปถึง service ได้ แต่ไม่ได้ทดสอบ `POST /api/auth/login` (อยู่ใน US3)
- DB เป็น SQL Server ใน container ที่สร้างใหม่ทุกครั้ง ไม่ใช่ DB ของ `docker compose` ข้อมูลใน DB ที่ใช้พัฒนาจึงไม่มีผลต่อผลทดสอบ
- ต้องเปิด Docker ไว้ก่อนรัน ถ้าไม่เปิด Testcontainers จะเปิด container ไม่ได้และเทสต์ทั้ง class จะ error
