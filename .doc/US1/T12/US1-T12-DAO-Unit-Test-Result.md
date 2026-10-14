# US1-T12 ผลการทดสอบ Unit Test ส่วน DAO

Oct 14, 2026 · @Non

## สรุปผล

รัน unit test 21 กรณีตามเอกสาร "US1-T12 Design Unit Test Cases ส่วน DAO" (Oct 14, 2026 · branch `docs/US1-T12-design-unit-test-dao`) กับโค้ด DAO ของ US1-T09 **ผ่านครบ 21/21** และ `./mvnw test` ทั้งโปรเจกต์ผ่าน 31/31

| Repository | Test case | ผ่าน |
| --- | --- | --- |
| `CourseRepository` | UT-DAO-01 – 05 | 5/5 |
| `SectionRepository` | UT-DAO-06 – 07 | 2/2 |
| `TimetableRepository` | UT-DAO-08 – 11 | 4/4 |
| `TimetableEntryRepository` | UT-DAO-12 – 16 | 5/5 |
| Schema (Flyway + constraint) | UT-DAO-17 – 21 | 5/5 |

**User story:** US1 เพิ่มวิชาที่ต้องการลงในตารางเรียนจำลอง · branch `feature/US1-T09-develop-dao-entity`

## สภาพแวดล้อม

| หัวข้อ | ค่า |
| --- | --- |
| วันที่รัน | 2026-10-14 |
| คำสั่ง | `cd backend && ./mvnw clean test` |
| Java / Spring Boot | 21.0.9 / 4.1.1 |
| Database | Testcontainers 2.0.5 `MSSQLServerContainer` image `mcr.microsoft.com/mssql/server:2025-latest` (start 54 วินาที) |
| Schema | Flyway รัน `db/migration` 2 ไฟล์ (`V1`, `V20261014_1940`) แล้ว Hibernate `validate` |
| Test class | `CourseRepositoryTest`, `SectionRepositoryTest`, `TimetableRepositoryTest`, `TimetableEntryRepositoryTest`, `SchemaConstraintTest` |

## ผลรายกรณี

| ID | Test method | ผล | เวลา (s) |
| --- | --- | --- | --- |
| UT-DAO-01 | `search_byTermOnly_returnsOfferedCoursesSortedByCode` | PASS | 0.199 |
| UT-DAO-02 | `search_codePrefixIgnoreCase_returnsMatchingCourses` | PASS | 0.171 |
| UT-DAO-03 | `search_nameWordPrefixIgnoreCase_returnsMatchingCourses` | PASS (ปรับ test ตาม spec ใหม่ ดูหัวข้อถัดไป) | 0.167 |
| UT-DAO-04 | `search_byCategory_returnsOnlyThatCategory` | PASS | 0.171 |
| UT-DAO-05 | `search_likeWildcardInQuery_isTreatedLiterally` | PASS (หลังแก้โค้ด) | 0.976 |
| UT-DAO-06 | `findById_existing_returnsSectionWithCourseAndSlots` | PASS (หลังแก้โค้ด) | 0.275 |
| UT-DAO-07 | `findById_notFound_returnsEmpty` | PASS | 0.166 |
| UT-DAO-08 | `findByStudentIdAndTerm_existing_returnsOnlyThatTimetable` | PASS | 0.297 |
| UT-DAO-09 | `findByStudentIdAndTerm_none_returnsEmpty` | PASS | 0.190 |
| UT-DAO-10 | `save_newTimetable_generatesIdAndKeepsUpdatedAt` | PASS (หลังแก้โค้ด) | 0.221 |
| UT-DAO-11 | `save_existingTimetable_updatesWithoutNewRow` | PASS (หลังแก้โค้ด) | 0.310 |
| UT-DAO-12 | `save_newEntry_isReturnedByFindByTimetableId` | PASS | 0.218 |
| UT-DAO-13 | `findByTimetableId_returnsAllEntriesOfThatTimetableOnly` | PASS (หลังแก้โค้ด) | 0.173 |
| UT-DAO-14 | `findByTimetableId_noEntries_returnsEmptyList` | PASS | 0.188 |
| UT-DAO-15 | `findByTimetableId_returnsExactSlotTimesForConflictCheck` | PASS | 0.219 |
| UT-DAO-16 | `findByTimetableId_multiSlotSection_returnsEachEntryOnce` | PASS | 0.294 |
| UT-DAO-17 | `contextLoads_flywayMigrationMatchesEntities` | PASS | 0.240 |
| UT-DAO-18 | `saveAndFlush_duplicateTimetableForTerm_throwsDataIntegrityViolation` | PASS | 0.315 |
| UT-DAO-19 | `saveAndFlush_duplicateSectionInTimetable_throwsDataIntegrityViolation` | PASS | 0.301 |
| UT-DAO-20 | `saveAndFlush_duplicateSectionNoInTerm_throwsDataIntegrityViolation` | PASS | 0.292 |
| UT-DAO-21 | `insertEntry_unknownSection_throwsConstraintViolation` | PASS | 0.247 |

