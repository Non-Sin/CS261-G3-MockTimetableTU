# US3-T12 Design Unit Test Cases ส่วน DAO: เข้าสู่ระบบ ข้อมูลนักศึกษา และการนับครั้งที่เข้าสู่ระบบผิดพลาด

## ขอบเขตการทดสอบ

ออกแบบ Unit Test ชั้น DAO จำนวน 11 เคส สำหรับ `UserRepository` (`User`) และ `LoginAttemptRepository` (`LoginAttempt`) ตามที่ออกแบบไว้ใน [US3-T06 DAO Class Diagram](../T06/US3-T06-DAO-Class-Diagram.md) และ [US3-T06 ER Diagram](../T06/US3-T06-ER-Diagram.md) เพื่อใช้เป็นข้อกำหนดในการเขียนโค้ดและชุดทดสอบใน US3-T09

- **User Story:** US3 เข้าสู่ระบบด้วย username และ password ของสำนักทะเบียน
- **Branch:** `docs/US3-T12-design-unit-test-dao`
- **Method under test:**
  1. **ส่วนบันทึก/อ่านข้อมูลนักศึกษาและประวัติส่วนตัว (`UserRepository` และ `User`):** `findById(studentId)`, `save(user)` และ `User.updateProfile(firstName, lastName, department, track)`
  2. **ส่วนการนับครั้งที่ผิด และการระงับ/ปลดระงับเมื่อครบ 15 นาที (`LoginAttemptRepository` และ `LoginAttempt`):** `findById(username)`, `save(attempt)`, `deleteById(username)`, `LoginAttempt.incrementFailedAttempts(maxAttempts, lockSeconds)`, `LoginAttempt.isLocked(now)` และ `LoginAttempt.remainingLockSeconds(now)`
  3. **ส่วนตรวจสอบ Schema และ Constraint ของตาราง:** `ck_login_attempt_count` (`failed_attempts >= 0`)
- **ประเภท:** Unit test ชั้น DAO ทดสอบกับฐานข้อมูล SQL Server จริงผ่าน Testcontainers ไม่ใช้ mock
- **ไม่อยู่ในขอบเขต (ทดสอบในชั้น Service / Controller แทน):**
  - การยิง HTTP ตรวจสอบรหัสผ่านกับ `TuApiClient.verifyCredentials`
  - การตรวจสอบสถานะบัญชี Active (`403 ACCOUNT_INACTIVE`) และการตรวจสอบสาขาวิชาวิทยาการคอมพิวเตอร์ภาคปกติ (`403 NOT_CS_STUDENT`) ใน `AuthService`
  - การออกและตรวจสอบ JWT Token (`JwtService`, `JwtAuthenticationFilter`, `SecurityContextStudentProvider`)
  - การควบคุม Transaction Propagation (`@Transactional(propagation = Propagation.REQUIRES_NEW)`) ของ `LoginAttemptService` เมื่อทำงานร่วมกับ `AuthService`

---

## สภาพแวดล้อมการทดสอบ (Test Approach)

ทุกเคสรันด้วย `@DaoTest` ตามมาตรฐานเดียวกับ [US1-T12](../../US1/T12/US1-T12%20Design%20Unit%20Test%20Cases%20ส่วน%20DAO.md) และ [US2-T12](../../US2/T12/US2-T12-DAO-Unit-Test-Cases.md) ให้ Flyway สร้างตารางจริงบน SQL Server เพื่อตรวจสอบการเก็บข้อความภาษาไทย (`NVARCHAR`), เวลาพร้อม Timezone (`DATETIMEOFFSET`) และ `CHECK` constraint โดยแต่ละเทสจะ Rollback อัตโนมัติหลังรันจบ

| รายการ | ข้อกำหนด |
| --- | --- |
| Annotation | `@DaoTest` (`@DataJpaTest(properties = "spring.flyway.locations=classpath:db/migration")` + `@AutoConfigureTestDatabase(replace = NONE)` + `@Import(TestcontainersConfig.class)`) |
| ฐานข้อมูลทดสอบ | `MSSQLServerContainer` image `mcr.microsoft.com/mssql/server:2025-latest` รันเฉพาะ `db/migration` |
| Library | JUnit 5, AssertJ / JUnit Assertions, `TestEntityManager` |
| คลาสเทส | `UserRepositoryTest` (ใน package `user`) และ `LoginAttemptRepositoryTest` (ใน package `auth`) |
| ชื่อ method เทส | `<method>_<เงื่อนไข>_<ผลที่คาดหวัง>` เช่น `findById_existingStudent_returnsUserWithThaiProfile` |

