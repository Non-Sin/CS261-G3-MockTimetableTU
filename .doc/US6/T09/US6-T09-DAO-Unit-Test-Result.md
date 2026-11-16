# US6-T09 ผลการทดสอบ Unit Test ส่วน DAO

Nov 16, 2026 · @Non

## สรุปผล

รัน unit test 35 กรณีตามเอกสาร [US6-T12 Design Unit Test Cases ส่วน DAO](../T12/US6-T12-DAO-Unit-Test-Cases.md) กับโค้ด DAO ของ US6-T09 **ผ่านครบ 35/35** (68 invocation รวม `@ParameterizedTest`) และ `./mvnw clean test` ทั้งโปรเจกต์ยกเว้น `BackendApplicationTests` ผ่าน **319/319**

| ส่วน | Repository / Entity | Test case | Test class | ผ่าน |
| --- | --- | --- | --- | --- |
| A | `ElectiveRepository.searchRecommended` | UT-DAO-US6-01 – 12 | `ElectiveRepositoryTest` | 12/12 (31 invocation) |
| B | `ElectiveRepository.findRecommendedByCode` + mapping ของ `ElectiveInfo` | UT-DAO-US6-13 – 18 | `ElectiveRepositoryTest` | 6/6 (11 invocation) |
| C | `SectionRepository.findWithSlotsByCourseCodesAndYear` / `findByCourseCodesAndYear` | UT-DAO-US6-19 – 26 | `ElectiveSectionRepositoryTest` | 8/8 |
| D | Schema (constraint ของ 3 ตารางใหม่) | UT-DAO-US6-27 – 35 | `ElectiveSchemaConstraintTest` | 9/9 (18 invocation) |

**User story:** US6 แนะนำวิชาเลือกเสรี · branch `feature/US6-T09-develop-dao-entity` · โค้ดที่ทดสอบอยู่ใน commit `56228ef`, `540b819`, `a88db77`, `40de74b`

## สภาพแวดล้อม

| หัวข้อ | ค่า |
| --- | --- |
| วันที่รัน | 2026-11-16 |
| คำสั่ง | `cd backend && ./mvnw test -Dtest='ElectiveRepositoryTest,ElectiveSectionRepositoryTest,ElectiveSchemaConstraintTest'` แล้ว `./mvnw clean test -Dtest='!BackendApplicationTests'` |
| Java / Spring Boot | 21.0.10 / 4.1.1 |
| Database | Testcontainers `MSSQLServerContainer` image `mcr.microsoft.com/mssql/server:2025-latest` ผ่าน `@DaoTest` |
| Schema | Flyway รัน `db/migration` 7 ไฟล์ (รวม `V20261116_1724__create_elective_tables.sql`) แล้ว Hibernate `validate` ผ่านกับ `ElectiveInfo` และ value collection 2 ตาราง |
| Fixture | `support/ElectiveDaoFixture` (F0 ตาม T12 ทุกแถว + F-WILD ของเคส 08) แยกจาก `DaoFixture` ของ US1 และ `StudyPlanFixture` ของ US8 |

ไม่ได้รัน `BackendApplicationTests` เพราะต่อ `appdb` ของ docker compose ในเครื่องจริง (ไม่ใช้ Testcontainers) ถ้ารันจะ apply migration และ seed ของงานนี้ลง DB dev ก่อน merge แล้วจะเจอ checksum mismatch แบบครั้งที่ 7 ของ [US8-T09](../../US8/T09/US8-T09-DAO-Unit-Test-Result.md) ถ้าไฟล์เปลี่ยนตามรีวิว test นี้ตรวจแค่ว่า Spring context ขึ้นได้ ซึ่ง `@DaoTest` และ integration test 2 ตัวที่ใช้ Testcontainers ครอบคลุม migration, seed และ Hibernate `validate` แล้ว

## โค้ดที่ทดสอบ

