# US3-T15 Design System Test ตาม Sequence Diagram

## User story
US3: Login เข้าสู่ระบบด้วย user name และ password ของสำนักทะเบียน

**CoS อ้างอิง:** [US3-T16 User Acceptance Test Specification](../US3-T16.md) และ [US3-T05 DTO & API Spec](../T05/US3-DTO-API-Spec.md)

## Objective
ออกแบบ System Test ของการเข้าสู่ระบบและการดึงข้อมูลนักศึกษาปัจจุบัน ตั้งแต่หน้าเว็บ → Spring Security Filter / Controller → Service → `TuApiClient` → ฐานข้อมูล ให้ครอบคลุมทุกเส้นทางใน [Sequence Diagram ของ US3-T06](../T06/US3-T06-Sequence-Diagram.md) โดยเฉพาะกรณี **เข้าสู่ระบบครั้งแรก (Insert)**, **เข้าสู่ระบบครั้งถัดไป (Update)** และ **การระงับบัญชีชั่วคราว 15 นาทีเมื่อกรอกรหัสผิดครบ 5 ครั้ง** เพื่อใช้ใน US3-T19 (รัน System Test)

## Scope
ทดสอบ `POST /api/auth/login` และ `GET /api/users/me` ทั้งระบบที่รันจริง ครอบคลุมทุกเส้นทางใน Sequence Diagram:

| เส้นทางใน Sequence Diagram | ผลลัพธ์ | Test Case |
| --- | --- | --- |
| เข้าสู่ระบบสำเร็จเป็นครั้งแรก (ยังไม่มีแถวใน `users`) → Insert ลง `users` + ออก JWT + เรียก `GET /api/users/me` แสดงชื่อที่ Navbar | `200 OK` (`{ token }`) และ `200 OK` (`{ studentId, firstName, lastName }`) | ST-01 |
| เข้าสู่ระบบสำเร็จในครั้งถัดไป / หลังเปลี่ยนรหัสผ่านใหม่ (มีแถวใน `users` แล้ว) → Update แถวเดิมใน `users` โดยไม่สร้างแถวซ้ำ | `200 OK` (`{ token }`) และอัปเดต `updated_at` ในแถวเดิม | ST-02 |
| กรอก `username` หรือ `password` ไม่ถูกต้อง ยังไม่ครบ 5 ครั้ง (ครั้งที่ 1–4) → บวก `failed_attempts` ใน `login_attempt` | `401 Unauthorized` (`code: "INVALID_CREDENTIALS"`) | ST-03 |
| กรอกรหัสผ่านถูกต้องหลังจากเคยกรอกผิด (ยังไม่ถูกล็อก) → ล้างประวัติใน `login_attempt` ด้วย `deleteById` ทันที | `200 OK` (`{ token }`) และลบแถวใน `login_attempt` | ST-04 |
| กรอกรหัสผ่านผิดติดต่อกันครบ 5 ครั้ง → ตั้ง `locked_until = now + 15 นาที` และระงับการเข้าสู่ระบบชั่วคราว | `429 Too Many Requests` (`code: "ACCOUNT_LOCKED"`, `retryAfterSeconds: 900`) | ST-05 |
| พยายามเข้าสู่ระบบขณะบัญชียังถูกระงับอยู่ (`lockedUntil > now`) → ปฏิเสธทันทีโดยไม่เรียก `TuApiClient` และปลดระงับเมื่อครบ 15 นาที | `429` พร้อม `retryAfterSeconds` ที่ลดลงตามเวลาจริง และ `200 OK` เมื่อพ้น 15 นาที | ST-06 |
| รหัสผ่านถูกแต่บัญชี มธ. ไม่ได้อยู่ในสถานะปกติ (`tu_status != "ปกติ"`) → ล้าง `login_attempt` แล้วปฏิเสธการเข้าสู่ระบบ (ไม่บันทึกลงตาราง `users`) | `403 Forbidden` (`code: "ACCOUNT_INACTIVE"`) | ST-07 |
| รหัสผ่านถูกแต่เป็นนักศึกษาต่างสาขา (`department != "ภาควิชาวิทยาการคอมพิวเตอร์"`) → ล้าง `login_attempt` (ไม่ถูก Rollback) แล้วปฏิเสธโดยไม่บันทึกลงตาราง `users` | `403 Forbidden` (`code: "NOT_CS_STUDENT"`) | ST-08 |
| รหัสผ่านถูกแต่เป็นนักศึกษา CS ภาคพิเศษ (หลักที่ 5–6 ของรหัสนักศึกษาเป็น `65`) → ล้าง `login_attempt` (ไม่ถูก Rollback) แล้วปฏิเสธโดยไม่บันทึกลงตาราง `users` | `403 Forbidden` (`code: "NOT_CS_STUDENT"`) | ST-09 |
| ไม่ส่ง `username` หรือ `password` (`@NotBlank`) หรือเรียก `GET /api/users/me` โดยไม่มี JWT / JWT ไม่ถูกต้อง | `400 Bad Request` (พร้อม `errors`) และ `401 Unauthorized` (จาก `JwtAuthenticationFilter`) | ST-10 |

---