**หลักการเตรียมข้อมูลและตรวจสอบผลในแต่ละเคส:**

1. แยกคลาสทดสอบ `UserRepositoryTest` และ `LoginAttemptRepositoryTest` ออกจาก `DaoFixture` ของ US1 เพื่อไม่ให้กระทบจำนวนแถวของเทสเดิมและลดโอกาสเกิด Merge Conflict ตาม `CONTRIBUTING.md`
2. ใน `@BeforeEach` ใช้ `TestEntityManager.persist(...)` บันทึกข้อมูลตั้งต้นลง DB แล้วเรียก `em.flush()` และ `em.clear()` ทันที เพื่อล้าง First-level Cache ใน Persistence Context ให้ทุกการเรียก Repository ในเทสยิง Query ไปอ่านจาก SQL Server จริง
3. หลังเรียกเมธอดที่เปลี่ยนแปลงข้อมูล (`save`, `deleteById`) ต้องเรียก `em.flush()` และ `em.clear()` ก่อนเสมอ แล้วจึง Query กลับมาตรวจสอบผลลัพธ์
4. ใช้เวลาอ้างอิงคงที่ (`BASE_TIME`) แทน `OffsetDateTime.now()` ในการทดสอบ `incrementFailedAttempts`, `isLocked` และ `remainingLockSeconds` เพื่อให้ผลลัพธ์ของการนับเวลา 15 นาที (`900` วินาที) และการปลดระงับมีความแน่นอน (Deterministic) ไม่คลาดเคลื่อนตามความเร็วเครื่องขณะรันเทส

---

## ข้อมูลตั้งต้น (Test Fixture)

กำหนดเวลาอ้างอิงมาตรฐานสำหรับชุดทดสอบ:
- `BASE_TIME` = `2026-10-18T10:00:00+07:00`
- ค่าคงที่ตาม Spec: `MAX_ATTEMPTS = 5`, `LOCK_SECONDS = 900` (15 นาที)

### 1. ตาราง `users` (ใน `UserRepositoryTest`)

| ตัวแปร | `student_id` (PK) | `first_name` | `last_name` | `department` | `track` | `updated_at` |
| --- | --- | --- | --- | --- | --- | --- |
| `U1` | `"6809610001"` | `"อลิษา"` | `"หลิว"` | `"วิทยาการคอมพิวเตอร์"` | `"ภาคปกติ"` | `2026-10-18T10:00:00+07:00` |
| `U2` | `"6809610002"` | `"เซเลอร์"` | `"มูน"` | `"วิทยาการคอมพิวเตอร์"` | `"ภาคปกติ"` | `2026-10-18T10:00:00+07:00` |

- รหัสนักศึกษาที่ยังไม่มีในฐานข้อมูลสำหรับทดสอบการค้นหาไม่พบและการเพิ่มแถวใหม่: `"6809619999"`

### 2. ตาราง `login_attempt` (ใน `LoginAttemptRepositoryTest`)

| ตัวแปร | `username` (PK) | `failed_attempts` | `locked_until` | `updated_at` | สถานะตั้งต้น ณ `BASE_TIME` (`10:00:00`) |
| --- | --- | --- | --- | --- | --- |
| `LA1` | `"6809610001"` | `4` | `null` | `2026-10-18T10:00:00+07:00` | ผิดสะสม 4 ครั้ง ยังไม่ถูกล็อก |
| `LA2` | `"6809610002"` | `5` | `2026-10-18T10:15:00+07:00` (`BASE_TIME + 15 นาที`) | `2026-10-18T10:00:00+07:00` | ผิดครบ 5 ครั้ง กำลังถูกระงับ 15 นาที |
| `LA3` | `"6809610003"` | `5` | `2026-10-18T09:45:00+07:00` (`BASE_TIME - 15 นาที`) | `2026-10-18T09:30:00+07:00` | เคยถูกล็อก แต่ครบกำหนด 15 นาทีแล้ว |