| ไฟล์ | หน้าที่ |
| --- | --- |
| `db/migration/V20261116_1724__create_elective_tables.sql` | สร้าง `elective_info`, `elective_tag`, `elective_review_point` พร้อม PK/FK/CHECK/DEFAULT และ `ON DELETE CASCADE` ตาม DDL ใน [T06 ER Diagram](../T06/US6-T06-ER-Diagram.md) ชื่อ constraint ตรงทุกตัว |
| `elective/InterestGroup`, `elective/ElectiveTag` | enum 5 หมวด / 6 ป้าย ลำดับตาม T06 (service ใช้เรียงผล) |
| `elective/ElectiveInfo` | entity shared primary key (`@Id courseCode` + `@OneToOne(LAZY) @MapsId`), `tags` เป็น `@ElementCollection Set`, `description` เป็น `@ElementCollection List` + `@OrderColumn("sort_order")` ทั้งคู่ LAZY |
| `elective/ElectiveRepository` | `searchRecommended` (default method ห่อ `searchByKeyword`) และ `findRecommendedByCode` |
| `course/SectionRepository` (US1, คุยกับเจ้าของแล้ว) | เพิ่ม `findByCourseCodesAndYear` (list ว่างคืน `List.of()` ไม่ออก SQL) และ `findWithSlotsByCourseCodesAndYear` |
| `db/seed/V20261116_1734__seed_electives.sql` | ข้อมูลวิชาเลือกเสรีแนะนำ 18 วิชา (หัวข้อ Seed ด้านล่าง) ไม่ได้อยู่ใน DAO test เพราะ `@DaoTest` รันเฉพาะ `db/migration` |

## ผลรายกรณี

