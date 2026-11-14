# US8-T09 ผลการทดสอบ Unit Test ส่วน DAO

Nov 14, 2026 · @Non

## สรุปผล

รัน unit test 30 กรณีตามเอกสาร [US8-T12 Design Unit Test Cases ส่วน DAO](../T12/US8-T12-DAO-Unit-Test-Cases.md) (branch `docs/US8-T12-design-unit-test-dao` commit `7cf987a` ยังไม่ merge เข้า `main`) กับโค้ด DAO ของ US8-T09 **ผ่านครบ 30/30** และกรณีที่เพิ่มใน T09 หลังเพิ่ม `plan_type` ในวิชาโท (UT-DAO-US8-31 – 33) ผ่าน 3/3 รวม **33/33** (53 invocation รวม `@ParameterizedTest`) `./mvnw clean test` ทั้งโปรเจกต์ผ่าน 251/252 ตัวที่ไม่ผ่านคือ `BackendApplicationTests` ซึ่งต่อฐานข้อมูล `appdb` ของ docker compose ในเครื่อง ไม่ใช่ DAO test (ดูประวัติการรันครั้งที่ 7)

| ส่วน | Repository / Entity | Test case | Test class | ผ่าน |
| --- | --- | --- | --- | --- |
| 1 | `StudyPlanRepository` | UT-DAO-US8-01 – 08 | `StudyPlanRepositoryTest` | 8/8 |
| 2 | `StudyMinorRepository` + `StudyMinor.coursesOf` | UT-DAO-US8-09 – 15, 31, 32 | `StudyMinorRepositoryTest` | 9/9 |
| 3 | `SectionRepository.findByCourseCodesAndTerm` (US1) | UT-DAO-US8-16 – 18 | `PlanSectionLookupTest` | 3/3 |
| 4 | `TimetableRepository` + `TimetableEntryRepository` (US1) ขั้น `saveAdded` | UT-DAO-US8-19 – 20 | `ApplyPlanSaveRepositoryTest` | 2/2 |
| 4 | rollback เมื่อผิด constraint | UT-DAO-US8-21 – 22 | `ApplyPlanSaveRollbackTest` | 2/2 |
| 5 | Schema (constraint ของ 4 ตารางใหม่) | UT-DAO-US8-23 – 30, 33 | `StudyPlanSchemaConstraintTest` | 9/9 |

**User story:** US8 จัดตารางเรียนจำลองตามแผนในเล่มหลักสูตร · branch `feature/US8-T09-develop-dao-entity`

## สภาพแวดล้อม

| หัวข้อ | ค่า |
| --- | --- |
| วันที่รัน | 2026-11-14 |
| คำสั่ง | `cd backend && ./mvnw clean test -Dtest='StudyPlan*Test,StudyMinor*Test,ApplyPlan*Test,PlanSectionLookupTest'` แล้ว `./mvnw clean test` ทั้งโปรเจกต์ |
| Java / Spring Boot | 21.0.10 / 4.1.1 |
| Database | Testcontainers 2.0.5 `MSSQLServerContainer` image `mcr.microsoft.com/mssql/server:2025-latest` (Microsoft SQL Server 17.0) |
| Schema | Flyway รัน `db/migration` 6 ไฟล์ (`V1`, `V20261014_1940`, `V20261019_0106`, `V20261020_2030`, `V20261114_1707`, `V20261114_1900`) แล้ว Hibernate `validate` ผ่านกับ entity ใหม่ 7 ตัว |
| Fixture | `support/StudyPlanFixture` (ข้อมูลตาม T12 หัวข้อ "ข้อมูลตั้งต้น" ทุกแถว) แยกจาก `DaoFixture` ของ US1 |

## โค้ดที่ทดสอบ (package `studyplan`)

