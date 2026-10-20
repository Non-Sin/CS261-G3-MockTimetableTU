# US3-T08 ผลการทดสอบ Unit Test และ API (Postman)

Oct 19, 2026 · @Non

## สรุปผล

| ชุดทดสอบ | ผล |
| --- | --- |
| Unit test backend (`./mvnw clean test`) | **ผ่าน 175/175** (31 test class) หลัง merge `main` เป็นของ US3-T08 ใหม่ 65 test ใน 12 class · คำสั่งของ CI (ไม่รวม `BackendApplicationTests`) ผ่าน 174/174 |
| Postman (newman) 21 request | **ผ่าน 25/25 assertion** ไม่มี request ล้ม |
| Test case ของการ์ด US3 ที่ทดสอบผ่าน API | TC1a, TC1b, TC2, TC5, TC6, TC7 ผ่าน · TC3, TC4 ต้องใช้บัญชี มธ. จริง (ดู "การจับคู่กับ UAT") |

**User story:** US3 Login เข้าสู่ระบบด้วย user name และ password ของสำนักทะเบียน · branch `feature/US3-T08-develop-api-dto` (ต่อจาก `feature/US3-T09` DAO และ entity)

## สภาพแวดล้อม

| หัวข้อ | ค่า |
| --- | --- |
| วันที่รัน | 2026-10-19 |
| Java / Spring Boot / Spring Security | 21.0.10 / 4.1.1 / 7.1.1 |
| Unit test DB | DAO test ใช้ Testcontainers `mcr.microsoft.com/mssql/server:2025-latest` · `BackendApplicationTests` ใช้ SQL Server จาก `docker compose` |
| Postman | newman 6.2.3 (`npx -y newman`) · Node 24.21.0 |
| Backend ตอนรัน Postman | `./mvnw spring-boot:run -Dspring-boot.run.profiles=stub-tu` ที่ `http://localhost:8080` กับ DB ของ `docker compose` ตาราง `login_attempt` ว่าง |
| TU Login API | **stub** (`StubTuApiClient`) ค่า `type`, `tu_status`, `department`, `faculty` สะกดตาม response จริงของ TU API ส่วนรหัสนักศึกษาและชื่อเป็นค่าสมมติ |
| ค่า config | `JWT_SECRET` จาก `.env` (ยาว ≥ 32 ตัวอักษร) · `app.auth.max-attempts=5` · `app.auth.lock-seconds=900` · token อายุ 8 ชั่วโมง (ตอนรัน ภายหลังเปลี่ยนเป็น 3 ชั่วโมง ดูหมายเหตุใต้ตาราง) |

> **หมายเหตุ (2026-10-20, US4-T08):** อายุ token เปลี่ยนจาก 8 ชั่วโมง (`28800000`) เป็น 3 ชั่วโมง (`app.auth.jwt.expiration-ms=10800000`) และ stub เพิ่มบัญชี demo `6609000000` ผลในเอกสารนี้รันก่อนการเปลี่ยนแปลง ไม่กระทบผลการทดสอบเพราะไม่มี test ใดขึ้นกับอายุ token ดู [US4-T08 Test Result](../../US4/T08/US4-T08-Test-Result.md)

### บัญชีใน stub (รหัสผ่าน `Passw0rd!` ทุกบัญชี)

| username | ประเภท (ตาม US3-T16) | ข้อมูลที่ stub คืน | ใช้กับ TC |
| --- | --- | --- | --- |
| `6609000001` | A/E active, CS ภาคปกติ | `tu_status: ปกติ`, `department: ภาควิชาวิทยาการคอมพิวเตอร์`, ชื่อ "สมชาย ใจดี" | 1a, 5, 7 |
| `6609000002` | C ต่างสาขา | `department: ภาควิชาคณิตศาสตร์และสถิติ` | 2 |
| `6609000003` | B ไม่ active | `tu_status: พักการศึกษา` | 1b |
| `6609000004` | D สำรองทดสอบการล็อก | เหมือน `6609000001` | 6 |
| `staff01` | บุคลากร | `type: employee` | 2 |
| `6609650001` | B2 CS ภาคพิเศษ (หลักที่ 5–6 เป็น `65`) | เหมือน `6609000001` ต่างแค่รหัสนักศึกษา ชื่อ "สมปอง พิเศษ" | 2 |
| `6609000099` | — | โยน 503 เหมือน TU API ใช้งานไม่ได้ | — |
| `6609000000` | demo active, CS ภาคปกติ (เพิ่มใน US4-T08) | เหมือน `6609000001` ชื่อ "สมพร ตัวอย่าง" รหัสเดียวกับนักศึกษา demo ของ US1 | — (ไม่อยู่ใน collection นี้) |
| อื่น ๆ หรือรหัสผิด | — | `status: false`, `message: "Users or Password Invalid!"` เหมือน TU API ตอบ 400 | 5, 6 |

