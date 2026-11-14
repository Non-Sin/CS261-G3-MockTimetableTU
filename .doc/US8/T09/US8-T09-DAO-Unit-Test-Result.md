# US8-T09 ผลการทดสอบ Unit Test ส่วน DAO

Nov 14, 2026 · @Non

## สรุปผล

รัน unit test 30 กรณีตามเอกสาร [US8-T12 Design Unit Test Cases ส่วน DAO](../T12/US8-T12-DAO-Unit-Test-Cases.md) (branch `docs/US8-T12-design-unit-test-dao` commit `7cf987a` ยังไม่ merge เข้า `main`) กับโค้ด DAO ของ US8-T09 **ผ่านครบ 30/30** (49 invocation รวม `@ParameterizedTest`) และ `./mvnw clean test` ทั้งโปรเจกต์ผ่าน 248/248

| ส่วน | Repository / Entity | Test case | Test class | ผ่าน |
| --- | --- | --- | --- | --- |
| 1 | `StudyPlanRepository` | UT-DAO-US8-01 – 08 | `StudyPlanRepositoryTest` | 8/8 |
| 2 | `StudyMinorRepository` + `StudyMinor.coursesOf` | UT-DAO-US8-09 – 15 | `StudyMinorRepositoryTest` | 7/7 |
| 3 | `SectionRepository.findByCourseCodesAndTerm` (US1) | UT-DAO-US8-16 – 18 | `PlanSectionLookupTest` | 3/3 |
| 4 | `TimetableRepository` + `TimetableEntryRepository` (US1) ขั้น `saveAdded` | UT-DAO-US8-19 – 20 | `ApplyPlanSaveRepositoryTest` | 2/2 |
| 4 | rollback เมื่อผิด constraint | UT-DAO-US8-21 – 22 | `ApplyPlanSaveRollbackTest` | 2/2 |
| 5 | Schema (constraint ของ 4 ตารางใหม่) | UT-DAO-US8-23 – 30 | `StudyPlanSchemaConstraintTest` | 8/8 |

**User story:** US8 จัดตารางเรียนจำลองตามแผนในเล่มหลักสูตร · branch `feature/US8-T09-develop-dao-entity`

## สภาพแวดล้อม

| หัวข้อ | ค่า |
| --- | --- |
| วันที่รัน | 2026-11-14 |
| คำสั่ง | `cd backend && ./mvnw clean test -Dtest='StudyPlan*Test,StudyMinor*Test,ApplyPlan*Test,PlanSectionLookupTest'` แล้ว `./mvnw clean test` ทั้งโปรเจกต์ |
| Java / Spring Boot | 21.0.10 / 4.1.1 |
| Database | Testcontainers 2.0.5 `MSSQLServerContainer` image `mcr.microsoft.com/mssql/server:2025-latest` (Microsoft SQL Server 17.0) |
| Schema | Flyway รัน `db/migration` 5 ไฟล์ (`V1`, `V20261014_1940`, `V20261019_0106`, `V20261020_2030`, `V20261114_1707`) แล้ว Hibernate `validate` ผ่านกับ entity ใหม่ 7 ตัว |
| Fixture | `support/StudyPlanFixture` (ข้อมูลตาม T12 หัวข้อ "ข้อมูลตั้งต้น" ทุกแถว) แยกจาก `DaoFixture` ของ US1 |

## โค้ดที่ทดสอบ (package `studyplan`)

| ไฟล์ | หน้าที่ |
| --- | --- |
| `V20261114_1707__create_study_plan_tables.sql` | สร้าง `study_plan`, `study_plan_course`, `study_minor`, `study_minor_course` พร้อม constraint ตาม T06 ER Diagram |
| `PlanType`, `StudyPlan`, `StudyPlanCourse`, `StudyPlanCourseId` | entity ของแผนการเรียน (`@EmbeddedId` + `@MapsId`, `@OrderBy("sortOrder")`, `@Immutable`) |
| `StudyMinor`, `StudyMinorCourse`, `StudyMinorCourseId` | entity ของวิชาโท และ `StudyMinor.coursesOf(studyYear, semester)` |
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

เวลามาจากการรันทั้งโปรเจกต์ (ครั้งที่ 5) ไม่รวมการ start container และ Spring context เคสแบบ parameterized รวมเวลาทุก invocation ทุกเคสใน UT-DAO-US8-23 – 29 ตรวจ `ConstraintViolationException.getConstraintName()` ตรงกับชื่อ constraint ที่ T12 ระบุ ไม่ได้ตรวจแค่ว่า throw

## ส่วนที่ต่างจากเอกสารออกแบบ