| ไฟล์ | หน้าที่ |
| --- | --- |
| `V20261114_1707__create_study_plan_tables.sql` | สร้าง `study_plan`, `study_plan_course`, `study_minor`, `study_minor_course` (มี `plan_type`) พร้อม constraint ตาม T06 ER Diagram |
| `V20261114_1900__add_course_category_minor.sql` | เพิ่มค่า `MINOR` ใน `ck_course_category` (และ `CourseCategory.MINOR` ทั้ง backend / frontend) |
| `PlanType`, `StudyPlan`, `StudyPlanCourse`, `StudyPlanCourseId` | entity ของแผนการเรียน (`@EmbeddedId` + `@MapsId`, `@OrderBy("sortOrder")`, `@Immutable`) |
| `StudyMinor`, `StudyMinorCourse`, `StudyMinorCourseId` | entity ของวิชาโท (`planType` อยู่ใน id) และ `StudyMinor.coursesOf(planType, studyYear, semester)` |
| `StudyPlanRepository` | `findByDepartmentAndStudyYearAndSemester`, `findWithCoursesById` |
| `StudyMinorRepository` | `findByDepartmentAndTerm`, `findWithCoursesById` |

## ผลรายกรณี

| ID | Test method | ผล | เวลา (s) |
| --- | --- | --- | --- |
| UT-DAO-US8-01 | `findByDepartmentAndStudyYearAndSemester_twoCurricula_returnsEachPlanOnceWithSortedCourses` | PASS | 0.148 |
| UT-DAO-US8-02 | `findByDepartmentAndStudyYearAndSemester_otherSemester_returnsOnlyPlansOfThatSemester` | PASS | 0.145 |
| UT-DAO-US8-03 | `findByDepartmentAndStudyYearAndSemester_thirdYear_returnsBothPlanTypes` | PASS | 0.143 |
| UT-DAO-US8-04 | `findByDepartmentAndStudyYearAndSemester_noPlanForTerm_returnsEmptyList` | PASS | 0.146 |
| UT-DAO-US8-05 | `findByDepartmentAndStudyYearAndSemester_departmentSpelledDifferently_returnsEmptyList` | PASS | 0.169 |
| UT-DAO-US8-06 | `findPlan_planWithoutCourses_isNotReturned` | PASS | 0.181 |
| UT-DAO-US8-07 | `findWithCoursesById_existingPlan_returnsCoursesInSortOrder` | PASS | 0.139 |
| UT-DAO-US8-08 | `findWithCoursesById_unknownId_returnsEmpty` | PASS | 0.132 |
| UT-DAO-US8-09 | `findByDepartmentAndTerm_termWithMinorCourses_returnsMinorsWithAllCourses` | PASS | 0.144 |
| UT-DAO-US8-10 | `findByDepartmentAndTerm_fourthYear_returnsOnlyMinorsWithCoursesInThatTerm` | PASS | 0.215 |
| UT-DAO-US8-11 | `findByDepartmentAndTerm_noMinorCourseInTerm_returnsEmptyList` | PASS | 0.151 |
| UT-DAO-US8-12 | `findByDepartmentAndTerm_departmentSpelledDifferently_returnsEmptyList` | PASS | 0.152 |
| UT-DAO-US8-13 | `findWithCoursesById_existingMinor_returnsAllCoursesSorted` | PASS | 0.146 |
| UT-DAO-US8-14 | `findWithCoursesById_unknownMinorId_returnsEmpty` | PASS | 0.156 |
| UT-DAO-US8-15 | `coursesOf_givenTerm_returnsOnlyCoursesOfThatTermInSortOrder` | PASS | 0.179 |
| UT-DAO-US8-16 | `findByCourseCodesAndTerm_planCourseCodes_returnsSectionsWithCourseAndSlots` | PASS | 0.181 |
| UT-DAO-US8-17 | `findByCourseCodesAndTerm_planAndMinorCodes_skipsUnofferedCourseAndReturnsEachSectionOnce` | PASS | 0.169 |
| UT-DAO-US8-18 | `findByCourseCodesAndTerm_otherTerm_returnsOnlySectionsOfThatTerm` | PASS | 0.238 |
| UT-DAO-US8-19 | `saveAll_newTimetableWithPlanSections_insertsTimetableAndAllEntries` | PASS | 0.280 |
| UT-DAO-US8-20 | `saveAll_existingTimetable_appendsEntriesAndTouchesUpdatedAt` | PASS | 0.197 |
| UT-DAO-US8-21 | `saveAll_existingTimetableWithDuplicateSection_rollsBackWholeBatch` | PASS | 0.130 |
| UT-DAO-US8-22 | `saveAll_newTimetableWithDuplicateInBatch_rollsBackTimetableAndEntries` | PASS | 0.067 |
| UT-DAO-US8-23 | `insertPlan_studyYearAndPlanTypeMismatch_throwsConstraintViolation` (7 ค่า) | PASS 7/7 | 0.950 |
| UT-DAO-US8-24 | `insertPlan_semesterOutOfRange_throwsConstraintViolation` (2 ค่า) | PASS 2/2 | 0.275 |
| UT-DAO-US8-25 | `insertPlan_duplicatePlanOfTerm_throwsConstraintViolation` (2 ค่า) + `insertPlan_otherPlanTypeOfFourthYear_succeeds` | PASS 3/3 | 0.450 |
| UT-DAO-US8-26 | `insertPlanCourse_invalidKey_throwsConstraintViolation` (4 ค่า) | PASS 4/4 | 0.545 |
| UT-DAO-US8-27 | `deletePlan_cascadesToPlanCoursesOnly` | PASS | 0.188 |
| UT-DAO-US8-28 | `insertMinor_duplicateNameOrOrder_throwsConstraintViolation` (2 ค่า) + `insertMinor_sameOrderInOtherCurriculum_succeeds` | PASS 3/3 | 0.451 |
| UT-DAO-US8-29 | `insertMinorCourse_invalidRow_throwsConstraintViolation` (6 ค่า) | PASS 6/6 | 0.870 |
| UT-DAO-US8-30 | `deleteMinor_cascadesToMinorCoursesOnly` | PASS | 0.156 |
| UT-DAO-US8-31 | `coursesOf_coopPlan_returnsOnlyCoursesOfThatPlan` (เพิ่มใน T09) | PASS | 0.161 |
| UT-DAO-US8-32 | `findByDepartmentAndTerm_courseOnlyInCoopPlan_returnsMinor` (เพิ่มใน T09) | PASS | 0.147 |
| UT-DAO-US8-33 | `insertMinorCourse_invalidRow_throwsConstraintViolation` ค่าที่ 7 (`plan_type = MINOR`) + `insertMinorCourse_sameCourseOtherPlanType_succeeds` (เพิ่มใน T09) | PASS 2/2 | 0.265 |