## Test Approach
- **ทดสอบแบบ End-to-End ครบทุกชั้น:** หน้าเว็บ (Next.js) + Backend (Spring Boot พร้อม Spring Security / JWT) + ฐานข้อมูล SQL Server ที่รันด้วย `docker compose up -d --build` ตาม README
- **ตรวจสอบผล 3 ชั้นในทุก Test Case:**
  1. **หน้าเว็บ (UI):** การเปลี่ยนหน้า, ข้อความแจ้งเตือน, หน้า Access Denied, หน้า Countdown Timer 15 นาที และการแสดงชื่อ-นามสกุล + รหัสนักศึกษาที่ Navbar มุมขวาบน
  2. **API Response:** HTTP Status Code, โครงสร้าง JSON (`LoginResponse`, `UserProfileResponse` หรือ `ProblemDetail` RFC 9457 พร้อม `code` และ `retryAfterSeconds`) ผ่าน DevTools แท็บ Network หรือ Postman
  3. **ฐานข้อมูล (DB):** ตรวจสอบตาราง `users` และ `login_attempt` ใน SQL Server จริง
- **การจำลอง TU Login API (`StubTuApiClient`):** กำหนด `SPRING_PROFILES_ACTIVE=stub-tu` ในไฟล์ `.env` แล้วรันระบบ ตัว Backend จะใช้ `StubTuApiClient` (`@Profile("stub-tu")`) ซึ่งทำงานอยู่ในตัว Backend โดยตรง **ไม่ได้ยิง HTTP Request ออกไปภายนอก** และคืนผลลัพธ์ตามบัญชีจำลองที่กำหนดไว้ (ทุกบัญชีใช้รหัสผ่าน `Passw0rd!`)
- **การทดสอบกรณีส่งข้อมูลไม่ครบหรือส่ง Header ผิด (ST-10):** กรณีที่ฟอร์มบนหน้าเว็บกันไว้ด้วย HTML/Client Validation ให้ยิงทดสอบ API โดยตรงด้วย Postman หรือ `curl`

---

## สภาพแวดล้อมและการเตรียมข้อมูล

| รายการ | ค่า |
| --- | --- |
| การตั้งค่า `.env` | `cp .env.example .env` แล้วกำหนด `SPRING_PROFILES_ACTIVE=stub-tu` และ `JWT_SECRET` (ยาวอย่างน้อย 32 ตัวอักษร) |
| เปิดระบบ | `docker compose up -d --build` (หรือกรณีรัน Backend แยก: `./mvnw spring-boot:run -Dspring-boot.run.profiles=stub-tu`) |
| หน้าเว็บ | `http://localhost:3000/login` (และหน้าหลัก `http://localhost:3000`) |
| API | `http://localhost:8080` |
| Endpoint ที่ทดสอบ | `POST /api/auth/login`, `GET /api/users/me` |
| รหัสผ่านของบัญชีจำลองใน `StubTuApiClient` | `Passw0rd!` (เหมือนกันทุกบัญชี) |

### บัญชีนักศึกษาสำหรับใช้ทดสอบ (ตาม `StubTuApiClient`)

| รหัสผู้ใช้ (`username`) | ชื่อ - นามสกุล (`displayname_th` / `displayname_en`) | ภาควิชา (`department`) / ภาค | สถานะ (`tu_status`) | ใช้ใน Test Case |
| --- | --- | --- | --- | --- |
| `6609000001` | สมชาย ใจดี / somchai jaidee | ภาควิชาวิทยาการคอมพิวเตอร์ / ภาคปกติ | `ปกติ` (Active) | ST-01 (Login ครั้งแรก), ST-02 (Login ครั้งถัดไป), ST-03, ST-04 |
| `6609000004` | สมใจ ลองดู / somjai longdoo | ภาควิชาวิทยาการคอมพิวเตอร์ / ภาคปกติ | `ปกติ` (Active) | ST-05, ST-06 (ทดสอบถูกระงับ 15 นาที และปลดระงับ) |
| `6609000003` | สมศักดิ์ พักก่อน / somsak pakkon | ภาควิชาวิทยาการคอมพิวเตอร์ / ภาคปกติ | `พักการศึกษา` (Inactive) | ST-07 (บัญชีไม่ Active → `403 ACCOUNT_INACTIVE`) |
| `6609000002` | สมหญิง รักเรียน / somying rakrian | ภาควิชาคณิตศาสตร์และสถิติ / ภาคปกติ | `ปกติ` (Active) | ST-08 (นักศึกษาต่างสาขา → `403 NOT_CS_STUDENT`, TC2) |
| `6609650001` | สมปอง พิเศษ / sompong piset | ภาควิชาวิทยาการคอมพิวเตอร์ / ภาคพิเศษ (หลักที่ 5–6 เป็น `65`) | `ปกติ` (Active) | ST-09 (นักศึกษา CS ภาคพิเศษ → `403 NOT_CS_STUDENT`, TC2) |

### คำสั่งล้างข้อมูลใน DB ก่อนเริ่มชุดทดสอบ

```bash
docker exec sqlserver bash -c '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -d appdb -Q "DELETE FROM login_attempt; DELETE FROM users WHERE student_id IN (N'"'"'6609000001'"'"', N'"'"'6609000002'"'"', N'"'"'6609000003'"'"', N'"'"'6609000004'"'"', N'"'"'6609650001'"'"');"'
```

### คำสั่งตรวจสอบข้อมูลใน DB (ใช้ตรวจผลในแต่ละ Test Case)

