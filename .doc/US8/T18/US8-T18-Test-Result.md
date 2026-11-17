# US8-T18 ผลการทดสอบ Integration Test ระหว่าง API กับ DAO

17 พ.ย. 2569 · WJ (jvongsakorn)

## สรุปผล

| ชุดทดสอบ | ผล |
| --- | --- |
| JUnit IT-API-DAO-US8-01–28 (`StudyPlanApiDaoIntegrationTest`) | **ผ่าน 28/28** |
| Backend ทั้งหมด (`./mvnw test` ยกเว้น `BackendApplicationTests`) | **ผ่าน 563/563** ใน 60 test class ไม่มี failure/error/skip |

**User story:** US8 จัดตารางเรียนจำลองตามแผนในเล่มหลักสูตร · branch `test/US8-T18-run-it-api-dao` · test case ตาม [US8-T14 Integration Test Cases (API & DAO)](../T14/US8-T14-design-it-api-dao.md)

ไม่พบ bug ในเส้นทาง API ↔ DAO ของ US8

## สภาพแวดล้อม

| หัวข้อ | ค่า |
| --- | --- |
| วันที่รัน | 2026-11-17 |
| Commit ฐาน | `develop` `aea7b98` + เพิ่ม `StudyPlanApiDaoIntegrationTest` |
| Backend test | JUnit 5 · Spring Boot 4.1.1 (`@SpringBootTest` + MockMvc) · Java 21.0.9 · Maven 3.10.0 |
| DB | SQL Server 2025 (`mcr.microsoft.com/mssql/server:2025-latest`) สร้างใหม่ทุกครั้งด้วย Testcontainers · Docker 28.5.1 |
| Schema และข้อมูล | Flyway รัน **เฉพาะ `db/migration`** (`spring.flyway.locations=classpath:db/migration`) ไม่โหลด seed ข้อมูลทดสอบสร้างเองตามหัวข้อ 2 ของ T14 |
| บัญชีทดสอบ | S1 `6609000801`, S2 `6609000802` (มีแถวใน `users` สาขา `ภาควิชาวิทยาการคอมพิวเตอร์` ภาคปกติ) และ S3 `6609000803` (มีแค่ token) สร้าง JWT ด้วย `JwtService` จริง ไม่ผ่าน login |

## JUnit: IT-API-DAO-US8-01–28

ไฟล์ [`backend/src/test/java/.../studyplan/StudyPlanApiDaoIntegrationTest.java`](../../../backend/src/test/java/th/ac/tu/cs261/group3/backend/studyplan/StudyPlanApiDaoIntegrationTest.java)

ต่างจาก unit test ของ US8-T08 (mock service / repository) และ DAO test ของ US8-T09 (rollback ทุกเคส ไม่มี HTTP) ไฟล์นี้ไม่ mock อะไรเลยยกเว้น IT-16 request วิ่งครบทาง security filter (JWT) → `StudyPlanController` / `ApplyPlanController` → `StudyPlanService` / `ApplyPlanService` → `PlanScheduler` และ repository → SQL Server

- ไม่ใส่ `@Transactional` ที่ test ให้ service commit จริง แล้วอ่าน `timetable` / `timetable_entry` ด้วย `JdbcTemplate` ก่อนและหลังยิง request
- ข้อมูลทดสอบ (รายวิชา `T8...` 18 วิชา, แผน 7 แผน, วิชาโท 3 วิชาโท, นักศึกษา S1, S2) สร้างครั้งเดียวต่อคลาสใน `@BeforeAll` และลบทิ้งใน `@AfterAll` ไม่ทิ้งข้อมูลไว้ให้คลาสอื่น
- ลบตารางของ S1–S3 ทั้งก่อนและหลังทุกเคส ลำดับการรันเคสจึงไม่มีผล
- ตารางเดิมของเคสที่มี pre-condition ตั้ง `updated_at = 2000-01-01T00:00:00+07:00` (OLD) เพื่อตรวจว่าเขียน DB หรือไม่
- `section_id`, `plan_id`, `minor_id` เป็น IDENTITY เก็บค่าจาก `OUTPUT INSERTED` ไม่ hard-code
- IT-16 ใช้ `@MockitoSpyBean TimetableEntryRepository` ให้ `saveAll` โยน exception เฉพาะเคสนั้น แล้ว reset ทุกเคส
- ผลรันอยู่ใน [`US8-T18-mvnw-cli.txt`](./US8-T18-mvnw-cli.txt)

