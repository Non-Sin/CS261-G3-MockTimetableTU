# US3-T06 — Sequence Diagram: เข้าสู่ระบบ (Log-in) และดึงข้อมูลผู้ใช้ปัจจุบัน

ลำดับการทำงานระหว่าง UI, Controller, Service, TU Login API, Repository (DAO) และ Database ของ `POST /api/auth/login` และ `GET /api/users/me` ต่อจาก US3-T05

ข้อกำหนดที่ใช้ตาม [DTO & API Spec](../T05/US3-DTO-API-Spec.md) และ [UAT (US3-T16)](../US3-T16.md):

- ลำดับตรวจใน `AuthService.authenticate`:
  1. ตรวจ body (`username`, `password` ไม่ว่าง) → `400 Bad Request`
  2. ตรวจว่าบัญชีถูกระงับอยู่หรือไม่ (`loginAttemptService.isLocked(username)`) → ถ้าล็อกอยู่โยน `429 ACCOUNT_LOCKED` พร้อม `retryAfterSeconds` ทันทีโดยไม่ยิง TU Login API (TC6)
  3. ยิงตรวจสอบ `username` / `password` กับระบบของมหาวิทยาลัยผ่าน `TuApiClient.verifyCredentials(username, password)` (TC1a, TC3, TC4, TC5)
  4. ถ้ารหัสผ่านไม่ถูกต้อง: เรียก `loginAttemptService.loginFailed(username)` เพื่อบวกจำนวนครั้งที่ผิด แล้วตรวจว่าครบ 5 ครั้งหรือไม่ → ถ้าครบ 5 ครั้งโยน `429 ACCOUNT_LOCKED` พร้อม `retryAfterSeconds` (900 วินาที = 15 นาที, TC6) ถ้ายังไม่ครบ 5 ครั้งโยน `401 INVALID_CREDENTIALS` (TC4, TC5)
  5. ถ้ารหัสผ่านถูกต้อง: ล้างจำนวนครั้งที่ผิดด้วย `loginAttemptService.loginSucceeded(username)`
  6. ตรวจสถานะบัญชีและสาขาด้วย `verifyTuStudentStatus(tuResponse)` → ถ้าบัญชีไม่อยู่ในสถานะ Active โยน `403 ACCOUNT_INACTIVE` (TC1b) · ถ้า `department` ไม่ใช่สาขาวิทยาการคอมพิวเตอร์ หรือ `track` ไม่ใช่ภาคปกติ โยน `403 NOT_CS_STUDENT` (TC2)
  7. บันทึกหรืออัปเดตข้อมูลนักศึกษา (Upsert) ลงตาราง `users` ผ่าน `UserRepository` แล้วสร้าง JWT Token คืน `200 OK` (`LoginResponse`)
- หลังได้ `token` แล้ว หน้าเมนูหลักเรียก `GET /api/users/me` พร้อม Header `Authorization: Bearer <token>` เพื่อดึง `studentId`, `firstName`, `lastName` ไปแสดงที่ Navbar มุมขวาบน (TC7)
- ชื่อ "DAO" ในการ์ดคือ Repository (`UserRepository` และ `LoginAttemptRepository`) เหมือน US1-T06 และ US2-T06

## แผนภาพ Sequence Diagram (Mermaid)