- ชื่อผู้ใช้ที่ยังไม่มีประวัติการกรอกผิด (และไม่มีอยู่ในตาราง `users`): `"unknown_user"`

---

## Test Cases ส่วนที่ 1: บันทึกและอ่านข้อมูลนักศึกษา (`UserRepository` และ `User`)

ครอบคลุมการอ่านข้อมูลนักศึกษาสำหรับแสดงที่ Navbar (`GET /api/users/me`) และการทำ Upsert ข้อมูลนักศึกษาเมื่อเข้าสู่ระบบสำเร็จ (`POST /api/auth/login`)

| TC ID | สถานการณ์ | Input | Expected Result | Actual Result | Status |
| --- | --- | --- | --- | --- | --- |
| UT-DAO-US3-01 | ค้นหานักศึกษาที่มีอยู่ในระบบด้วย `findById` | `"6809610001"` | คืน `Optional` ที่มี `U1` พร้อม `firstName = "อลิษา"`, `lastName = "หลิว"`, `department = "วิทยาการคอมพิวเตอร์"`, `track = "ภาคปกติ"` และ `updatedAt` ตรงกับ `BASE_TIME` |  | ยังไม่รัน |
| UT-DAO-US3-02 | ค้นหานักศึกษาที่ยังไม่เคยเข้าสู่ระบบด้วย `findById` | `"6809619999"` | คืน `Optional.empty()` โดยไม่โยน exception |  | ยังไม่รัน |
| UT-DAO-US3-03 | บันทึกนักศึกษาใหม่เมื่อเข้าสู่ระบบครั้งแรก (`save` Insert) | `User("6809619999", "ดลลี่", "แบร่", "วิทยาการคอมพิวเตอร์", "ภาคปกติ", BASE_TIME)` | บันทึกลงตาราง `users` สำเร็จ; `count()` เพิ่มจาก 2 เป็น 3; เมื่อ `findById("6809619999")` ได้ข้อมูลภาษาไทย (`firstName = "ดลลี่"`, `lastName = "แบร่"`) และเวลาตรงตามที่บันทึก |  | ยังไม่รัน |
| UT-DAO-US3-04 | อัปเดตข้อมูลนักศึกษาเดิมเมื่อเข้าสู่ระบบซ้ำ (`updateProfile` + `save` Update) | แก้ไข `U1` (`"6809610001"`) เป็นนามสกุล `"หลิวหลิว"` และ `updatedAt = BASE_TIME + 1 ชั่วโมง` | อัปเดตแถวเดิมสำเร็จโดยไม่สร้างแถวใหม่ (`count()` ยังเป็น 2); เมื่อ `findById("6809610001")` ได้ `firstName = "อลิษา"`, `lastName = "หลิวหลิว"` และ `updatedAt` ใหม่ ส่วน `U2` (`"เซเลอร์"`, `"มูน"`) ไม่เปลี่ยนแปลง |  | ยังไม่รัน |

### รายละเอียดขั้นตอนการทดสอบ (UT-DAO-US3-01 ถึง 04)

#### [UT-DAO-US3-01] ค้นหานักศึกษาที่มีอยู่ในระบบด้วย `findById`
- **Related CoS:** TC1a, TC7 · **Test method:** `findById_existingStudent_returnsUserWithThaiProfile`
- **Test Steps:**
  1. เรียก `userRepository.findById("6809610001")`
  2. ตรวจสอบค่าทุกฟิลด์ของ `User` ที่ได้
- **Expected Result:**
  - `Optional.isPresent()` เป็น `true`
  - `studentId = "6809610001"`, `firstName = "อลิษา"`, `lastName = "หลิว"`, `department = "วิทยาการคอมพิวเตอร์"`, `track = "ภาคปกติ"` (ภาษาไทยไม่เพี้ยน ยืนยันคอลัมน์ `NVARCHAR`)
  - `updatedAt.toInstant()` เท่ากับ `BASE_TIME.toInstant()`

