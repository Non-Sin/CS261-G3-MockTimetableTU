# US2-T12 ผลการทดสอบ Unit Test ส่วน DAO

Oct 18, 2026 · @Non

## สรุปผล

รัน unit test 8 กรณีตามเอกสาร [US2-T12 Design Unit Test Cases ส่วน DAO](./US2-T12-DAO-Unit-Test-Cases.md) กับ `TimetableEntryRepository` ของ US1 **ผ่านครบ 8/8** ไม่ต้องแก้โค้ด production

| Method | Test case | ผ่าน |
| --- | --- | --- |
| `TimetableEntryRepository.deleteAll(entries)` | UT-DAO-US2-01 – 05 | 5/5 |
| `TimetableEntryRepository.findAllById(entryIds)` | UT-DAO-US2-06 – 08 | 3/3 |

`./mvnw clean test` ทั้งโปรเจกต์: 82/83 ผ่าน ตัวที่ไม่ผ่านคือ `BackendApplicationTests` ซึ่งไม่เกี่ยวกับ US2 (ดูหัวข้อ "ประวัติการรัน")

**User story:** US2 ลบวิชาจากตารางเรียนจำลอง · branch `feature/US2-T09-develop-dao-entity`

## สภาพแวดล้อม

| หัวข้อ | ค่า |
| --- | --- |
| วันที่รัน | 2026-10-18 |
| คำสั่ง | `cd backend && ./mvnw clean test` |
| Java / Spring Boot | 21 / 4.1.1 |
| Docker | Docker Desktop (Engine 29.8.2) |
| Database | Testcontainers `MSSQLServerContainer` image `mcr.microsoft.com/mssql/server:2025-latest` |
| Schema | Flyway รันเฉพาะ `db/migration` ไม่รัน seed (`@DaoTest`) |
| Test class | `TimetableEntryDeleteRepositoryTest` (ใหม่ ใน package `timetable`) |

## ผลรายกรณี

| ID | Test method | ผล | เวลา (s) |
| --- | --- | --- | --- |
| UT-DAO-US2-01 | `deleteAll_oneMultiSlotEntry_removesOnlyThatEntry` | PASS | 0.069 |
| UT-DAO-US2-02 | `deleteAll_multipleEntries_removesAllGiven` | PASS | 0.102 |
| UT-DAO-US2-03 | `deleteAll_everyEntryOfTimetable_keepsTimetableRow` | PASS | 0.077 |
| UT-DAO-US2-04 | `deleteAll_emptyList_deletesNothing` | PASS | 0.096 |
| UT-DAO-US2-05 | `deleteAll_entry_keepsSectionAndScheduleSlots` | PASS | 0.069 |
| UT-DAO-US2-06 | `findAllById_existingIds_returnsThoseEntries` | PASS | 0.061 |
| UT-DAO-US2-07 | `findAllById_withUnknownId_skipsIt` | PASS | 0.053 |
| UT-DAO-US2-08 | `findAllById_withOtherStudentsId_doesNotFilterByOwner` | PASS | 0.070 |

เวลาไม่รวมการ start container และ Spring context ซึ่งใช้ร่วมกับ DAO test class อื่นของ US1

## ส่วนที่ต่างจากเอกสารออกแบบ

| หัวข้อ | เอกสารออกแบบ | ที่ทำจริง |
| --- | --- | --- |
| Library สำหรับ assert | AssertJ (`containsExactlyInAnyOrder`) | JUnit `assertEquals` เทียบเป็น `Set` ของ id ให้เหมือน DAO test ของ US1 ผลเท่ากัน คือไม่สนลำดับ |
| ข้อมูลที่เอกสารไม่ได้กำหนด | — | ชื่อวิชา CS261 = SOFTWARE ENGINEERING ทุกวิชาหมวด `MAJOR` 3 หน่วยกิต ไม่ใส่ชื่ออาจารย์และห้อง (column เป็น nullable) และ `updatedAt` เป็นค่าคงที่ |

ส่วนอื่นตรงตามเอกสาร ได้แก่ fixture E1–E4, S1–S3, T\_A, T\_B และ schedule\_slot 5 แถว, การ `flush()` + `clear()` ทั้งใน `@BeforeEach` และหลัง `deleteAll` และการโหลด entry ด้วย `em.find()` ก่อนลบ ส่วนเคส 05 นับ schedule\_slot ด้วย JPQL ผ่าน `TestEntityManager` โดยไม่เพิ่ม `ScheduleSlotRepository`

## ประวัติการรัน

| ครั้ง | ผล | สาเหตุ / การแก้ |
| --- | --- | --- |
| 1 | ไม่ได้รัน | Docker Desktop ไม่ได้เปิด Testcontainers จึงต่อ Docker ไม่ได้ แก้โดยเปิด Docker Desktop |
| 2 | **PASS 8/8** | `./mvnw clean test -Dtest=TimetableEntryDeleteRepositoryTest` |
| 3 | PASS 82/83 | `./mvnw test` ทั้งโปรเจกต์ตอนที่ยังไม่ได้เปิด DB ของ compose ตัวที่ไม่ผ่านคือ `BackendApplicationTests` ซึ่งต้องใช้ DB นั้น (ดูครั้งที่ 4 ใน US1-T12) |
| 4 | PASS 82/83 | หลัง `docker compose up -d sqlserver db-init` `BackendApplicationTests` ยังไม่ผ่าน เพราะ Flyway ตอบ `Detected applied migration not resolved locally: 2` คือ DB ใน volume ของ compose บนเครื่องนี้เคยรัน migration เวอร์ชัน 2 ซึ่งไม่มีในโค้ดปัจจุบันแล้ว เป็นข้อมูลเก่าในเครื่อง ไม่เกี่ยวกับโค้ดของ US2 |

ถ้าจะให้ `BackendApplicationTests` ผ่าน ต้องล้าง DB ของ compose ด้วย `docker compose down -v` แล้ว `docker compose up -d sqlserver db-init` ใหม่ ข้อมูลใน DB ของ compose บนเครื่องจะหายทั้งหมด จึงยังไม่ได้ทำ

## หมายเหตุสำหรับงานต่อ (US2-T08)

- เคส 07 ยืนยันว่า `findAllById` ข้าม id ที่หาไม่เจอโดยไม่ throw `TimetableDeleteService` จึงต้องเทียบจำนวน entry ที่ได้กับจำนวน id หลังตัดซ้ำเพื่อตอบ 404
- เคส 08 ยืนยันว่า DAO ไม่กรองเจ้าของ service ต้องเช็ก `entry.getTimetable().getStudentId()` เองก่อนลบ
- เคส 03 ยืนยันว่าลบ entry ทั้งหมดแล้วแถว `timetable` ยังอยู่ ตารางที่ลบจนว่างจึงคืน `updatedAt` เป็นเวลาที่ลบ ตาม API Spec
- เคส 05 ยืนยันว่าการลบ entry ไม่ cascade ไปที่ `Section` และ `schedule_slot`

**เอกสารที่เกี่ยวข้อง:** [Design Unit Test Cases ส่วน DAO](./US2-T12-DAO-Unit-Test-Cases.md) · [DAO Class Diagram](../T06/US2-T06-DAO-Class-Diagram.md) · [DTO & API Spec](../T05/US2-DTO-API-Spec.md) · [US1-T12 ผลการทดสอบ DAO](../../US1/T12/US1-T12-DAO-Unit-Test-Result.md)
