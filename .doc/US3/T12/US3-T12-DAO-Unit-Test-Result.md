# US3-T12 ผลการทดสอบ Unit Test ส่วน DAO

Oct 19, 2026 · @Non

## สรุปผล

รัน unit test 11 กรณีตามเอกสาร [US3-T12 Design Unit Test Cases ส่วน DAO](./US3-T12-DAO-Unit-Test-Cases.md) (branch `docs/US3-T12-design-unit-test-dao`) กับโค้ด DAO ของ US3-T09 **ผ่านครบ 11/11** `./mvnw clean test` ทั้งโปรเจกต์ผ่าน 86/86

| Repository / Entity | Test case | ผ่าน |
| --- | --- | --- |
| `UserRepository` + `User` | UT-DAO-US3-01 – 04 | 4/4 |
| `LoginAttemptRepository` + `LoginAttempt` | UT-DAO-US3-05 – 10 | 6/6 |
| Schema (`ck_login_attempt_count`) | UT-DAO-US3-11 | 1/1 |

**User story:** US3 เข้าสู่ระบบด้วย username และ password ของสำนักทะเบียน · branch `feature/US3-T09-dao-entity`

## สภาพแวดล้อม

| หัวข้อ | ค่า |
| --- | --- |
| วันที่รัน | 2026-10-19 |
| คำสั่ง | `cd backend && ./mvnw clean test` |
| Java / Spring Boot | 21.0.10 / 4.1.1 |
| Database | Testcontainers 2.0.5 `MSSQLServerContainer` image `mcr.microsoft.com/mssql/server:2025-latest` (start 7.9 วินาที) |
| Schema | Flyway รัน `db/migration` 3 ไฟล์ (`V1`, `V20261014_1940`, `V20261019_0106`) แล้ว Hibernate `validate` |
| Test class | `user/UserRepositoryTest`, `auth/LoginAttemptRepositoryTest`, `SchemaConstraintTest` (เพิ่ม 1 method) |

## ผลรายกรณี

| ID | Test method | ผล | เวลา (s) |
| --- | --- | --- | --- |
| UT-DAO-US3-01 | `findById_existingStudent_returnsUserWithThaiProfile` | PASS | 0.032 |
| UT-DAO-US3-02 | `findById_nonExistingStudent_returnsEmpty` | PASS | 0.028 |
| UT-DAO-US3-03 | `save_newUser_insertsRowAndPersistsAllFields` | PASS (ปรับขั้นตอน ดูหัวข้อถัดไป) | 0.034 |
| UT-DAO-US3-04 | `save_existingUserAfterUpdateProfile_updatesRowWithoutCreatingDuplicate` | PASS (ปรับขั้นตอน ดูหัวข้อถัดไป) | 0.035 |
| UT-DAO-US3-05 | `save_firstFailedAttemptForUnknownUsername_savesCountOneUnlocked` | PASS | 0.030 |
| UT-DAO-US3-06 | `save_fourthFailedAttempt_incrementsCountWithoutLocking` | PASS | 0.043 |
| UT-DAO-US3-07 | `save_fifthFailedAttempt_locksAccountFor15Minutes` | PASS | 0.054 |
| UT-DAO-US3-08 | `isLocked_when15MinutesElapsed_unlocksAndReturnsZeroRemainingSeconds` | PASS | 0.029 |
| UT-DAO-US3-09 | `save_failedAttemptAfterLockExpired_resetsCountToOneAndClearsLock` | PASS | 0.037 |
| UT-DAO-US3-10 | `deleteById_existingAttempt_removesOnlyTargetUserAttempt` | PASS | 0.760 |
| UT-DAO-US3-11 | `saveAndFlush_negativeFailedAttempts_throwsConstraintViolation` | PASS | 0.103 |

เวลาไม่รวมการ start container และ Spring context (ครั้งเดียวต่อการรัน ทุก test class ใช้ร่วมกัน) UT-DAO-US3-10 ใช้เวลานานกว่าเพราะเป็น test แรกที่ JUnit รันใน class