```sql
-- 1. ตรวจข้อมูลนักศึกษาในตาราง users
SELECT student_id, first_name, last_name, department, track, updated_at
FROM users
ORDER BY student_id;

-- 2. ตรวจจำนวนครั้งที่เข้าสู่ระบบผิดและเวลาล็อกในตาราง login_attempt
SELECT username, failed_attempts, locked_until, updated_at
FROM login_attempt
ORDER BY username;
```

---

## Test Cases

### [ST-01] เข้าสู่ระบบสำเร็จเป็นครั้งแรก (First-time Login) ระบบสร้างแถวใหม่ใน `users` และแสดงข้อมูลที่ Navbar

**Related CoS:** TC1a, TC7

**เส้นทางใน Sequence Diagram:**
1. `POST /api/auth/login` → ส่งครบ → `isLocked` = `false` → `TuApiClient.verifyCredentials` (`StubTuApiClient`) ผ่าน → `loginSucceeded` (`deleteById`) → `verifyTuStudentStatus` ผ่าน → `userRepository.findById("6609000001")` ไม่พบ → `userRepository.save` (**INSERT** แถวใหม่) → `jwtService.generateToken` → `200 OK { token }`
2. `GET /api/users/me` (แนบ `Authorization: Bearer <token>`) → `JwtAuthenticationFilter` ตรวจ Token ผ่าน `JwtService` → ตั้ง `Authentication` ใน `SecurityContextHolder` → `UserController` เรียก `CurrentStudentProvider` ได้ `"6609000001"` → `userService.getProfile` อ่านจาก `users` → `200 OK`

**Preconditions:**
- รันคำสั่งล้างตาราง `users` และ `login_attempt` แล้ว (ยืนยันว่ายังไม่มีรหัส `6609000001` ในตาราง `users`)
- เปิดหน้าเว็บที่หน้าเข้าสู่ระบบ (`/login`)

**Test Steps:**
1. กรอกชื่อผู้ใช้งาน `6609000001` และรหัสผ่าน `Passw0rd!` แล้วกดปุ่ม **"เข้าสู่ระบบ"**
2. ตรวจสอบหน้าเว็บหลังจากเปลี่ยนหน้าไปยังเมนูหลัก
3. ตรวจสอบ API Response ของ `POST /api/auth/login` และ `GET /api/users/me` ใน DevTools (Network)
4. รันคำสั่ง SQL ตรวจสอบตาราง `users` และ `login_attempt` ใน DB (และจดค่า `updated_at` ของ `6609000001` ไว้สำหรับเทียบใน ST-02)

**Expected Result:**
- **หน้าเว็บ:** พาไปยังหน้าเมนูหลัก แสดงชื่อ-นามสกุล **"Somchai Jaidee"** และรหัสนักศึกษา **"6609000001"** ที่ Navbar มุมขวาบน พร้อมเมนูฟังก์ชันครบตาม TC7
- **API:**
  - `POST /api/auth/login` ตอบ `200 OK` ได้ `{ "token": "<JWT>" }`
  - `GET /api/users/me` ตอบ `200 OK` ได้ `{ "studentId": "6609000001", "firstName": "Somchai", "lastName": "Jaidee", "firstNameTh": "สมชาย", "lastNameTh": "ใจดี" }`
- **DB:**
  - ตาราง `users` มีแถวใหม่ของ `6609000001` จำนวน 1 แถว (`first_name = N'Somchai'`, `last_name = N'Jaidee'`, `first_name_th = N'สมชาย'`, `last_name_th = N'ใจดี'`, `department = N'ภาควิชาวิทยาการคอมพิวเตอร์'`, `track = N'ภาคปกติ'`, `updated_at` ไม่เป็น `NULL`)
  - ตาราง `login_attempt` ไม่มีแถวของ `6609000001`

---

### [ST-02] เข้าสู่ระบบสำเร็จในครั้งถัดไป (Subsequent Login / หลังเปลี่ยนรหัสผ่านใหม่) ระบบอัปเดตแถว `users` เดิมโดยไม่สร้างแถวซ้ำ

**Related CoS:** TC1a, TC3, TC7

**เส้นทางใน Sequence Diagram:**
- ส่งครบ → ไม่ถูกล็อก → `TuApiClient.verifyCredentials` ผ่าน → `loginSucceeded` → `verifyTuStudentStatus` ผ่าน → `userRepository.findById("6609000001")` **พบแถวเดิม** → `updateProfile` + `userRepository.save` (**UPDATE** แถวเดิม) → `jwtService.generateToken` → `200 OK` → `GET /api/users/me` ตอบ `200 OK`

**Preconditions:**
- ผ่าน ST-01 แล้ว (มีแถวของ `6609000001` อยู่ในตาราง `users` แล้ว 1 แถว)
- ออกจากระบบ (หรือเปิดหน้า `/login` ใหม่) และเว้นระยะอย่างน้อย 1–2 วินาทีจาก ST-01 เพื่อให้เห็นความแตกต่างของ `updated_at`

**Test Steps:**
1. กรอกชื่อผู้ใช้งาน `6609000001` และรหัสผ่าน `Passw0rd!` แล้วกดปุ่ม **"เข้าสู่ระบบ"**
2. ตรวจสอบหน้าเว็บ, API Response และรันคำสั่ง SQL ตรวจสอบตาราง `users`