## Unit Test

คำสั่ง `cd backend && ./mvnw clean test` ต้องเปิด Docker และ `docker compose up -d sqlserver db-init` และมี `JWT_SECRET` ใน `.env` ก่อน (ไม่มีจะทำให้ `BackendApplicationTests` ล้ม) test ของ US3-T08 ทุกตัวไม่ใช้ DB (mock repository หรือใช้ `@WebMvcTest`)

| Test class | ชั้น | Tests | ผ่าน | เวลา (s) |
| --- | --- | --- | --- | --- |
| `auth.AuthControllerTest` | Controller (US3) | 8 | 8 | 4.362 |
| `user.UserControllerTest` | Controller (US3) | 2 | 2 | 0.297 |
| `config.SecurityConfigTest` | Security filter chain + JWT จริง (US3) | 6 | 6 | 0.536 |
| `auth.AuthServiceTest` | Service (US3) | 15 | 15 | 0.501 |
| `auth.LoginAttemptServiceTest` | Service (US3) | 8 | 8 | 0.103 |
| `auth.JwtServiceTest` | Service (US3) | 5 | 5 | 0.160 |
| `user.UserServiceTest` | Service (US3) | 2 | 2 | 0.006 |
| `auth.tu.HttpTuApiClientTest` | TU API client + `MockRestServiceServer` (US3) | 7 | 7 | 0.100 |
| `auth.tu.StubTuApiClientTest` | TU API stub (US3) | 4 | 4 | 0.007 |
| `common.student.SecurityContextStudentProviderTest` | common (US3) | 3 | 3 | 0.009 |
| `auth.dto.LoginRequestTest` | DTO / validation (US3) | 4 | 4 | 0.039 |
| `user.dto.UserProfileResponseTest` | DTO / JSON (US3) | 1 | 1 | 0.048 |
| `auth.LoginAttemptRepositoryTest` | DAO (US3-T12) | 6 | 6 | 16.85 * |
| `user.UserRepositoryTest` | DAO (US3-T12) | 4 | 4 | 0.138 |
| `course.CourseControllerTest` | Controller (US1) | 7 | 7 | 0.492 |
| `timetable.TimetableControllerTest` | Controller (US1) | 8 | 8 | 0.583 |
| `course.CourseServiceTest` | Service (US1) | 4 | 4 | 0.220 |
| `timetable.TimetableServiceTest` | Service (US1) | 12 | 12 | 0.168 |
| `course.dto.CourseResponseTest` | DTO / JSON (US1) | 3 | 3 | 0.206 |
| `timetable.dto.TimetableResponseTest` | DTO / JSON (US1) | 6 | 6 | 0.146 |
| `course.CourseRepositoryTest` | DAO (US1-T12) | 5 | 5 | 0.799 |
| `course.SectionRepositoryTest` | DAO (US1-T12) | 5 | 5 | 0.730 |
| `timetable.TimetableRepositoryTest` | DAO (US1-T12) | 4 | 4 | 0.477 |
| `timetable.TimetableEntryRepositoryTest` | DAO (US1-T12) | 6 | 6 | 0.695 |
| `timetable.TimetableDeleteControllerTest` | Controller (US2) | 8 | 8 | 0.468 |
| `timetable.TimetableDeleteServiceTest` | Service (US2) | 9 | 9 | 0.144 |
| `timetable.TimetableEntryDeleteRepositoryTest` | DAO (US2-T12) | 8 | 8 | 0.706 |
| `SchemaConstraintTest` | DAO | 6 | 6 | 0.773 |
| `common.exception.GlobalExceptionHandlerTest` | common | 2 | 2 | 0.032 |
| `item.ItemControllerTest` | ตัวอย่างเดิม | 6 | 6 | 0.492 |
| `BackendApplicationTests` | context | 1 | 1 | 2.554 |
| **รวม** | | **175** | **175** | |

