# US6-T18 ผลการทดสอบ Integration Test ระหว่าง API กับ DAO

Nov 17, 2026 @Elle

## สรุปผล

| ชุดทดสอบ | ผล |
| --- | --- |
| JUnit IT-API-DAO-US6-01–09 (`ElectiveApiDaoIntegrationTest`) | **ผ่าน 9/9** (0 failures, 0 errors, 0 skipped) |
| Backend ทั้งหมด (`./mvnw test -Dtest='!BackendApplicationTests'`) | **ผ่าน 542/543** ในการรันรวม (ติด timeout เปิด container ใน `QuotaMigrationTest` 1 คลาส) และรัน `QuotaMigrationTest` เดี่ยว **ผ่าน 2/2** — รวมครบ **544/544** ใน 61 test class |
| Frontend lint & type check (`npm run lint && npx tsc --noEmit`) | **ผ่าน 0 errors** |
| Bug ที่พบ | **ไม่พบ bug** (ไม่ต้องเปิดการ์ด fix) |

**User story:** US6 ดูวิชาเสรีแนะนำ · branch `test/US6-T18-run-it-api-dao` · test case ตาม [US6-T14 Design Integration Test Cases (API to DAO)](../T14/US6-T14-design-it-api-dao.md) · อ้างอิงผลเชื่อมต่อใน [US6-T10](../T10/US6-T10-Integration-Result.md) (`#118`)

## สภาพแวดล้อม

