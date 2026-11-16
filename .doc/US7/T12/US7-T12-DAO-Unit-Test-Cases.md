# US7-T12 Design Unit Test Cases ส่วน DAO: ค้นหาช่องทางขอโควตา

## ขอบเขตการทดสอบ

ออกแบบ Unit Test ชั้น DAO จำนวน **27 เคส** สำหรับ Repository ใหม่ (`QuotaInfoRepository`, `QuotaRoundRepository`), เมธอด query ใหม่บน Repository เดิม (`CourseRepository.searchAllCourses`, `SectionRepository.findOfferedSemestersByCourseCodesAndYear`) และข้อกำหนด Schema/Constraints ของตารางใหม่ 5 ตาราง (`course_quota_info`, `quota_condition`, `quota_round`, `quota_channel`, `quota_contact`) รวมถึงคอลัมน์ `course.course_name_th` ตามที่ออกแบบไว้ในเอกสาร US7-T06 เพื่อใช้เป็นข้อกำหนดในการพัฒนาและเขียนเทสต์ใน US7-T09

- **User Story:** US7 ค้นหาช่องทางและขั้นตอนการขอโควตา
- **Branch:** `docs/US7-T12-design-unit-test-dao`
- **อ้างอิง:**
  - `US7-T06-ER-Diagram.md`
  - `US7-T06-DAO-Class-Diagram.md`
  - `US7-T06-Extended-API-Class-Diagram.md`
  - [US7-DTO-API-Spec.md](../T05/US7-DTO-API-Spec.md)
- **Method under test & Schema:**

| ส่วน | Repository / Schema | Method / เป้าหมาย | TC ID |
| --- | --- | --- | --- |
| 1 | `CourseRepository` (US1 + query US7) | `searchAllCourses(q, courseCodes)`, `findById(courseCode)` | `UT-DAO-US7-01` – `08` |
| 2 | `SectionRepository` (US1 + query US7) | `findOfferedSemestersByCourseCodesAndYear(courseCodes, academicYear)` | `UT-DAO-US7-09` – `11` |
| 3 | `QuotaInfoRepository` (ใหม่) | `findWithDetailsByCourseCodes(courseCodes)` | `UT-DAO-US7-12` – `16` |
| 4 | `QuotaRoundRepository` (ใหม่) | `findByCourseCodesAndTerm(courseCodes, academicYear, semester)` | `UT-DAO-US7-17` – `20` |
| 5 | Schema (Flyway migration ใหม่) | `course.course_name_th`, `PK`/`FK`/`UQ`/`CHECK`/`ON DELETE CASCADE` ของตาราง US7 | `UT-DAO-US7-21` – `27` |

- **ประเภท:** Unit test ชั้น DAO ทดสอบกับฐานข้อมูล SQL Server จริงผ่าน Testcontainers ไม่ใช้ mock
- **ไม่อยู่ในขอบเขต (ทดสอบในชั้น Service / Integration แทน):**
  - การคำนวณ `QuotaStatus` (`REQUIRED`, `NOT_REQUIRED`, `NO_DATA`, `NOT_OFFERED`) และ `inMyTimetable` ใน `QuotaService`
  - การจำกัดผลลัพธ์สูงสุด `maxResults` (50 วิชา) และการตอบ `400` / `404` ใน `QuotaController`

ครอบคลุมหัวข้อที่การ์ด US7-T12 กำหนด:

| หัวข้อในการ์ด | TC ID |
| --- | --- |
| อ่านช่องทางขอโควตาตามรหัสวิชา | `UT-DAO-US7-12`, `14`, `17`, `18` |
| วิชาที่มีหลายช่องทาง | `UT-DAO-US7-12`, `13`, `17` |
| วิชาที่ไม่มีข้อมูล | `UT-DAO-US7-15`, `16`, `19`, `20` |
| ค้นหาวิชาด้วยชื่อหรือรหัส | `UT-DAO-US7-01` – `08`, `09` – `11` |

---

## สภาพแวดล้อมการทดสอบ (Test Approach)