เวลาของ UT-DAO-US8-01 – 30 มาจากการรันครั้งที่ 5 ส่วน 31 – 33 มาจากครั้งที่ 7 หลังเพิ่ม `plan_type` UT-DAO-US8-01 – 30 ยังผ่านในครั้งที่ 7 ทุกกรณี ไม่รวมการ start container และ Spring context เคสแบบ parameterized รวมเวลาทุก invocation ทุกเคสใน UT-DAO-US8-23 – 29 ตรวจ `ConstraintViolationException.getConstraintName()` ตรงกับชื่อ constraint ที่ T12 ระบุ ไม่ได้ตรวจแค่ว่า throw

## ส่วนที่ต่างจากเอกสารออกแบบ

**1. แก้ `ck_study_plan_plan_type` ตามข้อเสนอของ T12** SQL ใน [T06 ER Diagram](../T06/US8-T06-ER-Diagram.md) ยอมให้ชั้นปี 3–4 มี `plan_type = NULL` เพราะ `NULL IN (...)` ได้ UNKNOWN ซึ่ง CHECK ของ SQL Server ถือว่าผ่าน migration จึงเพิ่ม `plan_type IS NOT NULL` ตามหัวข้อ "สิ่งที่ต้องแก้ใน T06 / T09" ของ T12 UT-DAO-US8-23 ค่า (3, `NULL`) และ (4, `NULL`) จึงผ่าน SQL ใน T06 ER Diagram อัปเดตตาม migration แล้ว

**2. ตัดคอลัมน์ของ collection ออกจาก `order by` ใน JPQL** JPQL ใน [T06 DAO Class Diagram](../T06/US8-T06-DAO-Class-Diagram.md) ใส่ `pc.sortOrder` และ `mc.studyYear, mc.semester, mc.sortOrder` ไว้ใน `order by` แต่เมื่อ `join fetch` collection ที่มี `@OrderBy` Hibernate ต่อ `@OrderBy` ท้าย `order by` ให้เอง SQL จึงมีคอลัมน์ซ้ำ และ SQL Server ปฏิเสธด้วย `A column has been specified more than once in the order by list` (ครั้งที่ 3 ในประวัติการรัน) จึงเหลือไว้แค่ส่วนของ root ลำดับที่ได้เหมือน T06 ทุกข้อ ซึ่ง UT-DAO-US8-01, 07, 09, 13 ยืนยันแล้ว