| หัวข้อ | ค่า |
| --- | --- |
| วันที่รัน | 2026-11-17 |
| Commit ฐาน | `aea7b98` (`develop`, รวม `US6-T10` #118 และ `US6-T14` #107 แล้ว) |
| Backend test | JUnit 6.0.3 (JUnit Platform) · Spring Boot 4.1.1 (`@SpringBootTest` + `MockMvc`) · Java 25.0.1 (compile release 21) |
| DB | SQL Server 2025 (`mcr.microsoft.com/mssql/server:2025-latest`, Database version 17.0, JDBC Driver 13.4) สร้างใหม่ด้วย Testcontainers 2.0.5 · Docker Desktop 29.9.1 |
| Schema และข้อมูล | Flyway 12.4.0 รัน `db/migration` และ `db/seed` ครบ 12 ไฟล์ (ถึง `v20261117.1812`) รวม `V20261116_1724__create_elective_tables.sql` และ `V20261116_1734__seed_electives.sql` (18 วิชาเสรีแนะนำ) + `V20261014_2010__seed_courses_2568_1.sql` |
| บัญชีทดสอบ | `6609000095` สร้าง JWT ด้วย `JwtService` จริง (แยกจาก demo `6609000000`, US1 `6609000099` และ US2 `6609000097`/`6609000098`) |

## JUnit: IT-API-DAO-US6-01–09

ไฟล์ [`backend/src/test/java/.../elective/ElectiveApiDaoIntegrationTest.java`](../../../backend/src/test/java/th/ac/tu/cs261/group3/backend/elective/ElectiveApiDaoIntegrationTest.java)

ต่างจาก `ElectiveControllerTest` (mock `ElectiveService`), `ElectiveServiceTest` (mock repository และ `TimetableService`) และ `ElectiveRepositoryTest` (`@DaoTest` ไม่มี HTTP/API layer) ไฟล์นี้ไม่ mock อะไรเลย คำขอวิ่งครบทุกชั้นตั้งแต่ Security Filter (`JwtAuthenticationFilter`) → `ElectiveController` / `TimetableController` → `ElectiveService` / `TimetableService` → `ElectiveRepository` / `SectionRepository` / `TimetableRepository` / `TimetableEntryRepository` → SQL Server จริง

- ไม่ใส่ `@Transactional` ที่คลาสทดสอบ เพื่อให้ transaction ของ Service layer commit/rollback จริงใน SQL Server และใช้ `JdbcTemplate` ตรวจสอบแถวใน `timetable` และ `timetable_entry` โดยตรง
- ลบตารางเรียนของบัญชีทดสอบ `6609000095` ทั้งใน `@BeforeEach` และ `@AfterEach` (`ON DELETE CASCADE` ลบ `timetable_entry` ตามไปด้วย) ลำดับการรันแต่ละเคสจึงเป็นอิสระต่อกัน
- อ่าน `section_id` จากตาราง `section` ในฐานข้อมูลจริงตาม `course_code` + `section_no` + `2568/1` แทนการ hard-code เพราะ `section_id` เป็น `IDENTITY`
- ผลรัน CLI อยู่ใน [`US6-T18-mvnw-cli.txt`](./US6-T18-mvnw-cli.txt)

```bash
# ต้องเปิด Docker Desktop ไว้ (ไม่ต้อง docker compose up)
cd backend
./mvnw test -Dtest=ElectiveApiDaoIntegrationTest
```

| ID | Pre-condition | Request | สิ่งที่ตรวจ | ผล |
| --- | --- | --- | --- | --- |
| `IT-API-DAO-US6-01` | มีข้อมูล seed วิชาเสรี 18 วิชาใน SQL Server | `GET /api/electives?academicYear=2568&currentSemester=1&q=FR205&group=LANGUAGE` (+ ตรวจรายการเต็ม, ค้นภาษาไทย `ฝรั่งเศส`, กรอง `semester=1&day=TUESDAY&timeSlot=EVENING`) | `200 OK` · คืนเฉพาะ `FR205` (`group: "LANGUAGE"`, `requiresQuota: true`, `offeredSemesters: [1]`, `tags: ["KIND_INSTRUCTOR", "NO_PREREQUISITE"]`) · ไม่กรองได้ครบ 18 วิชาและไม่มี `JP171` | **PASS** |
| `IT-API-DAO-US6-02` | ตาราง `1/2568` มี `CS180` (`820001` จันทร์ 13:30–16:30) จากนั้นเพิ่ม `FR205` (`260001`) และ `FD216` (`810002` จันทร์ 09:30–12:30) | `GET /api/electives?academicYear=2568&currentSemester=1&excludeConflicts=true` | `200 OK` · รอบแรกเหลือ 14 วิชา ตัด `PY250` (ชน `CS180` ในภาค 1 แม้มี Sec ภาค 2) และวิชาที่เปิดเฉพาะภาค 2 (`AN242`, `AN347`, `PC280`) · รอบสองเหลือ 10 วิชา ตัด `FR205` (อยู่ในตารางแล้ว), `FD216`, `PY200`, `RE468` ออก | **PASS** |
| `IT-API-DAO-US6-03` | ไม่มีวิชา `SA240` ในฐานข้อมูล (`JP171` ไม่มีข้อมูลแนะนำ และไม่มีวิชาเรียนวันอาทิตย์) | `GET /api/electives?academicYear=2568&currentSemester=1&q=SA240` (+ `q=JP171`, `day=SUNDAY`) | `200 OK` · Response Body เป็น JSON array ว่าง `[]` ทุกกรณี | **PASS** |
| `IT-API-DAO-US6-04` | มี `FR205` และ `PY250` พร้อม `elective_info`, `tags`, `elective_review_point`, `sections`; ทดสอบต่อเมื่อมี `CS180` + `FR205` (`260001`) ในตาราง | `GET /api/electives/FR205?academicYear=2568&currentSemester=1` และ `GET /api/electives/PY250?...` | `200 OK` · `FR205` มี 2 Sec (`260001`, `260002`), `tags` 2 รายการ, `description` 4 bullet เรียงตาม `sort_order` · จาก Hibernate SQL query ทำงานแบบ batch ไม่มี N+1 query · `PY250` มี 2 Sec ทั้งปี (`820001` `selectable: true`, `conflictWith: ["CS180"]`; `230001` `selectable: false`, `conflictWith: []`, `room: null`) · `FR205` หลังเพิ่มแสดง `inTimetable: true` เฉพาะ `260001` | **PASS** |
| `IT-API-DAO-US6-05` | ยังไม่มีตาราง `1/2568`; ทดสอบเพิ่มวิชาชนเวลา (`FD216` + `RE468` จันทร์ 09:30–12:30) | `POST /api/timetable/entries` ส่ง `sectionId` ของ `FR205` (`260001`) และคู่ `FD216`/`RE468` | `201 Created` · `entries` มี `FR205` `260001`, `totalCredits: 3`, `conflicts: []` · ตรวจ DB พบ `timetable` 1 แถว และ `timetable_entry` 1 แถวผูก `section_id` ถูกต้อง · คู่ชนเวลาได้ `201 Created` พร้อม `conflicts` และเพิ่มแถวใน `timetable_entry` เป็น 3 แถว | **PASS** |
| `IT-API-DAO-US6-06` | (ก) มี `FR205` (`260001`) แล้ว (ข) มี 7 วิชา = 21 หน่วยกิตในตาราง `1/2568` | `POST /api/timetable/entries` ด้วย (ก) `FR205` (`260002`) และ (ข) `FR205` (`260001`) | (ก) `409 Conflict` `code: "COURSE_ALREADY_IN_TIMETABLE"`, `existingSectionNo: "260001"` (ข) `409 Conflict` `code: "CREDIT_LIMIT_EXCEEDED"`, `currentCredits: 21`, `courseCredits: 3`, `maxCredits: 22` · ทั้งสองกรณีจำนวนแถว `timetable_entry` ใน DB ไม่เพิ่ม | **PASS** |
| `IT-API-DAO-US6-07` | `SA240` ไม่มีใน DB, `JP171` เป็น `FREE_ELECTIVE` ที่ไม่มี `elective_info`, `CS111` เป็น `MAJOR` | `GET /api/electives/SA240`, `JP171`, `CS111` (`?academicYear=2568&currentSemester=1`) | `404 Not Found` (`application/problem+json`, `status: 404`) ทุกกรณี | **PASS** |
| `IT-API-DAO-US6-08` | ระบบปกติ | `GET /api/electives` ด้วย `currentSemester=3`, `semester=3`, `group=INVALID`, ขาด `academicYear`, `academicYear=abc` และ `GET /api/electives/FR205?...&currentSemester=3` | `400 Bad Request` (`status: 400`, ไม่เกิด 500) ทุกกรณี | **PASS** |
| `IT-API-DAO-US6-09` | ไม่มี Token หรือ Token ไม่ถูกต้อง | `GET /api/electives?...` (ไม่ส่ง Header / `Bearer invalid.jwt.token`) และ `GET /api/electives/FR205?...` (ไม่ส่ง Header) | `401 Unauthorized` (`application/problem+json`, `status: 401`) ถูกบล็อกตั้งแต่ `SecurityConfig` | **PASS** |

```
[INFO] Running th.ac.tu.cs261.group3.backend.elective.ElectiveApiDaoIntegrationTest
[INFO] Tests run: 9, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 39.40 s -- in th.ac.tu.cs261.group3.backend.elective.ElectiveApiDaoIntegrationTest
[INFO]
[INFO] Results:
[INFO]
[INFO] Tests run: 9, Failures: 0, Errors: 0, Skipped: 0
[INFO]
[INFO] BUILD SUCCESS
```

## ส่วนที่ปรับจาก US6-T14 และข้อสังเกต

| หัวข้อ | ในเอกสาร US6-T14 | ที่ทดสอบจริงและข้อสังเกต |
| --- | --- | --- |
| บัญชีทดสอบ | จำลองผ่าน `CurrentStudentProvider` | ใช้ `JwtService` สร้าง JWT จริงให้ `6609000095` เพื่อทดสอบผ่าน `JwtAuthenticationFilter` → `SecurityContextStudentProvider` ด้วย |
| `sectionId` ในเคส 05–06 | ตัวอย่าง `101`, `102` | `section_id` เป็น `IDENTITY` จึง query จากตาราง `section` ด้วย `FR205` (`260001`, `260002`) ใน `2568/1` |
| `@Transactional` | ระบุ `@Transactional` ในขอบเขต | ไม่ใส่ `@Transactional` ที่คลาสทดสอบ (แนวทางเดียวกับ US1-T18 / US2-T18) เพื่อให้ commit/rollback เกิดขึ้นจริงและตรวจสอบ DB ด้วย `JdbcTemplate` ได้ |
| `ScheduleOverlap` ในเคส 02 | ระบุการกรองผ่าน `ScheduleOverlap` | `ElectiveService` ยังใช้ method private `conflictWith` / `overlaps` ชั่วคราวตามหมายเหตุในโค้ด (สูตรเวลาชนตรงกับ `ScheduleOverlap` ทุกประการ) พฤติกรรมผ่านครบทุกเงื่อนไข |
| N+1 Query ในเคส 04 | ไม่มี N+1 Query | ตรวจสอบจาก Hibernate SQL log ใน `GET /api/electives/FR205` ยืนยันว่ายิง 4 query แบบ batch (`elective_info`+`tags`, `timetable`, `section`+`slots`, `elective_review_point`) |
| `QuotaMigrationTest` ในการรันรวม | — | ระหว่างรันทั้งโปรเจกต์พร้อมกันบน Docker Desktop (ARM64 emulation) `QuotaMigrationTest` เกิด timeout เปิด container ชั่วคราว เมื่อรันเดี่ยวผ่าน 2/2 ปกติ |

## ข้อจำกัด

- ไม่ได้ทดสอบ `POST /api/auth/login` ในชุดนี้ ใช้ JWT ที่ออกโดย `JwtService` เดียวกันกับ backend (การทดสอบ login อยู่ใน US3)
- ไม่ได้รัน `BackendApplicationTests` เพราะต่อกับ `appdb` ของ `docker compose` ภายนอก (การเปิด Spring context + Flyway + Hibernate `validate` ถูกครอบคลุมด้วย Testcontainers SQL Server 2025 แล้ว)
- ต้องเปิด Docker Desktop ไว้ก่อนรัน Testcontainers