ทุกเคสรันด้วย `@DaoTest` ตามมาตรฐานเดียวกับโปรเจกต์ ให้ Flyway สร้างตารางจริงบน SQL Server (รวม migration ใหม่ของ US7) เพื่อตรวจการค้นหาภาษาไทย (`NVARCHAR`), `LEFT JOIN FETCH`, `CHECK` / `UNIQUE` / `FOREIGN KEY` และ `ON DELETE CASCADE` ของจริง

| รายการ | ข้อกำหนด |
| --- | --- |
| Annotation | `@DaoTest` (`@DataJpaTest(properties = "spring.flyway.locations=classpath:db/migration")` + `@AutoConfigureTestDatabase(replace = NONE)` + `@Import(TestcontainersConfig.class)`) |
| ฐานข้อมูลทดสอบ | `MSSQLServerContainer` (`mcr.microsoft.com/mssql/server:2025-latest`) รันเฉพาะ `db/migration` ไม่รัน `db/seed` |
| Library | JUnit 5, AssertJ / JUnit Assertions, `TestEntityManager`, `PersistenceUnitUtil` |
| Transaction | ค่า default ของ `@DataJpaTest` (rollback อัตโนมัติหลังจบแต่ละเคส) |
| ชื่อ method เทส | `<method>_<เงื่อนไข>_<ผลที่คาดหวัง>` เช่น `findWithDetailsByCourseCodes_multiChannelCourse_returnsOrderedCollections` |

**หลักการเตรียมข้อมูลและตรวจสอบผล:**

1. แยก `QuotaFixture` ออกจาก `DaoFixture` ของ US1 โดยใช้รหัสวิชาขึ้นต้นด้วย `Q7` เพื่อไม่ชนกับข้อมูลทดสอบของ US1/US2/US8
2. `@BeforeEach` เรียก `QuotaFixture.persist(em)` แล้วทำ `em.flush()` + `em.clear()` ทันที เพื่อให้ทุก query อ่านจาก SQL Server จริง (ไม่ใช้ L1 cache)
3. ส่วนที่โหลด collection แบบ `LEFT JOIN FETCH` (`conditions`, `channels`, `contacts`) ต้องตรวจด้วย `PersistenceUnitUtil.isLoaded(...)` ด้วย เพื่อให้มั่นใจว่าใช้งานต่อได้จริงเมื่อ `open-in-view: false`
4. เคสที่คาดว่าจะ throw exception (ส่วนที่ 5) ให้รันเป็นคำสั่งสุดท้ายของเทส หรือแยก 1 เคสต่อ 1 เมธอดเทส

---

## ข้อมูลตั้งต้น (Test Fixture: `QuotaFixture`)

### 1. ตาราง `course` และ `section` (ปีการศึกษา 2569)

| `course_code` | `course_name` | `course_name_th` | `category` | `credits` | `section` ที่เปิด (2569) | วัตถุประสงค์ในเทส |
| --- | --- | --- | --- | --- | --- | --- |
| `Q7EL105` | `English in Academic Context` | `ภาษาอังกฤษเพื่อการสื่อสารทางวิชาการ` | `GENERAL_EDUCATION` | `3` | ภาค `1`, ภาค `2` | วิชาที่เปิดหลายภาค มีหลายช่องทาง และมีหลายรอบ |
| `Q7MA211` | `Calculus 1` | `แคลคูลัส 1` | `MAJOR` | `3` | ภาค `2` | ค้นหาด้วยชื่อภาษาไทย (`แคลคูลัส`) + รอบแบบกำหนดส่งวันเดียว |
| `Q7AN347` | `Anthropology of Southeast Asia` | `มานุษยวิทยาเอเชียตะวันออกเฉียงใต้` | `FREE_ELECTIVE` | `3` | ภาค `2` | วิชาที่มี 4 รอบพร้อม `start_time` / `end_time` (`09:00`–`16:00`) |
| `Q7EL395` | `Academic English` | `ภาษาอังกฤษเชิงวิชาการ` | `GENERAL_EDUCATION` | `3` | ภาค `2` | วิชาที่มีเงื่อนไขผูกกับ `related_course_code = Q7EL295` |
| `Q7EL295` | `Foundation English` | `ภาษาอังกฤษพื้นฐาน` | `GENERAL_EDUCATION` | `3` | ภาค `1` | วิชาอ้างอิงใน `quota_condition` และทดสอบ `NOT_REQUIRED` |
| `Q7PC280` | `Elementary Astronomy` | `ดาราศาสตร์เบื้องต้น` | `GENERAL_EDUCATION` | `3` | ภาค `2` | ช่องทางติดต่อ `url = NULL` (MS Teams) + 1 ช่องทางหลัก |
| `Q7NODAT` | `Special Topic_100%` | `หัวข้อพิเศษ 50_test!` | `MAJOR` | `3` | ภาค `2` | ไม่มีแถวใน `course_quota_info` (`NO_DATA`) + ทดสอบ escape `%`, `_`, `!` |
| `Q7OFF00` | `Archived Course-Data` | `วิชาที่ยังไม่เปิดสอน` | `FREE_ELECTIVE` | `3` | *(ไม่มี section ใน 2569; มีใน 2568 ภาค 1)* | วิชา `NOT_OFFERED` ในปี 2569 และค้นหาคำหลัง `-` (`Data`) |