| ID | Test method | ผล | เวลา (s) |
| --- | --- | --- | --- |
| UT-DAO-US6-01 | `searchRecommended_wholeYear_returnsEligibleCoursesOnce` | PASS | 0.144 |
| UT-DAO-US6-02 | `searchRecommended_otherYear_returnsOnlyCoursesWithSectionInThatYear` | PASS | 0.262 |
| UT-DAO-US6-03 | `searchRecommended_blankKeyword_doesNotFilter` (`null`, `""`, `"   "`) | PASS 3/3 | 0.545 |
| UT-DAO-US6-04 | `searchRecommended_lowerCaseCodePrefixWithSpaces_matchesCourseCode` | PASS | 0.143 |
| UT-DAO-US6-05 | `searchRecommended_englishName_matchesOnlyWordPrefix` (`FRE`, `ADJU`, `oriented`, `JUST`) | PASS 4/4 | 0.596 |
| UT-DAO-US6-06 | `searchRecommended_thaiSubstring_matchesThaiName` | PASS | 0.171 |
| UT-DAO-US6-07 | `searchRecommended_eachGroup_returnsOnlyCoursesOfThatGroup` (5 หมวด) | PASS 5/5 | 0.899 |
| UT-DAO-US6-08 | `searchRecommended_likeSpecialCharacters_matchLiterally` (`100%`, `100%_`, `100%_!`, `[LAB]`) | PASS 4/4 | 0.722 |
| UT-DAO-US6-09 | `searchRecommended_combinedFilters_areAnded` (3 ชุด) | PASS 3/3 | 0.426 |
| UT-DAO-US6-10 | `searchRecommended_ineligibleCourse_returnsEmptyList` (NI, NR, OY, NS, MA, GE) | PASS 6/6 | 0.988 |
| UT-DAO-US6-11 | `searchRecommended_noMatch_returnsEmptyList` | PASS | 0.155 |
| UT-DAO-US6-12 | `searchRecommended_fetchesCourseAndTagsWithoutDuplicateRoot` | PASS | 0.274 |
| UT-DAO-US6-13 | `findRecommendedByCode_eligibleCourse_returnsMappedInfo` | PASS | 0.197 |
| UT-DAO-US6-14 | `findRecommendedByCode_unknownCode_returnsEmpty` | PASS | 0.153 |
| UT-DAO-US6-15 | `findRecommendedByCode_ineligibleCourse_returnsEmpty` (NI, NR, OY, NS, MA, GE) | PASS 6/6 | 0.857 |
| UT-DAO-US6-16 | `findRecommendedByCode_usesRequestedYearForOpenSection` | PASS | 0.157 |
| UT-DAO-US6-17 | `findRecommendedByCode_thaiReviewsSortedBySortOrder` | PASS | 0.177 |
| UT-DAO-US6-18 | `findRecommendedByCode_courseWithoutTags_isStillReturned` | PASS | 0.185 |
| UT-DAO-US6-19 | `findWithSlotsByCourseCodesAndYear_manyCourses_sortedByCodeSemesterSectionNo` | PASS | 0.199 |
| UT-DAO-US6-20 | `findWithSlotsByCourseCodesAndYear_otherYear_returnsOnlySectionsOfThatYear` | PASS | 0.209 |
| UT-DAO-US6-21 | `findWithSlotsByCourseCodesAndYear_bothSemesters_semesterBeforeSectionNo` | PASS | 0.333 |
| UT-DAO-US6-22 | `findWithSlotsByCourseCodesAndYear_multipleSlots_oneSectionWithAssociationsLoaded` | PASS | 0.198 |
| UT-DAO-US6-23 | `findWithSlotsByCourseCodesAndYear_noSlotAndNullableFields_sectionKept` | PASS | 0.214 |
| UT-DAO-US6-24 | `findWithSlotsByCourseCodesAndYear_noMatch_returnsEmptyList` | PASS | 0.225 |
| UT-DAO-US6-25 | `findByCourseCodesAndYear_duplicateAndUnknownCodes_returnsDistinctSections` | PASS | 0.225 |
| UT-DAO-US6-26 | `findByCourseCodesAndYear_emptyList_doesNotQueryDatabase` | PASS | 0.235 |
| UT-DAO-US6-27 | `insertInfo_duplicateCourseCode_violatesPrimaryKey` | PASS | 0.159 |
| UT-DAO-US6-28 | `insertInfo_unknownCourse_violatesForeignKey` | PASS | 0.132 |
| UT-DAO-US6-29 | `insertInfo_invalidField_violatesConstraint` (5 ค่า) | PASS 5/5 | 0.720 |
| UT-DAO-US6-30 | `insertTag_duplicateTagOfSameCourse_violatesPrimaryKey` | PASS | 0.132 |
| UT-DAO-US6-31 | `insertTag_invalidValue_violatesConstraint` (`UNKNOWN_TAG`, NULL) | PASS 2/2 | 0.256 |
| UT-DAO-US6-32 | `insertReview_duplicateSortOrder_violatesPrimaryKey` | PASS | 0.127 |
| UT-DAO-US6-33 | `insertReview_invalidOrderOrText_violatesConstraint` (4 ค่า) | PASS 4/4 | 0.574 |
| UT-DAO-US6-34 | `deleteInfo_cascadesToOwnTagsAndReviewsOnly` | PASS | 0.162 |
| UT-DAO-US6-35 | `insertChild_withoutElectiveInfo_violatesForeignKey` (tag, review) | PASS 2/2 | 0.311 |

เวลามาจาก `./mvnw clean test` ทั้งโปรเจกต์ (ครั้งที่ 5 ในประวัติการรัน) ไม่รวมการ start container และ Spring context เคสแบบ parameterized รวมเวลาทุก invocation

เคส PK/FK/CHECK ตรวจ `ConstraintViolationException.getConstraintName()` ตรงกับชื่อที่ T12 ระบุ ไม่ได้ตรวจแค่ว่า throw ส่วนเคส NOT NULL ตรวจตามหัวข้อ "ส่วนที่ต่างจากเอกสารออกแบบ" ข้อ 3

## ส่วนที่ต่างจากเอกสารออกแบบ

**1. `findRecommendedByCode` ใช้ `select distinct`** T06 หัวข้อ 2 ระบุแค่ "ใช้เงื่อนไข eligibility เดียวกับ search พร้อม fetch course และ tags" query นี้ `left join fetch info.tags` จึงได้หลายแถวต่อวิชา ใส่ `distinct` เหมือน search เพื่อให้คืน `Optional` ได้แน่นอน UT-DAO-US6-13 ยืนยันว่า F ที่มี 2 tags ไม่เกิด `NonUniqueResultException`

