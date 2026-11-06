# US8-T14: Integration Test Cases ระหว่าง API กับ DAO: จัดตารางเรียนตามแผนการเรียน

| รายการ | รายละเอียด |
| --- | --- |
| User Story | US8: จัดตารางเรียนจำลองตามแผนในเล่มหลักสูตร (Priority: High, Estimate: 8 points) |
| Task | US8-T14 Design Integration Test ระหว่าง API กับ DAO |
| Branch | `docs/US8-T14-design-it-api-dao` |
| ขอบเขต | ทุก endpoint ของ US8 ที่แตะฐานข้อมูล: `GET /api/study-plans` และ `POST /api/timetable/apply-plan` ทั้งแบบ `dryRun: true` (Preview) และ `dryRun: false` (Confirm) ตรวจทั้ง response ของ API และแถวใน `timetable` / `timetable_entry` |
| อ้างอิง | DTO & API Spec, API Class Diagram (US8-T05 · PR #83) และ Sequence Diagram ทั้ง 3 ไฟล์, DAO Class Diagram, ER Diagram (US8-T06 · PR #84) |
| ต่อจาก | [US1-T14](../../US1/T14/US1-T14-design-it-api-dao.md) และ US3-T14 (PR #77) (วิธีเดียวกัน) |
| ใช้ใน | US8-T18 Run Integration Test ระหว่าง API กับ DAO |

ฉบับร่าง เขียนจาก US8-T05 (#83) และ US8-T06 (#84) ที่ยังรอรีวิว ถ้าสองเอกสารนั้นเปลี่ยน ต้องแก้เคสที่เกี่ยวข้องตาม คอลัมน์ "CoS" ใช้เลข Conditions of Satisfaction ของการ์ด US8 (1 = เพิ่มวิชาที่ยังไม่ผ่าน, 3 = ไม่เพิ่มซ้ำ, 4 = เวลาชน) ส่วน "T04" คือกรณีที่การ์ด US8-T04 ให้ครอบคลุมเพิ่ม (ไม่มี section เปิด, หน่วยกิตเกิน)

---

## 1. แนวทางและสภาพแวดล้อม (Test Approach)

ทดสอบเส้นทางเต็มตาม Sequence Diagram ของ T06 คือ security filter → `StudyPlanController` / `ApplyPlanController` → `StudyPlanService` / `ApplyPlanService` → `PlanScheduler` และ repository → SQL Server โดยใช้วิธีเดียวกับ US1-T18 และ US2-T18

| รายการ | ข้อกำหนด |
| --- | --- |
| คลาสเทสต์ | `StudyPlanApiDaoIntegrationTest` ใน package `studyplan` |
| Annotation | `@SpringBootTest` + `@AutoConfigureMockMvc` + `@Import(TestcontainersConfig.class)` |
| ฐานข้อมูล | SQL Server `mcr.microsoft.com/mssql/server:2025-latest` ผ่าน Testcontainers สร้างใหม่ทุกครั้งที่รัน Flyway รัน `db/migration` ครบรวมตาราง `study_plan` และ `study_plan_course` ของ US8 |
| สิ่งที่ mock | **ไม่มี** ใช้ bean จริงทั้งหมด ยกเว้นเคส rollback (IT-16) ที่ใช้ `@MockitoSpyBean TimetableEntryRepository` ให้ `saveAll` โยน exception |
| ผู้ใช้ | สร้าง JWT ด้วย `JwtService` จริง ไม่ผ่าน login (ไม่ต้องใช้ TU API) แบบเดียวกับ US1-T18 |
| Transaction | **ไม่ใส่ `@Transactional` ที่ test** ให้ service commit จริง แล้วอ่านแถวใน DB ด้วย `JdbcTemplate` ก่อนและหลังยิง request |
| ข้อมูลทดสอบ | สร้างรายวิชา section คาบเรียน และแผนการเรียนของ test เอง (หัวข้อ 2) **ไม่พึ่ง seed** เพราะ seed รายวิชากำลังจะเปลี่ยนเป็นข้อมูลจริงชั้นปี 1–2 และยังไม่มี seed ของแผนการเรียน |
| การตั้งค่า | ใช้ค่าจริง `app.timetable.max-credits = 22` และ `app.study-plan.max-search-nodes = 50000` กำหนด `app.auth.jwt.secret` ใน `@SpringBootTest(properties = ...)` |
| การล้างข้อมูล | `@BeforeEach` และ `@AfterEach` ลบตารางเรียนของนักศึกษาทดสอบทุกคน (`timetable_entry` ลบตามด้วย `ON DELETE CASCADE`) ลำดับการรันเคสจึงไม่มีผล ข้อมูลรายวิชาและแผนสร้างครั้งเดียวต่อคลาส |
| คำสั่งรัน | เปิด Docker ไว้ (ไม่ต้อง `docker compose up`) แล้ว `cd backend && ./mvnw test -Dtest=StudyPlanApiDaoIntegrationTest` |

**ต่างจากเทสต์อื่นของ US8**

| เทสต์ | สิ่งที่ mock | สิ่งที่ IT นี้เพิ่ม |
| --- | --- | --- |
| Unit test `PlanScheduler` (US8-T08) | ไม่ใช้ DB | ข้อมูลที่ service โหลดจาก DB ส่งให้ scheduler ถูกต้อง และผลถูกบันทึกจริง |
| Unit test controller / service (US8-T08) | service / repository | ใช้ service จริงและ DB จริง |
| Unit test DAO (US8-T12) | ไม่มี แต่ไม่มี API และ rollback ทุกเคส | เรียกผ่าน HTTP และดูข้อมูลหลัง commit |

---

## 2. ข้อมูลทดสอบ

### 2.1 นักศึกษา (สร้างแถวใน `users` ด้วย `JdbcTemplate`)

ใช้รหัสช่วง `66090008xx` ที่ไม่ซ้ำกับบัญชีอื่นใน repo: ไม่ใช้ `6609000000`–`04` (demo และ stub), `6609000097`–`99` (US1-T18, US2-T18) และ `66090003xx` (US3-T14)

| ชื่อ | `student_id` | `department` | ใช้ใน |
| --- | --- | --- | --- |
| S1 | `6609000801` | `ภาควิชาวิทยาการคอมพิวเตอร์` | เกือบทุกเคส |
| S2 | `6609000802` | `ภาควิชาคณิตศาสตร์และสถิติ` | กรองตามสาขา และแยกข้อมูลระหว่างนักศึกษา |
| S3 | `6609000803` | ไม่มีแถวใน `users` (มีแค่ token) | 404 |

`department` ของ S1 ต้องสะกดเหมือนที่ TU API ส่งมา (`ภาควิชาวิทยาการคอมพิวเตอร์` ตาม `AuthService.CS_DEPARTMENT`) ถ้า seed ของแผนจริงสะกดต่างจากนี้ นักศึกษาจะได้ `plans: []`

### 2.2 รายวิชาทดสอบ (ภาค 1/2568 ทุกวิชา 3 หน่วยกิต)

| รหัสวิชา | หมวด | section | วัน เวลา | ใช้ทดสอบ |
| --- | --- | --- | --- | --- |
| T8M01 | MAJOR | 010001 | จันทร์ 09:30–12:30 | วิชาปกติ |
| T8M02 | MAJOR | 010001 | อังคาร 09:30–12:30 | วิชาปกติ, มีในตารางแล้ว |
| T8M03 | MAJOR | 010001 | พุธ 09:30–12:30 | ชนกับ T8G01 ทุก section |
| T8M04 | MAJOR | 010001 | จันทร์ 12:30–14:00 | คาบต่อกับ T8M01 พอดี (ไม่นับว่าชน) |
| T8G01 | GENERAL_EDUCATION | 780001 | พุธ 09:30–12:30 | ชนกับ T8M03 |
| T8G02 | GENERAL_EDUCATION | 780002, 780001 (เวลาเดียวกัน), 780003 | 780001/780002 พฤหัสบดี 13:30–16:30 · 780003 ศุกร์ 13:30–16:30 | section เวลาซ้ำ ต้องได้ `sectionNo` น้อยที่สุด (780001) |
| T8A01 | MAJOR | 010001, 010002 | 010001 ศุกร์ 09:30–12:30 · 010002 เสาร์ 09:30–12:30 | กรณีที่ greedy พลาด |
| T8B01 | MAJOR | 010001 | ศุกร์ 09:30–12:30 | กรณีที่ greedy พลาด |
| T8X01 | MAJOR | 010001 **เฉพาะภาค 2/2568** | จันทร์ 09:30–12:30 | ไม่มี section เปิดในภาค 1 |
| T8F01–T8F05 | FREE_ELECTIVE | 900001 | เสาร์ 13:00–14:30, 14:30–16:00, 16:00–17:30, 17:30–19:00, 19:00–20:30 | วิชาเติมหน่วยกิต (รวม 15) ไม่ชนกับวิชาอื่น |

ให้ insert section ของ T8G02 ตามลำดับ 780002 ก่อน 780001 เพื่อพิสูจน์ว่าระบบเลือกตาม `sectionNo` ไม่ใช่ตามลำดับ `section_id`

### 2.3 แผนการเรียนทดสอบ (`study_plan` + `study_plan_course`)

แผนทุกแผนเป็นของสาขา `ภาควิชาวิทยาการคอมพิวเตอร์` ยกเว้น P-MATH วิชาในแผนเรียงตาม `sort_order` จากซ้ายไปขวา

| แผน | หลักสูตร | ชั้นปี / ภาค | วิชาในแผน | ใช้ทดสอบ |
| --- | --- | --- | --- | --- |
| P-BASIC | หลักสูตรทดสอบ A | 2 / 1 | T8M01, T8M02, T8M04, T8G02 | ทุกวิชาลงได้ (12 หน่วยกิต) |
| P-SECOND | หลักสูตรทดสอบ B | 2 / 1 | T8M02 | สาขาเดียวกันมี 2 หลักสูตร |
| P-MATH | หลักสูตรทดสอบ A (สาขาคณิตศาสตร์) | 2 / 1 | T8M01 | กรองตามสาขา |
| P-SEM2 | หลักสูตรทดสอบ A | 2 / 2 | T8X01 | กรองตามภาค |
| P-CONFLICT | หลักสูตรทดสอบ A | 3 / 1 | T8M03, T8G01, T8X01 | เวลาชน และไม่มี section |
| P-BACKTRACK | หลักสูตรทดสอบ A | 4 / 1 | T8A01, T8B01 | กรณีที่ greedy พลาด |
| P-CREDIT | หลักสูตรทดสอบ A | 1 / 1 | T8M01, T8M02, T8G02 | หน่วยกิตเกิน 22 |

ค่าเวลาคงที่ `OLD = 2000-01-01T00:00:00+07:00` ใช้ตั้ง `updated_at` ของตารางเดิม เพื่อตรวจว่าเปลี่ยนหรือไม่ (`touch()` ตัดเวลาเหลือหลักวินาที ถ้าใช้เวลาปัจจุบันอาจได้ค่าเท่าเดิม)

---

## 3. Test Cases

ทุก request ส่ง `Authorization: Bearer <token ของนักศึกษาในเคส>` ยกเว้นเคสที่ระบุว่าไม่ส่ง ปีการศึกษาของ `apply-plan` คือ `2568` ถ้าไม่ระบุ คอลัมน์ "สถานะ DB ก่อนเริ่ม" ถ้าไม่ระบุ หมายถึงนักศึกษาไม่มีตารางเรียนเลย

### 3.1 ดูแผนการเรียน (`GET /api/study-plans`)

| ID | CoS | สถานะ DB ก่อนเริ่ม | ขั้นตอน | ผลที่คาดหวังของ API | ผลที่คาดหวังใน DB |
| --- | --- | --- | --- | --- | --- |
| IT-API-DAO-US8-01 | 1 | ข้อมูลตามหัวข้อ 2 | S1 เรียก `?studyYear=2&semester=1` | `200` · `department = ภาควิชาวิทยาการคอมพิวเตอร์`, `studyYear = 2`, `semester = 1` · `plans` มี 2 แผนเรียงตามชื่อหลักสูตร: P-BASIC แล้ว P-SECOND · `courses` ของ P-BASIC เรียงเป็น T8M01, T8M02, T8M04, T8G02 พร้อมชื่อ หมวด หน่วยกิต · `totalCredits = 12` · ไม่มี P-MATH และ P-SEM2 | อ่านอย่างเดียว ไม่มีแถวเปลี่ยน |
| IT-API-DAO-US8-02 | 1 | เหมือน IT-01 | S2 เรียก `?studyYear=2&semester=1` | `200` · `department = ภาควิชาคณิตศาสตร์และสถิติ` · `plans` มีแค่ P-MATH | ไม่มีแถวเปลี่ยน |
| IT-API-DAO-US8-03 | 1 | เหมือน IT-01 | S1 เรียก `?studyYear=1&semester=2` (ไม่มีแผน) | `200` · `plans: []` (ไม่ใช่ error) | ไม่มีแถวเปลี่ยน |
| IT-API-DAO-US8-04 | - | เหมือน IT-01 | S1 เรียกแบบ (ก) ไม่ส่ง `studyYear` (ข) `studyYear=0` (ค) `studyYear=5` (ง) `semester=3` (จ) `studyYear=abc` | `400` ProblemDetail ทั้ง 5 แบบ (ไม่ใช่ 500) | ไม่มีแถวเปลี่ยน |
| IT-API-DAO-US8-05 | - | ไม่มีแถว S3 ใน `users` | S3 เรียก `?studyYear=2&semester=1` | `404` ProblemDetail (`ResourceNotFoundException` เมื่อ `UserRepository.findById` คืนว่าง) | ไม่มีแถวเปลี่ยน |
| IT-API-DAO-US8-06 | - | - | เรียก `?studyYear=2&semester=1` โดยไม่ส่ง token | `401` ProblemDetail จาก `SecurityConfig` ไม่ถึง controller | ไม่มีแถวเปลี่ยน |

### 3.2 ดูสรุปก่อนยืนยัน (`POST /api/timetable/apply-plan` · `dryRun: true`)

| ID | CoS | สถานะ DB ก่อนเริ่ม | ขั้นตอน | ผลที่คาดหวังของ API | ผลที่คาดหวังใน DB |
| --- | --- | --- | --- | --- | --- |
| IT-API-DAO-US8-07 | 1 | S1 ไม่มีตาราง 2568/1 | S1 ส่ง `{ planId: P-BASIC, academicYear: 2568, dryRun: true }` | `200` · `dryRun = true` · `added` 4 วิชา: T8M01 010001, T8M02 010001, T8M04 010001, T8G02 **780001** (`sectionId` ตรงกับ DB) · `skipped: []` · `timetable: null` | **ไม่สร้าง** แถว `timetable` ของ S1 และไม่มีแถวใน `timetable_entry` (preview ไม่เขียน DB) |
| IT-API-DAO-US8-08 | 3 | ตาราง 2568/1 ของ S1 มี T8M02 010001 และ `updated_at = OLD` | S1 ส่ง P-BASIC `dryRun: true` | `200` · `added` 3 วิชา (T8M01, T8M04, T8G02) · `skipped` มี T8M02 `reason = COURSE_ALREADY_IN_TIMETABLE`, `existingSectionNo = "010001"` · `timetable: null` | ตารางของ S1 ยังมี 1 entry และ `updated_at = OLD` |
| IT-API-DAO-US8-09 | 4, T04 | S1 ไม่มีตาราง 2568/1 | S1 ส่ง P-CONFLICT `dryRun: true` | `200` · `added` = [T8M03] (MAJOR มาก่อน) · `skipped` มี T8G01 `TIME_CONFLICT` `conflictWith = ["T8M03"]` และ T8X01 `NO_SECTION_AVAILABLE` · แต่ละรายการมี `message` | ไม่สร้างแถวใด ๆ |

### 3.3 ยืนยันจัดตาราง (`POST /api/timetable/apply-plan` · `dryRun: false`)

| ID | CoS | สถานะ DB ก่อนเริ่ม | ขั้นตอน | ผลที่คาดหวังของ API | ผลที่คาดหวังใน DB |
| --- | --- | --- | --- | --- | --- |
| IT-API-DAO-US8-10 | 1 | S1 ไม่มีตาราง 2568/1 | S1 ส่ง P-BASIC `dryRun: true` แล้วส่ง `dryRun: false` | `200` · `added` ของการยืนยันเหมือน IT-07 ทุกรายการ (รหัสวิชาและ `sectionId`) · `timetable` เป็น `TimetableResponse`: `entries` 4 รายการ, `totalCredits = 12`, `conflicts: []`, `updatedAt` ไม่ว่าง | `timetable` ของ (S1, 2568, 1) เพิ่ม **1 แถว** · `timetable_entry` มี **4 แถว** และ `section_id` ตรงกับ `added` ทุกตัว (**แถวครบตามสรุป**) · คาบต่อกันของ T8M01 กับ T8M04 ไม่ถูกนับว่าชน |
| IT-API-DAO-US8-11 | 3 | ตาราง 2568/1 ของ S1 มี T8M02 010001 และ `updated_at = OLD` | S1 ส่ง P-BASIC `dryRun: false` | `200` · `added` 3 วิชา · `skipped` T8M02 `COURSE_ALREADY_IN_TIMETABLE` · `timetable.entries` 4 รายการ | `timetable` ของ S1 ยังมี **1 แถว** (ไม่สร้างซ้ำ) · `timetable_entry` 4 แถว มี T8M02 **แถวเดียว** และยังเป็น 010001 (**ไม่เพิ่มซ้ำ**) · `updated_at` ใหม่กว่า `OLD` |
| IT-API-DAO-US8-12 | 4 | ตาราง 2568/1 ของ S1 มี T8G01 780001 และ `updated_at = OLD` | S1 ส่ง P-CONFLICT `dryRun: false` | `200` · `added: []` · `skipped`: T8M03 `TIME_CONFLICT` `conflictWith = ["T8G01"]`, T8G01 `COURSE_ALREADY_IN_TIMETABLE`, T8X01 `NO_SECTION_AVAILABLE` · `timetable.entries` มีแค่ T8G01 | `added` ว่างจึง**ไม่เขียน DB**: entry ยัง 1 แถว และ `updated_at = OLD` |
| IT-API-DAO-US8-13 | 1 | S1 ไม่มีตาราง 2568/1 | S1 ส่ง P-BACKTRACK `dryRun: false` | `200` · `added` 2 วิชา: T8A01 **010002** (เสาร์) และ T8B01 010001 (ศุกร์) · `skipped: []` | `timetable_entry` 2 แถว เป็น section 010002 ของ T8A01 และ 010001 ของ T8B01 (greedy จะได้ T8A01 010001 แล้วข้าม T8B01) |
| IT-API-DAO-US8-14 | T04 | ตาราง 2568/1 ของ S1 มี T8F01–T8F05 (15 หน่วยกิต) | S1 ส่ง P-CREDIT `dryRun: false` | `200` · `added` = T8M01, T8M02 (MAJOR มาก่อน) · `skipped` T8G02 `CREDIT_LIMIT_EXCEEDED`, `currentCredits = 21`, `maxCredits = 22` · `timetable.totalCredits = 21` | `timetable_entry` 7 แถว · ผลรวม `credits` ของวิชาในตาราง = 21 ไม่เกิน 22 |
| IT-API-DAO-US8-15 | 3 | S1 ไม่มีตาราง 2568/1 | S1 ส่ง P-BASIC `dryRun: true` แล้วเพิ่ม T8M01 010001 เองผ่าน `POST /api/timetable/entries` (เหมือนแก้จากอีกแท็บ) แล้วส่ง `dryRun: false` | การยืนยันได้ `200` · T8M01 อยู่ใน `skipped` `COURSE_ALREADY_IN_TIMETABLE` (ต่างจาก preview ที่อยู่ใน `added`) · `added` 3 วิชา | `timetable_entry` 4 แถว มี T8M01 **แถวเดียว** (backend คำนวณใหม่ตอนยืนยัน ไม่ใช้ผล preview) |
| IT-API-DAO-US8-16 | - | ตาราง 2568/1 ของ S1 มี T8M02 010001 และ `updated_at = OLD` · ตั้ง `@MockitoSpyBean TimetableEntryRepository` ให้ `saveAll` โยน `RuntimeException` | S1 ส่ง P-BASIC `dryRun: false` | `500` ProblemDetail (`GlobalExceptionHandler.handleUnexpected`) | **rollback ทั้งหมด**: entry ยังมีแค่ T8M02 1 แถว และ `updated_at = OLD` (`touch()` ถูก rollback ด้วย) · ทำซ้ำกับ S1 ที่ไม่มีตาราง: ต้องไม่มีแถว `timetable` ค้าง |
| IT-API-DAO-US8-17 | 1 | ตาราง 2568/1 ของ S2 มี T8M01 010001 · S1 ไม่มีตาราง | S1 ส่ง P-BASIC `dryRun: false` | `200` · T8M01 อยู่ใน `added` (ตารางของ S2 ไม่นับ) | ตารางของ S1 มี 4 entry · ตารางและ entry ของ S2 ไม่เปลี่ยน |
| IT-API-DAO-US8-18 | T04 | S1 ไม่มีตาราง 2569/1 | S1 ส่ง P-BASIC `academicYear: 2569`, `dryRun: false` (ปีที่ไม่มี section เลย) | `200` · `added: []` · ทุกวิชาเป็น `NO_SECTION_AVAILABLE` · `timetable.entries: []`, `updatedAt: null` | ไม่สร้างแถว `timetable` ของ (S1, 2569, 1) |
| IT-API-DAO-US8-19 | 1 | S1 ไม่มีตาราง 2568/1 | S1 ส่ง P-BASIC **ไม่ส่ง `dryRun`** | `200` · `dryRun = false` (ค่าเริ่มต้น) · `timetable` ไม่ใช่ `null` | บันทึกจริง 4 แถว เหมือน IT-10 |

### 3.4 ข้อผิดพลาดของ request

| ID | CoS | สถานะ DB ก่อนเริ่ม | ขั้นตอน | ผลที่คาดหวังของ API | ผลที่คาดหวังใน DB |
| --- | --- | --- | --- | --- | --- |
| IT-API-DAO-US8-20 | - | ตาราง 2568/1 ของ S1 มี T8M02 `updated_at = OLD` | S1 ส่ง `planId` ที่ไม่มีอยู่ (`MAX(plan_id) + 1000`) ทั้ง `dryRun: true` และ `false` | `404` ProblemDetail ทั้งสองครั้ง | entry ยัง 1 แถว และ `updated_at = OLD` |
| IT-API-DAO-US8-21 | - | เหมือน IT-20 | S1 ส่ง body (ก) ไม่มี `planId` (ข) ไม่มี `academicYear` | `400` ProblemDetail ทั้งสองแบบ | ไม่มีแถวเปลี่ยน |
| IT-API-DAO-US8-22 | - | - | ส่ง P-BASIC `dryRun: false` โดยไม่ส่ง token | `401` ProblemDetail ไม่ถึง controller | ไม่มีแถว `timetable` ใหม่ |

---

## 4. Traceability: เคสกับ Sequence Diagram (T06) และ DAO

| เส้นทางใน Sequence Diagram | DAO ที่เกี่ยวข้อง | เคส |
| --- | --- | --- |
| StudyPlans: param ผิด → 400 | ไม่เรียก DAO | 04 |
| StudyPlans: ไม่พบนักศึกษา → 404 | `UserRepository.findById` | 05 |
| StudyPlans: กรองแผนตามสาขา ชั้นปี ภาค | `UserRepository.findById` + `StudyPlanRepository.findByDepartmentAndStudyYearAndSemester` (join fetch, เรียง `sort_order`) | 01, 02, 03 |
| Preview / Confirm: body ไม่ครบ → 400 | ไม่เรียก DAO | 21 |
| Preview / Confirm: ไม่พบ `planId` → 404 | `StudyPlanRepository.findWithCoursesById` | 20 |
| `loadCandidates`: ตารางเดิมและ section ของภาค | `TimetableRepository.findByStudentIdAndAcademicYearAndSemester` + `TimetableEntryRepository.findByTimetableId` + `SectionRepository.findByCourseCodesAndTerm` | 07–15, 17, 18 |
| Preview ไม่เขียน DB และ `timetable: null` | ไม่เรียก `save` / `saveAll` | 07, 08, 09 |
| Confirm: `added` ว่าง → ไม่เขียน DB | ไม่เรียก `saveAdded` | 12, 18 |
| Confirm: สร้างตารางใหม่ / `touch()` / `saveAll` แล้ว `getTimetable` | `TimetableRepository.save` + `TimetableEntryRepository.saveAll` + `TimetableService.getTimetable` | 10, 11, 13, 14, 15, 17, 19 |
| Confirm: คำนวณใหม่ ไม่ใช้ผล preview | อ่านตารางใหม่ก่อน `schedule()` | 15 |
| Confirm: all-or-nothing | transaction เดียวของ `applyPlan` | 16 |

เทียบกับ CoS ของ US8: ข้อ 1 → 01, 02, 03, 07, 10, 13, 17, 19 · ข้อ 3 → 08, 11, 15 · ข้อ 4 → 09, 12 · **ข้อ 2 และ 5 ยังไม่มีเคส** (หัวข้อ 5 ข้อ 1) · การ์ด US8-T04: ไม่มี section → 09, 12, 18 · หน่วยกิตเกิน → 14

เทียบกับการ์ด US8-T14: ยืนยันแล้วแถวครบตามสรุป → 10, 11, 13, 14 · ผิดพลาดกลางทางแล้ว rollback ทั้งหมด → 16 · วิชาที่อยู่ในตารางแล้วไม่ถูกเพิ่มซ้ำ → 08, 11, 15

---

## 5. สิ่งที่ต้องยืนยันกับทีมก่อนเขียนเทสต์ (US8-T18)

| # | ประเด็น | ข้อเสนอในร่างนี้ | กระทบเคส |
| --- | --- | --- | --- |
| 1 | CoS ข้อ 2 (เรียนผ่านแล้วต้องไม่เพิ่ม) และข้อ 5 (ผ่านครบแล้วไม่เพิ่ม) ไม่มีใน US8-T05/T06 (ถามไว้ใน PR #83) | ยังไม่เขียนเคส ถ้าทีมเพิ่มข้อมูลวิชาที่ผ่านแล้วใน T05/T06 จะเพิ่มเคสในหมวด 3.2 และ 3.3 ถ้าตัด CoS สองข้อนี้ ให้ลบออกจากตาราง Traceability | เพิ่มเคสใหม่ |
| 2 | ตัวอย่าง response ใน US8-T05 ใช้ `department: "วิทยาการคอมพิวเตอร์"` แต่ TU API และ `AuthService` ใช้ `ภาควิชาวิทยาการคอมพิวเตอร์` | IT นี้ใช้ค่าตาม TU API และ seed ของแผนจริงต้องสะกดแบบเดียวกัน (ตามที่ ER Diagram ของ T06 เตือนไว้) | 01, 02 |
| 3 | วิธีทำให้ผิดพลาดกลางทางเพื่อตรวจ rollback | `@MockitoSpyBean TimetableEntryRepository` ให้ `saveAll` โยน exception เฉพาะ IT-16 แล้ว reset หลังจบเคส | 16 |
| 4 | `dryRun` ไม่ส่งมา = `false` (บันทึกจริง) ตาม Spec | ทดสอบไว้ใน IT-19 ฝั่งหน้าเว็บต้องส่ง `dryRun: true` ทุกครั้งตอนดูสรุป | 19 |
| 5 | ข้อมูลทดสอบสร้างเองแทน seed | ใช้รหัส `T8...` ที่ไม่ชนกับ seed จริง และสร้าง `study_plan` เองเพราะยังไม่มี seed แผน ถ้าทีมอยากใช้ seed จริง ต้องรอ seed ใหม่ของชั้นปี 1–2 และ seed แผนก่อน | ทุกเคส |

---

## 6. แบบบันทึกผล (ใช้ใน US8-T18)

| ID | ผล (Pass/Fail) | หมายเหตุ / Bug ที่พบ |
| --- | --- | --- |
| IT-API-DAO-US8-01 ถึง 06 (study-plans) | | |
| IT-API-DAO-US8-07 ถึง 09 (Preview) | | |
| IT-API-DAO-US8-10 ถึง 19 (Confirm) | | |
| IT-API-DAO-US8-20 ถึง 22 (request ผิด) | | |

## เอกสารที่เกี่ยวข้อง

- US8-T05 DTO & API Spec, API Class Diagram, DTO Class Diagram (PR #83)
- US8-T06 Sequence Diagram ดูแผนการเรียน, Preview, Confirm, DAO Class Diagram, ER Diagram (PR #84)
- US8-T16 UAT (PR #85)
- [US1-T14 Integration Test Cases (API & DAO)](../../US1/T14/US1-T14-design-it-api-dao.md)
- US3-T14 Integration Test Cases (API & DAO) (PR #77)
