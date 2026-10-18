# US3-T15 Design System Test ตาม Sequence Diagram

## User story
US3: Login เข้าสู่ระบบด้วย user name และ password ของสำนักทะเบียน

**CoS อ้างอิง:** [US3-T16 User Acceptance Test Specification](../US3-T16.md) และ [US3-T05 DTO & API Spec](../T05/US3-DTO-API-Spec.md)

## Objective
ออกแบบ System Test ของการเข้าสู่ระบบและการดึงข้อมูลนักศึกษาปัจจุบัน ตั้งแต่หน้าเว็บ → Spring Security Filter / Controller → Service → TU Login API → ฐานข้อมูล ให้ครอบคลุมทุกเส้นทางใน [Sequence Diagram ของ US3-T06](../T06/US3-T06-Sequence-Diagram.md) โดยเฉพาะกรณี **เข้าสู่ระบบครั้งแรก (Insert)**, **เข้าสู่ระบบครั้งถัดไป (Update)** และ **การระงับบัญชีชั่วคราว 15 นาทีเมื่อกรอกรหัสผิดครบ 5 ครั้ง** เพื่อใช้ใน US3-T19 (รัน System Test)

## Scope
ทดสอบ `POST /api/auth/login` และ `GET /api/users/me` ทั้งระบบที่รันจริงใน Docker ครอบคลุมทุกเส้นทางใน Sequence Diagram:

| เส้นทางใน Sequence Diagram | ผลลัพธ์ | Test Case |
| --- | --- | --- |
| เข้าสู่ระบบสำเร็จเป็นครั้งแรก (ยังไม่มีแถวใน `users`) → Insert ลง `users` + ออก JWT + เรียก `GET /api/users/me` แสดงชื่อที่ Navbar | `200 OK` (`{ token }`) และ `200 OK` (`{ studentId, firstName, lastName }`) | ST-01 |
| เข้าสู่ระบบสำเร็จในครั้งถัดไป / หลังเปลี่ยนรหัสผ่านใหม่ (มีแถวใน `users` แล้ว) → Update แถวเดิมใน `users` โดยไม่สร้างแถวซ้ำ | `200 OK` (`{ token }`) และอัปเดต `updated_at` ในแถวเดิม | ST-02 |
| กรอก `username` หรือ `password` ไม่ถูกต้อง ยังไม่ครบ 5 ครั้ง (ครั้งที่ 1–4) → บวก `failed_attempts` ใน `login_attempt` | `401 Unauthorized` (`code: "INVALID_CREDENTIALS"`) | ST-03 |
| กรอกรหัสผ่านถูกต้องหลังจากเคยกรอกผิด (ยังไม่ถูกล็อก) → ล้างประวัติใน `login_attempt` ด้วย `deleteById` ทันที | `200 OK` (`{ token }`) และลบแถวใน `login_attempt` | ST-04 |
| กรอกรหัสผ่านผิดติดต่อกันครบ 5 ครั้ง → ตั้ง `locked_until = now + 15 นาที` และระงับการเข้าสู่ระบบชั่วคราว | `429 Too Many Requests` (`code: "ACCOUNT_LOCKED"`, `retryAfterSeconds: 900`) | ST-05 |
| พยายามเข้าสู่ระบบขณะบัญชียังถูกระงับอยู่ (`lockedUntil > now`) → ปฏิเสธทันทีโดยไม่ยิง TU API และปลดระงับเมื่อครบ 15 นาที | `429` พร้อม `retryAfterSeconds` ที่ลดลงตามเวลาจริง และ `200 OK` เมื่อพ้น 15 นาที | ST-06 |
| รหัสผ่านถูกแต่บัญชี มธ. ไม่ได้อยู่ในสถานะ Active → ล้าง `login_attempt` แล้วปฏิเสธการเข้าสู่ระบบ (ไม่บันทึกลงตาราง `users`) | `403 Forbidden` (`code: "ACCOUNT_INACTIVE"`) | ST-07 |
| รหัสผ่านถูกแต่ไม่ใช่นักศึกษาสาขาวิทยาการคอมพิวเตอร์ ภาคปกติ → ล้าง `login_attempt` (ไม่ถูก Rollback) แล้วปฏิเสธโดยไม่บันทึกลงตาราง `users` | `403 Forbidden` (`code: "NOT_CS_STUDENT"`) | ST-08 |
| ไม่ส่ง `username` หรือ `password` (`@NotBlank`) หรือเรียก `GET /api/users/me` โดยไม่มี JWT / JWT ไม่ถูกต้อง | `400 Bad Request` (พร้อม `errors`) และ `401 Unauthorized` (จาก `JwtAuthenticationFilter`) | ST-09 |