**2. ค้นชื่อไทยผ่าน `upper()` ด้วย** คำค้นถูกแปลงเป็นตัวพิมพ์ใหญ่ก่อน escape (เหมือน US1) จึงเทียบชื่อไทยด้วย `upper(info.courseNameTh)` ให้ชื่อไทยที่มีอักษรอังกฤษปนยังค้นแบบไม่สนตัวพิมพ์ได้ ไม่กระทบอักษรไทย (UT-DAO-US6-06)

**3. ตรวจ NOT NULL ด้วย error 515 + ชื่อคอลัมน์** SQL Server ไม่ตั้งชื่อ constraint ให้ NOT NULL จึงตรวจ `SQLException.getErrorCode() == 515` และข้อความมี `'<คอลัมน์>'` (UT-DAO-US6-29, 31, 33) ไม่ยึดข้อความ error ทั้งประโยคตามที่ T12 กำหนด ค่า NULL bind ผ่าน `NativeQuery.setParameter(i, null, ชนิดของคอลัมน์)` (`String`, `Integer`, `Boolean`) ตาม T12 ไม่ได้เขียน `NULL` ลง SQL แบบ US8

**4. เปิด Hibernate Statistics ตอนรัน (UT-DAO-US6-26)** T12 ให้ "เปิดเฉพาะ test config" ถ้าเพิ่ม property ใน `@DaoTest` หรือ `@TestPropertySource` Spring จะสร้าง context (และอาจ container) แยก จึงเรียก `Statistics.setStatisticsEnabled(true)` เฉพาะใน test นี้ อ่าน `getPrepareStatementCount()` ก่อน/หลังเรียก wrapper แล้วคืนค่าเดิมใน `finally` ผลคือเปิดเฉพาะช่วงที่วัดตามเจตนาของ T12

**5. `escapeLike` คัดลอกจาก `CourseRepository`** ตามที่ทีมตกลงให้คัดลอกก่อน ยังไม่ย้ายเป็น util กลาง (escape `!`, `%`, `_`, `[` ครบตาม T06)

**6. ตรวจเพิ่มจาก T12**

- fixture ตรวจจำนวนแถว T6 ทั้ง 6 ตารางหลัง insert (13 / 12 / 4 / 12 / 16 / 16) ตามขั้นตอนร่วมข้อ 2 ของ T12 ไม่ครบจะ throw ก่อนเข้า test
- UT-DAO-US6-27 ตรวจว่ามี course ของ F ก่อน insert ซ้ำ และ UT-DAO-US6-29 ตรวจว่า NI ยังไม่มี `elective_info` เพื่อให้แน่ใจว่าล้มที่ constraint ที่ต้องการ ไม่ใช่ PK/FK ตัวอื่น

## การตรวจว่า test จับข้อผิดพลาดได้จริง (mutation check)

test ทั้ง 35 กรณีผ่านตั้งแต่รันครั้งแรก จึงลองทำให้โค้ดผิดชั่วคราวเพื่อยืนยันว่า test ไม่ผ่านแบบเปล่าประโยชน์

| การแก้ชั่วคราว | ผล |
| --- | --- |
| ข้าม `escapeLike` ใน `searchRecommended` (ส่งคำค้นเข้า LIKE ตรง ๆ) | UT-DAO-US6-08 **ล้ม 4/4** เพราะ F-WILD (`T6XC001`) ติดมาด้วย |

คืนไฟล์ด้วย `git checkout` แล้ว `git diff` ว่าง

## ประวัติการรัน