#### [UT-DAO-US3-02] ค้นหานักศึกษาที่ยังไม่เคยเข้าสู่ระบบด้วย `findById`
- **Related CoS:** TC1a · **Test method:** `findById_nonExistingStudent_returnsEmpty`
- **Test Steps:**
  1. เรียก `userRepository.findById("6809619999")`
- **Expected Result:**
  - คืน `Optional.empty()`

#### [UT-DAO-US3-03] บันทึกนักศึกษาใหม่เมื่อเข้าสู่ระบบครั้งแรก (`save` Insert)
- **Related CoS:** TC1a, TC3, TC7 · **Test method:** `save_newUser_insertsRowAndPersistsAllFields`
- **Test Steps:**
  1. สร้าง `User` ใหม่รหัส `"6809619999"` ชื่อ `"ดลลี่"` นามสกุล `"แบร่"` สาขา `"วิทยาการคอมพิวเตอร์"` ภาค `"ภาคปกติ"` เวลา `BASE_TIME`
  2. เรียก `userRepository.save(newUser)` ตามด้วย `em.flush()` และ `em.clear()`
  3. เรียก `userRepository.findById("6809619999")` และ `userRepository.count()`
- **Expected Result:**
  - `userRepository.count()` เพิ่มจาก `2` เป็น `3`
  - ข้อมูลที่อ่านกลับมาจาก DB มี `firstName = "ดลลี่"`, `lastName = "แบร่"` และตรงกับที่บันทึกทุกฟิลด์

#### [UT-DAO-US3-04] อัปเดตข้อมูลนักศึกษาเดิมเมื่อเข้าสู่ระบบซ้ำ (`updateProfile` + `save` Update)
- **Related CoS:** TC1a, TC3, TC7 · **Test method:** `save_existingUserAfterUpdateProfile_updatesRowWithoutCreatingDuplicate`
- **Test Steps:**
  1. โหลด `U1` ด้วย `userRepository.findById("6809610001").orElseThrow()`
  2. เรียก `u1.updateProfile("อลิษา", "หลิวหลิว", "วิทยาการคอมพิวเตอร์", "ภาคปกติ")` (พร้อมอัปเดต `updatedAt = BASE_TIME.plusHours(1)`)
  3. เรียก `userRepository.save(u1)` ตามด้วย `em.flush()` และ `em.clear()`
  4. โหลด `U1` และ `U2` กลับมาตรวจสอบ พร้อมเช็ก `userRepository.count()`
- **Expected Result:**
  - `userRepository.count()` ยังคงเท่ากับ `2` (ไม่สร้างแถวซ้ำ)
  - `U1` มี `firstName = "อลิษา"`, `lastName = "หลิวหลิว"` และ `updatedAt` เป็นเวลาใหม่
  - ข้อมูลของ `U2` (`"6809610002"`, `"เซเลอร์"`, `"มูน"`) ไม่ได้รับผลกระทบ

---

## Test Cases ส่วนที่ 2: การนับครั้งที่เข้าสู่ระบบผิดพลาด และการระงับ/ปลดระงับเมื่อครบ 15 นาที (`LoginAttemptRepository` และ `LoginAttempt`)

ครอบคลุมการนับจำนวนครั้งที่กรอกรหัสผิด (TC4, TC5), การระงับบัญชีชั่วคราว 15 นาทีเมื่อผิดครบ 5 ครั้งติดต่อกันพร้อมคำนวณเวลารอ (TC6), การปลดระงับอัตโนมัติเมื่อครบ 15 นาที และการล้างประวัติเมื่อรหัสผ่านถูกต้องด้วย `deleteById`