## ส่วนที่ต่างจากเอกสารออกแบบ

**`incrementFailedAttempts` รับเวลา `now`** เอกสาร T12 ให้เรียก `incrementFailedAttempts(5, 900)` "ณ เวลา `BASE_TIME`" แต่ signature ใน [DAO Class Diagram](../T06/US3-T06-DAO-Class-Diagram.md) ไม่รับเวลา จึงเพิ่ม overload `incrementFailedAttempts(maxAttempts, lockSeconds, now)` ให้ test ส่ง `BASE_TIME` ได้ (UT-DAO-US3-05 – 09) ส่วนแบบ 2 พารามิเตอร์ยังอยู่และส่งต่อด้วยเวลาปัจจุบัน (`Asia/Bangkok`) ให้ `LoginAttemptService` เรียก

**Constructor ของ `User`** เอกสารเขียน `User("6809619999", "ดลลี่", "แบร่", "วิทยาการคอมพิวเตอร์", "ภาคปกติ", BASE_TIME)` แต่โค้ดใช้ `User(studentId, firstName, lastName, department, track)` ที่เรียก `updateProfile` ให้ `updatedAt` เป็นเวลาซิงก์จริงเสมอ test จึงตั้ง `updatedAt` ทับด้วย setter

| Test case | เอกสารออกแบบ | ที่รันจริง |
| --- | --- | --- |
| UT-DAO-US3-03 | ส่ง `BASE_TIME` ใน constructor | `new User(...)` แล้ว `setUpdatedAt(BASE_TIME)` |
| UT-DAO-US3-04 | `updateProfile(...)` "พร้อมอัปเดต `updatedAt = BASE_TIME.plusHours(1)`" | `updateProfile(...)` แล้ว `setUpdatedAt(BASE_TIME.plusHours(1))` |
| Fixture `U1`, `U2` | `updated_at = BASE_TIME` | เหมือนกัน ตั้งด้วย setter |

**UT-DAO-US3-11** ใช้ `loginAttemptRepository.saveAndFlush` กับ `failedAttempts = -1` แล้วตรวจ `DataIntegrityViolationException` ตามที่เอกสารระบุ (เหมือน UT-DAO-18 – 20 ของ US1) ไม่ใช้ native query

**Fixture** แยกไว้ใน `@BeforeEach` ของแต่ละ test class ตามที่เอกสารกำหนด ไม่เพิ่มใน `DaoFixture` ของ US1 ข้อมูล `U1`, `U2`, `LA1` – `LA3` ตรงตามตาราง Test Fixture ทุกแถว

## ประวัติการรัน

| ครั้ง | ผล | สาเหตุ / การแก้ |
| --- | --- | --- |
| 1 | รันไม่ได้ | Docker Desktop ไม่ได้เปิด Testcontainers ต่อ Docker ไม่ได้ |
| 2 | Error 22 test (ก่อนมี test ของ US3) | `ClassNotFoundException: ...user.User` ตอน Hibernate โหลด entity เพราะ `target/` มี class เก่าค้างและ IDE compile ทับระหว่างรัน แก้ด้วย `./mvnw clean test` |
| 3 | Error 1/75 | Flyway กับ Hibernate validate ผ่านกับ entity ใหม่ (`contextLoads_flywayMigrationMatchesEntities` PASS) เหลือ `BackendApplicationTests` ที่ต่อ DB ของ `docker compose` ล้มด้วย `Detected applied migration not resolved locally: 2` (DB ในเครื่องเคยรัน migration จาก branch อื่น ไม่ใช่ปัญหาของ DAO) |
| 4 | **PASS 36/36** | DAO test ทั้งหมด (`SchemaConstraintTest,*RepositoryTest`) หลังเพิ่ม test ของ US3 |
| 5 | **PASS 86/86** | `./mvnw clean test` ทั้งโปรเจกต์ ไม่ได้แก้โค้ดระหว่างครั้งที่ 3 กับ 5 |