| Method | T06 | ที่ใช้จริง | SQL ที่ Hibernate สร้าง |
| --- | --- | --- | --- |
| `StudyPlanRepository.findByDepartmentAndStudyYearAndSemester` | `order by p.curriculumName, p.planId, pc.sortOrder` | `order by p.curriculumName, p.planId` | `... curriculum_name, plan_id, sort_order` |
| `StudyPlanRepository.findWithCoursesById` | `order by pc.sortOrder` | ไม่มี `order by` | `... sort_order` |
| `StudyMinorRepository.findByDepartmentAndTerm` | `order by m.sortOrder, m.minorId, mc.studyYear, mc.semester, mc.sortOrder` | `order by m.sortOrder, m.minorId` | `... sort_order, minor_id, study_year, semester, sort_order` |
| `StudyMinorRepository.findWithCoursesById` | `order by mc.studyYear, mc.semester, mc.sortOrder` | ไม่มี `order by` | `... study_year, semester, sort_order` |

ถ้าภายหลังลบ `@OrderBy` ออกจาก entity ต้องใส่คอลัมน์เหล่านี้กลับเข้าไปใน JPQL ไม่อย่างนั้นวิชาจะไม่เรียง (เขียนเตือนไว้ใน Javadoc ของ repository ทั้งสองตัว และใน T06 DAO Class Diagram ที่อัปเดต JPQL ตามโค้ดแล้ว)

**3. ข้อมูลตั้งต้นของ `ApplyPlanSaveRollbackTest` ใช้ `JdbcTemplate`** T12 ให้เตรียมข้อมูลใน `transactionTemplate.executeWithoutResult(...)` ซึ่งทำตามแล้ว แต่ข้างในใช้ `INSERT ... OUTPUT INSERTED` ผ่าน `JdbcTemplate` แทน entity เพราะคลาสนี้ปิด transaction ของ `@DataJpaTest` ไว้และไม่มี `TestEntityManager` ที่ใช้ได้นอก transaction ข้อมูลตรงกับที่ T12 กำหนด (`T8R01`, `T8R02`, TT-R ที่มี `updated_at = OLD`) และ `@AfterEach` ลบตามลำดับที่ T12 กำหนด นอกจากนี้ `@BeforeEach` เรียก cleanup ก่อน เพื่อกันข้อมูลค้างถ้ารอบก่อนหยุดกลางทาง

**4. ตรวจเพิ่มจาก T12** UT-DAO-US8-06 ตรวจ `existsById(P-EMPTY)` เพิ่ม เพื่อยืนยันว่าแถวยังอยู่จริงและที่ไม่ได้ผลคืนมาเป็นเพราะ inner join ส่วน UT-DAO-US8-16 ตรวจคาบเรียนของ `T8G02 780003` (FRIDAY) เพิ่ม

**5. เพิ่ม `plan_type` ใน `study_minor_course` (ทีมเลือก ทางเลือก ก)** ข้อมูลแผนสหกิจ (COOP.xlsx) และเล่มหลักสูตรวางวิชาโท CS440, CS371, CS355, CS341 ไว้ปี 3/1 ส่วนแผนหัวข้อพิเศษวางไว้ปี 4/1 schema เดิมของ T06 เก็บได้ภาคเดียวต่อวิชา จึงเพิ่ม `plan_type` เข้า PK และ unique ของลำดับ เพิ่ม CHECK `ck_study_minor_course_plan_type` และเปลี่ยนเป็น `StudyMinor.coursesOf(planType, studyYear, semester)` (อัปเดต T06 แล้ว) ผลต่อ T12:

| ส่วนของ T12 | ที่ทำ |
| --- | --- |
| Fixture วิชาโท (MN-1, MN-2, MN-OTHER) | ทุกแถวเป็น `SPECIAL_PROJECT` ค่าที่คาดของ UT-DAO-US8-09 – 15, 29, 30 จึงเหมือนเดิม |
| UT-DAO-US8-15, 17 (`coursesOf`) | ส่ง `PlanType.SPECIAL_PROJECT` เพิ่ม |
| UT-DAO-US8-29 | insert ระบุ `plan_type = 'SPECIAL_PROJECT'` ค่าที่ 4 (T8N01 ซ้ำ) ยังล้มที่ `pk_study_minor_course` เพราะแผนเดียวกัน |
| กรณีใหม่ | UT-DAO-US8-31 – 33 ยังไม่มีในเอกสาร T12 ต้องให้เจ้าของ T12 เพิ่ม |

