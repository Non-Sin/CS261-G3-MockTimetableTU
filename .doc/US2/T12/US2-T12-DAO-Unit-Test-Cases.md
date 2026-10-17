# US2-T12 Design Unit Test Cases ส่วน DAO: ลบวิชา

Oct 16, 2026 · @Non

## ขอบเขตการทดสอบ

US2 (ลบวิชาออกจากตารางเรียน) ทดสอบ 2 method ของ `TimetableEntryRepository` รวม 8 เคส คือ `deleteAll(entries)` และ `findAllById(entryIds)` ซึ่ง US2 เป็น Story แรกที่ใช้ ส่วน method ที่ใช้แสดงตารางหลังลบทดสอบไว้แล้วใน US1 และอ้างอิงไว้ในหัวข้อ Traceability

- **Method under test:** `TimetableEntryRepository.deleteAll(entries)` และ `TimetableEntryRepository.findAllById(entryIds)` ทั้งสองสืบทอดจาก `JpaRepository`
- **ประเภท:** Unit test ชั้น DAO ทดสอบกับ SQL Server จริงผ่าน Testcontainers ไม่ใช้ mock
- **ไม่อยู่ในขอบเขต:** สิ่งที่ `TimetableDeleteService.removeEntries` ทำตามลำดับใน [DTO & API Spec](../T05/US2-DTO-API-Spec.md) ได้แก่ ตอบ 400 เมื่อ `entryIds` ว่าง, ตัด ID ซ้ำ, ตรวจว่า entry เป็นของนักศึกษาคนนี้ (`entry.timetable.studentId`), ตรวจว่าอยู่ตารางเดียวกัน และการดักจับ null ทั้งหมดทดสอบใน Service test

โครงสร้างข้อมูล: `TimetableEntry` หนึ่งแถวคือหนึ่งวิชา (`Section`) ในตารางของนักศึกษา ส่วนคาบเรียน (`schedule_slot`) ผูกกับ `Section` ไม่ได้ผูกกับ entry การลบ entry แถวเดียวจึงทำให้ทุกคาบของวิชานั้นหายจากตาราง โดยที่ข้อมูล Section และคาบเรียนต้องยังอยู่

## สภาพแวดล้อมการทดสอบ

ทุกเคสรันด้วย `@DaoTest` ตาม Test Approach ของ US1-T12 ให้ Flyway สร้าง schema เหมือน production (ไม่ใช้ H2 เพราะ migration ใช้ syntax ของ SQL Server) แต่ละเทส rollback อัตโนมัติ จึงใช้ข้อมูลตั้งต้นชุดเดียวกันได้ทุกเคส

| รายการ | ค่า |
| --- | --- |
| Framework | Spring Boot, `@DaoTest` (`@DataJpaTest` + `@AutoConfigureTestDatabase(replace = NONE)` + `@Import(TestcontainersConfig.class)`) |
| ฐานข้อมูลทดสอบ | `MSSQLServerContainer` image `mcr.microsoft.com/mssql/server:2025-latest` รันเฉพาะ `db/migration` ไม่รัน seed |
| Library | JUnit 5, AssertJ, `TestEntityManager` |
| คลาสเทส | `TimetableEntryDeleteRepositoryTest` (คลาสใหม่ใน package `timetable`) |

แยกเป็นคลาสใหม่ ไม่เพิ่มลงใน `TimetableEntryRepositoryTest` ของ US1 เพราะ `@BeforeEach` ของคลาสนั้นเรียก `DaoFixture.persist(em)` ซึ่งเพิ่ม entry 5 แถวและ schedule\_slot 12 แถว ถ้ารวมกัน ค่าที่คาดหวังของ `count()` และจำนวน schedule\_slot ในเคส 01–05 จะไม่ตรง คลาสนี้จึงใช้เฉพาะข้อมูลตั้งต้นของ US2 และไม่ต้องแก้ไฟล์เทสของ US1 ซึ่งช่วยลด merge conflict ตาม CONTRIBUTING

ขั้นตอนเตรียมข้อมูล (ทุกเคส): `@BeforeEach` บันทึกข้อมูลตั้งต้นตามหัวข้อถัดไป แล้วเรียก `em.flush()` และ `em.clear()` ให้ทุกเคสเริ่มจาก persistence context ว่าง หลังจากนี้ตัวแปรใน fixture ใช้อ้างอิง ID เท่านั้น