| TC ID | สถานการณ์ | Input | Expected Result | Actual Result | Status |
| --- | --- | --- | --- | --- | --- |
| UT-DAO-US3-05 | บันทึกการกรอกรหัสผิดครั้งแรกของ `username` ที่ยังไม่มีประวัติ (และไม่มีในตาราง `users`) | `username = "unknown_user"`, เรียก `incrementFailedAttempts(5, 900)` แล้ว `save` | สร้างแถวใหม่ใน `login_attempt` สำเร็จ; `failedAttempts = 1`, `lockedUntil = null`, `isLocked(BASE_TIME) = false`, `remainingLockSeconds(BASE_TIME) = 0` |  | ยังไม่รัน |
| UT-DAO-US3-06 | กรอกรหัสผิดสะสมยังไม่ครบ 5 ครั้ง (ครั้งที่ 2 ถึง 4) | สร้างของผู้ใช้ใหม่แล้วเรียก `incrementFailedAttempts(5, 900)` ซ้ำจนถึงครั้งที่ 4 แล้ว `save` | `failedAttempts = 4`, `lockedUntil = null`, `isLocked(BASE_TIME) = false`, `remainingLockSeconds(BASE_TIME) = 0` |  | ยังไม่รัน |
| UT-DAO-US3-07 | กรอกรหัสผิดติดต่อกันครบ 5 ครั้ง ระงับบัญชี 15 นาที (900 วินาที) | โหลด `LA1` (`failedAttempts = 4`) เรียก `incrementFailedAttempts(5, 900)` ณ `BASE_TIME` แล้ว `save` | `failedAttempts = 5`, `lockedUntil = BASE_TIME + 15 นาที`; ณ `BASE_TIME` ค่า `isLocked = true` และ `remainingLockSeconds = 900`; ณ `BASE_TIME + 5 นาที` ค่า `isLocked = true` และ `remainingLockSeconds = 600` |  | ยังไม่รัน |
| UT-DAO-US3-08 | ปลดระงับบัญชีอัตโนมัติเมื่อครบกำหนด 15 นาทีพอดี และหลังครบ 15 นาที | โหลด `LA2` (`lockedUntil = BASE_TIME + 15 นาที`) และ `LA3` (`lockedUntil = BASE_TIME - 15 นาที`) | สำหรับ `LA2`: ณ `BASE_TIME + 14 นาที 59 วินาที` ยังล็อกอยู่ (`isLocked = true`, `remainingLockSeconds = 1`) แต่ณ `BASE_TIME + 15 นาที` พอดี ปลดระงับแล้ว (`isLocked = false`, `remainingLockSeconds = 0`); สำหรับ `LA3`: ณ `BASE_TIME` ค่า `isLocked = false` และ `remainingLockSeconds = 0` |  | ยังไม่รัน |
| UT-DAO-US3-09 | กรอกรหัสผิดอีกครั้งหลังจากพ้นเวลาระงับ 15 นาทีไปแล้ว | โหลด `LA3` (ที่หมดเวลาล็อกแล้ว) เรียก `incrementFailedAttempts(5, 900)` ณ `BASE_TIME` แล้ว `save` | ระบบล้างสถานะล็อกเดิมและเริ่มนับรอบใหม่เป็น `failedAttempts = 1`, `lockedUntil = null`, `isLocked(BASE_TIME) = false` |  | ยังไม่รัน |
| UT-DAO-US3-10 | ล้างประวัติการใส่รหัสผิดเมื่อรหัสผ่านถูกต้องด้วย `deleteById` | เรียก `deleteById("6809610001")` (`LA1`) | แถว `LA1` ถูกลบออกจากตาราง `login_attempt` (`findById("6809610001")` คืน `Optional.empty()`); `count()` ลดจาก 3 เหลือ 2; แถว `LA2` และ `LA3` ยังอยู่ครบ |  | ยังไม่รัน |

### รายละเอียดขั้นตอนการทดสอบ (UT-DAO-US3-05 ถึง 10)

#### [UT-DAO-US3-05] บันทึกการกรอกรหัสผิดครั้งแรกของ `username` ที่ยังไม่มีประวัติ
- **Related CoS:** TC4, TC5 · **Test method:** `save_firstFailedAttemptForUnknownUsername_savesCountOneUnlocked`
- **Test Steps:**
  1. สร้าง `LoginAttempt` สำหรับ `"unknown_user"` (ซึ่งไม่มีอยู่ในตาราง `users`)
  2. เรียก `attempt.incrementFailedAttempts(5, 900)` (ณ เวลา `BASE_TIME`)
  3. เรียก `loginAttemptRepository.save(attempt)` ตามด้วย `em.flush()` และ `em.clear()`
  4. โหลดกลับมาด้วย `loginAttemptRepository.findById("unknown_user")`