```bash
# ต้องเปิด Docker ไว้ ไม่ต้อง docker compose up
cd backend
./mvnw test -Dtest=StudyPlanApiDaoIntegrationTest
```

### ดูแผนการเรียน (`GET /api/study-plans`)

| ID | Pre-condition | Request | สิ่งที่ตรวจ | ผล |
| --- | --- | --- | --- | --- |
| 01 | ข้อมูลตาม T14 | S1 `studyYear=2&semester=1` | `200` · department / studyYear / semester · `plans` = P-BASIC แล้ว P-SECOND `planType` null · courses T8M01, T8M02, T8M04, T8G02 · `totalCredits` 12 · `minors: []` · DB ไม่มีตาราง | PASS |
| 02 | เหมือน 01 (insert P-COOP ก่อน P-CONFLICT) | S1 `studyYear=3&semester=1` | `plans` = P-CONFLICT (`SPECIAL_PROJECT`) แล้ว P-COOP (`CO_OP`) · `minors` = MN-1 แล้ว MN-OTHER ไม่มี MN-2 · MN-1 courses T8N01, T8N02, T8M05 `totalCredits` 10 | PASS |
| 03 | เหมือน 01 | S1 `studyYear=1&semester=2` | `200` `plans: []`, `minors: []` | PASS |
| 04 | เหมือน 01 | ไม่ส่ง studyYear / `studyYear=0` / `5` / `semester=3` / `studyYear=abc` | `400` ProblemDetail ทั้ง 5 แบบ | PASS |
| 05 | S3 ไม่มีแถวใน `users` | S3 `studyYear=2&semester=1` | `404` ProblemDetail | PASS |
| 06 | - | ไม่ส่ง token | `401` ProblemDetail | PASS |

### ดูสรุปก่อนยืนยัน (`dryRun: true`)

| ID | Pre-condition | Request | สิ่งที่ตรวจ | ผล |
| --- | --- | --- | --- | --- |
| 07 | S1 ไม่มีตาราง | P-BASIC | `dryRun: true`, `minorId` null · added T8M01 010001, T8M02 010001, T8M04 010001, T8G02 **780001** (`sectionId` ตรง DB, `PLAN` ทุกวิชา) · `skipped: []` · `timetable: null` · DB ไม่มีแถว `timetable` / `timetable_entry` | PASS |
| 08 | S1 มี T8M02 (OLD) | P-BASIC | added T8M01, T8M04, T8G02 · skipped T8M02 `COURSE_ALREADY_IN_TIMETABLE` `existingSectionNo` 010001 · `timetable: null` · DB entry 1 แถว `updated_at` = OLD | PASS |
| 09 | S1 ไม่มีตาราง | P-CONFLICT | added [T8M03] · skipped T8G01 `TIME_CONFLICT` `conflictWith` [T8M03], T8X01 `NO_SECTION_AVAILABLE` ทั้งคู่มี `message` · DB ไม่มีแถว | PASS |

### ยืนยันจัดตาราง (`dryRun: false`)