**Expected Result:**
- **หน้าเว็บ:** เข้าสู่หน้าเมนูหลักและแสดงชื่อ **"Somchai Jaidee"** รหัส **"6609000001"** ที่ Navbar มุมขวาบนตามปกติ
- **API:** `POST /api/auth/login` ตอบ `200 OK` ได้ JWT Token ใหม่ และ `GET /api/users/me` ตอบ `200 OK`
- **DB:**
  - ตาราง `users` ยังคงมีแถวของ `6609000001` เพียง **1 แถวเท่าเดิม** (ไม่สร้างแถวซ้ำ)
  - คอลัมน์ `updated_at` ของ `6609000001` ถูกอัปเดตเป็นเวลาใหม่กว่าค่าที่จดไว้ใน ST-01

---

### [ST-03] กรอกรหัสผ่านผิดยังไม่ครบ 5 ครั้ง (ครั้งที่ 1–4) ระบบนับจำนวนครั้งผิดและแจ้งเตือน แต่ยังไม่ระงับบัญชี

**Related CoS:** TC4, TC5

**เส้นทางใน Sequence Diagram:**
- ส่งครบ → `isLocked` = `false` → `TuApiClient.verifyCredentials` แจ้งรหัสผิด (`status: false`) → `loginAttemptService.loginFailed("6609000001")` [ทำงานใน Transaction `REQUIRES_NEW` บันทึก `failed_attempts + 1` และ commit ทันที] → `isLocked` = `false` (ยังไม่ครบ 5 ครั้ง) → โยน `401 INVALID_CREDENTIALS`

**Preconditions:**
- ตาราง `login_attempt` ไม่มีแถวของ `6609000001`

**Test Steps:**
1. ที่หน้า `/login` กรอกชื่อผู้ใช้งาน `6609000001` และรหัสผ่านที่**ไม่ถูกต้อง** (เช่น `WrongPass1`) แล้วกด **"เข้าสู่ระบบ"**
2. ตรวจผลครั้งที่ 1 บนหน้าเว็บ, API Response และ DB
3. กดส่งรหัสผ่านที่ไม่ถูกต้องซ้ำอีก 3 ครั้ง (รวมเป็นผิดติดต่อกัน **4 ครั้ง**) แล้วตรวจผลใน DB

**Expected Result:**
- **หน้าเว็บ:** ทั้ง 4 ครั้งยังคงอยู่ที่หน้าเข้าสู่ระบบ แสดงข้อความแจ้งเตือนว่าชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง (ยังไม่เปลี่ยนเป็นหน้าระงับบัญชี)
- **API:** ทั้ง 4 ครั้งตอบ `401 Unauthorized` เป็น `ProblemDetail` ที่มี `"code": "INVALID_CREDENTIALS"`
- **DB:**
  - หลังผิดครั้งที่ 1: ตาราง `login_attempt` มีแถว `username = N'6609000001'`, `failed_attempts = 1`, `locked_until = NULL`
  - หลังผิดครั้งที่ 4: แถวเดิมอัปเดตเป็น `failed_attempts = 4` และ `locked_until` ยังคงเป็น `NULL` (ยืนยันว่าการบันทึก `loginFailed` ด้วย `REQUIRES_NEW` ไม่ถูก Rollback เมื่อ `AuthService` โยน 401)

---

### [ST-04] กรอกรหัสผ่านถูกต้องหลังจากเคยกรอกผิด ระบบล้างจำนวนครั้งที่ผิดทันที (`loginSucceeded`)

**Related CoS:** TC1a, TC3

**เส้นทางใน Sequence Diagram:**
- ส่งครบ → `isLocked` = `false` (`failed_attempts = 4` ยังไม่ถูกล็อก) → `TuApiClient.verifyCredentials` ผ่าน → `loginAttemptService.loginSucceeded("6609000001")` เรียก `deleteById("6609000001")` → อัปเดต `users` → คืน `200 OK { token }`

**Preconditions:**
- ต่อเนื่องจาก ST-03 (ในตาราง `login_attempt` มีแถวของ `6609000001` ที่ `failed_attempts = 4`)

**Test Steps:**
1. กรอกชื่อผู้ใช้งาน `6609000001` และรหัสผ่านที่**ถูกต้อง** (`Passw0rd!`) แล้วกด **"เข้าสู่ระบบ"**
2. ตรวจสอบหน้าเว็บ, API Response และรันคำสั่ง SQL ตรวจสอบตาราง `login_attempt`

**Expected Result:**
- **หน้าเว็บ:** เข้าสู่หน้าเมนูหลักได้สำเร็จ แสดงชื่อ **"Somchai Jaidee"** ที่ Navbar
- **API:** `POST /api/auth/login` ตอบ `200 OK`
- **DB:** แถวของ `6609000001` ในตาราง `login_attempt` **ถูกลบออกไปแล้ว** (ถ้าภายหลังกรอกรหัสผิดอีกครั้ง ระบบจะเริ่มนับ `failed_attempts = 1` ใหม่ ไม่ถูกระงับทันที)

---

### [ST-05] กรอกรหัสผ่านผิดติดต่อกันครบ 5 ครั้ง ระบบระงับบัญชีชั่วคราว 15 นาที (900 วินาที)

**Related CoS:** TC6