- **Expected Result:**
  - บันทึกสำเร็จโดยไม่ติด Foreign Key กับตาราง `users` (ตามการออกแบบใน ER Diagram)
  - `failedAttempts == 1`, `lockedUntil == null`
  - `isLocked(BASE_TIME)` เป็น `false` และ `remainingLockSeconds(BASE_TIME) == 0`

#### [UT-DAO-US3-06] กรอกรหัสผิดสะสมยังไม่ครบ 5 ครั้ง (ครั้งที่ 2 ถึง 4)
- **Related CoS:** TC4, TC5 · **Test method:** `save_fourthFailedAttempt_incrementsCountWithoutLocking`
- **Test Steps:**
  1. สร้าง `LoginAttempt` ของ `"student_retry"` ที่ `failedAttempts = 3`, `lockedUntil = null` แล้วบันทึกและ `flush()` + `clear()`
  2. โหลดกลับมาด้วย `findById("student_retry")` เรียก `incrementFailedAttempts(5, 900)` (ครั้งที่ 4)
  3. เรียก `save`, `em.flush()` และ `em.clear()` แล้วโหลดกลับมาตรวจ
- **Expected Result:**
  - `failedAttempts == 4`
  - `lockedUntil` ยังคงเป็น `null`
  - `isLocked(BASE_TIME)` เป็น `false` และ `remainingLockSeconds(BASE_TIME) == 0`

#### [UT-DAO-US3-07] กรอกรหัสผิดติดต่อกันครบ 5 ครั้ง ระงับบัญชี 15 นาที (900 วินาที)
- **Related CoS:** TC6 · **Test method:** `save_fifthFailedAttempt_locksAccountFor15Minutes`
- **Test Steps:**
  1. โหลด `LA1` (`"6809610001"` ซึ่งมี `failedAttempts = 4`) ด้วย `findById`
  2. เรียก `la1.incrementFailedAttempts(5, 900)` ณ เวลา `BASE_TIME`
  3. เรียก `loginAttemptRepository.save(la1)` ตามด้วย `em.flush()` และ `em.clear()`
  4. โหลด `LA1` กลับมาตรวจค่าใน DB และการคำนวณเวลาที่เหลือ
- **Expected Result:**
  - `failedAttempts == 5`
  - `lockedUntil.toInstant()` เท่ากับ `BASE_TIME.plusSeconds(900).toInstant()` (`10:15:00+07:00`)
  - ณ เวลา `BASE_TIME`: `isLocked(BASE_TIME)` เป็น `true` และ `remainingLockSeconds(BASE_TIME) == 900`
  - ณ เวลาผ่านไป 5 นาที (`BASE_TIME.plusMinutes(5)`): `isLocked` เป็น `true` และ `remainingLockSeconds == 600`

#### [UT-DAO-US3-08] ปลดระงับบัญชีอัตโนมัติเมื่อครบกำหนด 15 นาที
- **Related CoS:** TC6 · **Test method:** `isLocked_when15MinutesElapsed_unlocksAndReturnsZeroRemainingSeconds`
- **Test Steps:**
  1. โหลด `LA2` (`lockedUntil = BASE_TIME + 15 นาที`) และ `LA3` (`lockedUntil = BASE_TIME - 15 นาที`) จาก DB ด้วย `findById`
  2. ตรวจ `LA2` ณ เวลา `BASE_TIME.plusMinutes(14).plusSeconds(59)` (1 วินาทีก่อนครบกำหนด)
  3. ตรวจ `LA2` ณ เวลา `BASE_TIME.plusMinutes(15)` (ครบ 15 นาทีพอดี — Boundary)
  4. ตรวจ `LA3` ณ เวลา `BASE_TIME` (เลยกำหนดมาแล้ว 15 นาที)