| ID | Pre-condition | Request | สิ่งที่ตรวจ | ผล |
| --- | --- | --- | --- | --- |
| 10 | S1 ไม่มีตาราง | P-BASIC preview แล้วยืนยัน | `sectionId` ของ added ตรงกับ preview · `timetable.entries` 4, `totalCredits` 12, `conflicts: []` (T8M01 กับ T8M04 คาบต่อกันพอดีไม่ชน), `updatedAt` ไม่ว่าง · DB `timetable` 1 แถว `timetable_entry` 4 แถวตรงกับ added | PASS |
| 11 | S1 มี T8M02 (OLD) | P-BASIC | added 3 · skipped T8M02 · entries 4 · DB `timetable` ยัง 1 แถว T8M02 แถวเดียว `updated_at` ใหม่กว่า OLD | PASS |
| 12 | S1 มี T8G01 (OLD) | P-CONFLICT | `added: []` · skipped T8M03 `TIME_CONFLICT` [T8G01], T8G01 `COURSE_ALREADY_IN_TIMETABLE`, T8X01 `NO_SECTION_AVAILABLE` · entries มีแค่ T8G01 · DB ไม่เขียน `updated_at` = OLD | PASS |
| 13 | S1 ไม่มีตาราง | P-BACKTRACK | added T8A01 **010002** และ T8B01 010001 `skipped: []` · DB 2 แถวตรงกัน (greedy จะได้ T8A01 010001 แล้วข้าม T8B01) | PASS |
| 14 | S1 มี T8F01–F05 (15 หน่วยกิต) | P-CREDIT | added T8M01, T8M02 · skipped T8G02 `CREDIT_LIMIT_EXCEEDED` `currentCredits` 21 `maxCredits` 22 · `totalCredits` 21 · DB 7 แถว หน่วยกิตรวม 21 | PASS |
| 15 | S1 ไม่มีตาราง | P-BASIC preview → `POST /api/timetable/entries` T8M01 → ยืนยัน | ยืนยันได้ T8M01 ใน skipped `COURSE_ALREADY_IN_TIMETABLE` (preview อยู่ใน added) · added 3 · DB 4 แถว T8M01 แถวเดียว | PASS |
| 16 | `saveAll` โยน exception | P-BASIC ยืนยัน (มีตาราง T8M02 OLD และไม่มีตาราง) | `500` ProblemDetail ทั้งสองแบบ · มีตาราง: entry ยังแค่ T8M02 `updated_at` = OLD (`touch()` rollback) · ไม่มีตาราง: ไม่มีแถว `timetable` ค้าง | PASS |
| 17 | S2 มี T8M01 (OLD) · S1 ไม่มีตาราง | S1 P-BASIC | T8M01 อยู่ใน added ของ S1 · S1 4 แถว · S2 ยัง T8M01 แถวเดียว `updated_at` = OLD | PASS |
| 18 | S1 ไม่มีตาราง 2569/1 | P-BASIC `academicYear: 2569` | `added: []` skipped 4 วิชา `NO_SECTION_AVAILABLE` · `timetable.entries: []` `updatedAt` null · DB ไม่มีตาราง 2569 | PASS |
| 19 | S1 ไม่มีตาราง | P-BASIC ไม่ส่ง `dryRun` | `dryRun: false` · `timetable` ไม่ว่าง · DB 4 แถว | PASS |

### แผนชั้นปีที่ 3–4 และวิชาโท