---

### 2. ตาราง `course_quota_info`, `quota_condition`, `quota_channel`, `quota_contact`, `quota_round`

| ตาราง | ข้อมูลตั้งต้นใน `QuotaFixture` |
| --- | --- |
| `course_quota_info` | • `Q7EL105` (`quota_required = true`)<br>• `Q7MA211` (`quota_required = true`)<br>• `Q7AN347` (`quota_required = true`)<br>• `Q7EL395` (`quota_required = true`)<br>• `Q7EL295` (`quota_required = false` — `NOT_REQUIRED`, ไม่มี condition/channel/contact/round)<br>• `Q7PC280` (`quota_required = true`)<br>• `Q7NODAT` และ `Q7OFF00` **ไม่มีแถว** (`NO_DATA`) |
| `quota_condition` | • `Q7EL395`: `sort_order=1` (`"ต้องสอบได้วิชา Q7EL295"`, `related_course_code="Q7EL295"`), `sort_order=2` (`"นักศึกษาชั้นปีที่ 2 ขึ้นไป"`, `related_course_code=NULL`) |
| `quota_channel` | • `Q7EL105`: 3 ช่องทาง เรียง `sort_order` `1..3` ได้แก่<br>  1) `QUOTA_SYSTEM` `"ผ่านระบบโควตา LITU"` (`url="https://litu.tu.ac.th/quota"`, `note=NULL`)<br>  2) `ONLINE_FORM` `"กรอก Google Form สำรอง"` (`url="https://forms.gle/example"`, `note="สำหรับกรณีเข้าระบบไม่ได้"`)<br>  3) `FACULTY_OFFICE` `"ติดต่อห้องธุรการสถาบันภาษา"` (`url=NULL`, `note="วันจันทร์-ศุกร์ 09:00-15:00"`)<br>• `Q7PC280`: 1 ช่องทาง `INSTRUCTOR` (`url=NULL`, `note="ติดต่ออาจารย์ผู้สอน"`) |
| `quota_contact` | • `Q7EL105`: `sort_order=1` (`organization_name="สถาบันภาษา"`, `label="Facebook LITU"`, `url="https://facebook.com/litu"`)<br>• `Q7PC280`: `sort_order=1` (`organization_name="สาขาวิชาฟิสิกส์"`, `label="MS Teams wchumpon@tu.ac.th"`, `url=NULL`) |
| `quota_round` | • `Q7EL105` (2569, ภาค 2): `round_no=1` (`label="รอบที่ 1"`, `2026-10-05`..`2026-10-09`, `start_time=NULL`, `end_time=NULL`), `round_no=2` (`label="รอบที่ 2"`, `2026-10-15`..`2026-10-16`, `start_time=NULL`, `end_time=NULL`) และมีแถวของปี `2568` ภาค `1` (`round_no=1`) เพื่อทดสอบการกรองปี/ภาค<br>• `Q7MA211` (2569, ภาค 2): `round_no=1` (`label=NULL`, `start_date=NULL`, `end_date=2026-10-20`, `start_time=NULL`, `end_time=15:00`)<br>• `Q7AN347` (2569, ภาค 2): 4 รอบ (`round_no=1..4`, `label="รหัส 65-66"`, `"รหัส 67"`, `"รหัส 68"`, `"รหัส 69"`, `start_date=2026-10-12`, `end_date=2026-10-12`, `start_time=09:00`, `end_time=16:00`) |