เหตุที่ต้อง clear: entity ที่สร้างตอนเตรียมข้อมูลจะค้างอยู่ใน persistence context ถ้าไม่ clear ทั้ง `em.find()` และการตรวจผลจะได้ object จาก cache แทนที่จะอ่านจาก DB ผลเทสจึงขึ้นกับวิธีสร้าง fixture แทนที่จะขึ้นกับการทำงานจริง

ขั้นตอนของเคส `deleteAll` (UT-DAO-US2-01 ถึง 05):

1. โหลด entry ตาม ID ของเคสด้วย `em.find()` ให้เป็น managed entity เหมือนที่ Service ได้จาก `findAllById` (ไม่เรียก `findAllById` เพื่อไม่ให้ผลขึ้นกับอีก method ที่ทดสอบ)
2. เรียก `deleteAll(entries)`
3. เรียก `em.flush()` และ `em.clear()` เพื่อให้ผลที่ตรวจมาจาก DB จริง ไม่ใช่ cache ของ persistence context
4. assert ทั้งสองฝั่ง: entry ที่ส่งไปต้องหาย และ entry ที่ไม่ได้ส่งต้องยังอยู่ (ตรวจด้วย ID และ `count()`)

ขั้นตอนของเคส `findAllById` (UT-DAO-US2-06 ถึง 08):

1. เรียก `findAllById(ids)` ตาม Input ของเคส
2. assert ID ของรายการที่คืนแบบไม่สนลำดับ (เช่น `containsExactlyInAnyOrder`) เพราะ `findAllById` ไม่รับประกันลำดับ ค่าที่อ่านผ่าน relation แบบ LAZY (เช่น `entry.timetable.studentId`) ต้อง assert ภายใน transaction ของเทส

## ข้อมูลตั้งต้น (Test Fixture)

ก่อนทุกเคสมี 4 entry ใน 2 ตารางของภาค 1 ปีการศึกษา 2568: นักศึกษา A มี 3 วิชา และนักศึกษา B มี 1 วิชา โดย B ลง section เดียวกับ A ใน CS261 เพื่อทดสอบว่าการลบไม่กระทบผู้ใช้อื่น

| Entry | Timetable | Section | วิชา |
| --- | --- | --- | --- |
| E1 | T\_A (นักศึกษา A `6609000010`) | S1 | CS261 |
| E2 | T\_A (นักศึกษา A `6609000010`) | S2 | CS180 |
| E3 | T\_A (นักศึกษา A `6609000010`) | S3 | MA211 |
| E4 | T\_B (นักศึกษา B `6609000011`) | S1 | CS261 |

| Section | วิชา | กลุ่ม | คาบเรียน (schedule\_slot) |
| --- | --- | --- | --- |
| S1 | CS261 | 100001 | พุธ 15:00–16:30, ศุกร์ 15:00–16:30 |
| S2 | CS180 | 820001 | จันทร์ 13:30–16:30 |
| S3 | MA211 | 020001 | อังคาร 09:30–11:00, พฤหัสบดี 09:30–11:00 |

รวม schedule\_slot 5 แถว ชื่อ E1–E4, S1–S3, T\_A และ T\_B เป็นชื่อตัวแปรในเทส ส่วน ID จริง DB เป็นคนสร้าง

คลาสนี้ไม่เรียก `DaoFixture` จึงต้องสร้าง `Course` ทั้ง 3 วิชาเอง แต่ข้อมูลยังออกแบบไม่ให้ชน unique constraint กับ `DaoFixture` (ภาค 1/2568) เผื่อภายหลังต้องรวมกัน:

- CS180 และ MA211 กลุ่ม 020001 ใช้รหัสกลุ่มและเวลาตาม seed ภาค 1/2568 ส่วน CS261 กลุ่ม 100001 ไม่มีใน seed และ `DaoFixture` จึงไม่ชนกับข้อมูลเดิม
- `uq_section_course_term_no`: MA211 ใช้กลุ่ม 020001 ไม่ซ้ำกับกลุ่ม 010001 ที่มีใน `DaoFixture`
- `course` PK: MA211 มีใน `DaoFixture` ด้วย ถ้ารวมกันต้องใช้ `Course` เดิม ไม่สร้างใหม่
- `uq_timetable_student_term`: รหัสนักศึกษา A และ B ไม่ซ้ำกับ `6609000000`, `6609000001`, `6609000003` ที่ `DaoFixture` ใช้ในภาค 1/2568
- ไม่ใช้ CS223 เพราะ seed เปิดวิชานี้เฉพาะภาค 2/2568

## Test Cases: deleteAll(entries)

5 เคสครอบคลุมจำนวนที่ลบ (0, 1, หลาย, ทั้งหมด) และการไม่ลบเกินขอบเขต

| TC ID | สถานการณ์ | Input | Expected Result | Actual Result | Status |
| --- | --- | --- | --- | --- | --- |
| UT-DAO-US2-01 | ลบ 1 วิชาที่มี 2 คาบคนละวัน และมีนักศึกษาอื่นลง section เดียวกัน | `[E1]` | E1 ไม่อยู่ใน DB; `findByTimetableId(T_A)` คืน E2, E3 จึงไม่มีคาบพุธและศุกร์ของ CS261 ในตาราง A; `count()` 4 → 3; E4 (นักศึกษา B, S1 เดียวกัน) ยังอยู่ |  | ยังไม่รัน |
| UT-DAO-US2-02 | ลบหลายวิชา | `[E1, E2]` | E1, E2 หาย; ตาราง A เหลือ E3 เท่านั้น; `count()` 4 → 2 |  | ยังไม่รัน |
| UT-DAO-US2-03 | ลบทุกวิชาของ A | `[E1, E2, E3]` | ตาราง A เหลือ 0 entry แต่ Timetable T\_A ยังอยู่; E4 ของ B ยังอยู่; `count()` 4 → 1 |  | ยังไม่รัน |
| UT-DAO-US2-04 | entries ว่าง | `List.of()` | ไม่ throw exception; `count()` ยังเป็น 4 และ E1–E4 ยังอยู่ครบ |  | ยังไม่รัน |
| UT-DAO-US2-05 | ไม่ลบข้อมูลรายวิชาและคาบเรียน | `[E1]` | S1 ยังค้นเจอใน `SectionRepository`; `em.find(Section.class, S1).getSlots()` ยังมี 2 แถว; schedule\_slot ทั้งหมดยังเป็น 5 แถว (นับด้วย JPQL `select count(s) from ScheduleSlot s`) |  | ยังไม่รัน |

- ไม่ทดสอบการส่ง entity ที่ถูกลบไปแล้วเข้า `deleteAll` เพราะ Service ส่งเฉพาะ entity ที่เพิ่งโหลดจาก `findAllById` ใน transaction เดียวกัน กรณี ID ที่ไม่มีใน DB แล้วครอบคลุมโดยเคส 07
- เคส 05 ยืนยันว่าการลบ entry ไม่ cascade ไปลบ `Section` หรือ `schedule_slot` ซึ่งเป็นข้อมูลรายวิชาที่นักศึกษาทุกคนใช้ร่วมกัน นับ schedule\_slot ทั้งหมดด้วย JPQL ผ่าน `TestEntityManager` ไม่เพิ่ม `ScheduleSlotRepository` เพราะไม่มี Service ใดใช้ (คาบเรียนอ่านผ่าน `Section.slots` เสมอ) จึงไม่ควรเพิ่มโค้ด production เพื่อเทสอย่างเดียว
- การดักจับ null ทำที่ Service จึงทดสอบใน Service test ไม่ใช่ที่ DAO

กรณีตารางเรียนว่าง (ไม่มีวิชาเลย) ไม่แยกเป็นเคสใน DAO เพราะ `deleteAll` ลบเฉพาะ entry ที่ส่งเข้าไป จึงครอบคลุมโดยเคส 04 ส่วนการล็อคปุ่มลบทดสอบที่ Frontend และ response ของ API ทดสอบที่ Service

## Test Cases: findAllById(entryIds)

`findAllById` คืนเฉพาะ entry ที่หาเจอ ไม่ throw และไม่กรองว่าเป็นของใคร 3 เคสนี้ตรวจพฤติกรรมของ DAO เท่านั้น ส่วนการตัดสินว่าจะตอบ error แบบใดตรวจในชั้น Service