- **Expected Result:**
  - ข้อ 2 (ก่อนครบ 1 วินาที): `la2.isLocked(...)` เป็น `true` และ `la2.remainingLockSeconds(...) == 1`
  - ข้อ 3 (ครบ 15 นาทีพอดี): `la2.isLocked(...)` เป็น `false` และ `la2.remainingLockSeconds(...) == 0`
  - ข้อ 4 (เลยเวลาล็อกแล้ว): `la3.isLocked(BASE_TIME)` เป็น `false` และ `la3.remainingLockSeconds(BASE_TIME) == 0`

#### [UT-DAO-US3-09] กรอกรหัสผิดอีกครั้งหลังจากพ้นเวลาระงับ 15 นาทีไปแล้ว
- **Related CoS:** TC5, TC6 · **Test method:** `save_failedAttemptAfterLockExpired_resetsCountToOneAndClearsLock`
- **Test Steps:**
  1. โหลด `LA3` (`"6809610003"` ซึ่งมี `failedAttempts = 5` แต่ `lockedUntil` หมดเวลาไปแล้วเมื่อ `09:45:00`)
  2. เรียก `la3.incrementFailedAttempts(5, 900)` ณ เวลา `BASE_TIME` (`10:00:00`)
  3. เรียก `loginAttemptRepository.save(la3)` ตามด้วย `em.flush()` และ `em.clear()`
  4. โหลด `LA3` กลับมาตรวจจาก DB
- **Expected Result:**
  - ระบบเริ่มนับรอบใหม่ที่ `failedAttempts == 1` (ไม่ค้างที่ 5 หรือกลายเป็น 6)
  - `lockedUntil` ถูกล้างเป็น `null`
  - `isLocked(BASE_TIME)` เป็น `false`

#### [UT-DAO-US3-10] ล้างประวัติการใส่รหัสผิดเมื่อรหัสผ่านถูกต้องด้วย `deleteById`
- **Related CoS:** TC1a, TC3, TC6 · **Test method:** `deleteById_existingAttempt_removesOnlyTargetUserAttempt`
- **Test Steps:**
  1. เรียก `loginAttemptRepository.deleteById("6809610001")` (`LA1`)
  2. เรียก `em.flush()` และ `em.clear()`
  3. ตรวจ `findById("6809610001")`, `findById("6809610002")`, `findById("6809610003")` และ `count()`
- **Expected Result:**
  - `findById("6809610001")` คืน `Optional.empty()`
  - `count()` ลดลงจาก `3` เหลือ `2`
  - `LA2` (`"6809610002"`) และ `LA3` (`"6809610003"`) ยังคงอยู่ใน DB ตามปกติ

---

## Test Cases ส่วนที่ 3: Schema และ Constraint ของฐานข้อมูล

ตรวจสอบข้อกำหนด `CHECK` constraint ใน [US3-T06 ER Diagram](../T06/US3-T06-ER-Diagram.md)

| TC ID | สถานการณ์ | Input | Expected Result | Actual Result | Status |
| --- | --- | --- | --- | --- | --- |
| UT-DAO-US3-11 | DB ป้องกันการบันทึก `failed_attempts` ติดลบ (`ck_login_attempt_count`) | บันทึกแถวที่มี `failed_attempts = -1` ลงตาราง `login_attempt` แล้ว `flush()` | โยน `DataIntegrityViolationException` / `ConstraintViolationException` จาก constraint `ck_login_attempt_count` |  | ยังไม่รัน |

### รายละเอียดขั้นตอนการทดสอบ (UT-DAO-US3-11)

#### [UT-DAO-US3-11] DB ป้องกันการบันทึก `failed_attempts` ติดลบ (`ck_login_attempt_count`)
- **Related CoS:** — (ER Constraint) · **Test method:** `saveAndFlush_negativeFailedAttempts_throwsConstraintViolation`
- **Test Steps:**
  1. พยายามบันทึกข้อมูลลงตาราง `login_attempt` โดยกำหนด `failed_attempts = -1` แล้ว `flush()` ทันที
- **Expected Result:**
  - โยน `DataIntegrityViolationException` (หรือ `PersistenceException` ที่มี `ConstraintViolationException`) เนื่องจากขัดกับ `ck_login_attempt_count CHECK (failed_attempts >= 0)`

---

## Traceability Matrix