---

## Test Approach
- **ทดสอบแบบ End-to-End ครบทุกชั้น:** หน้าเว็บ (Next.js) + Backend (Spring Boot พร้อม Spring Security / JWT) + ฐานข้อมูล SQL Server ที่รันด้วย `docker compose up -d --build` ตาม README
- **ตรวจสอบผล 3 ชั้นในทุก Test Case:**
  1. **หน้าเว็บ (UI):** การเปลี่ยนหน้า, ข้อความแจ้งเตือน, หน้า Access Denied, หน้า Countdown Timer 15 นาที และการแสดงชื่อ-นามสกุล + รหัสนักศึกษาที่ Navbar มุมขวาบน
  2. **API Response:** HTTP Status Code, โครงสร้าง JSON (`LoginResponse`, `UserProfileResponse` หรือ `ProblemDetail` RFC 9457 พร้อม `code` และ `retryAfterSeconds`) ผ่าน DevTools แท็บ Network หรือ Postman
  3. **ฐานข้อมูล (DB):** ตรวจสอบตาราง `users` และ `login_attempt` ใน SQL Server จริง
- **การเชื่อมต่อ TU Login API:** ในสภาพแวดล้อมทดสอบ หากไม่สามารถใช้บัญชีจริงของสำนักทะเบียนสำหรับเคสพิเศษ (เช่น บัญชีไม่ Active, นักศึกษาต่างสาขา หรือการทดสอบล็อก 5 ครั้งซ้ำๆ) ให้กำหนดค่า `TU_API_BASE_URL` ชี้ไปยังชุดจำลองผลการตอบกลับของ TU API ตามบัญชีทดสอบที่ระบุไว้ในตารางเตรียมข้อมูล โดยที่ Backend ยังคงยิง HTTP Request จริงผ่าน `TuApiClient`
- **การทดสอบกรณีส่งข้อมูลไม่ครบหรือส่ง Header ผิด (ST-09):** กรณีที่ฟอร์มบนหน้าเว็บกันไว้ด้วย HTML/Client Validation ให้ยิงทดสอบ API โดยตรงด้วย Postman หรือ `curl`

---

## สภาพแวดล้อมและการเตรียมข้อมูล

| รายการ | ค่า |
| --- | --- |
| เปิดระบบ | `cp .env.example .env` แล้ว `docker compose up -d --build` |
| หน้าเว็บ | `http://localhost:3000/login` (และหน้าหลัก `http://localhost:3000`) |
| API | `http://localhost:8080` |
| Endpoint ที่ทดสอบ | `POST /api/auth/login`, `GET /api/users/me` |

### บัญชีนักศึกษาสำหรับใช้ทดสอบ

| รหัสผู้ใช้ (`username`) | ชื่อ - นามสกุล | สาขาวิชา / ภาค | สถานะบัญชี มธ. | ใช้ใน Test Case |
| --- | --- | --- | --- | --- |
| `6809610001` | อลิษา หลิว | วิทยาการคอมพิวเตอร์ / ภาคปกติ | Active (`true`) | ST-01 (Login ครั้งแรก), ST-02 (Login ครั้งถัดไป), ST-03, ST-04 |
| `6809610002` | เซเลอร์ มูน | วิทยาการคอมพิวเตอร์ / ภาคปกติ | Active (`true`) | ST-05, ST-06 (ทดสอบถูกระงับ 15 นาที และปลดระงับ) |
| `6809619999` | ดลลี่ แบร่ | วิทยาการคอมพิวเตอร์ / ภาคปกติ | Inactive (`false`) | ST-07 (บัญชีไม่ Active) |
| `6809620001` | นักศึกษา ต่างสาขา | คณิตศาสตร์ / ภาคปกติ | Active (`true`) | ST-08 (ไม่ใช่นักศึกษา CS ภาคปกติ) |