| ID | Pre-condition | Request | สิ่งที่ตรวจ | ผล |
| --- | --- | --- | --- | --- |
| 20 | S1 ไม่มีตาราง | P-COOP ไม่ส่ง `minorId` | `minorId` null · added T8M05, T8C01 (`PLAN`) · `conflicts: []` (T8C01 ไม่มีคาบ) · DB 2 แถว | PASS |
| 21 | S1 ไม่มีตาราง | P-COOP + MN-1 preview | `minorId` = MN-1 · added T8M05 `PLAN`, T8C01 `PLAN`, T8N01 990001 `MINOR` (T8M05 ครั้งเดียว) · skipped T8N02 `TIME_CONFLICT` `MINOR` [T8M05] · DB ไม่มีแถว | PASS |
| 22 | S1 ไม่มีตาราง | P-COOP + MN-1 ยืนยัน | added / skipped เหมือน 21 · entries 3 · DB 3 แถว T8M05, T8C01, T8N01 | PASS |
| 23 | S1 มี T8F01–F05 (15 หน่วยกิต) | P-COOP + MN-1 ยืนยัน | added T8M05, T8C01 (`PLAN`) · skipped T8N01 `CREDIT_LIMIT_EXCEEDED` `MINOR` `currentCredits` 21, T8N02 `TIME_CONFLICT` · DB 7 แถว หน่วยกิต 21 | PASS |
| 24 | S1 ไม่มีตาราง | P-COOP + MN-2 ยืนยัน | `minorId` = MN-2 · added T8M05, T8C01 ไม่มี `MINOR` · DB 2 แถว | PASS |
| 25 | S1 มี T8M02 (OLD) | (ก) P-COOP + minor ไม่มีอยู่ (ข) P-COOP + MN-OTHER (ค) P-BASIC + minor ไม่มีอยู่ | `404` · `400 MINOR_PLAN_MISMATCH` · `400 MINOR_NOT_ALLOWED` (ตรวจชั้นปีก่อนหาวิชาโท) · DB entry 1 แถว OLD | PASS |

### ข้อผิดพลาดของ request

| ID | Pre-condition | Request | สิ่งที่ตรวจ | ผล |
| --- | --- | --- | --- | --- |
| 26 | S1 มี T8M02 (OLD) | `planId` = `MAX(plan_id) + 1000` ทั้ง preview และยืนยัน | `404` ProblemDetail ทั้งสองครั้ง · DB ไม่เปลี่ยน | PASS |
| 27 | เหมือน 26 | body ไม่มี `planId` / ไม่มี `academicYear` | `400` ProblemDetail ทั้งสองแบบ · DB ไม่เปลี่ยน | PASS |
| 28 | - | P-BASIC ยืนยันไม่ส่ง token | `401` ProblemDetail · ไม่มีแถว `timetable` | PASS |

```
[INFO] Running th.ac.tu.cs261.group3.backend.studyplan.StudyPlanApiDaoIntegrationTest
[INFO] Tests run: 28, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 24.49 s -- in th.ac.tu.cs261.group3.backend.studyplan.StudyPlanApiDaoIntegrationTest
[INFO]
[INFO] Results:
[INFO]
[INFO] Tests run: 28, Failures: 0, Errors: 0, Skipped: 0
[INFO]
[INFO] BUILD SUCCESS
```

> เวลาส่วนใหญ่เป็นการเปิด SQL Server container และ Spring context `BackendApplicationTests` ไม่ได้รันเพราะต่อ `appdb` ในเครื่องจริง (แบบเดียวกับ PR อื่นของทีม)

## สิ่งที่ปรับจาก US8-T14

- `study_minor_course` มีคอลัมน์ `plan_type` (NOT NULL) ที่เพิ่มหลังเขียน T14 และ API ส่ง `minors` 1 รายการต่อ 1 วิชาโท × 1 แผน วิชาของ MN-1, MN-2, MN-OTHER จึงใส่เป็นของแผนสหกิจ (`CO_OP`) ซึ่งเป็นแผนที่ใช้คู่กับวิชาโทใน IT-21 ถึง 25 ผลที่คาดหวังใน T14 ไม่เปลี่ยน
- แผนเรียงตามชื่อหลักสูตรแล้วตาม `planType` (`SPECIAL_PROJECT` → `CO_OP`) ในโค้ด Java ตามข้อเสนอข้อ 4 ของ T14 IT-02 ยืนยันแล้ว
- ลำดับใน `added` ไม่ได้กำหนดใน T14 (ยกเว้น IT-09) จึงตรวจแบบไม่สนลำดับ

## ข้อจำกัด

- ไม่ผ่าน login จริง ใช้ JWT ที่สร้างจาก `JwtService` ตัวเดียวกับที่ backend ใช้
- DB เป็น SQL Server ใน container ที่สร้างใหม่ทุกครั้ง ไม่ใช่ DB ของ `docker compose`
- ต้องเปิด Docker ไว้ก่อนรัน