**6. เพิ่มหมวด `MINOR`** ทีมเลือกให้วิชาที่เป็นวิชาโทอย่างเดียวมีหมวดของตัวเอง แก้ `ck_course_category` ใน migration ใหม่ (ไม่แก้ migration ของ US1 ที่รันไปแล้ว) เพิ่ม `CourseCategory.MINOR` (backend) และ type + ตัวเลือก "วิชาโท" ในตัวกรองหน้าค้นหา (frontend) `tsc --noEmit` ผ่าน

| ข้อที่ T06 / T12 เปิดให้เลือก | ที่ทำ |
| --- | --- |
| `@Immutable` | ใส่ทั้ง 4 entity fixture สร้างแผนและวิชาโทด้วย native SQL ตาม T12 จึงไม่ขึ้นกับข้อนี้ |
| Collection ย้อนกลับใน `Course` | ไม่เพิ่ม ตาม T06 |
| Constructor ของ `Timetable` (T12 ส่วนที่ 4) | ไม่เพิ่ม ใช้ `new Timetable()` + setter แบบ `TimetableService` |

## ประวัติการรัน

| ครั้ง | ผล | สาเหตุ / การแก้ |
| --- | --- | --- |
| 1 | รันไม่ได้ | Docker Desktop ไม่ได้เปิด (`Could not find a valid Docker environment`) ตอนนั้นมีแค่ migration |
| 2 | PASS 45/45 (DAO test เดิม) | เพิ่ม entity ครบ 7 ตัว Flyway + Hibernate `validate` ผ่าน ยังไม่มี repository และ test ของ US8 |
| 3 | US8 ผ่าน 12/30 กรณี (Error 18) | UT-DAO-US8-01 – 18 error เพราะคอลัมน์ซ้ำใน `order by` (ส่วนที่ต่างข้อ 2) ส่วน 19 – 30 ผ่าน (รวม UT-23 ที่ใช้ CHECK ฉบับแก้แล้ว) |
| 4 | **PASS 30/30** (49 invocation) | ตัดคอลัมน์ซ้ำออกจาก JPQL |
| 5 | **PASS 248/248** | `./mvnw clean test` ทั้งโปรเจกต์ ไม่ได้แก้โค้ดระหว่างครั้งที่ 4 กับ 5 ข้อมูลที่ `ApplyPlanSaveRollbackTest` commit ไม่ทำให้ test class อื่นล้ม |
| 6 | **PASS 33/33** (+ `SchemaConstraintTest`, `CourseRepositoryTest`) | หลังเพิ่ม `plan_type` ในวิชาโท, หมวด `MINOR` และ UT-DAO-US8-31 – 33 |
| 7 | 251/252 | `./mvnw clean test` ทั้งโปรเจกต์ DAO test ทุกตัวผ่าน `BackendApplicationTests` ล้มด้วย `Migration checksum mismatch for migration version 20261114.1707` เพราะครั้งที่ 5 ไป apply migration ฉบับก่อนเพิ่ม `plan_type` ลง `appdb` ของ docker compose ในเครื่อง (test นี้ต่อ DB จริงของเครื่อง ไม่ใช้ Testcontainers) ต้องล้างตาราง US8 / แถวใน `flyway_schema_history` ของ DB ในเครื่องก่อน ไม่ใช่ปัญหาของโค้ด |

## Seed แผนการเรียน (`db/seed/V20261114_2100__seed_study_plans.sql`)

สร้างด้วยสคริปต์จาก Year1&Year2.xlsx, Year3&Year4.xlsx, COOP.xlsx (ตารางเรียน) และเล่มหลักสูตร 2566 (ชื่อวิชา หมวด และวิชาโทที่ Excel ไม่มีข้อมูล) ตรวจด้วย test ชั่วคราวที่รัน `db/migration` + `db/seed` บน Testcontainers แล้วลบทิ้ง (ไม่ได้อยู่ใน 252 test) ผลที่ได้