**เส้นทางใน Sequence Diagram:**
- ครั้งที่ 1–4: `loginFailed("6609000004")` บันทึก `failed_attempts = 1..4` → `401 INVALID_CREDENTIALS`
- ครั้งที่ 5: `loginFailed("6609000004")` บันทึก `failed_attempts = 5` และตั้ง `locked_until = now + 15 นาที` (commit ด้วย `REQUIRES_NEW`) → `isLocked("6609000004")` (`REQUIRES_NEW` อ่านค่าที่เพิ่ง commit) คืน `true` → `getWaitTime("6609000004")` คืนค่าประมาณ `900` → โยน `429 ACCOUNT_LOCKED` พร้อม `retryAfterSeconds`

**Preconditions:**
- ตาราง `login_attempt` ไม่มีแถวของ `6609000004` (Somjai Longdoo)

**Test Steps:**
1. ที่หน้า `/login` กรอกชื่อผู้ใช้งาน `6609000004` และรหัสผ่านที่**ไม่ถูกต้อง** (เช่น `WrongPass1`) ติดต่อกัน **4 ครั้ง** (ได้ `401` ทั้ง 4 ครั้ง)
2. กรอกรหัสผ่านที่ไม่ถูกต้องเป็น**ครั้งที่ 5** แล้วกด **"เข้าสู่ระบบ"**
3. ตรวจสอบหน้าเว็บ, API Response ของครั้งที่ 5 และตาราง `login_attempt` ใน DB

**Expected Result:**
- **หน้าเว็บ:** เปลี่ยนเป็นหน้าระงับการเข้าสู่ระบบชั่วคราว แจ้งเตือนว่าบัญชีถูกระงับเป็นเวลา 15 นาทีเนื่องจากกรอกผิดครบ 5 ครั้ง พร้อมแสดง **Countdown Timer** นับถอยหลังจาก 15:00 นาที
- **API (ครั้งที่ 5):** ตอบ `429 Too Many Requests` เป็น `ProblemDetail` ที่มี:
  - `"code": "ACCOUNT_LOCKED"`
  - `"retryAfterSeconds": 900` (หรือค่าประมาณ 899–900 วินาที)
- **DB:** ตาราง `login_attempt` ของ `6609000004` มี `failed_attempts = 5` และ `locked_until` ไม่เป็น `NULL` (มีค่าเท่ากับ `updated_at + 15 นาที`)

---

### [ST-06] พยายามเข้าสู่ระบบขณะถูกระงับ (ปฏิเสธทันทีโดยไม่เรียก `TuApiClient`) และปลดระงับเมื่อครบ 15 นาที

**Related CoS:** TC6, TC1a

**เส้นทางใน Sequence Diagram:**
- **ช่วงที่ 1 (ขณะยังถูกล็อก `lockedUntil > now`):** `POST /api/auth/login` → `isLocked("6609000004")` เป็น `true` ตั้งแต่ต้นฟังก์ชัน → `getWaitTime` คืนเวลาที่เหลือ → โยน `429 ACCOUNT_LOCKED` ทันทีโดยไม่เรียก `TuApiClient`
- **ช่วงที่ 2 (เมื่อครบ 15 นาที `lockedUntil <= now`):** `isLocked("6609000004")` เป็น `false` → เรียก `TuApiClient` ผ่าน → `loginSucceeded` ลบแถวใน `login_attempt` → บันทึก `users` ("Somjai Longdoo") → `200 OK`

**Preconditions:**
- ต่อเนื่องจาก ST-05 (บัญชี `6609000004` กำลังถูกระงับอยู่ในตาราง `login_attempt`)

**Test Steps:**
1. **ทดสอบขณะยังถูกระงับ:** หลังผ่านไปประมาณ 10 วินาที ลองส่ง `POST /api/auth/login` ของ `6609000004` ด้วยรหัสผ่านที่**ถูกต้อง** (`Passw0rd!`) ผ่าน Postman หรือหน้าเว็บ แล้วตรวจ API Response และ DB
2. **ทดสอบเมื่อครบกำหนด 15 นาที:** รอจนครบ 15 นาที (หรือรันคำสั่ง SQL จำลองว่าเวลาล็อกผ่านไปแล้ว 15 นาที: `UPDATE login_attempt SET locked_until = DATEADD(SECOND, -1, SYSDATETIMEOFFSET()) WHERE username = N'6609000004';`)
3. กรอกชื่อผู้ใช้งาน `6609000004` และรหัสผ่านที่**ถูกต้อง** (`Passw0rd!`) บนหน้าเว็บ แล้วกด **"เข้าสู่ระบบ"**
4. ตรวจสอบหน้าเว็บ, API Response และ DB

**Expected Result:**
- **ข้อ 1 (ขณะยังถูกระงับ):**
  - **API:** ตอบ `429 Too Many Requests` (`"code": "ACCOUNT_LOCKED"`) ทันทีแม้รหัสผ่านจะถูก และค่า `"retryAfterSeconds"` ลดลงตามเวลาที่ผ่านไป (เช่น เหลือประมาณ `890` วินาที)
  - **DB:** แถวของ `6609000004` ใน `login_attempt` ยังคงมี `failed_attempts = 5` และยังไม่มีแถวของ `6609000004` ในตาราง `users`