### คำสั่งล้างข้อมูลใน DB ก่อนเริ่มชุดทดสอบ

```bash
docker exec sqlserver bash -c '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -d appdb -Q "DELETE FROM login_attempt; DELETE FROM users WHERE student_id IN (N'"'"'6809610001'"'"', N'"'"'6809610002'"'"', N'"'"'6809619999'"'"', N'"'"'6809620001'"'"');"'
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
1. `POST /api/auth/login` → ส่งครบ → `isLocked` = `false` → `TuApiClient.verifyCredentials` ผ่าน → `loginSucceeded` (`deleteById`) → `verifyTuStudentStatus` ผ่าน → `userRepository.findById("6809610001")` ไม่พบ → `userRepository.save` (**INSERT** แถวใหม่) → `jwtService.generateToken` → `200 OK { token }`
2. `GET /api/users/me` (แนบ `Authorization: Bearer <token>`) → `JwtAuthenticationFilter` ตรวจ Token ผ่าน `JwtService` → ตั้ง `Authentication` ใน `SecurityContextHolder` → `UserController` เรียก `CurrentStudentProvider` ได้ `"6809610001"` → `userService.getProfile` อ่านจาก `users` → `200 OK`

**Preconditions:**
- รันคำสั่งล้างตาราง `users` และ `login_attempt` แล้ว (ยืนยันว่ายังไม่มีรหัส `6809610001` ในตาราง `users`)
- เปิดหน้าเว็บที่หน้าเข้าสู่ระบบ (`/login`)

**Test Steps:**
1. กรอกชื่อผู้ใช้งาน `6809610001` และรหัสผ่านที่ถูกต้อง แล้วกดปุ่ม **"เข้าสู่ระบบ"**
2. ตรวจสอบหน้าเว็บหลังจากเปลี่ยนหน้าไปยังเมนูหลัก
3. ตรวจสอบ API Response ของ `POST /api/auth/login` และ `GET /api/users/me` ใน DevTools (Network)
4. รันคำสั่ง SQL ตรวจสอบตาราง `users` และ `login_attempt` ใน DB (และจดค่า `updated_at` ของ `6809610001` ไว้สำหรับเทียบใน ST-02)

**Expected Result:**
- **หน้าเว็บ:** พาไปยังหน้าเมนูหลัก แสดงชื่อ-นามสกุล **"อลิษา หลิว"** และรหัสนักศึกษา **"6809610001"** ที่ Navbar มุมขวาบน พร้อมเมนูฟังก์ชันครบตาม TC7
- **API:**
  - `POST /api/auth/login` ตอบ `200 OK` ได้ `{ "token": "<JWT>" }`
  - `GET /api/users/me` ตอบ `200 OK` ได้ `{ "studentId": "6809610001", "firstName": "อลิษา", "lastName": "หลิว" }`
- **DB:**
  - ตาราง `users` มีแถวใหม่ของ `6809610001` จำนวน 1 แถว (`first_name = N'อลิษา'`, `last_name = N'หลิว'`, `department = N'วิทยาการคอมพิวเตอร์'`, `track = N'ภาคปกติ'`, `updated_at` ไม่เป็น `NULL`)
  - ตาราง `login_attempt` ไม่มีแถวของ `6809610001`

---

### [ST-02] เข้าสู่ระบบสำเร็จในครั้งถัดไป (Subsequent Login / หลังเปลี่ยนรหัสผ่านใหม่) ระบบอัปเดตแถว `users` เดิมโดยไม่สร้างแถวซ้ำ

**Related CoS:** TC1a, TC3, TC7

**เส้นทางใน Sequence Diagram:**
- ส่งครบ → ไม่ถูกล็อก → `TuApiClient.verifyCredentials` ผ่าน (ด้วยรหัสปัจจุบัน/รหัสใหม่) → `loginSucceeded` → `verifyTuStudentStatus` ผ่าน → `userRepository.findById("6809610001")` **พบแถวเดิม** → `updateProfile` + `userRepository.save` (**UPDATE** แถวเดิม) → `jwtService.generateToken` → `200 OK` → `GET /api/users/me` ตอบ `200 OK`

**Preconditions:**
- ผ่าน ST-01 แล้ว (มีแถวของ `6809610001` อยู่ในตาราง `users` แล้ว 1 แถว)
- ออกจากระบบ (หรือเปิดหน้า `/login` ใหม่) และเว้นระยะอย่างน้อย 1–2 วินาทีจาก ST-01 เพื่อให้เห็นความแตกต่างของ `updated_at`

**Test Steps:**
1. กรอกชื่อผู้ใช้งาน `6809610001` และรหัสผ่านที่ถูกต้อง (หรือรหัสผ่านใหม่ตาม TC3) แล้วกดปุ่ม **"เข้าสู่ระบบ"**
2. ตรวจสอบหน้าเว็บ, API Response และรันคำสั่ง SQL ตรวจสอบตาราง `users`

**Expected Result:**
- **หน้าเว็บ:** เข้าสู่หน้าเมนูหลักและแสดงชื่อ **"อลิษา หลิว"** รหัส **"6809610001"** ที่ Navbar มุมขวาบนตามปกติ
- **API:** `POST /api/auth/login` ตอบ `200 OK` ได้ JWT Token ใหม่ และ `GET /api/users/me` ตอบ `200 OK`
- **DB:**
  - ตาราง `users` ยังคงมีแถวของ `6809610001` เพียง **1 แถวเท่าเดิม** (ไม่สร้างแถวซ้ำ)
  - คอลัมน์ `updated_at` ของ `6809610001` ถูกอัปเดตเป็นเวลาใหม่กว่าค่าที่จดไว้ใน ST-01

---

### [ST-03] กรอกรหัสผ่านผิดยังไม่ครบ 5 ครั้ง (ครั้งที่ 1–4) ระบบนับจำนวนครั้งผิดและแจ้งเตือน แต่ยังไม่ระงับบัญชี

**Related CoS:** TC4, TC5

**เส้นทางใน Sequence Diagram:**
- ส่งครบ → `isLocked` = `false` → `TuApiClient.verifyCredentials` แจ้งรหัสผิด → `loginAttemptService.loginFailed("6809610001")` [ทำงานใน Transaction `REQUIRES_NEW` บันทึก `failed_attempts + 1` และ commit ทันที] → `isLocked` = `false` (ยังไม่ครบ 5 ครั้ง) → โยน `401 INVALID_CREDENTIALS`

**Preconditions:**
- ตาราง `login_attempt` ไม่มีแถวของ `6809610001`

**Test Steps:**
1. ที่หน้า `/login` กรอกชื่อผู้ใช้งาน `6809610001` และรหัสผ่านที่**ไม่ถูกต้อง** (หรือรหัสผ่านเดิมที่เปลี่ยนไปแล้วตาม TC4) แล้วกด **"เข้าสู่ระบบ"**
2. ตรวจผลครั้งที่ 1 บนหน้าเว็บ, API Response และ DB
3. กดส่งรหัสผ่านที่ไม่ถูกต้องซ้ำอีก 3 ครั้ง (รวมเป็นผิดติดต่อกัน **4 ครั้ง**) แล้วตรวจผลใน DB

**Expected Result:**
- **หน้าเว็บ:** ทั้ง 4 ครั้งยังคงอยู่ที่หน้าเข้าสู่ระบบ แสดงข้อความแจ้งเตือนว่าชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง (ยังไม่เปลี่ยนเป็นหน้าระงับบัญชี)
- **API:** ทั้ง 4 ครั้งตอบ `401 Unauthorized` เป็น `ProblemDetail` ที่มี `"code": "INVALID_CREDENTIALS"`
- **DB:**
  - หลังผิดครั้งที่ 1: ตาราง `login_attempt` มีแถว `username = N'6809610001'`, `failed_attempts = 1`, `locked_until = NULL`
  - หลังผิดครั้งที่ 4: แถวเดิมอัปเดตเป็น `failed_attempts = 4` และ `locked_until` ยังคงเป็น `NULL` (ยืนยันว่าการบันทึก `loginFailed` ด้วย `REQUIRES_NEW` ไม่ถูก Rollback เมื่อ `AuthService` โยน 401)

---

### [ST-04] กรอกรหัสผ่านถูกต้องหลังจากเคยกรอกผิด ระบบล้างจำนวนครั้งที่ผิดทันที (`loginSucceeded`)

**Related CoS:** TC1a, TC3

**เส้นทางใน Sequence Diagram:**
- ส่งครบ → `isLocked` = `false` (`failed_attempts = 4` ยังไม่ถูกล็อก) → `TuApiClient.verifyCredentials` ผ่าน → `loginAttemptService.loginSucceeded("6809610001")` เรียก `deleteById("6809610001")` → อัปเดต `users` → คืน `200 OK { token }`

**Preconditions:**
- ต่อเนื่องจาก ST-03 (ในตาราง `login_attempt` มีแถวของ `6809610001` ที่ `failed_attempts = 4`)

**Test Steps:**
1. กรอกชื่อผู้ใช้งาน `6809610001` และรหัสผ่านที่**ถูกต้อง** แล้วกด **"เข้าสู่ระบบ"**
2. ตรวจสอบหน้าเว็บ, API Response และรันคำสั่ง SQL ตรวจสอบตาราง `login_attempt`

**Expected Result:**
- **หน้าเว็บ:** เข้าสู่หน้าเมนูหลักได้สำเร็จ แสดงชื่อ **"อลิษา หลิว"** ที่ Navbar
- **API:** `POST /api/auth/login` ตอบ `200 OK`
- **DB:** แถวของ `6809610001` ในตาราง `login_attempt` **ถูกลบออกไปแล้ว** (ถ้าภายหลังกรอกรหัสผิดอีกครั้ง ระบบจะเริ่มนับ `failed_attempts = 1` ใหม่ ไม่ถูกระงับทันที)

---

### [ST-05] กรอกรหัสผ่านผิดติดต่อกันครบ 5 ครั้ง ระบบระงับบัญชีชั่วคราว 15 นาที (900 วินาที)

**Related CoS:** TC6

**เส้นทางใน Sequence Diagram:**
- ส่งครบ → `isLocked` = `false` → `TuApiClient.verifyCredentials` แจ้งรหัสผิด (ครั้งที่ 5) → `loginFailed("6809610002")` [Transaction `REQUIRES_NEW`] เพิ่ม `failed_attempts` เป็น `5` และตั้ง `locked_until = now + 15 นาที` → `isLocked` = `true` → `getWaitTime` คืน `900` → โยน `429 ACCOUNT_LOCKED` พร้อม `retryAfterSeconds: 900`

**Preconditions:**
- ล้างแถวของ `6809610002` ในตาราง `login_attempt` แล้ว

**Test Steps:**
1. กรอกชื่อผู้ใช้งาน `6809610002` และรหัสผ่านที่ไม่ถูกต้อง กด **"เข้าสู่ระบบ"** ติดต่อกัน 4 ครั้ง (ได้ `401 INVALID_CREDENTIALS` ทั้ง 4 ครั้ง)
2. กรอกรหัสผ่านที่ไม่ถูกต้องเป็น**ครั้งที่ 5** แล้วกด **"เข้าสู่ระบบ"**
3. ตรวจสอบหน้าเว็บ, API Response ของครั้งที่ 5 และตาราง `login_attempt` ใน DB

**Expected Result:**
- **หน้าเว็บ:** เปลี่ยนเป็นหน้าระงับการเข้าสู่ระบบชั่วคราว แจ้งเตือนว่าบัญชีถูกระงับเป็นเวลา 15 นาทีเนื่องจากกรอกผิดครบ 5 ครั้ง พร้อมแสดง **Countdown Timer** นับถอยหลังจาก 15:00 นาที
- **API (ครั้งที่ 5):** ตอบ `429 Too Many Requests` เป็น `ProblemDetail` ที่มี:
  - `"code": "ACCOUNT_LOCKED"`
  - `"retryAfterSeconds": 900` (หรือค่าประมาณ 899–900 วินาที)
- **DB:** ตาราง `login_attempt` ของ `6809610002` มี `failed_attempts = 5` และ `locked_until` ไม่เป็น `NULL` (มีค่าเท่ากับ `updated_at + 15 นาที`)

---

### [ST-06] พยายามเข้าสู่ระบบขณะถูกระงับ (ปฏิเสธทันทีโดยไม่ยิง TU API) และปลดระงับเมื่อครบ 15 นาที

**Related CoS:** TC6, TC1a

**เส้นทางใน Sequence Diagram:**
- **ช่วงที่ 1 (ขณะยังถูกล็อก `lockedUntil > now`):** `POST /api/auth/login` → `isLocked("6809610002")` เป็น `true` ตั้งแต่ต้นฟังก์ชัน → `getWaitTime` คืนเวลาที่เหลือ → โยน `429 ACCOUNT_LOCKED` ทันทีโดยไม่เรียก `TuApiClient`
- **ช่วงที่ 2 (เมื่อครบ 15 นาที `lockedUntil <= now`):** `isLocked("6809610002")` เป็น `false` → เรียก `TuApiClient` ผ่าน → `loginSucceeded` ลบแถวใน `login_attempt` → บันทึก `users` ("เซเลอร์ มูน") → `200 OK`

**Preconditions:**
- ต่อเนื่องจาก ST-05 (บัญชี `6809610002` กำลังถูกระงับอยู่ในตาราง `login_attempt`)

**Test Steps:**
1. **ทดสอบขณะยังถูกระงับ:** หลังผ่านไปประมาณ 10 วินาที ลองส่ง `POST /api/auth/login` ของ `6809610002` ด้วยรหัสผ่านที่**ถูกต้อง** (ผ่าน Postman หรือหน้าเว็บ) แล้วตรวจ API Response และ DB
2. **ทดสอบเมื่อครบกำหนด 15 นาที:** รอจนครบ 15 นาที (หรือรันคำสั่ง SQL จำลองว่าเวลาล็อกผ่านไปแล้ว 15 นาที: `UPDATE login_attempt SET locked_until = DATEADD(SECOND, -1, SYSDATETIMEOFFSET()) WHERE username = N'6809610002';`)
3. กรอกชื่อผู้ใช้งาน `6809610002` และรหัสผ่านที่**ถูกต้อง** บนหน้าเว็บ แล้วกด **"เข้าสู่ระบบ"**
4. ตรวจสอบหน้าเว็บ, API Response และ DB

**Expected Result:**
- **ข้อ 1 (ขณะยังถูกระงับ):**
  - **API:** ตอบ `429 Too Many Requests` (`"code": "ACCOUNT_LOCKED"`) ทันทีแม้รหัสผ่านจะถูก และค่า `"retryAfterSeconds"` ลดลงตามเวลาที่ผ่านไป (เช่น เหลือประมาณ `890` วินาที)
  - **DB:** แถวของ `6809610002` ใน `login_attempt` ยังคงมี `failed_attempts = 5` และยังไม่มีแถวของ `6809610002` ในตาราง `users`
- **ข้อ 3–4 (หลังครบ 15 นาที):**
  - **หน้าเว็บ:** ปลดระงับและเข้าสู่หน้าเมนูหลักสำเร็จ แสดงชื่อ **"เซเลอร์ มูน"** รหัส **"6809610002"** ที่ Navbar มุมขวาบน
  - **API:** `POST /api/auth/login` ตอบ `200 OK` ได้ `{ "token": "<JWT>" }` และ `GET /api/users/me` ได้ `{ "studentId": "6809610002", "firstName": "เซเลอร์", "lastName": "มูน" }`
  - **DB:** แถวของ `6809610002` ใน `login_attempt` ถูกลบออก และมีแถวของ `6809610002` (`เซเลอร์ มูน`) ถูกบันทึกในตาราง `users`

---

### [ST-07] เข้าสู่ระบบด้วยบัญชี มธ. ที่ไม่อยู่ในสถานะ Active ระบบปฏิเสธ (`403 ACCOUNT_INACTIVE`)

**Related CoS:** TC1b

**เส้นทางใน Sequence Diagram:**
- ส่งครบ → ไม่ถูกล็อก → `TuApiClient.verifyCredentials` ผ่าน (รหัสถูก) → `loginSucceeded` → `verifyTuStudentStatus` พบว่า `active == false` → โยน `403 ACCOUNT_INACTIVE`

**Preconditions:**
- บัญชี `6809619999` (ดลลี่ แบร่) มีสถานะจาก TU API เป็น `active: false`

**Test Steps:**
1. ที่หน้า `/login` กรอกชื่อผู้ใช้งาน `6809619999` และรหัสผ่านที่ถูกต้อง แล้วกด **"เข้าสู่ระบบ"**
2. ตรวจสอบหน้าเว็บ, API Response และตาราง `users` / `login_attempt` ใน DB

**Expected Result:**
- **หน้าเว็บ:** ไม่อนุญาตให้เข้าสู่ระบบ และแสดงข้อความแจ้งเตือนว่าบัญชีไม่อยู่ในสถานะใช้งานปกติ
- **API:** ตอบ `403 Forbidden` เป็น `ProblemDetail` ที่มี `"code": "ACCOUNT_INACTIVE"`
- **DB:** ไม่มีแถวของ `6809619999` ถูกบันทึกลงในตาราง `users` และไม่มีการนับเป็นรหัสผิดใน `login_attempt`

---

### [ST-08] เข้าสู่ระบบด้วยนักศึกษาที่ไม่ใช่สาขาวิทยาการคอมพิวเตอร์ ภาคปกติ ระบบปฏิเสธ (`403 NOT_CS_STUDENT`) โดยไม่บันทึกลงตาราง `users` และไม่ Rollback การล้าง Attempt

**Related CoS:** TC2

**เส้นทางใน Sequence Diagram:**
- ส่งครบ → ไม่ถูกล็อก → `TuApiClient.verifyCredentials` ผ่าน → `loginSucceeded` (`deleteById` ใน Transaction `REQUIRES_NEW` commit ทันที) → `verifyTuStudentStatus` พบว่าไม่ใช่สาขาวิทยาการคอมพิวเตอร์หรือภาคปกติ → โยน `403 NOT_CS_STUDENT` ทันที (ไม่ไปถึงขั้นตอน `userRepository.save` จึงไม่บันทึกข้อมูลลงตาราง `users`)

**Preconditions:**
- บัญชี `6809620001` เป็นนักศึกษาต่างสาขาหรือต่างภาค (เช่น สาขาคณิตศาสตร์) และยังไม่มีข้อมูลอยู่ในตาราง `users`
- ก่อนเริ่ม ให้กรอกรหัสผ่านของ `6809620001` **ผิด 1 ครั้ง** เพื่อให้มีแถว `failed_attempts = 1` อยู่ในตาราง `login_attempt` (ใช้พิสูจน์ว่าเมื่อกรอกรหัสถูกแต่ติด 403 การลบ `login_attempt` จะไม่ถูก Rollback)

**Test Steps:**
1. ตรวจ DB ก่อนเริ่มว่าในตาราง `login_attempt` มีแถวของ `6809620001` (`failed_attempts = 1`) และในตาราง `users` ไม่มีแถวของ `6809620001`
2. กรอกชื่อผู้ใช้งาน `6809620001` และรหัสผ่านที่**ถูกต้อง** แล้วกด **"เข้าสู่ระบบ"**
3. ตรวจสอบหน้าเว็บ, API Response และรันคำสั่ง SQL ตรวจสอบทั้งตาราง `users` และตาราง `login_attempt` ใน DB

**Expected Result:**
- **หน้าเว็บ:** แสดงหน้า Access Denied แจ้งเตือนว่าระบบนี้เปิดให้ใช้งานเฉพาะนักศึกษาสาขาวิทยาการคอมพิวเตอร์ภาคปกติเท่านั้น
- **API:** ตอบ `403 Forbidden` เป็น `ProblemDetail` ที่มี `"code": "NOT_CS_STUDENT"`
- **DB:**
  - **ตาราง `users`:** รหัส `6809620001` **ต้องไม่ถูกบันทึก**ลงในตาราง `users` (`SELECT ... FROM users WHERE student_id = N'6809620001'` ได้ `0` แถว) แม้จะกรอกรหัสผ่านถูกต้อง เพราะถูกดักด้วย `403 NOT_CS_STUDENT` ในขั้นตอน `verifyTuStudentStatus` ก่อนถึงการทำ Upsert
  - **ตาราง `login_attempt`:** แถวของ `6809620001` ในตาราง `login_attempt` **ถูกลบออกไปแล้ว** (`0` แถว — ยืนยันว่า `loginSucceeded` ที่รันด้วย `Propagation.REQUIRES_NEW` ไม่ถูก Rollback เมื่อ `AuthService` โยน 403)

---

### [ST-09] ส่งข้อมูลไม่ครบ (`400 Bad Request`) และเรียก `GET /api/users/me` โดยไม่มี Token หรือ Token ไม่ถูกต้อง (`401 Unauthorized`)

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
| ST-01 | Login สำเร็จครั้งแรก → Insert ลง `users` + ออก JWT + เรียก `GET /api/users/me` แสดงชื่อ "อลิษา หลิว" ที่ Navbar | TC1a, TC7 |
| ST-02 | Login สำเร็จครั้งถัดไป / หลังเปลี่ยนรหัสใหม่ → Update แถวเดิมใน `users` ไม่สร้างแถวซ้ำ | TC1a, TC3, TC7 |
| ST-03 | กรอกรหัสผิด (หรือรหัสเดิมหลังเปลี่ยนรหัส) ครั้งที่ 1–4 → บันทึก `failed_attempts` + ตอบ `401 INVALID_CREDENTIALS` | TC4, TC5 |
| ST-04 | กรอกรหัสถูกหลังเคยกรอกผิด → ล้าง `login_attempt` ด้วย `deleteById` ทันที | TC1a, TC3 |
| ST-05 | กรอกรหัสผิดติดต่อกันครบ 5 ครั้ง → ล็อกบัญชี 15 นาที (`429 ACCOUNT_LOCKED`, `retryAfterSeconds: 900`) | TC6 |
| ST-06 | พยายามเข้าสู่ระบบขณะถูกระงับ (`429` ทันทีไม่ยิง TU API) และปลดระงับเข้าสู่ระบบของ "เซเลอร์ มูน" ได้เมื่อครบ 15 นาที | TC6, TC1a |
| ST-07 | บัญชี มธ. ไม่ Active ("ดลลี่ แบร่") → ปฏิเสธด้วย `403 ACCOUNT_INACTIVE` และไม่บันทึกลงตาราง `users` | TC1b |
| ST-08 | นักศึกษาไม่ใช่สาขา CS ภาคปกติ → ล้าง `login_attempt` (ไม่ Rollback) แล้วปฏิเสธด้วย `403 NOT_CS_STUDENT` โดยไม่บันทึกลงตาราง `users` | TC2 |
| ST-09 | ไม่ส่ง `username`/`password` → `400 Bad Request` และเรียก `/api/users/me` ไม่มี/ผิด Token → `401 Unauthorized` | - (Validation & JWT Filter) |

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

---

## เอกสารที่เกี่ยวข้อง
- [US3-T06 Sequence Diagram](../T06/US3-T06-Sequence-Diagram.md)
- [US3-T06 DAO Class Diagram](../T06/US3-T06-DAO-Class-Diagram.md)
- [US3-T06 Extended API Class Diagram](../T06/US3-T06-Extended-API-Class-Diagram.md)
- [US3-T06 ER Diagram](../T06/US3-T06-ER-Diagram.md)
- [US3-T05 DTO & API Spec](../T05/US3-DTO-API-Spec.md)
- [US3-T12 Design Unit Test Cases ส่วน DAO](../T12/US3-T12-DAO-Unit-Test-Cases.md)
- [US3-T16 User Acceptance Test](../US3-T16.md)