```mermaid
sequenceDiagram
    actor User as นักศึกษา
    participant UI as หน้าเว็บ
    participant AC as AuthController
    participant AS as AuthService
    participant LAS as LoginAttemptService
    participant LAR as LoginAttemptRepository
    participant TU as TuApiClient (TU Login API)
    participant UR as UserRepository
    participant UC as UserController
    participant P as CurrentStudentProvider
    participant US as UserService
    participant DB as Database

    User->>UI: กรอก username, password แล้วกด "เข้าสู่ระบบ"
    UI->>AC: POST /api/auth/login (username, password)

    alt ไม่ส่ง username หรือ password (@NotBlank)
        AC-->>UI: 400 ProblemDetail พร้อม errors
    else ส่งมาครบ
        AC->>AS: authenticate(request)
        AS->>LAS: isLocked(username)
        LAS->>LAR: findById(username)
        LAR->>DB: SELECT login_attempt WHERE username = ?
        DB-->>LAR: LoginAttempt หรือไม่พบ
        LAR-->>LAS: Optional<LoginAttempt>
        LAS-->>AS: true / false

        alt บัญชีถูกระงับอยู่ (lockedUntil > now)
            AS->>LAS: getWaitTime(username)
            LAS-->>AS: retryAfterSeconds
            AS-->>AC: throw BusinessRuleException 429 ACCOUNT_LOCKED
            AC-->>UI: 429 ProblemDetail (code: ACCOUNT_LOCKED, retryAfterSeconds)
            UI-->>User: แสดงหน้าระงับชั่วคราว พร้อม Countdown Timer
        else บัญชีไม่ได้ถูกระงับ
            AS->>TU: verifyCredentials(username, password)

            alt username หรือ password ไม่ถูกต้อง
                TU-->>AS: รหัสไม่ถูกต้อง
                AS->>LAS: loginFailed(username)
                LAS->>LAR: findById(username) และ save(attempt)
                LAR->>DB: UPSERT login_attempt (failed_attempts + 1, ตั้ง locked_until ถ้าครบ 5)
                DB-->>LAR: สำเร็จ
                AS->>LAS: isLocked(username)
                LAS-->>AS: true (ครบ 5 ครั้ง) / false (ยังไม่ครบ 5 ครั้ง)

                alt ผิดครบ 5 ครั้งติดต่อกัน
                    AS->>LAS: getWaitTime(username)
                    LAS-->>AS: retryAfterSeconds (900)
                    AS-->>AC: throw BusinessRuleException 429 ACCOUNT_LOCKED
                    AC-->>UI: 429 ProblemDetail (code: ACCOUNT_LOCKED, retryAfterSeconds: 900)
                    UI-->>User: แสดงหน้าระงับการเข้าสู่ระบบ 15 นาที
                else ผิดยังไม่ครบ 5 ครั้ง (ครั้งที่ 1-4)
                    AS-->>AC: throw BusinessRuleException 401 INVALID_CREDENTIALS
                    AC-->>UI: 401 ProblemDetail (code: INVALID_CREDENTIALS)
                    UI-->>User: แจ้งเตือนชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง
                end
            else username และ password ถูกต้อง
                TU-->>AS: TuAuthDto (active, studentId, firstName, lastName, department, track)
                AS->>LAS: loginSucceeded(username)
                LAS->>LAR: deleteById(username) / reset failed_attempts = 0
                LAR->>DB: DELETE / UPDATE login_attempt
                DB-->>LAR: สำเร็จ

                AS->>AS: verifyTuStudentStatus(tuResponse)

                alt บัญชี มธ. ไม่ Active (TC1b)
                    AS-->>AC: throw BusinessRuleException 403 ACCOUNT_INACTIVE
                    AC-->>UI: 403 ProblemDetail (code: ACCOUNT_INACTIVE)
                    UI-->>User: แจ้งเตือนบัญชีไม่อยู่ในสถานะใช้งานปกติ
                else ไม่ใช่นักศึกษา CS ภาคปกติ (TC2)
                    AS-->>AC: throw BusinessRuleException 403 NOT_CS_STUDENT
                    AC-->>UI: 403 ProblemDetail (code: NOT_CS_STUDENT)
                    UI-->>User: แสดงหน้า Access Denied (เฉพาะนักศึกษา CS ภาคปกติ)
                else เป็นนักศึกษา CS ภาคปกติ และบัญชี Active (TC1a, TC3)
                    AS->>UR: findById(studentId)
                    UR->>DB: SELECT users WHERE student_id = ?
                    DB-->>UR: User หรือยังไม่มี
                    UR-->>AS: Optional<User>
                    AS->>UR: save(user) (Upsert ข้อมูลนักศึกษาและประวัติส่วนตัว)
                    UR->>DB: INSERT หรือ UPDATE users
                    DB-->>UR: สำเร็จ
                    AS->>AS: สร้าง JWT Token และ LoginResponse.of(token)
                    AS-->>AC: LoginResponse(token)
                    AC-->>UI: 200 OK { token }

                    UI->>UC: GET /api/users/me (Authorization: Bearer <token>)
                    UC->>P: currentStudentId()
                    P-->>UC: studentId
                    UC->>US: getProfile(studentId)
                    US->>UR: findById(studentId)
                    UR->>DB: SELECT users WHERE student_id = ?
                    DB-->>UR: User
                    UR-->>US: Optional<User>
                    US->>US: UserProfileResponse.from(user)
                    US-->>UC: UserProfileResponse
                    UC-->>UI: 200 OK { studentId, firstName, lastName }
                    UI-->>User: พาไปหน้าเมนูหลัก และแสดงชื่อ-นามสกุล + รหัสนักศึกษาที่ Navbar (TC7)
                end
            end
        end
    end
```

หมายเหตุ

- **`BusinessRuleException` ทุกกรณี** (`ACCOUNT_LOCKED`, `INVALID_CREDENTIALS`, `ACCOUNT_INACTIVE`, `NOT_CS_STUDENT`) ถูกจับโดย `GlobalExceptionHandler.handleBusinessRule` เดิม แปลงเป็น `ProblemDetail` (RFC 9457) พร้อม `code` และ `retryAfterSeconds` ตาม API Spec
- **การบันทึกจำนวนครั้งที่ผิดไม่ถูก rollback เมื่อโยน 401/429:** `LoginAttemptService.loginFailed` ใช้ `@Transactional(propagation = Propagation.REQUIRES_NEW)` (หรือตั้ง `noRollbackFor = BusinessRuleException.class`) เพื่อให้การเพิ่ม `failed_attempts` และ `locked_until` ถูก commit ลง DB แม้ `AuthService.authenticate` จะโยน `BusinessRuleException` ออกมา
- **ตรวจสถานะล็อกก่อนยิง TU API:** ถ้าบัญชีถูกล็อกอยู่แล้ว (`isLocked(username) == true`) จะโยน `429 ACCOUNT_LOCKED` ทันทีโดยไม่เรียก `TuApiClient` เพื่อลดภาระของระบบมหาวิทยาลัยและป้องกันการเดารหัสผ่านระหว่างถูกระงับ
- **การล้างจำนวนครั้งที่ผิด (`loginSucceeded`) ทำทันทีเมื่อรหัสผ่านถูก:** ก่อนตรวจ `verifyTuStudentStatus` เพราะผู้ใช้พิสูจน์รหัสผ่านผ่านแล้ว หากเป็นนักศึกษาต่างสาขา (`403 NOT_CS_STUDENT`) จึงไม่ถูกนับเป็นการเดารหัสผ่านผิด

## เอกสารที่เกี่ยวข้อง

- [Sequence Diagram](./US3-T06-Sequence-Diagram.md)
- [DAO Class Diagram](./US3-T06-DAO-Class-Diagram.md)
- [Extended API Class Diagram](./US3-T06-Extended-API-Class-Diagram.md)
- [ER Diagram (DB)](./US3-T06-ER-Diagram.md)
- [DTO & API Spec](../T05/US3-DTO-API-Spec.md) (US3-T05)
- [API Class Diagram](../T05/US3-API-Class-Diagram.md) (US3-T05)
- [DTO Class Diagram](../T05/US3-DTO-Class-Diagram.md) (US3-T05)