- **ข้อ 3–4 (หลังครบ 15 นาที):**
  - **หน้าเว็บ:** ปลดระงับและเข้าสู่หน้าเมนูหลักสำเร็จ แสดงชื่อ **"Somjai Longdoo"** รหัส **"6609000004"** ที่ Navbar มุมขวาบน
  - **API:** `POST /api/auth/login` ตอบ `200 OK` ได้ `{ "token": "<JWT>" }` และ `GET /api/users/me` ได้ `{ "studentId": "6609000004", "firstName": "Somjai", "lastName": "Longdoo", "firstNameTh": "สมใจ", "lastNameTh": "ลองดู" }`
  - **DB:** แถวของ `6609000004` ใน `login_attempt` ถูกลบออก และมีแถวของ `6609000004` (`Somjai Longdoo`) ถูกบันทึกในตาราง `users`

---

### [ST-07] เข้าสู่ระบบด้วยบัญชี มธ. ที่ไม่อยู่ในสถานะปกติ ระบบปฏิเสธ (`403 ACCOUNT_INACTIVE`)

**Related CoS:** TC1b

**เส้นทางใน Sequence Diagram:**
- ส่งครบ → ไม่ถูกล็อก → `TuApiClient.verifyCredentials` ผ่าน (รหัสถูก) → `loginSucceeded` → `verifyTuStudentStatus` พบว่า `tu_status` ไม่ใช่ `"ปกติ"` (`"พักการศึกษา"`) → โยน `403 ACCOUNT_INACTIVE`

**Preconditions:**
- บัญชี `6609000003` (สมศักดิ์ พักก่อน) ใน `StubTuApiClient` มีค่า `tu_status: "พักการศึกษา"` และยังไม่มีข้อมูลอยู่ในตาราง `users`

**Test Steps:**
1. ที่หน้า `/login` กรอกชื่อผู้ใช้งาน `6609000003` และรหัสผ่านที่ถูกต้อง (`Passw0rd!`) แล้วกด **"เข้าสู่ระบบ"**
2. ตรวจสอบหน้าเว็บ, API Response และตาราง `users` / `login_attempt` ใน DB

**Expected Result:**
- **หน้าเว็บ:** ไม่อนุญาตให้เข้าสู่ระบบ และแสดงข้อความแจ้งเตือนว่าบัญชีไม่อยู่ในสถานะใช้งานปกติ
- **API:** ตอบ `403 Forbidden` เป็น `ProblemDetail` ที่มี `"code": "ACCOUNT_INACTIVE"`
- **DB:**
  - **ตาราง `users`:** รหัส `6609000003` **ต้องไม่ถูกบันทึก**ลงในตาราง `users` (`0` แถว)
  - **ตาราง `login_attempt`:** ไม่มีการนับเป็นรหัสผิดใน `login_attempt` (`0` แถว)

---

### [ST-08] เข้าสู่ระบบด้วยนักศึกษาต่างสาขา (`6609000002`) ระบบปฏิเสธ (`403 NOT_CS_STUDENT`) โดยไม่บันทึกลงตาราง `users` และไม่ Rollback การล้าง Attempt

**Related CoS:** TC2

**เส้นทางใน Sequence Diagram:**
- ส่งครบ → ไม่ถูกล็อก → `TuApiClient.verifyCredentials` ผ่าน → `loginSucceeded` (`deleteById` ใน Transaction `REQUIRES_NEW` commit ทันที) → `verifyTuStudentStatus` พบว่า `department` เป็น `"ภาควิชาคณิตศาสตร์และสถิติ"` (ไม่ใช่ `"ภาควิชาวิทยาการคอมพิวเตอร์"`) → โยน `403 NOT_CS_STUDENT` ทันที (ไม่ไปถึงขั้นตอน `userRepository.save` จึงไม่บันทึกข้อมูลลงตาราง `users`)

**Preconditions:**
- บัญชี `6609000002` (สมหญิง รักเรียน) ใน `StubTuApiClient` มี `department: "ภาควิชาคณิตศาสตร์และสถิติ"` และยังไม่มีข้อมูลอยู่ในตาราง `users`
- ก่อนเริ่ม ให้กรอกรหัสผ่านของ `6609000002` **ผิด 1 ครั้ง** เพื่อให้มีแถว `failed_attempts = 1` อยู่ในตาราง `login_attempt` (ใช้พิสูจน์ว่าเมื่อกรอกรหัสถูกแต่ติด 403 การลบ `login_attempt` จะไม่ถูก Rollback)

**Test Steps:**
1. ตรวจ DB ก่อนเริ่มว่าในตาราง `login_attempt` มีแถวของ `6609000002` (`failed_attempts = 1`) และในตาราง `users` ไม่มีแถวของ `6609000002`
2. กรอกชื่อผู้ใช้งาน `6609000002` และรหัสผ่านที่**ถูกต้อง** (`Passw0rd!`) แล้วกด **"เข้าสู่ระบบ"**
3. ตรวจสอบหน้าเว็บ, API Response และรันคำสั่ง SQL ตรวจสอบทั้งตาราง `users` และตาราง `login_attempt` ใน DB