| ครั้ง | ผล | สาเหตุ / การแก้ |
| --- | --- | --- |
| 1 | PASS 6/6 (`SchemaConstraintTest`) | มีแค่ migration ใหม่ ยืนยันว่า Flyway apply `V20261116_1724` ได้ (`now at version v20261116.1724`) ยังไม่ทดสอบ constraint ของตารางใหม่ |
| 2 | PASS 11/11 (`SchemaConstraintTest`, `SectionRepositoryTest`) | เพิ่ม entity + repository แล้ว compile, Hibernate `validate` และ JPQL ตอน start ผ่าน method เดิมของ `SectionRepository` ไม่เปลี่ยนพฤติกรรม |
| 3 | ผ่าน (test ชั่วคราว) | ตรวจ seed บน Testcontainers ที่รัน `db/migration` + `db/seed` แล้วลบ test ทิ้ง ผลในหัวข้อ Seed |
| 4 | **PASS 35/35** (68 invocation) | 3 test class ของ US6 ผ่านตั้งแต่รันแรก จากนั้นทำ mutation check ด้านบน |
| 5 | **PASS 319/319** | `./mvnw clean test -Dtest='!BackendApplicationTests'` รวม integration test 2 ตัวที่รัน seed ทุกไฟล์ (US1 + US8 + US6) บน Testcontainers |

## Seed วิชาเลือกเสรีแนะนำ (`db/seed/V20261116_1734__seed_electives.sql`)

สร้างด้วยสคริปต์จาก `ข้อมูลสำหรับงานCS261.xlsx` ไม่ได้พิมพ์เอง

| ชีต | ข้อมูลที่ใช้ |
| --- | --- |
| `เสรี` | รายชื่อ 18 วิชา ชื่ออังกฤษ/ไทย หมวดความสนใจ โควตา tag และรีวิว |
| `วิชาสำหรับค้นหาวิชาเรียน ปี69` | กลุ่มเรียน เวลา ผู้สอน ห้อง หน่วยกิต |

ผลที่ตรวจด้วย test ชั่วคราว (ครั้งที่ 3) บน Testcontainers

| ตาราง | แถวที่ seed นี้เพิ่ม | หมายเหตุ |
| --- | --- | --- |
| `course` | 18 | FREE_ELECTIVE 3 หน่วยกิตทุกวิชา ไม่มีวิชาใดซ้ำกับ seed ของ US1 / US8 |
| `section` | 59 | EG214 มี 32 กลุ่ม (ภาค 1: 13, ภาค 2: 19) |
| `schedule_slot` | 63 | ทุกกลุ่มมีคาบ |
| `elective_info` | 18 | LANGUAGE 3, PSYCHOLOGY 4, SOCIETY 5, SCIENCE 4, MEDIA 2 · `requires_quota` 10 วิชา |
| `elective_tag` | 34 | |
| `elective_review_point` | 72 | วิชาละ 4 bullet `sort_order` 0–3 |

และ `searchRecommended(2568, null, null)` ได้ 18 วิชา, `"บุคลิก"` ได้ PY250, `SA240` ได้ `[]`, `findRecommendedByCode("FR205", 2568)` ได้ tags 2 ตัว รีวิว 4 ข้อ quota = true และ `findByCourseCodesAndYear([PY250], 2568)` ได้ภาค 1/820001 แล้วภาค 2/230001

กติกาที่ใช้ (เขียนไว้ที่หัวไฟล์ seed ด้วย)