| TC ID | สถานการณ์ | Input | Expected Result | Actual Result | Status |
| --- | --- | --- | --- | --- | --- |
| UT-DAO-US2-06 | ID ที่มีอยู่ทั้งหมด | `[E1.id, E2.id]` | คืน 2 entry คือ E1 (S1, CS261) และ E2 (S2, CS180) |  | ยังไม่รัน |
| UT-DAO-US2-07 | มี ID ที่ไม่มีใน DB ปนอยู่ | `[E1.id, Long.MAX_VALUE]` | ไม่ throw exception; คืน E1 รายการเดียว |  | ยังไม่รัน |
| UT-DAO-US2-08 | มี ID ของนักศึกษาคนอื่นปนอยู่ | `[E1.id, E4.id]` | คืนทั้ง 2 entry; `timetable.studentId` ของ E4 เป็นของ B |  | ยังไม่รัน |

- เคส 07 ยืนยันว่า ID ที่หาไม่เจอถูกข้ามไปโดยไม่ throw จำนวน entry ที่คืนจึงอาจน้อยกว่าจำนวน ID ที่ส่งไป ใช้ `Long.MAX_VALUE` เป็น ID ที่ไม่มีอยู่จริง เพราะ `entry_id` เป็น `BIGINT IDENTITY` ที่เริ่มจาก 1 จึงไม่มีทางสร้างถึงค่านี้ และไม่ขึ้นกับข้อมูลใน fixture
- เคส 08 ยืนยันว่า DAO ไม่กรองเจ้าของ Service จึงต้องเช็ก `entry.timetable.studentId` เองก่อนลบ

list ว่างและ ID ซ้ำไม่ทดสอบที่ DAO เพราะ Service จัดการก่อนเรียก `findAllById` ตามลำดับใน DTO & API Spec: `entryIds` ว่างตอบ 400 ทันที ส่วน ID ซ้ำ (เช่น `7,7`) ถูกตัดด้วย `LinkedHashSet` แล้วตอบ 200 เหมือนส่ง `7` ตัวเดียว Service จึงเทียบจำนวน entry ที่ได้กับจำนวน ID หลังตัดซ้ำได้ถูกต้อง ทั้งสองกรณีทดสอบใน Service test

## Traceability: method ที่ทดสอบแล้วใน US1

การแสดงตารางหลังลบใช้ `TimetableService.getTimetable` ของ US1 ซึ่งเรียก 2 method ต่อกัน ทั้งสองทดสอบไว้แล้วใน US1 จึงอ้างอิง TC ID เดิมแทนการเขียนซ้ำ (TC ID ในตารางนี้เป็นของเอกสาร US1-T12)

| Method | ใช้ใน US2 เพื่อ | TC ID ที่อ้างอิง (US1-T12) |
| --- | --- | --- |
| `TimetableRepository.findByStudentIdAndAcademicYearAndSemester` | หาตารางของนักศึกษาในภาคนั้น | UT-DAO-08, 09 |
| `TimetableEntryRepository.findByTimetableId` | ดึงวิชาที่เหลือพร้อม section และคาบเรียน | UT-DAO-13, 14, 15, 16 |

## สรุปผลการทดสอบ

กรอกหลังรัน `mvn test`

| รายการ | ค่า |
| --- | --- |
| จำนวน test case | 8 |
| Pass |  |
| Fail |  |
| ผู้ทดสอบ |  |
| วันที่ทดสอบ |  |

## เอกสารที่เกี่ยวข้อง

- [DAO Class Diagram](../T06/US2-T06-DAO-Class-Diagram.md) (US2-T06)
- [Sequence Diagram](../T06/US2-T06-Sequence-Diagram.md) (US2-T06)
- [ER Diagram (DB)](../T06/US2-T06-ER-Diagram.md) (US2-T06)
- [DTO & API Spec](../T05/US2-DTO-API-Spec.md) (US2-T05)
- [US1-T12 Design Unit Test Cases ส่วน DAO](../../US1/T12/US1-T12%20Design%20Unit%20Test%20Cases%20ส่วน%20DAO.md)