---

## รายการ Test Cases

### ส่วนที่ 1: `CourseRepository` — ค้นหาวิชาด้วยชื่อหรือรหัส

| TC ID | ประเภท | Fixture | ขั้นตอน (Steps) | ผลที่คาดหวัง (Expected Result) |
| --- | --- | --- | --- | --- |
| `UT-DAO-US7-01` | ปกติ | `QuotaFixture` (`Q7EL105`, `Q7EL295`, `Q7EL395`) | เรียก `searchAllCourses("q7el", null)` (ตัวพิมพ์เล็ก) | คืน 3 วิชาเรียงตาม `courseCode`: `Q7EL105`, `Q7EL295`, `Q7EL395` (จับคู่ prefix รหัสวิชาแบบ case-insensitive) |
| `UT-DAO-US7-02` | ปกติ | `QuotaFixture` (`Q7OFF00` มี section เฉพาะปี 2568 ไม่มีในปี 2569) | เรียก `searchAllCourses("Q7OFF", null)` และ `searchAllCourses("data", null)` | คืน `Q7OFF00` ทั้งสองแบบ (พิสูจน์ว่า query ไม่กรอง `EXISTS Section` แบบ US1 และจับคู่คำหลังเครื่องหมาย `-` ใน `Archived Course-Data` ได้) |
| `UT-DAO-US7-03` | ปกติ | `QuotaFixture` (`Q7MA211`: `courseNameTh = "แคลคูลัส 1"`) | เรียก `searchAllCourses("แคลคูลัส", null)` | คืน `[Q7MA211]` พร้อม `courseNameTh = "แคลคูลัส 1"` |
| `UT-DAO-US7-04` | ปกติ (mine=true) | `QuotaFixture` | เรียก `searchAllCourses("Q7EL", List.of("Q7EL105", "Q7MA211"))` | คืนเฉพาะ `[Q7EL105]` (กรองเฉพาะวิชาที่อยู่ใน `courseCodes` และตรงคำค้น) |
| `UT-DAO-US7-05` | ขอบเขต (escape wildcard) | `QuotaFixture` (`Q7NODAT`: `Special Topic_100%` / `หัวข้อพิเศษ 50_test!`) | เรียก `searchAllCourses("50_test!", null)` และ `searchAllCourses("100%", null)` | คืนเฉพาะ `[Q7NODAT]` ไม่ match วิชาอื่น (ตัวอักษร `_`, `%`, `!` ถูก escape เป็น literal) |
| `UT-DAO-US7-06` | ข้อมูลว่าง (ไม่พบ) | `QuotaFixture` | เรียก `searchAllCourses("ZZZ999", null)` | คืน list ว่าง `[]` |
| `UT-DAO-US7-07` | ข้อมูลว่าง (`courseCodes` ว่าง) | `QuotaFixture` | เรียก `searchAllCourses("Q7EL", List.of())` | คืน list ว่าง `[]` ทันทีโดยไม่เกิด SQL syntax error จาก `IN ()` |
| `UT-DAO-US7-08` | ข้อมูลว่าง (`findById` ไม่พบ) | `QuotaFixture` | เรียก `findById("UNKNOWN999")` | คืน `Optional.empty()` |

---

### ส่วนที่ 2: `SectionRepository` — ตรวจสอบภาคเรียนที่เปิดสอน

| TC ID | ประเภท | Fixture | ขั้นตอน (Steps) | ผลที่คาดหวัง (Expected Result) |
| --- | --- | --- | --- | --- |
| `UT-DAO-US7-09` | ปกติ | `QuotaFixture` (`Q7EL105` เปิดภาค 1, 2 ปี 2569; `Q7MA211` เปิดภาค 2 ปี 2569) | เรียก `findOfferedSemestersByCourseCodesAndYear(List.of("Q7EL105", "Q7MA211"), 2569)` | คืน `(Q7EL105, 1)`, `(Q7EL105, 2)`, `(Q7MA211, 2)` เรียงตาม `courseCode, semester` และไม่ซ้ำแม้มีหลาย section |
| `UT-DAO-US7-10` | ข้อมูลว่าง (ไม่เปิดสอนในปีนั้น) | `QuotaFixture` (`Q7OFF00` มี section เฉพาะปี 2568) | เรียก `findOfferedSemestersByCourseCodesAndYear(List.of("Q7OFF00"), 2569)` | คืน list ว่าง `[]` (ใช้ตัดสินสถานะ `NOT_OFFERED` ในปี 2569) |
| `UT-DAO-US7-11` | ข้อมูลว่าง (`courseCodes` ว่าง) | `QuotaFixture` | เรียก `findOfferedSemestersByCourseCodesAndYear(List.of(), 2569)` | คืน list ว่าง `[]` โดยไม่เกิด SQL error |