**1. แก้ `ck_study_plan_plan_type` ตามข้อเสนอของ T12** SQL ใน [T06 ER Diagram](../T06/US8-T06-ER-Diagram.md) ยอมให้ชั้นปี 3–4 มี `plan_type = NULL` เพราะ `NULL IN (...)` ได้ UNKNOWN ซึ่ง CHECK ของ SQL Server ถือว่าผ่าน migration จึงเพิ่ม `plan_type IS NOT NULL` ตามหัวข้อ "สิ่งที่ต้องแก้ใน T06 / T09" ของ T12 UT-DAO-US8-23 ค่า (3, `NULL`) และ (4, `NULL`) จึงผ่าน **SQL ใน T06 ER Diagram ยังเป็นฉบับเดิม ควรอัปเดตให้ตรงกับ migration**

**2. ตัดคอลัมน์ของ collection ออกจาก `order by` ใน JPQL** JPQL ใน [T06 DAO Class Diagram](../T06/US8-T06-DAO-Class-Diagram.md) ใส่ `pc.sortOrder` และ `mc.studyYear, mc.semester, mc.sortOrder` ไว้ใน `order by` แต่เมื่อ `join fetch` collection ที่มี `@OrderBy` Hibernate ต่อ `@OrderBy` ท้าย `order by` ให้เอง SQL จึงมีคอลัมน์ซ้ำ และ SQL Server ปฏิเสธด้วย `A column has been specified more than once in the order by list` (ครั้งที่ 3 ในประวัติการรัน) จึงเหลือไว้แค่ส่วนของ root ลำดับที่ได้เหมือน T06 ทุกข้อ ซึ่ง UT-DAO-US8-01, 07, 09, 13 ยืนยันแล้ว

| Method | T06 | ที่ใช้จริง | SQL ที่ Hibernate สร้าง |
| --- | --- | --- | --- |
| `StudyPlanRepository.findByDepartmentAndStudyYearAndSemester` | `order by p.curriculumName, p.planId, pc.sortOrder` | `order by p.curriculumName, p.planId` | `... curriculum_name, plan_id, sort_order` |
| `StudyPlanRepository.findWithCoursesById` | `order by pc.sortOrder` | ไม่มี `order by` | `... sort_order` |
| `StudyMinorRepository.findByDepartmentAndTerm` | `order by m.sortOrder, m.minorId, mc.studyYear, mc.semester, mc.sortOrder` | `order by m.sortOrder, m.minorId` | `... sort_order, minor_id, study_year, semester, sort_order` |
| `StudyMinorRepository.findWithCoursesById` | `order by mc.studyYear, mc.semester, mc.sortOrder` | ไม่มี `order by` | `... study_year, semester, sort_order` |

ถ้าภายหลังลบ `@OrderBy` ออกจาก entity ต้องใส่คอลัมน์เหล่านี้กลับเข้าไปใน JPQL ไม่อย่างนั้นวิชาจะไม่เรียง (เขียนเตือนไว้ใน Javadoc ของ repository ทั้งสองตัวแล้ว)

**3. ข้อมูลตั้งต้นของ `ApplyPlanSaveRollbackTest` ใช้ `JdbcTemplate`** T12 ให้เตรียมข้อมูลใน `transactionTemplate.executeWithoutResult(...)` ซึ่งทำตามแล้ว แต่ข้างในใช้ `INSERT ... OUTPUT INSERTED` ผ่าน `JdbcTemplate` แทน entity เพราะคลาสนี้ปิด transaction ของ `@DataJpaTest` ไว้และไม่มี `TestEntityManager` ที่ใช้ได้นอก transaction ข้อมูลตรงกับที่ T12 กำหนด (`T8R01`, `T8R02`, TT-R ที่มี `updated_at = OLD`) และ `@AfterEach` ลบตามลำดับที่ T12 กำหนด นอกจากนี้ `@BeforeEach` เรียก cleanup ก่อน เพื่อกันข้อมูลค้างถ้ารอบก่อนหยุดกลางทาง

**4. ตรวจเพิ่มจาก T12** UT-DAO-US8-06 ตรวจ `existsById(P-EMPTY)` เพิ่ม เพื่อยืนยันว่าแถวยังอยู่จริงและที่ไม่ได้ผลคืนมาเป็นเพราะ inner join ส่วน UT-DAO-US8-16 ตรวจคาบเรียนของ `T8G02 780003` (FRIDAY) เพิ่ม

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

## สิ่งที่ต้องทำต่อ

- กรอกคอลัมน์ Actual Result / Status และ "สรุปผลการทดสอบ" ในเอกสาร US8-T12 ตามผลนี้ (อยู่บน branch ของ T12)
- อัปเดต SQL ของ `ck_study_plan_plan_type` และ JPQL ใน T06 ให้ตรงกับโค้ด (ส่วนที่ต่างข้อ 1 และ 2)
- Seed แผนการเรียนและวิชาโทจริงใน `db/seed` สำหรับ UAT (US8-T16) ยังไม่ได้ทำ