เชื่อมโยง Conditions of Satisfaction (CoS) ของ US3 (TC1a–TC7 ตาม [US3-T16](../US3-T16.md) และ [US3-T05 DTO & API Spec](../T05/US3-DTO-API-Spec.md)) เข้ากับ Test Case ชั้น DAO

| CoS / ข้อกำหนดของ US3 | บทบาทของชั้น DAO ที่ต้องรองรับ | TC ID ที่ครอบคลุม |
| --- | --- | --- |
| **TC1a, TC3:** Login ด้วยบัญชี มธ. ที่ Active (และหลังเปลี่ยนรหัสผ่านใหม่) สำเร็จ | ล้างประวัติการใส่รหัสผิด (`deleteById`) และบันทึก/อัปเดตข้อมูลนักศึกษาลงตาราง `users` (`findById`, `save`) | UT-DAO-US3-01, 02, 03, 04, 10 |
| **TC1b, TC2:** บัญชีไม่ Active หรือไม่ใช่นักศึกษา CS ภาคปกติ เข้าสู่ระบบไม่ได้ | ล้างประวัติการใส่รหัสผิดด้วย `deleteById` เมื่อรหัสผ่านถูกต้อง (ส่วนการตรวจสถานะและสาขาอยู่ใน `AuthService`) | UT-DAO-US3-10 |
| **TC4, TC5:** กรอกรหัสผ่านเดิมหลังเปลี่ยนรหัส หรือกรอก username/password ไม่ถูกต้อง | บันทึกและเพิ่มจำนวนครั้งที่กรอกผิด (`failedAttempts` ครั้งที่ 1–4) โดยยังไม่ล็อกบัญชี แม้ `username` ยังไม่มีในตาราง `users` | UT-DAO-US3-05, 06 |
| **TC6:** กรอกผิดติดต่อกันครบ 5 ครั้ง ระงับการเข้าสู่ระบบชั่วคราว 15 นาที และปลดระงับเมื่อครบเวลา | ตั้งเวลา `lockedUntil = now + 15 นาที` เมื่อครบ 5 ครั้ง, คำนวณ `remainingLockSeconds`, ปลดระงับอัตโนมัติเมื่อครบ 15 นาที และเริ่มนับ 1 ใหม่หากผิดซ้ำหลังพ้นเวลาล็อก | UT-DAO-US3-07, 08, 09 |
| **TC7:** แสดงชื่อ-นามสกุล และรหัสนักศึกษาที่ Navbar หลัง Login สำเร็จ | อ่านข้อมูล `studentId`, `firstName`, `lastName` ภาษาไทยจากตาราง `users` ด้วย `findById` ได้ถูกต้อง | UT-DAO-US3-01, 03, 04 |
| **ER Diagram Constraint:** ตาราง `login_attempt` | ตรวจสอบ `ck_login_attempt_count CHECK (failed_attempts >= 0)` | UT-DAO-US3-11 |

---

## สรุปผลการทดสอบ

กรอกหลังรัน `./mvnw test` ใน US3-T09

| รายการ | ค่า |
| --- | --- |
| จำนวน test case ทั้งหมด | 11 |
| Pass |  |
| Fail |  |
| ผู้ทดสอบ |  |
| วันที่ทดสอบ |  |

---

## เอกสารที่เกี่ยวข้อง

- [DAO Class Diagram](../T06/US3-T06-DAO-Class-Diagram.md) (US3-T06)
- [Sequence Diagram](../T06/US3-T06-Sequence-Diagram.md) (US3-T06)
- [Extended API Class Diagram](../T06/US3-T06-Extended-API-Class-Diagram.md) (US3-T06)
- [ER Diagram (DB)](../T06/US3-T06-ER-Diagram.md) (US3-T06)
- [DTO & API Spec](../T05/US3-DTO-API-Spec.md) (US3-T05)
- [UAT Specification](../US3-T16.md) (US3-T16)
- [US1-T12 Design Unit Test Cases ส่วน DAO](../../US1/T12/US1-T12%20Design%20Unit%20Test%20Cases%20ส่วน%20DAO.md)
- [US2-T12 Design Unit Test Cases ส่วน DAO](../../US2/T12/US2-T12-DAO-Unit-Test-Cases.md)