**Expected Result:**
- **หน้าเว็บ:** แสดงหน้า Access Denied แจ้งเตือนว่าระบบนี้เปิดให้ใช้งานเฉพาะนักศึกษาสาขาวิทยาการคอมพิวเตอร์ภาคปกติเท่านั้น
- **API:** ตอบ `403 Forbidden` เป็น `ProblemDetail` ที่มี `"code": "NOT_CS_STUDENT"`
- **DB:**
  - **ตาราง `users`:** รหัส `6609000002` **ต้องไม่ถูกบันทึก**ลงในตาราง `users` (`SELECT ... FROM users WHERE student_id = N'6609000002'` ได้ `0` แถว) แม้จะกรอกรหัสผ่านถูกต้อง เพราะถูกดักด้วย `403 NOT_CS_STUDENT` ในขั้นตอน `verifyTuStudentStatus` ก่อนถึงการทำ Upsert
  - **ตาราง `login_attempt`:** แถวของ `6609000002` ในตาราง `login_attempt` **ถูกลบออกไปแล้ว** (`0` แถว — ยืนยันว่า `loginSucceeded` ที่รันด้วย `Propagation.REQUIRES_NEW` ไม่ถูก Rollback เมื่อ `AuthService` โยน 403)

---

### [ST-09] เข้าสู่ระบบด้วยนักศึกษาสาขาวิทยาการคอมพิวเตอร์ ภาคพิเศษ (`6609650001` รหัสหลักที่ 5–6 เป็น `65`) ระบบปฏิเสธ (`403 NOT_CS_STUDENT`) โดยไม่บันทึกลงตาราง `users`

**Related CoS:** TC2

**เส้นทางใน Sequence Diagram:**
- ส่งครบ → ไม่ถูกล็อก → `TuApiClient.verifyCredentials` ผ่าน → `loginSucceeded` (`deleteById` ใน Transaction `REQUIRES_NEW` commit ทันที) → `verifyTuStudentStatus` ตรวจพบว่าแม้ `department` จะเป็น `"ภาควิชาวิทยาการคอมพิวเตอร์"` แต่หลักที่ 5–6 ของรหัสนักศึกษา `6609650001` เป็น `"65"` (`isSpecialTrack == true` คือภาคพิเศษ) → โยน `403 NOT_CS_STUDENT` ทันทีโดยไม่บันทึกข้อมูลลงตาราง `users`

**Preconditions:**
- บัญชี `6609650001` (สมปอง พิเศษ) ใน `StubTuApiClient` มี `department: "ภาควิชาวิทยาการคอมพิวเตอร์"` แต่หลักที่ 5–6 ของรหัสนักศึกษาเป็น `65` (ภาคพิเศษ) และยังไม่มีข้อมูลอยู่ในตาราง `users`
- ก่อนเริ่ม ให้กรอกรหัสผ่านของ `6609650001` **ผิด 1 ครั้ง** เพื่อให้มีแถว `failed_attempts = 1` อยู่ในตาราง `login_attempt`

**Test Steps:**
1. ตรวจ DB ก่อนเริ่มว่าในตาราง `login_attempt` มีแถวของ `6609650001` (`failed_attempts = 1`) และในตาราง `users` ไม่มีแถวของ `6609650001`
2. กรอกชื่อผู้ใช้งาน `6609650001` และรหัสผ่านที่**ถูกต้อง** (`Passw0rd!`) แล้วกด **"เข้าสู่ระบบ"**
3. ตรวจสอบหน้าเว็บ, API Response และรันคำสั่ง SQL ตรวจสอบทั้งตาราง `users` และตาราง `login_attempt` ใน DB

**Expected Result:**
- **หน้าเว็บ:** แสดงหน้า Access Denied แจ้งเตือนว่าระบบนี้เปิดให้ใช้งานเฉพาะนักศึกษาสาขาวิทยาการคอมพิวเตอร์ภาคปกติเท่านั้น
- **API:** ตอบ `403 Forbidden` เป็น `ProblemDetail` ที่มี `"code": "NOT_CS_STUDENT"`
- **DB:**
  - **ตาราง `users`:** รหัส `6609650001` **ต้องไม่ถูกบันทึก**ลงในตาราง `users` (`SELECT ... FROM users WHERE student_id = N'6609650001'` ได้ `0` แถว) แม้จะอยู่ภาควิชาวิทยาการคอมพิวเตอร์และกรอกรหัสผ่านถูกต้อง เพราะเป็นนักศึกษาภาคพิเศษ
  - **ตาราง `login_attempt`:** แถวของ `6609650001` ในตาราง `login_attempt` **ถูกลบออกไปแล้ว** (`0` แถว — ไม่ถูก Rollback เมื่อ `AuthService` โยน 403)

---

### [ST-10] ส่งข้อมูลไม่ครบ (`400 Bad Request`) และเรียก `GET /api/users/me` โดยไม่มี Token หรือ Token ไม่ถูกต้อง (`401 Unauthorized`)

**Related CoS:** - (ตรวจเส้นทาง Validation และชั้น `JwtAuthenticationFilter` ใน Sequence Diagram)

**เส้นทางใน Sequence Diagram:**
1. ส่ง `POST /api/auth/login` โดยไม่ส่ง `username` หรือ `password` (`@NotBlank`) → `AuthController` ตอบ `400 ProblemDetail` พร้อม `errors` โดยไม่เข้า `AuthService`
2. เรียก `GET /api/users/me` โดยไม่แนบ Header `Authorization: Bearer <token>` หรือแนบ Token ที่ไม่ถูกต้อง → `JwtAuthenticationFilter` ปฏิเสธด้วย `401 Unauthorized` โดยไม่ถึง `UserController`