## ข้อที่ต้องตัดสินในเอกสารออกแบบ

| ข้อ | ที่ทำ |
| --- | --- |
| คอลัมน์ของ `users` ว่างได้หรือไม่ (ER Diagram ไม่ได้ระบุ) | ทุกคอลัมน์ `NOT NULL` เพราะ `save(user)` อยู่หลังตรวจ `ACCOUNT_INACTIVE` และ `NOT_CS_STUDENT` ใน [Sequence Diagram](../T06/US3-T06-Sequence-Diagram.md) แถวที่บันทึกได้จึงมี `department` และ `track` เสมอ และ `first_name`, `last_name` ใช้แสดงที่ Navbar (TC7) ถ้าภายหลังต้องให้ว่างได้ เพิ่ม migration ใหม่ `ALTER COLUMN ... NULL` ได้โดยไม่กระทบข้อมูลเดิม (กลับกันต้องเติมแถวที่เป็น `NULL` ก่อน) |
| ครบเวลาล็อกพอดีถือว่าล็อกอยู่หรือไม่ | ปลดล็อกแล้ว (`now < lockedUntil` จึงล็อก) ตาม UT-DAO-US3-08 |
| `remainingLockSeconds` เมื่อเหลือเศษวินาที | ปัดขึ้น ให้ `retryAfterSeconds` ไม่บอกเวลาน้อยกว่าที่ต้องรอจริง |
| เวลาที่บันทึก (`updatedAt`, `lockedUntil`) | ตัดเหลือวินาทีเหมือน `Timetable.touch()` ของ US1 |

## หมายเหตุสำหรับงานต่อ

- อัปเดต [DAO Class Diagram](../T06/US3-T06-DAO-Class-Diagram.md) ของ T06 ให้มี constructor `User(studentId, firstName, lastName, department, track)` และ overload `incrementFailedAttempts(int, long, OffsetDateTime)`
- `AuthService` (US3-T08) สร้างผู้ใช้ใหม่ด้วย constructor 5 พารามิเตอร์ ไม่ต้องเรียก `updateProfile` ซ้ำ ส่วนผู้ใช้เดิมเรียก `updateProfile` แล้ว `save`
- `AuthService` (US3-T08) ต้องรับมือกรณี TU API ส่ง `firstName` หรือ `lastName` เป็น `null` (เช่น นักศึกษาที่ไม่มีนามสกุล) ก่อน `save` โดยใส่ `""` แทนหรือโยน error ที่ชัดเจน ไม่เช่นนั้น `NOT NULL` จะทำให้เกิด `DataIntegrityViolationException` และผู้ใช้ได้ 500 ส่วน `department` และ `track` ผ่านการตรวจ `NOT_CS_STUDENT` มาแล้ว
- `LoginAttemptService` สร้าง `new LoginAttempt(username)` เมื่อ `findById` ไม่พบ แล้วเรียก `incrementFailedAttempts` ก่อน `save` เสมอ (`updated_at` เป็น `NOT NULL`)
- ถ้า IDE เปิดอยู่ระหว่างรัน test แล้วเจอ `ClassNotFoundException` หรือ `ClassSelector ... resolution failed` ให้รัน `./mvnw clean test`
- เอกสาร test case ของ T12 ยังอยู่ใน branch `docs/US3-T12-design-unit-test-dao` ลิงก์ไปเอกสารนั้นจะใช้ได้หลัง merge

**เอกสารที่เกี่ยวข้อง:** [DAO Class Diagram](../T06/US3-T06-DAO-Class-Diagram.md) · [ER Diagram](../T06/US3-T06-ER-Diagram.md) · [Sequence Diagram](../T06/US3-T06-Sequence-Diagram.md) · [Extended API Class Diagram](../T06/US3-T06-Extended-API-Class-Diagram.md) · [DTO & API Spec](../T05/US3-DTO-API-Spec.md)