เวลาไม่รวมการ start container และ Spring context (ครั้งเดียวต่อการรัน ทุก test class ใช้ร่วมกัน)

## ส่วนที่ต่างจากเอกสารออกแบบ

**UT-DAO-03 ค้นชื่อภาษาไทย** หลังออกแบบ test ทีมเปลี่ยน spec ของ `q` ใน [US1-T05 DTO & API Spec](../T05/US1-DTO%20&%20API%20Spec.md) จาก "ชื่อวิชาที่มี q" เป็น "ชื่อวิชาที่มีคำขึ้นต้นด้วย q (คำคั่นด้วยช่องว่างหรือ `-`)" เพื่อไม่ให้ `CS` ตรงกับ STATISTICS ภาษาไทยไม่เว้นวรรคระหว่างคำ ข้อ 2 ที่ค้น "ถ่ายภาพ" แล้วคาดว่าเจอ "การถ่ายภาพเบื้องต้น" จึงขัดกับ spec ใหม่ ปรับเป็น

| ขั้น | เอกสารออกแบบ | ที่รันจริง |
| --- | --- | --- |
| 1 | `thinking` → [LAS101] | เหมือนเดิม |
| 2 | `ถ่ายภาพ` → [FE001] | `การถ่าย` → [FE001] ยังตรวจได้ว่า parameter ภาษาไทยส่งเป็น `NVARCHAR` |
| 3 | — | `ถ่ายภาพ` → list ว่าง ตาม spec ใหม่ |

ชื่อ method เปลี่ยนจาก `search_nameContainsIgnoreCase_...` เป็น `search_nameWordPrefixIgnoreCase_...` ให้ตรงกับพฤติกรรม

**Annotation** รวม `@DataJpaTest` + `@AutoConfigureTestDatabase(replace = NONE)` + `@Import(TestcontainersConfig.class)` ไว้ใน `@DaoTest` (`support/DaoTest.java`) และเพิ่ม property `spring.flyway.locations=classpath:db/migration` ให้ test ไม่รัน seed ทุก class จึงใช้ context และ container ตัวเดียวกัน

**Fixture** อยู่ที่ `support/DaoFixture.java` ใช้ข้อมูลตาม Test Data ทุกแถว ส่วนที่เอกสารไม่ได้กำหนด (ชื่ออาจารย์ของ S2–S8 และห้องเรียนของ S2, S3, S6–S8) ใส่ค่าสมมติ

## โค้ดที่แก้เพราะ test

ตรวจโค้ดเทียบกับเอกสารออกแบบก่อนรัน พบ 3 จุดที่จะไม่ผ่าน จึงแก้ก่อนรันครั้งแรก (test ใหม่ใช้ `Section.getSlots()` ซึ่งโค้ดเดิมไม่มี จึงรันกับโค้ดเดิมไม่ได้ ผลด้านล่างมาจากการตรวจโค้ด ไม่ได้รันจริง)

| Test case | ปัญหาในโค้ดเดิม | ที่แก้ |
| --- | --- | --- |
| UT-DAO-05 | `CourseRepository.search` ใช้ `@Query` แบบ LIKE โดยไม่ escape `_S1` จะได้ CS111 และ `%` จะได้ทุกวิชา | `search` เป็น default method ที่ escape `!`, `%`, `_`, `[` (SQL Server ตีความ `[` เป็น wildcard ด้วย) แล้วส่งให้ `searchByPrefix` ที่ใช้ `escape '!'` |
| UT-DAO-06, 13 | `Section` ไม่มี collection คาบเรียน และ `findById` / `findByTimetableId` ไม่โหลดวิชาและคาบเรียนมาด้วย | เพิ่ม `Section.slots` (`@OneToMany(mappedBy = "section")`), override `SectionRepository.findById` ด้วย `@EntityGraph({"course", "slots"})` และเพิ่ม `join fetch s.slots` ใน `findByTimetableId` |
| UT-DAO-10, 11 | `Timetable.updatedAt` ใช้ `@UpdateTimestamp` ซึ่งเขียนทับค่าที่ตั้งเองด้วยเวลาปัจจุบัน | เอา `@UpdateTimestamp` ออก ให้ service ตั้งค่าเองผ่าน `touch()` |