---

### ส่วนที่ 3: `QuotaInfoRepository` — อ่านช่องทาง เงื่อนไข และช่องทางติดต่อตามรหัสวิชา

| TC ID | ประเภท | Fixture | ขั้นตอน (Steps) | ผลที่คาดหวัง (Expected Result) |
| --- | --- | --- | --- | --- |
| `UT-DAO-US7-12` | ปกติ (หลายช่องทาง) | `QuotaFixture` (`Q7EL105` มี 3 ช่องทาง, `Q7EL395` มี 2 เงื่อนไข) | เรียก `findWithDetailsByCourseCodes(List.of("Q7EL105", "Q7EL395"))` | คืน `CourseQuotaInfo` ของทั้ง 2 วิชา; `PersistenceUnitUtil.isLoaded` เป็น `true` สำหรับ `conditions`, `channels`, `contacts` ทุกตัว; `Q7EL105.channels` มีครบ 3 รายการเรียงตาม `sortOrder` (`QUOTA_SYSTEM` → `ONLINE_FORM` → `FACULTY_OFFICE`) และไม่มีแถวซ้ำจาก `LEFT JOIN FETCH` |
| `UT-DAO-US7-13` | ปกติ (ค่า `NULL` ที่อนุญาต) | `QuotaFixture` (`Q7PC280` มี `channel.url=NULL`, `contact.url=NULL`; `Q7EL395` มี `relatedCourseCode` ทั้งมีค่าและ `NULL`) | เรียก `findWithDetailsByCourseCodes(List.of("Q7PC280", "Q7EL395"))` | อ่าน `Q7PC280.contacts` ได้ `"MS Teams wchumpon@tu.ac.th"` โดย `url == null` และ `Q7EL395.conditions` มีทั้ง `relatedCourseCode == "Q7EL295"` และ `null` |
| `UT-DAO-US7-14` | ปกติ (`NOT_REQUIRED`) | `QuotaFixture` (`Q7EL295` มี `quota_required = false`, ไม่มี child rows) | เรียก `findWithDetailsByCourseCodes(List.of("Q7EL295"))` | คืน 1 แถวของ `Q7EL295` โดย `isQuotaRequired() == false` และ `conditions`, `channels`, `contacts` เป็นเซตว่างที่ถูก load แล้ว |
| `UT-DAO-US7-15` | ข้อมูลว่าง (วิชาไม่มีข้อมูลโควตา) | `QuotaFixture` (`Q7NODAT` ไม่มีแถวใน `course_quota_info`) | เรียก `findWithDetailsByCourseCodes(List.of("Q7NODAT", "UNKNOWN999"))` | คืน list ว่าง `[]` (Service จะนำไปตีความเป็น `NO_DATA`) |
| `UT-DAO-US7-16` | ข้อมูลว่าง (`courseCodes` ว่าง) | `QuotaFixture` | เรียก `findWithDetailsByCourseCodes(List.of())` | คืน list ว่าง `[]` โดยไม่เกิด SQL error |

---

### ส่วนที่ 4: `QuotaRoundRepository` — อ่านรอบและช่วงเวลาการขอโควตา