**Preconditions:**
- ระบบรันอยู่ตามปกติ

**Test Steps:**
1. ยิง `POST http://localhost:8080/api/auth/login` ด้วย Body `{ "username": "", "password": "" }` ผ่าน Postman
2. ยิง `GET http://localhost:8080/api/users/me` โดย**ไม่ใส่ Header `Authorization`** ผ่าน Postman
3. ยิง `GET http://localhost:8080/api/users/me` โดยใส่ Header `Authorization: Bearer invalid.jwt.token` ผ่าน Postman

**Expected Result:**
- **ข้อ 1:** ตอบ `400 Bad Request` ได้ `ProblemDetail` ที่มีฟิลด์ `errors` ของ `username` และ `password` และไม่มีแถวเพิ่มใน `login_attempt`
- **ข้อ 2 และ ข้อ 3:** ตอบ `401 Unauthorized` จากชั้น Spring Security / `JwtAuthenticationFilter` โดยไม่เข้าถึงข้อมูลใน `UserController`

---

## สรุปความครอบคลุม (Traceability)

| Test Case | เรื่องที่ทดสอบตาม Sequence Diagram | CoS (US3-T16) |
| --- | --- | --- |
| ST-01 | Login สำเร็จครั้งแรก (`6609000001`) → Insert ลง `users` + ออก JWT + เรียก `GET /api/users/me` แสดงชื่อ "Somchai Jaidee" ที่ Navbar | TC1a, TC7 |
| ST-02 | Login สำเร็จครั้งถัดไป / หลังเปลี่ยนรหัสใหม่ (`6609000001`) → Update แถวเดิมใน `users` ไม่สร้างแถวซ้ำ | TC1a, TC3, TC7 |
| ST-03 | กรอกรหัสผิด (หรือรหัสเดิมหลังเปลี่ยนรหัส) ครั้งที่ 1–4 (`6609000001`) → บันทึก `failed_attempts` + ตอบ `401 INVALID_CREDENTIALS` | TC4, TC5 |
| ST-04 | กรอกรหัสถูกหลังเคยกรอกผิด (`6609000001`) → ล้าง `login_attempt` ด้วย `deleteById` ทันที | TC1a, TC3 |
| ST-05 | กรอกรหัสผิดติดต่อกันครบ 5 ครั้ง (`6609000004`) → ล็อกบัญชี 15 นาที (`429 ACCOUNT_LOCKED`, `retryAfterSeconds: 900`) | TC6 |
| ST-06 | พยายามเข้าสู่ระบบขณะถูกระงับ (`429` ทันทีไม่เรียก `TuApiClient`) และปลดระงับเข้าสู่ระบบของ "Somjai Longdoo" (`6609000004`) ได้เมื่อครบ 15 นาที | TC6, TC1a |
| ST-07 | บัญชี มธ. ไม่ Active ("สมศักดิ์ พักก่อน" `6609000003`) → ปฏิเสธด้วย `403 ACCOUNT_INACTIVE` และไม่บันทึกลงตาราง `users` | TC1b |
| ST-08 | นักศึกษาต่างสาขา ("สมหญิง รักเรียน" `6609000002`) → ล้าง `login_attempt` (ไม่ Rollback) แล้วปฏิเสธด้วย `403 NOT_CS_STUDENT` โดยไม่บันทึกลงตาราง `users` | TC2 |
| ST-09 | นักศึกษา CS ภาคพิเศษ หลักที่ 5–6 เป็น `65` ("สมปอง พิเศษ" `6609650001`) → ล้าง `login_attempt` (ไม่ Rollback) แล้วปฏิเสธด้วย `403 NOT_CS_STUDENT` โดยไม่บันทึกลงตาราง `users` | TC2 |
| ST-10 | ไม่ส่ง `username`/`password` → `400 Bad Request` และเรียก `/api/users/me` ไม่มี/ผิด Token → `401 Unauthorized` | - (Validation & JWT Filter) |

---

## แบบบันทึกผล (ใช้ใน US3-T19)

| Test Case | ผู้ทดสอบ | วันที่ | ผล (Pass/Fail) | หมายเหตุ / Bug ที่พบ |
| --- | --- | --- | --- | --- |
| ST-01 | | | | |
| ST-02 | | | | |
| ST-03 | | | | |
| ST-04 | | | | |
| ST-05 | | | | |
| ST-06 | | | | |
| ST-07 | | | | |
| ST-08 | | | | |
| ST-09 | | | | |
| ST-10 | | | | |

---

## เอกสารที่เกี่ยวข้อง
- [US3-T06 Sequence Diagram](../T06/US3-T06-Sequence-Diagram.md)
- [US3-T06 DAO Class Diagram](../T06/US3-T06-DAO-Class-Diagram.md)
- [US3-T06 Extended API Class Diagram](../T06/US3-T06-Extended-API-Class-Diagram.md)
- [US3-T06 ER Diagram](../T06/US3-T06-ER-Diagram.md)
- [US3-T05 DTO & API Spec](../T05/US3-DTO-API-Spec.md)
- [US3-T12 Design Unit Test Cases ส่วน DAO](../T12/US3-T12-DAO-Unit-Test-Cases.md)
- [US3-T16 User Acceptance Test](../US3-T16.md)