\* รวมเวลา start SQL Server container ครั้งแรก

`DemoStudentProviderTest` ถูกลบพร้อม `DemoStudentProvider` เพราะ `SecurityContextStudentProvider` มาแทน และ controller test เดิมของ US1 (`CourseControllerTest`, `TimetableControllerTest`, `ItemControllerTest`) เพิ่ม `@AutoConfigureMockMvc(addFilters = false)` ให้ทดสอบเฉพาะ controller ส่วนการตรวจ token อยู่ใน `SecurityConfigTest`

หลัง merge `main` (US2-T08 #43) `TimetableDeleteControllerTest` ได้ 403 ทั้ง 8 test เพราะ Spring Security เปิด filter ใน `@WebMvcTest` (CSRF กับ DELETE) จึงเพิ่ม `@AutoConfigureMockMvc(addFilters = false)` แบบเดียวกัน

**สิ่งที่ unit test ของ US3 ครอบคลุม**

| กฎ / พฤติกรรม | Test |
| --- | --- |
| ล็อกอยู่ → 429 พร้อม `retryAfterSeconds` และ**ไม่เรียก TU API** (TC6) | `authenticate_locked_throws429WithoutCallingTuApi` |
| รหัสผิดครั้งที่ 1–4 → 401 และนับ attempt (TC4, TC5) | `authenticate_wrongPassword_countsAttemptAndThrows401`, `loginFailed_fourthTime_notLockedYet` |
| รหัสผิดครั้งที่ 5 → 429 900 วินาที ตรวจล็อกซ้ำหลัง `loginFailed` (TC6) | `authenticate_fifthWrongPassword_throws429With900Seconds`, `loginFailed_fifthTime_locksFor900Seconds` |
| ล็อกหมดเวลาแล้วนับใหม่ · ครบเวลาพอดีถือว่าปลดล็อก | `loginFailed_afterLockExpired_startsCountingAgain`, `isLocked_exactlyAtLockedUntil_unlocked` |
| รหัสถูกล้าง attempt ก่อนตรวจสาขา (ต่างสาขาไม่นับเป็นเดารหัส) | `authenticate_inactiveAccount_throws403AfterClearingAttempts`, `authenticate_otherDepartment_throws403NotCsStudent` |
| `tu_status` ไม่ใช่ "ปกติ" → 403 `ACCOUNT_INACTIVE` และตรวจก่อนสาขา (TC1b) | `authenticate_inactiveAccount_...`, `authenticate_inactiveOtherDepartment_reportsInactiveFirst` |
| สาขาอื่นหรือบุคลากร → 403 `NOT_CS_STUDENT` (TC2) | `authenticate_otherDepartment_...`, `authenticate_employee_throws403NotCsStudent` |
| CS ภาคพิเศษ (หลักที่ 5–6 ของรหัสเป็น `65`) → 403 `NOT_CS_STUDENT` ไม่บันทึกผู้ใช้ · `65` ที่ตำแหน่งอื่น, `staff01`, `null` ไม่ใช่ภาคพิเศษ (TC2) | `authenticate_specialTrackCsStudent_throws403NotCsStudent`, `isSpecialTrack_...` 2 test |
| upsert ผู้ใช้ใหม่/เดิม แยกชื่อจาก `displayname_th` นามสกุลหลายคำอยู่ครบ (TC1a, TC7) | `authenticate_csStudent_newUser_...`, `authenticate_existingUser_updatesProfile`, `authenticate_multiWordLastName_...` |
| TU API ตอบ 400 + `Users or Password Invalid!` = รหัสผิด | `verifyCredentials_wrongPassword400_returnsStatusFalse` |
| Application-Key ผิด (ทั้ง 401 และ 400), 5xx, HTML, timeout → 503 ไม่นับ attempt | `HttpTuApiClientTest` 5 test, `authenticate_tuApiUnavailable_doesNotCountAttempt` |
| ส่ง header `Application-Key` และ body `UserName`/`PassWord` ตาม TU API | `verifyCredentials_success_sendsKeyAndBodyAndParsesResponse` |
| JWT: อ่านกลับได้, secret อื่น, หมดอายุ, ลายเซ็นไม่ตรง, secret สั้น | `JwtServiceTest` |
| login ไม่ต้องมี token · `/api/users/me` และ `/api/timetable` ไม่มี/ผิด token → 401 ProblemDetail · studentId จาก token ถึง controller (TC7) | `SecurityConfigTest` |
| body ไม่ครบ → 400 `errors` · 401/403/429/503 เป็น ProblemDetail พร้อม `code` | `AuthControllerTest` |
| `toString` ของ `LoginRequest` ไม่มีรหัสผ่าน | `toString_hidesPassword` |

## Postman

ไฟล์ในโฟลเดอร์นี้:

- [`US3-T08.postman_collection.json`](./US3-T08.postman_collection.json) collection v2.1 import เข้า Postman ได้ ตัวแปร `baseUrl` ค่าเริ่มต้น `http://localhost:8080` และ username ของบัญชี stub เป็นตัวแปรของ collection ต้องรันทั้ง collection ตามลำดับ เพราะ request 02–05 ใช้ token ที่ request 01 เก็บไว้
- [`US3-T08-newman-cli.txt`](./US3-T08-newman-cli.txt) ผลรันจาก newman

คำสั่งที่ใช้รัน

```bash
# terminal 1: backend ใช้ TU API stub
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=stub-tu

# terminal 2
cd .doc/US3/T08
npx -y newman run US3-T08.postman_collection.json
```

| # | Request | Test case | ผลที่คาดหวัง | ผล |
| --- | --- | --- | --- | --- |
| 00 | GET `/api/users/me` ไม่มี token | — | 401 `application/problem+json` detail "กรุณาเข้าสู่ระบบก่อนใช้งาน" | PASS |
| 01 | POST login `6609000001` | TC1a | 200 body มีแค่ `token` เป็น JWT 3 ส่วน | PASS |
| 02 | GET `/api/users/me` ด้วย token | TC7 | 200 `{studentId: 6609000001, firstName: สมชาย, lastName: ใจดี}` | PASS |
| 03 | GET `/api/timetable` ด้วย token | — | 200 API ของ US1 ใช้ studentId จาก token | PASS |
| 04 | GET `/api/timetable` ไม่มี token | — | 401 | PASS |
| 05 | GET `/api/users/me` token ถูกแก้ลายเซ็น | — | 401 | PASS |
| 06 | POST login รหัสผิด | TC5 | 401 `INVALID_CREDENTIALS` ไม่มี `retryAfterSeconds` | PASS |
| 07 | POST login username ที่ไม่มีอยู่ | TC5 | 401 `INVALID_CREDENTIALS` (ตอบเหมือนรหัสผิด) | PASS |
| 08 | POST login `6609000001` รหัสถูกอีกครั้ง | TC1a | 200 ล้าง attempt ของ request 06 และ upsert ผู้ใช้เดิม | PASS |
| 09 | POST login `6609000003` | TC1b | 403 `ACCOUNT_INACTIVE` | PASS |
| 10 | POST login `6609000002` | TC2 | 403 `NOT_CS_STUDENT` detail มี "วิทยาการคอมพิวเตอร์" และ "ภาคปกติ" | PASS |
| 11 | POST login `staff01` | TC2 | 403 `NOT_CS_STUDENT` | PASS |
| 11a | POST login `6609650001` (CS ภาคพิเศษ) | TC2 | 403 `NOT_CS_STUDENT` ไม่มี token detail มี "วิทยาการคอมพิวเตอร์" และ "ภาคปกติ" · ตรวจตาราง `users` หลังรันแล้วไม่มีแถวของ `6609650001` | PASS |
| 12–15 | POST login `6609000004` รหัสผิดครั้งที่ 1–4 | TC6 | 401 `INVALID_CREDENTIALS` | PASS |
| 16 | POST login `6609000004` รหัสผิดครั้งที่ 5 | TC6 | 429 `ACCOUNT_LOCKED` `retryAfterSeconds` 899–900 detail มี "15 นาที" | PASS |
| 17 | POST login `6609000004` **รหัสถูก**ระหว่างล็อก | TC6 | ยัง 429 `retryAfterSeconds` 1–900 | PASS |
| 18 | POST login ไม่ส่ง password | — | 400 `errors.password` | PASS |
| 19 | POST login `6609000099` | — | 503 `TU_API_UNAVAILABLE` | PASS |

เวลาตอบเฉลี่ย 58 ms (สูงสุด 302 ms คือ login ครั้งแรกหลัง start) รวม 2.9 วินาที

**ก่อนรันซ้ำ** ต้องล้างตาราง `login_attempt` เพราะยังไม่มี API ปลดล็อก ถ้าไม่ล้างภายใน 15 นาที request 12–16 จะได้ 429 และ request 07 นับ attempt ของ `0000000000` สะสม (รันซ้ำครบ 5 ครั้งจะได้ 429)

```bash
docker exec sqlserver bash -c '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -d appdb -Q "DELETE FROM login_attempt"'
```

(Git Bash ให้ใส่ `MSYS_NO_PATHCONV=1` นำหน้า) หลังรันครั้งนี้ล้าง `login_attempt` แล้ว ในตาราง `users` เหลือแถวของบัญชีสมมติ `6609000001` (ไม่กระทบการรันซ้ำ เพราะ login ทำ upsert)

## การจับคู่กับ UAT (US3-T16)

| UAT | ทดสอบใน T08 | หมายเหตุ |
| --- | --- | --- |
| TC1a | request 01, 08 · `AuthServiceTest` | บัญชีสมมติใน stub |
| TC1b | request 09 · `authenticate_inactiveAccount_...` | `tu_status` ไม่ใช่ "ปกติ" |
| TC2 | request 10, 11, 11a · `authenticate_otherDepartment_...`, `authenticate_employee_...`, `authenticate_specialTrackCsStudent_...` | ภาคพิเศษตรวจจากรหัสนักศึกษา (ดู "ข้อที่ต้องตัดสิน") |
| TC3, TC4 | — | ระบบไม่เก็บรหัสผ่าน ส่งต่อให้ TU API ทุกครั้ง ผลจึงขึ้นกับ TU API ต้องทดสอบด้วยบัญชีจริงตอน UAT (US3-T20) |
| TC5 | request 06, 07 | |
| TC6 | request 12–17 · `LoginAttemptServiceTest`, `authenticate_locked_...`, `authenticate_fifthWrongPassword_...` | |
| TC7 | request 02 · `SecurityConfigTest.me_withValidToken_usesStudentIdFromToken` | API ส่งชื่อ-นามสกุลและรหัส ส่วนเมนูหลักเป็นงาน UI |

## ข้อที่ต้องตัดสิน

**ตรวจ "ภาคพิเศษ" จากรหัสนักศึกษา (ทางแก้ชั่วคราว)** response จริงของ TU Login API มี `type`, `tu_status`, `department`, `faculty` แต่ไม่มี field บอกภาค (ปกติ/พิเศษ) ทีมตกลงให้ดูหลักที่ 5–6 ของรหัสนักศึกษา ถ้าเป็น `65` (เช่น `680965xxxx`) เป็นภาคพิเศษ ได้ 403 `NOT_CS_STUDENT` เหมือนต่างสาขา (ใช้ code เดิมตาม T13 IT-09 และ T11 จึงไม่ต้องแก้ UI) นอกนั้นเป็นภาคปกติ และเก็บ `track = "ภาคปกติ"` เพราะภาคพิเศษไม่ถึงขั้นบันทึก ข้อเสียคือขึ้นกับรูปแบบรหัสที่มหาวิทยาลัยไม่ได้ประกาศเป็นทางการ ถ้ารูปแบบรหัสเปลี่ยนหรือ TU API มีข้อมูลภาคให้ แก้ได้ที่ `AuthService.isSpecialTrack` ที่เดียว

**เพิ่ม error `TU_API_UNAVAILABLE` (503)** ไม่มีใน Spec เดิม เพิ่มเพื่อไม่ให้ Application-Key ผิดหรือ TU API ล่มถูกนับเป็นรหัสผิด (ไม่อย่างนั้นผู้ใช้ทุกคนจะถูกล็อก) แก้ [DTO & API Spec](../T05/US3-DTO-API-Spec.md) และ `AuthErrorCode` แล้ว UI (US3-T07) ต้องมีข้อความสำหรับ code นี้

## การเปลี่ยนแปลงจากเอกสารออกแบบ

แก้ใน [DTO & API Spec](../T05/US3-DTO-API-Spec.md), [API Class Diagram](../T05/US3-API-Class-Diagram.md), [Extended API Class Diagram](../T06/US3-T06-Extended-API-Class-Diagram.md) และ [Sequence Diagram](../T06/US3-T06-Sequence-Diagram.md) แล้ว

| เรื่อง | ออกแบบไว้ | ทำจริง | เหตุผล |
| --- | --- | --- | --- |
| `TuAuthDto` | `active`, `studentId`, `firstName`, `lastName`, `department`, `track` | field ตาม response จริง (`status`, `tu_status`, `displayname_th`, `type`, ...) | TU API ไม่มี field ตามที่ออกแบบ |
| `TuApiClient` | class | interface + `HttpTuApiClient` / `StubTuApiClient` (profile `stub-tu`) | ทดสอบ Postman โดยไม่ต้องมีบัญชีและ key จริง |
| `isLocked` / `getWaitTime` | ไม่ระบุ transaction | `REQUIRES_NEW` (readOnly) | ถ้าอ่านใน transaction ของ `AuthService` จะได้ entity ที่ cache ไว้ รหัสผิดครั้งที่ 5 จะได้ 401 แทน 429 (request 16 ยืนยันแล้ว) |
| `JwtAuthenticationFilter` | field ของ `SecurityConfig` | `SecurityConfig` สร้างเอง ไม่เป็น bean | กัน filter ถูกลงทะเบียนซ้ำ และ `@WebMvcTest` เดิมไม่พัง |
| ลำดับใน filter | `extractStudentId` แล้ว `isTokenValid` | `isTokenValid` ก่อน | token ผิดทำให้ `extractStudentId` โยน exception |
| path ที่ต้อง login | `/api/users/me`, `/api/timetables/**` | ทุก `/api/**` ยกเว้น `POST /api/auth/login` | ตาม "บังคับ Authenticate ทุก Request อื่น" ใน T06 |
| JWT | ไม่ระบุไลบรารี | HS256 ผ่าน `spring-security-oauth2-jose` (Nimbus) | Spring Boot จัดการเวอร์ชันให้ และเข้ากับ Jackson 3 |

## ข้อจำกัด

- Postman ใช้ TU API stub ยังไม่ได้รันกับ TU Login API จริงทั้ง collection (การตีความ response ทดสอบใน `HttpTuApiClientTest` ด้วย JSON รูปแบบจริง) ตอน UAT ให้รัน backend โดยไม่ใส่ profile และมี `TU_API_APPLICATION_KEY` ใน `.env`
- **frontend ของ US1 ยังไม่ส่ง token** หลัง merge หน้าตารางเรียนจะได้ 401 จนกว่า UI login ของ US3 จะเสร็จ
- `compose.yaml` ส่ง `JWT_SECRET`, `TU_API_APPLICATION_KEY` และ `SPRING_PROFILES_ACTIVE` จาก `.env` เข้า container `backend` แล้ว (ไม่มี `JWT_SECRET` compose หยุดพร้อมข้อความ) ตรวจด้วย `docker compose config` แต่ยังไม่ได้ build และรัน image ของ backend ผ่าน compose
- token เป็น stateless ยังไม่มี logout ฝั่ง server (ลบ token ที่ UI) และ token อยู่ได้ 8 ชั่วโมงแม้บัญชี มธ. ถูกระงับระหว่างนั้น (ภายหลังลดเหลือ 3 ชั่วโมงใน US4-T08 · logout ของ US4 ก็เป็นแบบ stateless ไม่ invalidate token ฝั่ง server)
- [US3-T13 Integration Test Cases](../T13/US3-T13-integration-test-cases-ui-api.md) ยังอ้าง `TuAuthDto` แบบเดิม ต้องแก้ตามเอกสารนี้ (case IT-09 "CS แต่ไม่ใช่ภาคปกติ" ตรวจได้แล้วด้วยบัญชี `6609650001`)

**เอกสารที่เกี่ยวข้อง:** [DTO & API Spec](../T05/US3-DTO-API-Spec.md) · [Extended API Class Diagram](../T06/US3-T06-Extended-API-Class-Diagram.md) · [Sequence Diagram](../T06/US3-T06-Sequence-Diagram.md) · [US3-T12 DAO Unit Test Result](../T12/US3-T12-DAO-Unit-Test-Result.md) · [US3-T16 UAT](../US3-T16.md)