UT-DAO-16 ยืนยันว่า `join fetch s.slots` ไม่ทำให้ entry ซ้ำ (Hibernate 6+ ตัดแถวซ้ำของ root ให้เอง) CS111 ที่มี 2 คาบนับหน่วยกิตครั้งเดียว

## ประวัติการรัน

| ครั้ง | ผล | สาเหตุ / การแก้ |
| --- | --- | --- |
| 1 | Error 21/21 ที่ `@BeforeEach` | `Violation of PRIMARY KEY constraint 'pk_course' ... (CS111)` ไฟล์ seed เก่ายังค้างใน `target/classes/db/migration` หลังย้ายไป `db/seed` Flyway จึงรัน seed ก่อน fixture เป็นปัญหาของ build ไม่ใช่โค้ด แก้ด้วย `./mvnw clean` |
| 2 | **PASS 21/21** | Flyway รันแค่ `V1` และ `V20261014_1940` |
| 3 | PASS 31/31 (`./mvnw test` ทั้งโปรเจกต์) | รวม `BackendApplicationTests` ที่ใช้ DB จาก `docker compose` และยังโหลด seed จาก `db/seed` ได้ |

## ข้อที่ต้องตัดสินในเอกสารออกแบบ

| ข้อ | ที่ทำ |
| --- | --- |
| `search` คืนวิชาทุกภาคหรือเฉพาะภาคที่ค้น | คืนเฉพาะวิชาที่มีกลุ่มเรียนในภาคที่ค้น (`exists` subquery) แต่ไม่ได้โหลด section มาด้วย `CourseService` ต้องดึง section ของภาคนั้นเองตอนสร้าง `CourseResponse` |
| seed ชนกับ fixture | ย้าย seed ไป `src/main/resources/db/seed/` แอปโหลดทั้ง `db/migration` และ `db/seed` (`spring.flyway.locations` ใน `application.yaml`) ส่วน DAO test โหลดแค่ `db/migration` Flyway จำ migration ด้วย version จึงไม่กระทบ DB ที่รัน seed ไปแล้ว |
| ชนิด column `updated_at` | `DATETIMEOFFSET` ตาม ER Diagram UT-DAO-10, 11 เทียบเป็น instant ผ่าน |
| Testcontainers ใน `pom.xml` | เพิ่ม `spring-boot-testcontainers`, `testcontainers-junit-jupiter`, `testcontainers-mssqlserver` (scope `test`) **`pom.xml` เป็นไฟล์ร่วม ต้องบอกกลุ่มก่อน merge** |

## หมายเหตุสำหรับงานต่อ

- `TimetableService` ต้องเรียก `timetable.touch()` ตอนสร้างตารางใหม่ (column เป็น `NOT NULL`) และทุกครั้งที่เพิ่มหรือลบวิชา (US2) เพราะไม่มี `@UpdateTimestamp` แล้ว
- DAO test ต้องมี Docker ทั้งในเครื่องและบน CI ส่วน `BackendApplicationTests` ยังต้องใช้ SQL Server จาก `docker compose` เหมือนเดิม
- image `2025-latest` เคย crash ตอน start ด้วย `ASSERT ... NtumWaiter.cpp` บน WSL2 ครั้งหนึ่ง (container ของ compose) ถ้า test ล้มตอนเริ่ม container ให้รันซ้ำก่อน ถ้าเกิดบ่อยค่อยคุยกันเรื่องเปลี่ยนเป็น `2022-latest`
- ลบ `TimetableEntityMappingTest` และ test เดิมของ `CourseRepository` / `TimetableRepository` ที่พึ่ง seed ใน DB ของ compose เพราะ 21 กรณีนี้ครอบคลุมแล้ว

**เอกสารที่เกี่ยวข้อง:** [DAO Class Diagram](../T06/US1-T06-DAO-Class-Diagram.md) · [ER Diagram](../T06/US1-T06-ER-Diagram.md) · [Sequence Diagram](../T06/US1-T06-Sequence-Diagram.md) · [DTO & API Spec](../T05/US1-DTO%20&%20API%20Spec.md)