- ภาค 1 = 2568/1 และภาค 2 = 2568/2 แบบเดียวกับ seed ของ US8 แม้ชีตจะชื่อ "ปี69"
- "ทั้ง 2 เทอม" ที่มีกลุ่มเรียนเดียว (AS201, PB317, IS313, TH291, PY200, PY320, PY252) ใช้กลุ่มและเวลาเดียวกันทั้งสองภาค ส่วน FD216, EG214, PY250 ใช้กลุ่มแยกภาคตาม Excel
- หมวด: ภาษาและการสื่อสาร = LANGUAGE, จิตวิทยาและพฤติกรรมศาสตร์ = PSYCHOLOGY, สังคม วัฒนธรรม และสุขภาพ = SOCIETY, วิทยาศาสตร์และเทคโนโลยี = SCIENCE, สื่อ สารสนเทศ และภาพยนตร์ = MEDIA
- tag: ไม่เช็คชื่อ = NO_ATTENDANCE, ไม่มีสอบ = NO_EXAM, ไม่มีงานกลุ่ม = NO_GROUP_WORK, อาจารย์ใจดี = KIND_INSTRUCTOR, ไม่มีพื้นฐานเรียนได้ = NO_PREREQUISITE, เก็บAง่าย = EASY_GRADE
- รีวิวแยก bullet ตามบรรทัดที่ขึ้นต้นด้วย `-` บรรทัดต่อของ bullet เดิม (PC280 ข้อแรก) ต่อท้ายด้วยช่องว่าง
- ผู้สอน/ห้อง "ไม่ระบุ" = NULL · ผู้สอนหลายคนคั่นด้วย `, ` ถ้าเกิน `NVARCHAR(100)` ใช้คนแรก + "และคณะ" (มีกรณีเดียวคือ PY200 ที่มีผู้สอน 6 คน)
- แก้ข้อมูลต้นทางที่พิมพ์ผิด: PB317 `HEALT` → `HEALTH` และ PY250 ภาค 2 กลุ่ม `23001` → `230001` (ตามชีต `เสรี`)
- เวลาของ EG214 ใช้ชีตค้นหา เพราะตารางเวลาในชีต `เสรี` ไม่มีกลุ่ม 45000X ของภาค 2
- ชื่อวิชาอังกฤษเป็นตัวพิมพ์ใหญ่ตาม Excel (ต่างจาก seed ของ US1 ที่เป็น Title Case)
- SA240 ใน Prototype ไม่อยู่ในรายการแนะนำ จึงค้นหาแล้วได้ `[]` ตาม T06

### ผลกระทบต่อจำนวนรายวิชาของ US1

seed นี้เพิ่มวิชา FREE_ELECTIVE ที่มีกลุ่มเรียนใน 2568/1 และ 2568/2 จำนวนรายวิชาใน `GET /api/courses` จึงเปลี่ยน ค่าด้านล่างได้จากการเรียก `CourseRepository.search` จริงบน Testcontainers ที่รัน `db/migration` + `db/seed` ครบ (test ชั่วคราว ลบทิ้งแล้ว) ไม่ได้คำนวณด้วยมือ

| ค้นหา | ก่อน (ตาม US8-T09) | หลัง seed US6 |
| --- | --- | --- |
| 2568/1 ทั้งหมด | 37 | **52** |
| 2568/2 ทั้งหมด | 27 | **40** |
| 2568/1 `q=cs1` | 5 | 5 (CS100, CS101, CS102, CS111, CS180) |
| 2568/1 `q=CS` | 24 | 24 |
| 2568/1 GENERAL_EDUCATION | 9 | 9 |
| 2568/1 / 2568/2 FREE_ELECTIVE | – | 16 / 13 |

## สิ่งที่ต้องทำต่อ

- อัปเดตจำนวนรายวิชาตามตารางข้างบนใน US1-T08 Postman (test "ได้ 37 วิชา" และ "ได้ 27 วิชาของ 2568/2"), US1-T17 Postman (`lengthOf(37)`) และชุดข้อมูล A ใน US1-T13 IT ไม่แก้เอกสารผลการรันในอดีต (เช่น US2-T17 Test Result)
- กรอก Actual Result / Status ในเอกสาร US6-T12 ตามผลรายกรณีข้างบน
- Service tests ตาม "ตารางส่งต่อ Service / UI tests" ของ T12 (ตัวกรองภาค/วัน/ช่วงเวลา/excludeConflicts, `offeredSemesters`, การเรียงตาม `InterestGroup` และ tags) ทำในงาน Service ของ US6 ไม่อยู่ใน 35 กรณีนี้
- ตรวจจำนวนการ์ดในหน้ารายการเทียบ Prototype เมื่อมี API และ UI (seed มี 18 วิชาตามที่ T06 กำหนด)
