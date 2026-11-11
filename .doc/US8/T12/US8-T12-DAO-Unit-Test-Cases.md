# US8-T12 Design Unit Test Cases ส่วน DAO: จัดตารางเรียนตามแผนการเรียน

## ขอบเขตการทดสอบ

ออกแบบ Unit Test ชั้น DAO จำนวน 30 เคส สำหรับ repository และ entity ที่ US8 เพิ่ม (`StudyPlanRepository`, `StudyMinorRepository`, `StudyMinor.coursesOf`) และ repository เดิมของ US1 ที่ `ApplyPlanService` ใช้ในแบบใหม่ (หา section ของวิชาในแผน และบันทึกหลายวิชาในครั้งเดียว) ตามที่ออกแบบไว้ใน DAO Class Diagram และ ER Diagram ของ US8-T06 (PR #84 ฉบับ `76b4950`) เพื่อใช้เป็นข้อกำหนดในการเขียนโค้ดและชุดทดสอบใน US8-T09

- **User Story:** US8 จัดตารางเรียนจำลองตามแผนในเล่มหลักสูตร
- **Branch:** `docs/US8-T12-design-unit-test-dao`
- **Method under test:**

| ส่วน | Repository / Entity | Method | TC ID |
| --- | --- | --- | --- |
| 1 | `StudyPlanRepository` (ใหม่) | `findByDepartmentAndStudyYearAndSemester(department, studyYear, semester)`, `findWithCoursesById(planId)` | UT-DAO-US8-01 – 08 |
| 2 | `StudyMinorRepository` (ใหม่) และ `StudyMinor` | `findByDepartmentAndTerm(department, studyYear, semester)`, `findWithCoursesById(minorId)`, `StudyMinor.coursesOf(studyYear, semester)` | UT-DAO-US8-09 – 15 |
| 3 | `SectionRepository` (US1) | `findByCourseCodesAndTerm(courseCodes, academicYear, semester)` กับรหัสวิชาของแผนและวิชาโท | UT-DAO-US8-16 – 18 |
| 4 | `TimetableRepository`, `TimetableEntryRepository` (US1) | `save(timetable)` + `saveAll(entries)` ตามขั้น `saveAdded` และการ rollback เมื่อผิดพลาด | UT-DAO-US8-19 – 22 |
| 5 | Schema (Flyway) | constraint ของ `study_plan`, `study_plan_course`, `study_minor`, `study_minor_course` | UT-DAO-US8-23 – 30 |

- **ประเภท:** Unit test ชั้น DAO ทดสอบกับฐานข้อมูล SQL Server จริงผ่าน Testcontainers ไม่ใช้ mock
- **ไม่อยู่ในขอบเขต (ทดสอบในชั้น Service / Controller แทน):**
  - การเรียง `plans` ตาม `planType` (`SPECIAL_PROJECT` ก่อน `CO_OP`) ซึ่ง T06 ให้ `StudyPlanService` เรียงใน Java ไม่ได้เรียงใน SQL เคสในเอกสารนี้จึงตรวจแค่ลำดับที่ query คืน
  - การเลือก section, ตรวจเวลาชน, ตรวจวิชาซ้ำ และหน่วยกิตเกิน 22 ใน `PlanScheduler` (ไม่ใช้ DB)
  - error `MINOR_NOT_ALLOWED`, `MINOR_PLAN_MISMATCH`, 404 และ `dryRun` ใน `ApplyPlanService`
  - rollback ของ `ApplyPlanService.applyPlan` ทั้ง transaction เมื่อเรียกผ่าน API ซึ่งอยู่ใน US8-T14 (PR #86) เคส IT-16

ระบบไม่ตรวจสอบวิชาที่นักศึกษาเรียนผ่านแล้ว นักศึกษาลบวิชาออกจากตารางเองได้ (ตามข้อตกลงของทีมเรื่อง CoS ของ US8) จึงไม่มี query และเคสเรื่องวิชาที่เรียนผ่านแล้ว

ครอบคลุมหัวข้อที่การ์ด US8-T12 กำหนด:

| หัวข้อในการ์ด | TC ID |
| --- | --- |
| อ่านแผนตามชั้นปีและภาค | UT-DAO-US8-01, 02, 03, 07, 09, 10, 13, 15 |
| ชั้นปีหรือภาคที่ไม่มีแผน | UT-DAO-US8-04, 05, 06, 08, 11, 12, 14 |
| หา section ที่เปิดของวิชาในแผน | UT-DAO-US8-16, 17, 18 |
| บันทึกหลายวิชาแล้ว rollback เมื่อผิดพลาด | UT-DAO-US8-19, 20, 21, 22 |

---

## สภาพแวดล้อมการทดสอบ (Test Approach)

ทุกเคสรันด้วย `@DaoTest` ตามมาตรฐานเดียวกับ [US1-T12](../../US1/T12/US1-T12%20Design%20Unit%20Test%20Cases%20ส่วน%20DAO.md), [US2-T12](../../US2/T12/US2-T12-DAO-Unit-Test-Cases.md) และ [US3-T12](../../US3/T12/US3-T12-DAO-Unit-Test-Cases.md) ให้ Flyway สร้างตารางจริงบน SQL Server (รวม migration ใหม่ของ US8-T09) เพื่อตรวจข้อความภาษาไทย (`NVARCHAR`), `CHECK` / `UNIQUE` / `FOREIGN KEY` และ `ON DELETE CASCADE` ของจริง

| รายการ | ข้อกำหนด |
| --- | --- |
| Annotation | `@DaoTest` (`@DataJpaTest(properties = "spring.flyway.locations=classpath:db/migration")` + `@AutoConfigureTestDatabase(replace = NONE)` + `@Import(TestcontainersConfig.class)`) |
| ฐานข้อมูลทดสอบ | `MSSQLServerContainer` image `mcr.microsoft.com/mssql/server:2025-latest` รันเฉพาะ `db/migration` ไม่รัน seed (seed แผนการเรียนจริงของ T09 จึงไม่ปนกับข้อมูลทดสอบ) |
| Library | JUnit 5, AssertJ / JUnit Assertions, `TestEntityManager`, `PersistenceUnitUtil` (ตรวจว่า fetch มาแล้ว) |
| Transaction | ส่วนที่ 1–3, 5 และเคส 19–20 rollback เองหลังจบแต่ละเทส (ค่า default ของ `@DataJpaTest`) · เคส 21–22 ปิด transaction ของเทสแล้วคุมเองด้วย `TransactionTemplate` (ดูหัวข้อส่วนที่ 4) |
| ชื่อ method เทส | `<method>_<เงื่อนไข>_<ผลที่คาดหวัง>` เช่น `findByDepartmentAndStudyYearAndSemester_twoCurricula_returnsEachPlanOnceWithSortedCourses` |
| คำสั่งรัน | เปิด Docker ไว้ แล้ว `cd backend && ./mvnw test -Dtest='StudyPlan*Test,StudyMinor*Test,ApplyPlan*Test,PlanSectionLookupTest'` |

คลาสเทส (ทั้งหมดอยู่ใน package `studyplan` ยกเว้น fixture)

| คลาส | เคส | หมายเหตุ |
| --- | --- | --- |
| `support/StudyPlanFixture` | ข้อมูลตั้งต้น | แบบเดียวกับ `DaoFixture` ของ US1 แต่ใช้ข้อมูลของ US8 เท่านั้น |
| `StudyPlanRepositoryTest` | 01 – 08 | |
| `StudyMinorRepositoryTest` | 09 – 15 | |
| `PlanSectionLookupTest` | 16 – 18 | ไม่เพิ่มลงใน `SectionRepositoryTest` ของ US1 |
| `ApplyPlanSaveRepositoryTest` | 19 – 20 | |
| `ApplyPlanSaveRollbackTest` | 21 – 22 | `@Transactional(propagation = Propagation.NOT_SUPPORTED)` ระดับคลาส |
| `StudyPlanSchemaConstraintTest` | 23 – 30 | ไม่เพิ่มลงใน `SchemaConstraintTest` เดิม |

**หลักการเตรียมข้อมูลและตรวจสอบผลในแต่ละเคส:**

1. แยกคลาสเทสและ fixture ของ US8 ออกจาก `DaoFixture` ของ US1 เพื่อไม่ให้กระทบจำนวนแถวของเทสเดิม (เช่น `count()` ใน US2-T12) และลดโอกาสเกิด merge conflict ตาม `CONTRIBUTING.md` รหัสวิชาทุกตัวขึ้นต้นด้วย `T8` จึงไม่ชนกับ `DaoFixture` (CS111, MA211, TU109, LAS101, FE001, CS213, TU107)
2. `@BeforeEach` เรียก `StudyPlanFixture.persist(em)` ซึ่งบันทึกข้อมูลตั้งต้นแล้ว `em.flush()` + `em.clear()` ทันที ให้ทุกการเรียก repository ยิง query ไปอ่านจาก SQL Server จริง ไม่ได้ object จาก cache
3. `course`, `section`, `schedule_slot`, `timetable`, `timetable_entry` สร้างด้วย `TestEntityManager.persist(...)` แบบ `DaoFixture` ส่วน `study_plan`, `study_plan_course`, `study_minor`, `study_minor_course` สร้างด้วย native SQL (`em.getEntityManager().createNativeQuery("INSERT ... OUTPUT INSERTED.plan_id VALUES (...)")`) เพราะ T06 เสนอให้ entity ใหม่เป็น `@Immutable` และไม่มี flow ของแอปที่สร้างแผน ข้อมูลตั้งต้นจึงไม่ขึ้นกับว่า entity มี constructor หรือ setter หรือไม่ `plan_id` และ `minor_id` เป็น IDENTITY ให้เก็บค่าที่ได้จาก `OUTPUT` ไว้ใน field ห้าม hard-code ตัวเลข
4. ค่าที่อ่านผ่าน relation แบบ LAZY ให้ตรวจด้วย `PersistenceUnitUtil.isLoaded(...)` ก่อนว่า query fetch มาแล้วจริง (แบบ `SectionRepositoryTest` และ `TimetableEntryRepositoryTest`) เพราะ `open-in-view: false` และ service อ่านวิชาในแผนหลังจบ query
5. เคสที่คาดว่า throw ให้อยู่ขั้นสุดท้ายของเทส เพราะ session ใช้ต่อไม่ได้หลัง constraint ล้ม (แบบ `SchemaConstraintTest`) เคสที่มีหลายค่าให้ใช้ `@ParameterizedTest` ให้แต่ละค่าเป็น 1 invocation แยก transaction กัน

---

## ข้อมูลตั้งต้น (Test Fixture)

ค่าคงที่ที่ใช้ในชุดทดสอบ:

- `CS` = `"ภาควิชาวิทยาการคอมพิวเตอร์"` (สะกดตาม TU API และ `AuthService.CS_DEPARTMENT`)
- `CS_TYPO` = `"วิทยาการคอมพิวเตอร์"` (สะกดแบบตัวอย่างใน US8-T05 ใช้ทดสอบว่าสะกดไม่ตรงจะไม่ได้แผน)
- `CUR_A` = `"หลักสูตรทดสอบ A"`, `CUR_B` = `"หลักสูตรทดสอบ B"`
- `OLD` = `2000-01-01T00:00:00+07:00` ใช้ตั้ง `updated_at` ของตารางเดิม เพื่อตรวจว่า `touch()` เปลี่ยนค่าหรือไม่

ข้อมูลชุดนี้ใช้รหัสวิชา แผน และวิชาโทชุดเดียวกับ US8-T14 (PR #86) เท่าที่ DAO ต้องใช้ และเพิ่ม `T8F01` ในวิชาโท MN-1 (ชั้นปี 4 ภาค 1) กับแผนว่าง P-EMPTY เพื่อทดสอบการโหลดวิชาโทข้ามภาคและแผนที่ไม่มีวิชา

### 1. ตาราง `course` และ `section` / `schedule_slot` (ภาค 1/2568 ยกเว้นที่ระบุ)

ทุกแถวกำหนดคอลัมน์ NOT NULL ครบ: `course` (`course_code`, `course_name`, `category`, `credits`), `section` (`course_code`, `section_no`, `academic_year`, `semester`; `instructor` = `NULL`), `schedule_slot` (`section_id`, `day_of_week`, `start_time`, `end_time`; `room` = `NULL`)

| `course_code` | `course_name` | `category` | `credits` | `section_no` | คาบเรียน | ใช้ใน |
| --- | --- | --- | --- | --- | --- | --- |
| `T8M01` | `"วิชาเอกทดสอบ 1"` | `MAJOR` | 3 | `010001` | MONDAY 09:30–12:30 | P-BASIC |
| `T8M02` | `"วิชาเอกทดสอบ 2"` | `MAJOR` | 3 | `010001` | TUESDAY 09:30–12:30 | P-BASIC, P-SECOND, ตาราง TT-OLD |
| `T8M03` | `"วิชาเอกทดสอบ 3"` | `MAJOR` | 3 | `010001` | WEDNESDAY 09:30–12:30 | P-CONFLICT |
| `T8M04` | `"วิชาเอกทดสอบ 4"` | `MAJOR` | 3 | `010001` | MONDAY 12:30–14:00 | P-BASIC |
| `T8M05` | `"วิชาเอกทดสอบ 5"` | `MAJOR` | 3 | `010001` | THURSDAY 09:30–12:30 | P-COOP และวิชาโท MN-1 |
| `T8C01` | `"สหกิจศึกษาทดสอบ"` | `MAJOR` | 3 | `010001` | **ไม่มีคาบเรียน** | P-COOP |
| `T8G01` | `"วิชาศึกษาทั่วไปทดสอบ 1"` | `GENERAL_EDUCATION` | 3 | `780001` | WEDNESDAY 09:30–12:30 | P-CONFLICT |
| `T8G02` | `"วิชาศึกษาทั่วไปทดสอบ 2"` | `GENERAL_EDUCATION` | 3 | `780002`, `780001`, `780003` (insert ตามลำดับนี้) | 780001/780002 THURSDAY 13:30–16:30 · 780003 FRIDAY 13:30–16:30 | P-BASIC |
| `T8X01` | `"วิชาเอกเปิดภาค 2"` | `MAJOR` | 3 | `010001` **เฉพาะภาค 2/2568** | MONDAY 09:30–12:30 | P-SEM2, P-CONFLICT |
| `T8N01` | `"วิชาโททดสอบ 1"` | `FREE_ELECTIVE` | 3 | `990001` | FRIDAY 13:30–16:30 | MN-1, MN-2, MN-OTHER |
| `T8N02` | `"วิชาโททดสอบ 2"` | `FREE_ELECTIVE` | 4 | `990001` | THURSDAY 09:30–12:30 | MN-1 |
| `T8F01` | `"วิชาโททดสอบ 3"` | `FREE_ELECTIVE` | 3 | `900001` | SATURDAY 13:00–14:30 | MN-1 (ชั้นปี 4 ภาค 1) |

รวม 12 วิชา 14 section (T8G02 มี 3 section) และ 13 แถวใน `schedule_slot` (T8C01 ไม่มีคาบ) ทุก section ใช้ `academic_year = 2568`

### 2. ตาราง `study_plan` + `study_plan_course`

ทุกแผน `department` = `CS` insert ตามลำดับในตาราง (ลำดับนี้ใช้พิสูจน์ว่าผลไม่ได้เรียงตาม `plan_id`) วิชาในแผนให้ insert ตามลำดับที่เขียนในคอลัมน์ "ลำดับ insert" ซึ่งไม่ตรงกับ `sort_order` โดยตั้งใจ

| ตัวแปร | `curriculum_name` | `study_year` | `semester` | `plan_type` | วิชาในแผน (`sort_order`) | ลำดับ insert ของวิชา |
| --- | --- | --- | --- | --- | --- | --- |
| P-SECOND | `CUR_B` | 2 | 1 | `NULL` | T8M02 (1) | T8M02 |
| P-BASIC | `CUR_A` | 2 | 1 | `NULL` | T8M01 (1), T8M02 (2), T8M04 (3), T8G02 (4) | T8G02, T8M01, T8M04, T8M02 |
| P-SEM2 | `CUR_A` | 2 | 2 | `NULL` | T8X01 (1) | T8X01 |
| P-COOP | `CUR_A` | 3 | 1 | `CO_OP` | T8M05 (1), T8C01 (2) | T8M05, T8C01 |
| P-CONFLICT | `CUR_A` | 3 | 1 | `SPECIAL_PROJECT` | T8M03 (1), T8G01 (2), T8X01 (3) | T8M03, T8G01, T8X01 |
| P-EMPTY | `CUR_A` | 1 | 2 | `NULL` | ไม่มีวิชา (seed ผิด) | |

รวม 6 แผน 11 แถวใน `study_plan_course`

### 3. ตาราง `study_minor` + `study_minor_course`

ทุกวิชาโท `department` = `CS` insert ตามลำดับในตาราง

| ตัวแปร | `curriculum_name` | `minor_name` | `sort_order` | วิชา (`study_year`/`semester`, `sort_order`) | ลำดับ insert ของวิชา |
| --- | --- | --- | --- | --- | --- |
| MN-OTHER | `CUR_B` | `"ความมั่นคงปลอดภัยไซเบอร์"` | 3 | T8N01 (3/1, 1) | T8N01 |
| MN-1 | `CUR_A` | `"วิทยาการข้อมูล"` | 1 | T8N01 (3/1, 1), T8N02 (3/1, 2), T8M05 (3/1, 3), T8F01 (4/1, 1) | T8F01, T8M05, T8N01, T8N02 |
| MN-2 | `CUR_A` | `"ปัญญาประดิษฐ์"` | 2 | T8N01 (4/2, 1) | T8N01 |

รวม 3 วิชาโท 6 แถวใน `study_minor_course`

### 4. ตาราง `timetable` + `timetable_entry`

| ตัวแปร | `student_id` | `academic_year` | `semester` | `updated_at` | entry |
| --- | --- | --- | --- | --- | --- |
| TT-OLD | `"6609000802"` | 2568 | 1 | `OLD` | E-OLD = T8M02 กลุ่ม 010001 |

- นักศึกษา `"6609000801"` ยังไม่มีตารางในภาค 1/2568 ใช้ทดสอบการสร้างตารางใหม่
- รหัสนักศึกษาช่วง `66090008xx` เดียวกับ US8-T14 ไม่ซ้ำกับรหัสที่ `DaoFixture` ใช้ (`6609000000`, `6609000001`, `6609000003`) ตาราง `timetable` ไม่มี FK ไป `users` จึงไม่ต้องสร้างแถวใน `users`

ผลรวมเวลาและหน่วยกิตที่ใช้ในเคส: P-BASIC ทุกวิชาไม่ชนกัน (T8M01 จบ 12:30 ต่อกับ T8M04 เริ่ม 12:30 พอดี) รวม 12 หน่วยกิต · MN-1 ภาค 3/1 รวม 10 หน่วยกิต (3 + 4 + 3)

---

## Test Cases ส่วนที่ 1: อ่านแผนการเรียน (`StudyPlanRepository`)

ใช้ใน `GET /api/study-plans` (`StudyPlanService.getPlans`) และ `POST /api/timetable/apply-plan` (`ApplyPlanService.applyPlan`)

| TC ID | สถานการณ์ | Input | Expected Result | Actual Result | Status |
| --- | --- | --- | --- | --- | --- |
| UT-DAO-US8-01 | อ่านแผนของชั้นปีและภาคที่มี 2 หลักสูตร | `findByDepartmentAndStudyYearAndSemester(CS, 2, 1)` | คืน `[P-BASIC, P-SECOND]` เรียงตาม `curriculumName` (ไม่ใช่ `planId`); แผนละ 1 object ไม่ซ้ำจากการ join; วิชาของ P-BASIC เรียง `T8M01, T8M02, T8M04, T8G02` |  | ยังไม่รัน |
| UT-DAO-US8-02 | กรองตามภาคเรียน | `(CS, 2, 2)` | คืน `[P-SEM2]` เท่านั้น |  | ยังไม่รัน |
| UT-DAO-US8-03 | ชั้นปีที่ 3 มี 2 แผน (หัวข้อพิเศษ / สหกิจ) | `(CS, 3, 1)` | คืนทั้ง 2 แผน `[P-COOP, P-CONFLICT]` ตาม `planId` (DAO ไม่เรียงตาม `planType`); `planType` อ่านเป็น enum `CO_OP` และ `SPECIAL_PROJECT` |  | ยังไม่รัน |
| UT-DAO-US8-04 | ชั้นปีหรือภาคที่ไม่มีแผน | `(CS, 4, 1)`, `(CS, 4, 2)`, `(CS, 1, 1)` | คืน list ว่างทุกครั้ง ไม่ throw |  | ยังไม่รัน |
| UT-DAO-US8-05 | `department` สะกดไม่ตรงกับ seed | `(CS_TYPO, 2, 1)` | คืน list ว่าง |  | ยังไม่รัน |
| UT-DAO-US8-06 | แผนที่ไม่มีวิชา (seed ผิด) | `(CS, 1, 2)` และ `findWithCoursesById(P-EMPTY)` | คืน list ว่าง และ `Optional.empty()` (inner `join fetch` ตาม ER `1..*`) |  | ยังไม่รัน |
| UT-DAO-US8-07 | อ่านแผนตาม id พร้อมวิชาเพื่อจัดตาราง | `findWithCoursesById(P-BASIC)` | คืนแผนพร้อม 4 วิชาเรียงตาม `sortOrder`; `course` โหลดมาแล้ว อ่าน `courseCode`, `category`, `credits` ได้ |  | ยังไม่รัน |
| UT-DAO-US8-08 | id ของแผนที่ไม่มีอยู่ | `findWithCoursesById(-1L)` | คืน `Optional.empty()` ไม่ throw |  | ยังไม่รัน |

### รายละเอียดขั้นตอนการทดสอบ (UT-DAO-US8-01 ถึง 08)

#### [UT-DAO-US8-01] อ่านแผนของชั้นปีและภาคที่มี 2 หลักสูตร
- **Related:** CoS 1 · **Test method:** `findByDepartmentAndStudyYearAndSemester_twoCurricula_returnsEachPlanOnceWithSortedCourses`
- **Test Steps:**
  1. เรียก `studyPlanRepository.findByDepartmentAndStudyYearAndSemester(CS, 2, 1)`
  2. ตรวจ `planId` ของผลตามลำดับ แล้วตรวจทุก field ของแต่ละแผน
  3. ตรวจ `PersistenceUnitUtil.isLoaded(plan, "courses")` และ `isLoaded(planCourse, "course")` ของทุกวิชา
- **Expected Result:**
  - `size() == 2` (P-BASIC มี 4 วิชา ถ้า Hibernate ไม่ตัดแถวซ้ำจะได้ 5 object)
  - ลำดับ `[P-BASIC, P-SECOND]` เพราะ `CUR_A` < `CUR_B` แม้ P-SECOND จะ insert ก่อน (`planId` น้อยกว่า)
  - P-BASIC: `department = CS`, `curriculumName = "หลักสูตรทดสอบ A"` (ภาษาไทยไม่เพี้ยน), `studyYear = 2`, `semester = 1`, `planType = null`
  - วิชาของ P-BASIC เรียงตาม `sortOrder` เป็น `T8M01, T8M02, T8M04, T8G02` (ไม่ใช่ลำดับ insert `T8G02, T8M01, T8M04, T8M02`) และ `sortOrder` เป็น `1, 2, 3, 4`
  - วิชาของ P-SECOND มี `T8M02` วิชาเดียว
  - `courses` และ `course` ของทุกวิชาโหลดมาแล้ว

#### [UT-DAO-US8-02] กรองตามภาคเรียน
- **Related:** CoS 1 · **Test method:** `findByDepartmentAndStudyYearAndSemester_otherSemester_returnsOnlyPlansOfThatSemester`
- **Test Steps:**
  1. เรียก `findByDepartmentAndStudyYearAndSemester(CS, 2, 2)`
- **Expected Result:**
  - คืน 1 แผนคือ P-SEM2 (`semester = 2`) มีวิชา `T8X01`
  - ไม่มี P-BASIC และ P-SECOND ซึ่งเป็นชั้นปี 2 เหมือนกันแต่ภาค 1

#### [UT-DAO-US8-03] ชั้นปีที่ 3 มี 2 แผน (หัวข้อพิเศษ / สหกิจ)
- **Related:** T05 (แผนปี 3–4) · **Test method:** `findByDepartmentAndStudyYearAndSemester_thirdYear_returnsBothPlanTypes`
- **Test Steps:**
  1. เรียก `findByDepartmentAndStudyYearAndSemester(CS, 3, 1)`
- **Expected Result:**
  - คืน 2 แผนตามลำดับ `[P-COOP, P-CONFLICT]` เพราะหลักสูตรเดียวกัน query จึงเรียงต่อด้วย `planId` (P-COOP insert ก่อน) การเรียง `SPECIAL_PROJECT` ก่อน `CO_OP` เป็นหน้าที่ของ `StudyPlanService` ไม่ assert ในเคสนี้
  - P-COOP `planType = PlanType.CO_OP` วิชา `T8M05, T8C01` · P-CONFLICT `planType = PlanType.SPECIAL_PROJECT` วิชา `T8M03, T8G01, T8X01` (ค่าใน DB แปลงเป็น enum ได้ ยืนยัน `@Enumerated(EnumType.STRING)`)
  - query ไม่กรอง `planType` ได้ทั้งสองแผนตาม T05

#### [UT-DAO-US8-04] ชั้นปีหรือภาคที่ไม่มีแผน
- **Related:** CoS 1 (กรณีข้อมูลว่าง) · **Test method:** `findByDepartmentAndStudyYearAndSemester_noPlanForTerm_returnsEmptyList`
- **Test Steps:**
  1. เรียก `findByDepartmentAndStudyYearAndSemester(CS, 4, 1)`
  2. เรียก `findByDepartmentAndStudyYearAndSemester(CS, 4, 2)`
  3. เรียก `findByDepartmentAndStudyYearAndSemester(CS, 1, 1)`
- **Expected Result:**
  - ทั้ง 3 ครั้งคืน list ว่าง (`isEmpty()`) ไม่ใช่ `null` และไม่ throw

#### [UT-DAO-US8-05] `department` สะกดไม่ตรงกับ seed
- **Related:** CoS 1 (กรณีข้อมูลว่าง) · **Test method:** `findByDepartmentAndStudyYearAndSemester_departmentSpelledDifferently_returnsEmptyList`
- **Test Steps:**
  1. เรียก `findByDepartmentAndStudyYearAndSemester(CS_TYPO, 2, 1)` (`"วิทยาการคอมพิวเตอร์"` ไม่มีคำว่า "ภาควิชา")
- **Expected Result:**
  - คืน list ว่าง ยืนยันว่า query เทียบ `department` ทั้งข้อความ ถ้า seed ของ T09 สะกดตามตัวอย่างใน T05 นักศึกษาจริงจะได้ `plans: []`

#### [UT-DAO-US8-06] แผนที่ไม่มีวิชา (seed ผิด)
- **Related:** ER (`STUDY_PLAN ||--|{ STUDY_PLAN_COURSE`) · **Test method:** `findPlan_planWithoutCourses_isNotReturned`
- **Test Steps:**
  1. เรียก `findByDepartmentAndStudyYearAndSemester(CS, 1, 2)`
  2. เรียก `findWithCoursesById(P-EMPTY)`
- **Expected Result:**
  - ข้อ 1 คืน list ว่าง แม้ตาราง `study_plan` มีแถวของ P-EMPTY
  - ข้อ 2 คืน `Optional.empty()` (service จะตอบ 404 เหมือนไม่พบแผน) ตามที่ T06 ใช้ `join fetch` แบบ inner join

#### [UT-DAO-US8-07] อ่านแผนตาม id พร้อมวิชาเพื่อจัดตาราง
- **Related:** CoS 1, T04 (หน่วยกิต) · **Test method:** `findWithCoursesById_existingPlan_returnsCoursesInSortOrder`
- **Test Steps:**
  1. เรียก `findWithCoursesById(P-BASIC)`
  2. ตรวจ `isLoaded(plan, "courses")` และ `isLoaded(planCourse, "course")`
  3. อ่าน `courseCode`, `category`, `credits` ของทุกวิชา และรวม `credits`
- **Expected Result:**
  - `isPresent()` เป็น `true` และ `planId` ตรงกับ P-BASIC
  - วิชาเรียง `T8M01, T8M02, T8M04, T8G02` ตาม `sortOrder`
  - `category` เป็น `MAJOR, MAJOR, MAJOR, GENERAL_EDUCATION` · `credits` รวม `12`
  - `courses` และ `course` โหลดมาแล้ว (ไม่ต้องยิง query เพิ่มตอน service อ่าน)

#### [UT-DAO-US8-08] id ของแผนที่ไม่มีอยู่
- **Related:** T05 (404 ไม่พบ `planId`) · **Test method:** `findWithCoursesById_unknownId_returnsEmpty`
- **Test Steps:**
  1. เรียก `findWithCoursesById(-1L)`
- **Expected Result:**
  - คืน `Optional.empty()` ไม่ throw

---

## Test Cases ส่วนที่ 2: อ่านวิชาโท (`StudyMinorRepository` และ `StudyMinor.coursesOf`)

ใช้ใน `GET /api/study-plans` (`minors` ของชั้นปี 3–4) และ `ApplyPlanService.loadMinor` / `loadCandidates` เมื่อส่ง `minorId`

| TC ID | สถานการณ์ | Input | Expected Result | Actual Result | Status |
| --- | --- | --- | --- | --- | --- |
| UT-DAO-US8-09 | อ่านวิชาโทของภาคที่มีวิชา | `findByDepartmentAndTerm(CS, 3, 1)` | คืน `[MN-1, MN-OTHER]` เรียงตาม `sortOrder`; MN-2 ไม่อยู่; MN-1 โหลดวิชาครบทุกภาค 4 วิชา เรียง `T8N01, T8N02, T8M05, T8F01` |  | ยังไม่รัน |
| UT-DAO-US8-10 | กรองตามชั้นปีและภาคของวิชาในวิชาโท | `(CS, 4, 1)`, `(CS, 4, 2)` | `(4, 1)` คืน `[MN-1]` · `(4, 2)` คืน `[MN-2]` |  | ยังไม่รัน |
| UT-DAO-US8-11 | ภาคที่ไม่มีวิชาโท และชั้นปี 1–2 | `(CS, 3, 2)`, `(CS, 1, 1)`, `(CS, 2, 1)` | คืน list ว่างทุกครั้ง |  | ยังไม่รัน |
| UT-DAO-US8-12 | `department` สะกดไม่ตรงกับ seed | `(CS_TYPO, 3, 1)` | คืน list ว่าง |  | ยังไม่รัน |
| UT-DAO-US8-13 | อ่านวิชาโทตาม id พร้อมวิชาทุกภาค | `findWithCoursesById(MN-1)` | คืน MN-1 พร้อม 4 วิชาเรียง `studyYear, semester, sortOrder` |  | ยังไม่รัน |
| UT-DAO-US8-14 | id ของวิชาโทที่ไม่มีอยู่ | `findWithCoursesById(-1L)` | คืน `Optional.empty()` |  | ยังไม่รัน |
| UT-DAO-US8-15 | เลือกวิชาของวิชาโทเฉพาะภาคของแผน | `MN-1.coursesOf(3, 1)`, `(4, 1)`, `(3, 2)` | `[T8N01, T8N02, T8M05]` · `[T8F01]` · `[]` |  | ยังไม่รัน |

### รายละเอียดขั้นตอนการทดสอบ (UT-DAO-US8-09 ถึง 15)

#### [UT-DAO-US8-09] อ่านวิชาโทของภาคที่มีวิชา
- **Related:** T05 (วิชาโท) · **Test method:** `findByDepartmentAndTerm_termWithMinorCourses_returnsMinorsWithAllCourses`
- **Test Steps:**
  1. เรียก `studyMinorRepository.findByDepartmentAndTerm(CS, 3, 1)`
  2. ตรวจ `minorId` ตามลำดับ และ `isLoaded(minor, "courses")`, `isLoaded(minorCourse, "course")`
  3. ตรวจรายการวิชาใน `courses` ของ MN-1 (`courseCode`, `studyYear`, `semester`)
- **Expected Result:**
  - คืน 2 วิชาโท `[MN-1, MN-OTHER]` เรียงตาม `sortOrder` (1, 3) แม้ MN-OTHER จะ insert ก่อน
  - MN-2 ไม่อยู่ในผล เพราะไม่มีวิชาใน 3/1 (กรองด้วย `exists`)
  - วิชาโทละ 1 object ไม่ซ้ำจากการ join · `minorName` ของ MN-1 เป็น `"วิทยาการข้อมูล"` (ภาษาไทยไม่เพี้ยน)
  - `courses` ของ MN-1 มี **4 วิชา** รวม `T8F01` (4/1) เรียง `T8N01 (3/1), T8N02 (3/1), T8M05 (3/1), T8F01 (4/1)` ยืนยันว่า query ไม่ตัดวิชาของภาคอื่นออกจาก collection ตาม T06
  - MN-OTHER (`CUR_B`) อยู่ในผลด้วย เพราะ query ไม่กรอง `curriculumName`

#### [UT-DAO-US8-10] กรองตามชั้นปีและภาคของวิชาในวิชาโท
- **Related:** T05 (วิชาโท) · **Test method:** `findByDepartmentAndTerm_fourthYear_returnsOnlyMinorsWithCoursesInThatTerm`
- **Test Steps:**
  1. เรียก `findByDepartmentAndTerm(CS, 4, 1)`
  2. เรียก `findByDepartmentAndTerm(CS, 4, 2)`
- **Expected Result:**
  - ข้อ 1 คืน `[MN-1]` (มี T8F01 ใน 4/1) ไม่มี MN-2, MN-OTHER
  - ข้อ 2 คืน `[MN-2]` (มี T8N01 ใน 4/2) ไม่มี MN-1 แม้ MN-1 จะมี T8N01 เหมือนกันแต่อยู่ 3/1

#### [UT-DAO-US8-11] ภาคที่ไม่มีวิชาโท และชั้นปี 1–2
- **Related:** T05 (ปี 1–2 ได้ `minors: []`) · **Test method:** `findByDepartmentAndTerm_noMinorCourseInTerm_returnsEmptyList`
- **Test Steps:**
  1. เรียก `findByDepartmentAndTerm(CS, 3, 2)`
  2. เรียก `findByDepartmentAndTerm(CS, 1, 1)` และ `findByDepartmentAndTerm(CS, 2, 1)`
- **Expected Result:**
  - ทั้ง 3 ครั้งคืน list ว่าง ไม่ throw

#### [UT-DAO-US8-12] `department` สะกดไม่ตรงกับ seed
- **Related:** T05 (กรณีข้อมูลว่าง) · **Test method:** `findByDepartmentAndTerm_departmentSpelledDifferently_returnsEmptyList`
- **Test Steps:**
  1. เรียก `findByDepartmentAndTerm(CS_TYPO, 3, 1)`
- **Expected Result:**
  - คืน list ว่าง

#### [UT-DAO-US8-13] อ่านวิชาโทตาม id พร้อมวิชาทุกภาค
- **Related:** T05 (`minorId`) · **Test method:** `findWithCoursesById_existingMinor_returnsAllCoursesSorted`
- **Test Steps:**
  1. เรียก `studyMinorRepository.findWithCoursesById(MN-1)`
  2. ตรวจ `isLoaded(minor, "courses")` และ `isLoaded(minorCourse, "course")`
- **Expected Result:**
  - `isPresent()` เป็น `true` · `department = CS`, `curriculumName = CUR_A`, `minorName = "วิทยาการข้อมูล"`, `sortOrder = 1` (ใช้เทียบกับ preset ใน `loadMinor`)
  - `courses` มี 4 วิชาเรียง `T8N01, T8N02, T8M05, T8F01` (ไม่ใช่ลำดับ insert `T8F01, T8M05, T8N01, T8N02`)
  - `T8N02` มี `credits = 4`

#### [UT-DAO-US8-14] id ของวิชาโทที่ไม่มีอยู่
- **Related:** T05 (404 ไม่พบ `minorId`) · **Test method:** `findWithCoursesById_unknownMinorId_returnsEmpty`
- **Test Steps:**
  1. เรียก `studyMinorRepository.findWithCoursesById(-1L)`
- **Expected Result:**
  - คืน `Optional.empty()` ไม่ throw

#### [UT-DAO-US8-15] เลือกวิชาของวิชาโทเฉพาะภาคของแผน
- **Related:** T05 (วิชาโท), CoS 1 · **Test method:** `coursesOf_givenTerm_returnsOnlyCoursesOfThatTermInSortOrder`
- **Test Steps:**
  1. โหลด MN-1 ด้วย `findWithCoursesById(MN-1).orElseThrow()` แล้วเรียก `em.clear()` ให้ MN-1 เป็น detached
  2. เรียก `mn1.coursesOf(3, 1)`, `mn1.coursesOf(4, 1)`, `mn1.coursesOf(3, 2)`
- **Expected Result:**
  - `coursesOf(3, 1)` คืน `Course` 3 ตัวเรียง `T8N01, T8N02, T8M05` (รวมหน่วยกิต `10`)
  - `coursesOf(4, 1)` คืน `[T8F01]`
  - `coursesOf(3, 2)` คืน list ว่าง (วิชาโทที่ไม่มีวิชาในภาคของ preset ไม่เพิ่มวิชาใด ไม่ใช่ error)
  - ไม่เกิด `LazyInitializationException` แม้ MN-1 เป็น detached ยืนยันว่า `coursesOf` กรองใน Java จาก `courses` ที่โหลดมาแล้ว ไม่ต้อง query เพิ่ม

---

## Test Cases ส่วนที่ 3: หา section ที่เปิดของวิชาในแผน (`SectionRepository.findByCourseCodesAndTerm`)

`ApplyPlanService.loadCandidates` รวมรหัสวิชาของแผนกับวิชาโทแล้วค้น section ครั้งเดียว method นี้มีอยู่แล้วจาก US1 (ทดสอบใน `SectionRepositoryTest` กับรายการวิชาจากการค้นหา) เคสส่วนนี้ทดสอบกับรายการรหัสของแผน ซึ่งมีวิชาที่ไม่เปิดในภาค วิชาที่ไม่มีคาบเรียน และรหัสซ้ำระหว่างแผนกับวิชาโท

| TC ID | สถานการณ์ | Input | Expected Result | Actual Result | Status |
| --- | --- | --- | --- | --- | --- |
| UT-DAO-US8-16 | หา section ของทุกวิชาในแผน | รหัสวิชาของ P-BASIC, 2568, 1 | คืน 6 section เรียง `courseCode` แล้ว `sectionNo`: T8G02 (780001, 780002, 780003), T8M01, T8M02, T8M04 พร้อม `course` และ `slots` |  | ยังไม่รัน |
| UT-DAO-US8-17 | แผนที่มีวิชาไม่เปิดในภาค วิชาไม่มีคาบ และรหัสซ้ำกับวิชาโท | รหัสของ P-CONFLICT + P-COOP + `MN-1.coursesOf(3, 1)`, 2568, 1 | คืน 6 section: T8C01 (`slots` ว่าง), T8G01, T8M03, T8M05 (ครั้งเดียว), T8N01, T8N02; ไม่มี T8X01 |  | ยังไม่รัน |
| UT-DAO-US8-18 | ภาคหรือปีการศึกษาที่ไม่มี section | รหัสชุดเดียวกับ 17, (2568, 2) และ (2569, 1) | (2568, 2) คืน `[T8X01 010001]` · (2569, 1) คืน list ว่าง |  | ยังไม่รัน |

### รายละเอียดขั้นตอนการทดสอบ (UT-DAO-US8-16 ถึง 18)

#### [UT-DAO-US8-16] หา section ของทุกวิชาในแผน
- **Related:** CoS 1, CoS 3 · **Test method:** `findByCourseCodesAndTerm_planCourseCodes_returnsSectionsWithCourseAndSlots`
- **Test Steps:**
  1. โหลด P-BASIC ด้วย `findWithCoursesById` แล้วเก็บรหัสวิชาเป็น `List.of("T8M01", "T8M02", "T8M04", "T8G02")`
  2. เรียก `sectionRepository.findByCourseCodesAndTerm(codes, 2568, 1)`
  3. ตรวจ `isLoaded(section, "course")` และ `isLoaded(section, "slots")` ของทุก section
- **Expected Result:**
  - คืน 6 section ตามลำดับ (`courseCode`, `sectionNo`): `T8G02 780001`, `T8G02 780002`, `T8G02 780003`, `T8M01 010001`, `T8M02 010001`, `T8M04 010001` (T8G02 780001 มาก่อน 780002 แม้ insert ทีหลัง)
  - คาบเรียนตรงตาม fixture ทุกตัว เช่น `T8M01` = MONDAY 09:30–12:30 และ `T8M04` = MONDAY 12:30–14:00 (ให้ `PlanScheduler` ตรวจเวลาชนได้ถูก)
  - section ละ 1 object ไม่ซ้ำจากการ join คาบเรียน

#### [UT-DAO-US8-17] แผนที่มีวิชาไม่เปิดในภาค วิชาไม่มีคาบ และรหัสซ้ำกับวิชาโท
- **Related:** CoS 1, CoS 2, T04 (ไม่มี section เปิด), T05 (วิชาโท) · **Test method:** `findByCourseCodesAndTerm_planAndMinorCodes_skipsUnofferedCourseAndReturnsEachSectionOnce`
- **Test Steps:**
  1. สร้างรายการรหัสตามลำดับ: วิชาของ P-CONFLICT (`T8M03, T8G01, T8X01`) + P-COOP (`T8M05, T8C01`) + `MN-1.coursesOf(3, 1)` (`T8N01, T8N02, T8M05`) รวม 8 รหัส โดย `T8M05` อยู่ 2 ครั้ง
  2. เรียก `findByCourseCodesAndTerm(codes, 2568, 1)`
- **Expected Result:**
  - คืน 6 section ตามลำดับ: `T8C01 010001`, `T8G01 780001`, `T8M03 010001`, `T8M05 010001`, `T8N01 990001`, `T8N02 990001`
  - `T8M05` มี 1 section แม้รหัสจะอยู่ในรายการ 2 ครั้ง
  - ไม่มี `T8X01` เพราะเปิดเฉพาะภาค 2 (service ใช้ข้อนี้ตัดสินว่าเป็น `NO_SECTION_AVAILABLE`)
  - `T8C01` อยู่ในผลและ `slots` เป็น list ว่าง (โหลดแล้ว ไม่ใช่ `null`) ยืนยันว่า `left join fetch` ไม่ตัดวิชาที่ไม่มีคาบเรียน

#### [UT-DAO-US8-18] ภาคหรือปีการศึกษาที่ไม่มี section
- **Related:** T04 (ไม่มี section เปิด) · **Test method:** `findByCourseCodesAndTerm_otherTerm_returnsOnlySectionsOfThatTerm`
- **Test Steps:**
  1. ใช้รายการรหัสชุดเดียวกับ UT-DAO-US8-17
  2. เรียก `findByCourseCodesAndTerm(codes, 2568, 2)`
  3. เรียก `findByCourseCodesAndTerm(codes, 2569, 1)`
- **Expected Result:**
  - ข้อ 2 คืน 1 section คือ `T8X01 010001` (`semester = 2`)
  - ข้อ 3 คืน list ว่าง (preset ไม่ผูกปีการศึกษา ปีที่ยังไม่มี section จึงไม่มีวิชาให้เพิ่ม)

---

## Test Cases ส่วนที่ 4: บันทึกหลายวิชาลงตาราง และ rollback เมื่อผิดพลาด

ทดสอบขั้น `ApplyPlanService.saveAdded` ตาม Sequence Diagram Confirm ของ T06: สร้างหรือโหลด `Timetable` → `touch()` → `TimetableRepository.save` → `TimetableEntryRepository.saveAll` (1 entry ต่อ 1 section) ทั้งหมดใน transaction เดียว

`Timetable` มีแค่ `@NoArgsConstructor` ให้สร้างตารางใหม่ด้วย `new Timetable()` + setter (`studentId`, `academicYear`, `semester`) แบบ `TimetableService` ถ้า T09 เพิ่ม constructor ตาม Sequence Diagram ใช้แทนได้

**เคส 19–20** ใช้ transaction ของเทสตามปกติ (rollback หลังจบ)

**เคส 21–22** ต้องดูผลหลัง transaction rollback จริง จึงทำแบบนี้ใน `ApplyPlanSaveRollbackTest`:

1. ใส่ `@Transactional(propagation = Propagation.NOT_SUPPORTED)` ที่คลาส ให้เทสไม่อยู่ใน transaction ของ `@DataJpaTest`
2. สร้าง `TransactionTemplate` จาก `PlatformTransactionManager` ที่ inject มา
3. `@BeforeEach` เตรียมข้อมูลใน `transactionTemplate.executeWithoutResult(...)` ซึ่ง commit จริง ใช้เฉพาะข้อมูลที่เคสต้องใช้: วิชา `T8R01` (`"วิชาทดสอบย้อนกลับ 1"`, MAJOR, 3, กลุ่ม `010001` MONDAY 09:30–12:30) และ `T8R02` (`"วิชาทดสอบย้อนกลับ 2"`, MAJOR, 3, กลุ่ม `010001` TUESDAY 09:30–12:30) ภาค 1/2568 และ TT-R ของ `"6609000802"` ภาค 1/2568 `updated_at = OLD` มี entry ของ T8R02 รหัส `T8R` ใช้เฉพาะคลาสนี้ จึงไม่ชนกับ `StudyPlanFixture`
4. ในเคส เรียกขั้น `saveAdded` ภายใน `transactionTemplate.execute(...)` และ `assertThrows(DataIntegrityViolationException.class, ...)` ครอบไว้ เมื่อ exception ออกจาก callback `TransactionTemplate` จะ rollback
5. ตรวจผลด้วย `JdbcTemplate` (นอก transaction) ว่าแถวใน DB เหมือนก่อนเรียก
6. `@AfterEach` ลบข้อมูลที่ commit ไว้ตามลำดับ `DELETE FROM timetable WHERE student_id IN ('6609000801', '6609000802')` (entry ลบตาม `ON DELETE CASCADE`) → `DELETE FROM section WHERE course_code IN ('T8R01', 'T8R02')` (คาบเรียนลบตาม cascade) → `DELETE FROM course WHERE course_code IN ('T8R01', 'T8R02')` ต้องลบให้หมดเสมอ เพราะคลาสเทสทุกตัวใช้ container เดียวกัน ถ้าค้างจะทำให้ `count()` ของเทสอื่นผิด

id ของ `timetable_entry` เป็น IDENTITY ทำให้ Hibernate ส่ง `INSERT` ทันทีตอน `saveAll` แถวแรกของ batch จึงถึง DB แล้วก่อนแถวที่ผิด constraint ผลที่ตรวจในเคส 21–22 จึงพิสูจน์ว่า rollback เอาแถวที่เขียนไปแล้วออกจริง (exception อาจเกิดตอน `saveAll` หรือตอน `flush` ให้ครอบทั้งสองขั้นไว้ใน `assertThrows` เดียว)

| TC ID | สถานการณ์ | Input | Expected Result | Actual Result | Status |
| --- | --- | --- | --- | --- | --- |
| UT-DAO-US8-19 | ยังไม่มีตารางของภาค สร้างตารางใหม่และบันทึกหลายวิชา | `"6609000801"`, 2568/1, section ของ T8M01, T8M02, T8M04, T8G02 780001 | ได้ตารางใหม่ 1 แถวที่มี `timetableId`; `findByTimetableId` คืน 4 entry ตรงตาม section; `updatedAt` ไม่เป็น `null` |  | ยังไม่รัน |
| UT-DAO-US8-20 | มีตารางเดิมอยู่แล้ว เพิ่มวิชาของแผนต่อท้าย | TT-OLD + section ของ T8M01, T8M04 | ไม่สร้างตารางใหม่; TT-OLD มี 3 entry (E-OLD + 2); `updatedAt` เปลี่ยนจาก `OLD` |  | ยังไม่รัน |
| UT-DAO-US8-21 | บันทึกหลายวิชาลงตารางเดิม แต่มี 1 วิชาผิด constraint | TT-R + `saveAll([T8R01, T8R02])` (T8R02 มีอยู่แล้ว) | throw `DataIntegrityViolationException`; หลัง rollback TT-R ยังมี 1 entry (T8R02), ไม่มี entry ของ T8R01, `updated_at` ยังเป็น `OLD` |  | ยังไม่รัน |
| UT-DAO-US8-22 | สร้างตารางใหม่แล้วบันทึกหลายวิชา แต่ batch มี section ซ้ำ | `"6609000801"`, 2568/1, `saveAll([T8R01, T8R01])` | throw `DataIntegrityViolationException`; หลัง rollback ไม่มีตารางของ `"6609000801"` ภาค 1/2568 และจำนวนแถว `timetable_entry` ทั้งหมดเท่าเดิม (1) |  | ยังไม่รัน |

### รายละเอียดขั้นตอนการทดสอบ (UT-DAO-US8-19 ถึง 22)

#### [UT-DAO-US8-19] ยังไม่มีตารางของภาค สร้างตารางใหม่และบันทึกหลายวิชา
- **Related:** CoS 1 · **Test method:** `saveAll_newTimetableWithPlanSections_insertsTimetableAndAllEntries`
- **Test Steps:**
  1. ตรวจ `timetableRepository.findByStudentIdAndAcademicYearAndSemester("6609000801", 2568, 1)` เป็น `Optional.empty()`
  2. สร้าง `Timetable` ใหม่ (`studentId = "6609000801"`, `academicYear = 2568`, `semester = 1`) แล้วเรียก `touch()` และ `timetableRepository.save(timetable)`
  3. โหลด section ของ T8M01, T8M02, T8M04 และ T8G02 กลุ่ม 780001 ด้วย `em.find(Section.class, id)` สร้าง `TimetableEntry` 4 ตัว แล้วเรียก `entryRepository.saveAll(entries)`
  4. เรียก `em.flush()` และ `em.clear()` แล้วโหลดตารางและ `findByTimetableId` กลับมาตรวจ
- **Expected Result:**
  - มีตารางของ `"6609000801"` ภาค 1/2568 1 แถว `timetableId` ไม่เป็น `null` และ `updatedAt` ไม่เป็น `null`
  - `findByTimetableId` คืน 4 entry และ `sectionId` ตรงกับ 4 section ที่ส่ง · หน่วยกิตรวม `12`
  - ตาราง TT-OLD ของ `"6609000802"` ยังมี 1 entry เท่าเดิม

#### [UT-DAO-US8-20] มีตารางเดิมอยู่แล้ว เพิ่มวิชาของแผนต่อท้าย
- **Related:** CoS 1, CoS 2 · **Test method:** `saveAll_existingTimetable_appendsEntriesAndTouchesUpdatedAt`
- **Test Steps:**
  1. โหลด TT-OLD ด้วย `findByStudentIdAndAcademicYearAndSemester("6609000802", 2568, 1).orElseThrow()`
  2. เรียก `touch()` และ `timetableRepository.save(ttOld)`
  3. สร้าง entry ของ section T8M01 และ T8M04 แล้ว `entryRepository.saveAll(entries)`
  4. เรียก `em.flush()` และ `em.clear()` แล้วโหลดกลับมาตรวจ และนับแถว `timetable` ของ `"6609000802"`
- **Expected Result:**
  - ยังมีตารางของ `"6609000802"` ภาค 1/2568 1 แถว และ `timetableId` เท่าเดิม (ไม่สร้างแถวใหม่ ไม่ชน `uq_timetable_student_term`)
  - `findByTimetableId(TT-OLD)` คืน 3 entry: E-OLD (T8M02) ตามด้วย T8M01 และ T8M04 ตาม `entryId` (วิชาเดิมไม่ถูกลบหรือแทนที่)
  - `updatedAt` อ่านจาก DB แล้วมากกว่า `OLD`

#### [UT-DAO-US8-21] บันทึกหลายวิชาลงตารางเดิม แต่มี 1 วิชาผิด constraint
- **Related:** CoS 2, Sequence Diagram Confirm (all-or-nothing) · **Test method:** `saveAll_existingTimetableWithDuplicateSection_rollsBackWholeBatch`
- **Test Steps:**
  1. อ่านค่าก่อนเรียกด้วย `JdbcTemplate`: จำนวน entry ของ TT-R (`1`) และ `updated_at` ของ TT-R (`OLD`)
  2. ใน `transactionTemplate.execute(...)`: โหลด TT-R → `touch()` → `timetableRepository.save(ttR)` → สร้าง entry ของ T8R01 และ T8R02 ตามลำดับ → `entryRepository.saveAll(entries)` → `entryRepository.flush()`
  3. ครอบข้อ 2 ด้วย `assertThrows(DataIntegrityViolationException.class, ...)`
  4. อ่านค่าหลังเรียกด้วย `JdbcTemplate`
- **Expected Result:**
  - ข้อ 2 throw `DataIntegrityViolationException` จาก `uq_timetable_entry_section` เพราะ T8R02 มีในตารางอยู่แล้ว (จำลองกรณีวิชาถูกเพิ่มจากแท็บอื่นหลัง scheduler อ่านตาราง)
  - TT-R ยังมี 1 entry คือ T8R02 และไม่มีแถวของ section T8R01 ใน `timetable_entry` (แถวที่ insert ไปก่อนถูก rollback)
  - `updated_at` ของ TT-R ยังเป็น `OLD` (`touch()` ถูก rollback ด้วย)

#### [UT-DAO-US8-22] สร้างตารางใหม่แล้วบันทึกหลายวิชา แต่ batch มี section ซ้ำ
- **Related:** CoS 2, Sequence Diagram Confirm (all-or-nothing) · **Test method:** `saveAll_newTimetableWithDuplicateInBatch_rollsBackTimetableAndEntries`
- **Test Steps:**
  1. อ่านจำนวนแถว `timetable_entry` ทั้งหมดก่อนเรียก (`1`)
  2. ใน `transactionTemplate.execute(...)`: สร้าง `Timetable` ใหม่ของ `"6609000801"` ภาค 1/2568 → `touch()` → `save` → สร้าง entry ของ section T8R01 **2 ตัว** → `saveAll` → `flush()`
  3. ครอบข้อ 2 ด้วย `assertThrows(DataIntegrityViolationException.class, ...)`
  4. อ่านค่าหลังเรียกด้วย `JdbcTemplate`
- **Expected Result:**
  - ข้อ 2 throw `DataIntegrityViolationException` จาก `uq_timetable_entry_section`
  - `SELECT COUNT(*) FROM timetable WHERE student_id = '6609000801' AND academic_year = 2568 AND semester = 1` ได้ `0` (ตารางที่สร้างใหม่ถูก rollback ด้วย ไม่เหลือตารางว่าง)
  - จำนวนแถว `timetable_entry` ทั้งหมดยังเป็น `1`

---

## Test Cases ส่วนที่ 5: Schema และ Constraint ของตาราง US8

ตรวจข้อกำหนดในตาราง "ข้อกำหนดของตาราง" ของ ER Diagram (US8-T06) ทุกเคสใช้ `StudyPlanFixture` แล้ว insert แถวที่ผิดด้วย native SQL แบบ UT-DAO-21 ของ US1 คาดว่า throw `PersistenceException` ที่มี `org.hibernate.exception.ConstraintViolationException` อยู่ใน cause และ `getConstraintName()` ตรงกับชื่อ constraint ที่ระบุ (ไม่สนตัวพิมพ์) การที่ Hibernate validate ผ่านกับ entity ใหม่และ migration ใหม่ถูกรัน ตรวจโดย UT-DAO-17 ของ US1 (`contextLoads_flywayMigrationMatchesEntities`) อยู่แล้วโดยไม่ต้องแก้

| TC ID | สถานการณ์ | Input | Expected Result | Actual Result | Status |
| --- | --- | --- | --- | --- | --- |
| UT-DAO-US8-23 | ชั้นปีกับ `plan_type` ไม่สอดคล้องกัน | `@ParameterizedTest` 7 ค่า (ดูรายละเอียด) | ทุกค่าถูกปฏิเสธด้วย `ck_study_plan_plan_type` |  | ยังไม่รัน |
| UT-DAO-US8-24 | ภาคเรียนนอก 1, 2 | `study_plan.semester` = 3 และ 0 | ถูกปฏิเสธด้วย `ck_study_plan_semester` |  | ยังไม่รัน |
| UT-DAO-US8-25 | แผนซ้ำในหลักสูตร ชั้นปี ภาค (รวมกรณี `plan_type` เป็น `NULL`) | ซ้ำกับ P-BASIC และซ้ำกับ P-COOP | ถูกปฏิเสธด้วย `uq_study_plan`; ปี 4 ภาค 1 `CO_OP` ใหม่ insert ได้ |  | ยังไม่รัน |
| UT-DAO-US8-26 | วิชาในแผนผิด key | วิชาซ้ำ, `sort_order` ซ้ำ, รหัสวิชาไม่มีอยู่, `plan_id` ไม่มีอยู่ | ถูกปฏิเสธด้วย `pk_study_plan_course`, `uq_study_plan_course_order`, `fk_study_plan_course_course`, `fk_study_plan_course_plan` |  | ยังไม่รัน |
| UT-DAO-US8-27 | ลบแผนแล้ววิชาในแผนหายตาม | `DELETE` P-BASIC | แถวของ P-BASIC ใน `study_plan_course` หมด (11 → 7); แถวของแผนอื่นและ `course` ยังอยู่ |  | ยังไม่รัน |
| UT-DAO-US8-28 | วิชาโทซ้ำในหลักสูตร | ชื่อซ้ำกับ MN-1, `sort_order` ซ้ำกับ MN-1 | ถูกปฏิเสธด้วย `uq_study_minor`, `uq_study_minor_order`; `sort_order = 1` ใน `CUR_B` insert ได้ |  | ยังไม่รัน |
| UT-DAO-US8-29 | วิชาในวิชาโทผิดเงื่อนไข | ชั้นปี 2 / 5, ภาค 3, วิชาซ้ำต่างภาค, `sort_order` ซ้ำ, รหัสวิชาไม่มีอยู่ | ถูกปฏิเสธด้วย constraint ตามรายละเอียด |  | ยังไม่รัน |
| UT-DAO-US8-30 | ลบวิชาโทแล้ววิชาในวิชาโทหายตาม | `DELETE` MN-1 | แถวของ MN-1 ใน `study_minor_course` หมด (6 → 2); MN-2, MN-OTHER ยังอยู่ |  | ยังไม่รัน |

### รายละเอียดขั้นตอนการทดสอบ (UT-DAO-US8-23 ถึง 30)

#### [UT-DAO-US8-23] ชั้นปีกับ `plan_type` ไม่สอดคล้องกัน (`ck_study_plan_plan_type`)
- **Related:** T05 (แผนปี 3–4), ER Constraint · **Test method:** `insertPlan_studyYearAndPlanTypeMismatch_throwsConstraintViolation` (`@ParameterizedTest` + `@CsvSource`)
- **Test Steps:** insert `study_plan` (`department = CS`, `curriculum_name = "หลักสูตรทดสอบ C"`, `semester = 1`) ทีละค่า:

  | `study_year` | `plan_type` | เหตุผล |
  | --- | --- | --- |
  | 1 | `SPECIAL_PROJECT` | ปี 1–2 ต้องไม่มีแผน |
  | 2 | `CO_OP` | ปี 1–2 ต้องไม่มีแผน |
  | 3 | `NULL` | ปี 3–4 ต้องระบุแผน |
  | 4 | `NULL` | ปี 3–4 ต้องระบุแผน |
  | 3 | `MINOR` | ค่าไม่อยู่ใน enum `PlanType` |
  | 5 | `SPECIAL_PROJECT` | ชั้นปีเกิน 4 |
  | 0 | `NULL` | ชั้นปีน้อยกว่า 1 |

- **Expected Result:**
  - ทุกค่า throw `PersistenceException` ที่มี `ConstraintViolationException` ของ `ck_study_plan_plan_type`
  - กรณีที่ถูกต้อง (ปี 1–2 + `NULL`, ปี 3 + `CO_OP` / `SPECIAL_PROJECT`) insert ได้อยู่แล้วใน fixture
  - **หมายเหตุ:** ถ้าใช้ SQL ใน ER Diagram ของ T06 ตรงตัว ค่า (3, `NULL`) และ (4, `NULL`) จะ **insert ได้** (เคสนี้ Fail) ดูหัวข้อ "สิ่งที่ต้องแก้ใน T06 / T09"

#### [UT-DAO-US8-24] ภาคเรียนนอก 1, 2 (`ck_study_plan_semester`)
- **Related:** ER Constraint (ไม่มีภาคฤดูร้อน) · **Test method:** `insertPlan_semesterOutOfRange_throwsConstraintViolation` (`@ParameterizedTest` ค่า 3 และ 0)
- **Test Steps:**
  1. insert `study_plan` (`CS`, `"หลักสูตรทดสอบ C"`, `study_year = 1`, `semester = <ค่า>`, `plan_type = NULL`)
- **Expected Result:**
  - throw `PersistenceException` ที่มี `ConstraintViolationException` ของ `ck_study_plan_semester`

#### [UT-DAO-US8-25] แผนซ้ำในหลักสูตร ชั้นปี ภาค (`uq_study_plan`)
- **Related:** ER Constraint · **Test method:** `insertPlan_duplicatePlanOfTerm_throwsConstraintViolation` (`@ParameterizedTest` 2 ค่า) และ `insertPlan_otherPlanTypeOfFourthYear_succeeds`
- **Test Steps:**
  1. insert `(CS, CUR_A, 2, 1, NULL)` ซ้ำกับ P-BASIC
  2. insert `(CS, CUR_A, 3, 1, 'CO_OP')` ซ้ำกับ P-COOP
  3. (เทสแยก) insert `(CS, CUR_A, 4, 1, 'CO_OP')` แล้วนับแถวของ `CUR_A` ชั้นปี 4 ภาค 1
- **Expected Result:**
  - ข้อ 1 throw ด้วย `uq_study_plan` (SQL Server นับ `NULL` เป็นค่าเดียวกันใน UNIQUE constraint ปี 1–2 จึงมีได้ 1 แผนต่อหลักสูตร/ภาค)
  - ข้อ 2 throw ด้วย `uq_study_plan`
  - ข้อ 3 insert ได้ และนับได้ `1` (ชั้นปีเดียวกันมีทั้ง `SPECIAL_PROJECT` และ `CO_OP` ได้ เห็นจาก P-COOP กับ P-CONFLICT ใน fixture)

#### [UT-DAO-US8-26] วิชาในแผนผิด key (`study_plan_course`)
- **Related:** ER Constraint · **Test method:** `insertPlanCourse_invalidKey_throwsConstraintViolation` (`@ParameterizedTest` 4 ค่า)
- **Test Steps:** insert `study_plan_course (plan_id, course_code, sort_order)` ทีละค่า:

  | ค่า | ผิดเพราะ | constraint ที่คาดหวัง |
  | --- | --- | --- |
  | (P-BASIC, `T8M01`, 9) | วิชาซ้ำในแผนเดียวกัน | `pk_study_plan_course` |
  | (P-BASIC, `T8F01`, 1) | `sort_order` ซ้ำในแผน | `uq_study_plan_course_order` |
  | (P-BASIC, `ZZ999`, 9) | ไม่มีรหัสวิชานี้ใน `course` | `fk_study_plan_course_course` |
  | (-1, `T8M01`, 1) | ไม่มีแผนนี้ | `fk_study_plan_course_plan` |

- **Expected Result:**
  - ทุกค่า throw `PersistenceException` ที่มี `ConstraintViolationException` ของ constraint ตามตาราง
  - วิชาเดียวกันอยู่ต่างแผนได้ (T8M02 อยู่ทั้ง P-BASIC และ P-SECOND ใน fixture)

#### [UT-DAO-US8-27] ลบแผนแล้ววิชาในแผนหายตาม (`fk_study_plan_course_plan ON DELETE CASCADE`)
- **Related:** ER Constraint · **Test method:** `deletePlan_cascadesToPlanCoursesOnly`
- **Test Steps:**
  1. รัน `DELETE FROM study_plan WHERE plan_id = :pBasic` ด้วย native SQL
  2. นับแถวใน `study_plan_course` ทั้งหมดและของ P-BASIC และนับ `course` รหัส `T8M01`
- **Expected Result:**
  - แถวของ P-BASIC ใน `study_plan_course` เหลือ `0` · ทั้งตารางจาก `11` เหลือ `7`
  - แถว `T8M02` ของ P-SECOND ยังอยู่ · `course` `T8M01` ยังอยู่ (`1` แถว)

#### [UT-DAO-US8-28] วิชาโทซ้ำในหลักสูตร (`uq_study_minor`, `uq_study_minor_order`)
- **Related:** ER Constraint · **Test method:** `insertMinor_duplicateNameOrOrder_throwsConstraintViolation` (`@ParameterizedTest` 2 ค่า) และ `insertMinor_sameOrderInOtherCurriculum_succeeds`
- **Test Steps:**
  1. insert `study_minor (CS, CUR_A, "วิทยาการข้อมูล", 9)` ชื่อซ้ำกับ MN-1
  2. insert `study_minor (CS, CUR_A, "วิศวกรรมซอฟต์แวร์", 1)` `sort_order` ซ้ำกับ MN-1
  3. (เทสแยก) insert `study_minor (CS, CUR_B, "วิศวกรรมซอฟต์แวร์", 1)`
- **Expected Result:**
  - ข้อ 1 throw ด้วย `uq_study_minor` · ข้อ 2 throw ด้วย `uq_study_minor_order`
  - ข้อ 3 insert ได้ (ลำดับปุ่มแยกตามหลักสูตร)

#### [UT-DAO-US8-29] วิชาในวิชาโทผิดเงื่อนไข (`study_minor_course`)
- **Related:** T05 (วิชาโทเฉพาะปี 3–4), ER Constraint · **Test method:** `insertMinorCourse_invalidRow_throwsConstraintViolation` (`@ParameterizedTest` 6 ค่า)
- **Test Steps:** insert `study_minor_course (minor_id, course_code, study_year, semester, sort_order)` ทีละค่า:

  | ค่า | ผิดเพราะ | constraint ที่คาดหวัง |
  | --- | --- | --- |
  | (MN-1, `T8G01`, 2, 1, 9) | วิชาโทเลือกได้เฉพาะปี 3–4 | `ck_study_minor_course_year` |
  | (MN-1, `T8G01`, 5, 1, 9) | ชั้นปีเกิน 4 | `ck_study_minor_course_year` |
  | (MN-1, `T8G01`, 3, 3, 9) | ไม่มีภาคฤดูร้อน | `ck_study_minor_course_semester` |
  | (MN-1, `T8N01`, 4, 2, 9) | วิชาเดียวกันอยู่ในวิชาโทเดียวกันได้ภาคเดียว (T8N01 อยู่ 3/1 แล้ว) | `pk_study_minor_course` |
  | (MN-1, `T8G01`, 3, 1, 1) | `sort_order` ซ้ำในภาคเดียวกัน (T8N01) | `uq_study_minor_course_order` |
  | (MN-1, `ZZ999`, 3, 1, 9) | ไม่มีรหัสวิชานี้ใน `course` | `fk_study_minor_course_course` |

- **Expected Result:**
  - ทุกค่า throw `PersistenceException` ที่มี `ConstraintViolationException` ของ constraint ตามตาราง
  - วิชาเดียวกันอยู่ต่างวิชาโทได้ (T8N01 อยู่ใน MN-1, MN-2, MN-OTHER ใน fixture)

#### [UT-DAO-US8-30] ลบวิชาโทแล้ววิชาในวิชาโทหายตาม (`fk_study_minor_course_minor ON DELETE CASCADE`)
- **Related:** ER Constraint · **Test method:** `deleteMinor_cascadesToMinorCoursesOnly`
- **Test Steps:**
  1. รัน `DELETE FROM study_minor WHERE minor_id = :mn1` ด้วย native SQL
  2. นับแถวใน `study_minor_course` ทั้งหมดและของ MN-1
- **Expected Result:**
  - แถวของ MN-1 เหลือ `0` · ทั้งตารางจาก `6` เหลือ `2` (T8N01 ของ MN-2 และ MN-OTHER)
  - `course` `T8N01`, `T8N02`, `T8M05`, `T8F01` ยังอยู่

---

## สิ่งที่ต้องแก้ใน T06 / T09

ตรวจ SQL ใน ER Diagram ของ US8-T06 (PR #84 ฉบับ `76b4950`) กับ SQL Server 2025 (`mcr.microsoft.com/mssql/server:2025-latest`) โดย insert ข้อมูลตั้งต้นของเอกสารนี้แล้วลองทุกค่าในส่วนที่ 5: constraint ทุกตัวปฏิเสธตามที่คาด ยกเว้น 1 ข้อ

1. **`ck_study_plan_plan_type` ยอมให้ชั้นปี 3–4 มี `plan_type = NULL`** เพราะ `NULL IN ('SPECIAL_PROJECT', 'CO_OP')` ได้ผล UNKNOWN และ CHECK ของ SQL Server ถือว่า UNKNOWN ผ่าน ขัดกับที่ ER เขียนว่า "ปี 3–4 ต้องเป็น `SPECIAL_PROJECT` หรือ `CO_OP` เท่านั้น" ถ้า seed ลืมใส่ `plan_type` ของปี 3–4 จะได้แผนที่ `planType = null` ปนกับแผนหัวข้อพิเศษ/สหกิจ เสนอให้ migration ของ T09 เขียนเป็น

   ```sql
   CONSTRAINT ck_study_plan_plan_type CHECK (
       (study_year IN (1, 2) AND plan_type IS NULL)
       OR (study_year IN (3, 4) AND plan_type IS NOT NULL AND plan_type IN ('SPECIAL_PROJECT', 'CO_OP'))
   )
   ```

   ทดสอบแล้วฉบับนี้ปฏิเสธ (3, `NULL`), (4, `NULL`), (1, `CO_OP`), (5, `NULL`), (3, ค่าอื่น) และรับ (1, `NULL`), (2, `NULL`), (3, `SPECIAL_PROJECT`), (4, `CO_OP`) UT-DAO-US8-23 เขียนตามฉบับนี้
2. ผลอื่นที่ยืนยันแล้วบน SQL Server: `uq_study_plan` ปฏิเสธแผนซ้ำที่ `plan_type` เป็น `NULL` (UT-25) · `ON DELETE CASCADE` ลบเฉพาะแถวลูก (UT-27, 30) · ลำดับของ query ตรงกับที่เขียนในเคส 01, 03, 09 และ collation `SQL_Latin1_General_CP1_CI_AS` เรียงรหัส `T8C01 < T8G01 < T8G02 < T8M01 < ... < T8N02` ตามเคส 16–17

---

## Traceability Matrix

คอลัมน์ CoS ใช้เลข Conditions of Satisfaction ของการ์ด US8 หลังทีมตัด TC2 และ TC5 เดิมออก (1 = เพิ่มวิชาที่จำเป็นต้องลงทะเบียนตามแผน, 2 = ไม่เพิ่มวิชาที่มีในตารางซ้ำ, 3 = เวลาชน) แบบเดียวกับ US8-T14 (PR #86) และ US8-T16 (PR #85) ส่วน "T04" คือกรณีที่การ์ด US8-T04 ให้ครอบคลุมเพิ่ม และ "T05" คือกรณีจาก US8-T05 ที่ไม่ได้อยู่ใน CoS

| CoS / ข้อกำหนดของ US8 | บทบาทของชั้น DAO ที่ต้องรองรับ | TC ID ที่ครอบคลุม |
| --- | --- | --- |
| **CoS 1:** เพิ่มวิชาที่จำเป็นตามแผนของชั้นปีและภาค | อ่านแผนตามสาขา ชั้นปี ภาค พร้อมวิชาเรียงตามลำดับ, หา section ของวิชาในแผน, บันทึกตารางและหลายวิชาในครั้งเดียว | UT-DAO-US8-01 – 08, 15 – 17, 19, 20 |
| **CoS 2:** ไม่เพิ่มวิชาที่มีในตารางแล้วซ้ำ | คืน section ไม่ซ้ำแม้รหัสวิชาซ้ำระหว่างแผนกับวิชาโท, ไม่แทนที่วิชาเดิมในตาราง, DB กัน section ซ้ำและ rollback ทั้งชุด | UT-DAO-US8-17, 20, 21, 22 |
| **CoS 3:** วิชาที่เวลาชนไม่ถูกเพิ่ม | คืนคาบเรียนของทุก section ครบและตรง (รวมวิชาที่ไม่มีคาบ) ให้ `PlanScheduler` ตรวจเวลาชน | UT-DAO-US8-16, 17 |
| **T04:** วิชาที่ไม่มี section เปิดในภาค | ไม่คืน section ของวิชาที่ไม่เปิดในภาค/ปีที่ขอ | UT-DAO-US8-17, 18 |
| **T04:** หน่วยกิตเกิน 22 | อ่าน `credits` ของวิชาในแผนและวิชาโทได้ถูกต้อง | UT-DAO-US8-07, 13, 15, 19 |
| **T05:** แผนชั้นปี 3–4 (หัวข้อพิเศษ / สหกิจ) | คืนทั้ง 2 แผนพร้อม `planType` เป็น enum, DB บังคับ `plan_type` ตามชั้นปี | UT-DAO-US8-03, 23, 25 |
| **T05:** วิชาโท | อ่านวิชาโทที่มีวิชาในภาค, โหลดวิชาครบทุกภาค, เลือกวิชาเฉพาะภาค, 404 เมื่อไม่พบ | UT-DAO-US8-09 – 15, 28 – 30 |
| **กรณีข้อมูลว่าง** | ชั้นปี/ภาคที่ไม่มีแผนหรือวิชาโท, `department` สะกดไม่ตรง, แผนไม่มีวิชา, id ไม่มีอยู่ | UT-DAO-US8-04, 05, 06, 08, 11, 12, 14, 18 |
| **ER Diagram Constraint** | CHECK, UNIQUE, PK, FK และ `ON DELETE CASCADE` ของ 4 ตารางใหม่ | UT-DAO-US8-23 – 30 |

---

## สรุปผลการทดสอบ

กรอกหลังรัน `./mvnw test` ใน US8-T09

| รายการ | ค่า |
| --- | --- |
| จำนวน test case ทั้งหมด | 30 |
| Pass |  |
| Fail |  |
| ผู้ทดสอบ |  |
| วันที่ทดสอบ |  |

---

## เอกสารที่เกี่ยวข้อง

- DAO Class Diagram, ER Diagram (DB), Sequence Diagram ทั้ง 3 ไฟล์ (US8-T06 · PR #84)
- DTO & API Spec, API Class Diagram (US8-T05 · PR #83)
- Integration Test Cases ระหว่าง API กับ DAO (US8-T14 · PR #86)
- UAT Test Cases (US8-T16 · PR #85)
- [US1-T06 DAO Class Diagram](../../US1/T06/US1-T06-DAO-Class-Diagram.md)
- [US1-T12 Design Unit Test Cases ส่วน DAO](../../US1/T12/US1-T12%20Design%20Unit%20Test%20Cases%20ส่วน%20DAO.md)
- [US2-T12 Design Unit Test Cases ส่วน DAO](../../US2/T12/US2-T12-DAO-Unit-Test-Cases.md)
- [US3-T12 Design Unit Test Cases ส่วน DAO](../../US3/T12/US3-T12-DAO-Unit-Test-Cases.md)