| ตาราง | แถวที่ seed นี้เพิ่ม | หมายเหตุ |
| --- | --- | --- |
| `course` | 49 (รวม 59 กับของ US1) | หมวด: MAJOR 30, GENERAL_EDUCATION 9, MINOR 19, FREE_ELECTIVE 1 (JP171 ของ US1) · แก้ชื่อ CS223 เป็น Virtualization Technology |
| `section` | 54 (รวม 67) | ภาค 1 ของชั้นปี = 2568/1, ภาค 2 = 2568/2 · ST216 040001 2568/1 และ CS111 030001 2568/2 ใช้แถวเดิม แต่เปลี่ยนคาบตาม Excel |
| `schedule_slot` | 83 คาบตาม Excel | TU107 000002, CS303, CS403, CS404 000001 ไม่มีคาบ |
| `study_plan` | 10 | ปี 1/1, 1/2, 2/1, 2/2 (NULL) · ปี 3/1, 3/2, 4/1 ทั้ง SPECIAL_PROJECT และ CO_OP |
| `study_plan_course` | 48 | หน่วยกิตรวมตรงกับ "รวม" ใน Excel ทุกภาค ยกเว้นปี 4/1 ที่ Excel นับ "เลือกเสรี 2 ตัว" ไว้ด้วย |
| `study_minor` | 4 | วิทยาการข้อมูล, ปัญญาประดิษฐ์, การออกแบบและพัฒนาผลิตภัณฑ์ดิจิทัล, เดฟออปส์ |
| `study_minor_course` | 40 | แยกตามแผน 20 + 20 |

ข้อจำกัดของข้อมูล (เขียนไว้ที่หัวไฟล์ seed ด้วย)

- CS371 เปิดเฉพาะภาค 2 (ทีมยืนยัน) แต่ยังไม่มีเวลาเรียนของภาค 2 จึงไม่มีกลุ่มเรียนเลย ไม่สร้างกลุ่ม 020001 ภาค 1 ตาม COOP.xlsx
- CS287, CS355, CS385 ไม่มีข้อมูลกลุ่มเรียน อยู่ในวิชาโทตามเล่มหลักสูตร จัดตารางแล้วได้ `NO_SECTION_AVAILABLE`
- วิชาโทวิทยาการข้อมูลปี 3/2: CS246 ชนกับ CS332 (พ.) และ CS314 (ศ.) ตามที่ Excel หมายเหตุไว้
- ปี 4 ภาค 2 ไม่มีแผน (วิชาเลือกเสรีอย่างเดียว) และ CS304 (ภาคฤดูร้อน) ไม่อยู่ในขอบเขต
- แผนเป็นของวิชาเอกวิทยาการคอมพิวเตอร์และสารสนเทศ `users.department` แยกวิชาเอกไม่ได้ นักศึกษาวิชาเอกคอมพิวเตอร์ประยุกต์จะเห็นแผนเดียวกัน
- ไม่ลบกลุ่มเรียน 2568/1 ของ US1 ที่มาจาก Prototype (CS180, MA211, CS111, LAS101, TU101, TU106, TU109, JP171) เพราะ `timetable_entry` ใน DB dev อาจอ้างถึงอยู่

## สิ่งที่ต้องทำต่อ

- กรอกคอลัมน์ Actual Result / Status และ "สรุปผลการทดสอบ" ในเอกสาร US8-T12 และเพิ่ม UT-DAO-US8-31 – 33 กับ `plan_type` ใน fixture (อยู่บน branch ของ T12)
- T05 (API) ต้องตัดสินว่า `minors` ใน `GET /api/study-plans` ส่งวิชาของแต่ละแผนอย่างไร เพราะวิชาโทเดียวกันมีวิชาต่างกันตาม `planType`
- อัปเดตค่าที่คาดในเอกสาร / Postman ของ US1 ที่อ้าง seed เดิม (รายวิชา 2568/1 มี 9 วิชา, 2568/2 มีแค่ CS111 และ CS223, เวลา ST216, ชื่อ CS223) และ UAT ของ US8-T16 ที่อ้างว่า CS223 เปิดเฉพาะภาค 2
- ล้าง migration US8 ออกจาก `appdb` ในเครื่องแล้วรัน `BackendApplicationTests` ใหม่