| TC ID | ประเภท | Fixture | ขั้นตอน (Steps) | ผลที่คาดหวัง (Expected Result) |
| --- | --- | --- | --- | --- |
| `UT-DAO-US7-17` | ปกติ (หลายรอบ + `start_time`/`end_time`) | `QuotaFixture` (`Q7AN347` 4 รอบ `09:00`–`16:00`, `Q7EL105` 2 รอบปี 2569 และ 1 รอบปี 2568) | เรียก `findByCourseCodesAndTerm(List.of("Q7AN347", "Q7EL105"), 2569, 2)` | คืน `Q7AN347` 4 รอบเรียง `roundNo 1..4` พร้อม `startTime = 09:00`, `endTime = 16:00` และคืน `Q7EL105` เฉพาะ 2 รอบของปี 2569 ภาค 2 (ไม่ติดรอบปี 2568) |
| `UT-DAO-US7-18` | ปกติ (กำหนดส่งวันเดียว `start_date = NULL`) | `QuotaFixture` (`Q7MA211`) | เรียก `findByCourseCodesAndTerm(List.of("Q7MA211"), 2569, 2)` | คืน 1 รอบโดย `startDate == null`, `startTime == null`, `endDate == 2026-10-20`, `endTime == 15:00` |
| `UT-DAO-US7-19` | ข้อมูลว่าง (ภาคที่ไม่มีรอบ) | `QuotaFixture` (`Q7EL295`, `Q7EL105` ปี 2569 ภาค 1 ไม่มีรอบ) | เรียก `findByCourseCodesAndTerm(List.of("Q7EL295", "Q7EL105"), 2569, 1)` | คืน list ว่าง `[]` |
| `UT-DAO-US7-20` | ข้อมูลว่าง (`courseCodes` ว่าง) | `QuotaFixture` | เรียก `findByCourseCodesAndTerm(List.of(), 2569, 2)` | คืน list ว่าง `[]` โดยไม่เกิด SQL error |

---

### ส่วนที่ 5: Schema & Constraints (Flyway Migration ใหม่)

| TC ID | ประเภท | Fixture | ขั้นตอน (Steps) | ผลที่คาดหวัง (Expected Result) |
| --- | --- | --- | --- | --- |
| `UT-DAO-US7-21` | ปกติ (`NVARCHAR` + `NULL`) | `QuotaFixture` | บันทึก `course` ที่ `course_name_th = NULL` และอีกแถวที่มีอักขระไทย แล้ว query กลับมาอ่าน | บันทึกสำเร็จทั้งคู่และภาษาไทยไม่เพี้ยนเป็น `???` |
| `UT-DAO-US7-22` | ผิดพลาด (FK ไม่มีวิชา) | `QuotaFixture` | insert `course_quota_info` ด้วย `course_code = "NO_COURSE"` | throw `DataIntegrityViolationException` (ละเมิด FK `course_quota_info -> course`) |
| `UT-DAO-US7-23` | ผิดพลาด (URL ไม่ใช่ `https://`) | `QuotaFixture` | insert `quota_channel` และ `quota_contact` ด้วย `url = "http://insecure.example.com"` | throw `DataIntegrityViolationException` (ละเมิด `CHECK (url IS NULL OR url LIKE 'https://%')`) |
| `UT-DAO-US7-24` | ผิดพลาด (`channel_type` นอก enum) | `QuotaFixture` | insert `quota_channel` ด้วย `channel_type = "WALK_IN"` | throw `DataIntegrityViolationException` (ละเมิด `CHECK (channel_type IN (...))`) |
| `UT-DAO-US7-25` | ผิดพลาด (`quota_round` ผิด `semester` หรือวันที่ย้อนหลัง) | `QuotaFixture` | ทดสอบ 2 กรณีด้วย `@ParameterizedTest`: (1) `semester = 3` (2) `start_date = 2026-10-10`, `end_date = 2026-10-05` | throw `DataIntegrityViolationException` ทั้ง 2 กรณี |
| `UT-DAO-US7-26` | ผิดพลาด (`UQ` ซ้ำ) | `QuotaFixture` | insert `quota_channel` (`Q7EL105`, `sort_order = 1`) ซ้ำ หรือ `quota_round` (`Q7EL105`, `2569`, `2`, `1`) ซ้ำ | throw `DataIntegrityViolationException` (ละเมิด `UNIQUE` constraint) |
| `UT-DAO-US7-27` | ปกติ (`ON DELETE CASCADE`) | `QuotaFixture` | ลบแถว `course_quota_info` ของ `Q7EL105` แล้ว `flush` + `clear` | แถวลูกของ `Q7EL105` ใน `quota_condition`, `quota_round`, `quota_channel`, `quota_contact` ถูกลบตามทั้งหมด ส่วนแถวใน `course` ยังคงอยู่ |
