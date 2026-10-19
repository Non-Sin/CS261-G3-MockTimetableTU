# US4-T08 ผลการทดสอบ Unit Test และ API (Postman)

Oct 20, 2026 · @Non

## สรุปผล

| ชุดทดสอบ | ผล |
| --- | --- |
| Unit test backend (`./mvnw clean test`) | **ผ่าน 182/182** (31 test class) เป็นของ US4-T08 ใหม่ 7 test ใน 4 class |
| Postman (newman) 10 request | **ผ่าน 11/11 assertion** ไม่มี request ล้ม |
| Integration test case ของ US4-T13 ที่ทดสอบผ่าน API | IT-01, IT-02, IT-06, IT-07, IT-08 ผ่าน · ส่วนที่เหลือเป็นพฤติกรรมฝั่ง UI (ดู "การจับคู่กับ US4-T13") |

**User story:** US4 ออกจากระบบ (Log-out) · branch `feature/US4-T08-develop-api-dto` (ต่อจาก `feature/US3-T08-develop-api-dto` เพราะ US4 ใช้ Authentication ของ US3)

## สภาพแวดล้อม

| หัวข้อ | ค่า |
| --- | --- |
| วันที่รัน | 2026-10-20 |
| Java / Spring Boot | 21.0.10 / 4.1.1 |
| Unit test DB | DAO test ใช้ Testcontainers `mcr.microsoft.com/mssql/server:2025-latest` · `BackendApplicationTests` ใช้ SQL Server จาก `docker compose` · test ของ US4-T08 ไม่ใช้ DB |
| Postman | newman 6.2.3 (`npx -y newman`) · Node 24.21.0 |
| Backend ตอนรัน Postman | `./mvnw spring-boot:run -Dspring-boot.run.profiles=stub-tu` ที่ `http://localhost:8080` กับ DB ของ `docker compose` |
| TU Login API | **stub** (`StubTuApiClient`) ใช้บัญชี `6609000001` / `Passw0rd!` เพื่อเอา token มาทดสอบ Logout · เพิ่มบัญชี demo `6609000000` (ดู "สิ่งที่พัฒนา") (ดูบัญชีทั้งหมดใน [US3-T08 Test Result](../../US3/T08/US3-T08-Test-Result.md#บัญชีใน-stub-รหัสผ่าน-passw0rd-ทุกบัญชี)) |
| ค่า config | `JWT_SECRET` จาก `.env` · token อายุ 3 ชั่วโมง (`app.auth.jwt.expiration-ms=10800000`) |

## สิ่งที่พัฒนา

| ไฟล์ | การเปลี่ยนแปลง |
| --- | --- |
| `auth/AuthController.java` | เพิ่ม `logout()` = `POST /api/auth/logout` ตอบ `204 No Content` ไม่มี Request/Response Body |
| `auth/AuthService.java` | เพิ่ม `logout()` ว่างไว้ (stateless) ไม่ invalidate token ไม่เรียก DAO และ `@Transactional(propagation = NOT_SUPPORTED)` เพื่อไม่เปิด transaction |
| DTO | ไม่มี DTO ใหม่ ตาม [DTO Class Diagram](../T05/US4-DTO-Class-Diagram.md) |
| `application.yaml` | อายุ token จาก 8 ชั่วโมง (`28800000`) เป็น **3 ชั่วโมง** (`10800000`) ตรวจแล้ว token ที่ได้จาก login มี `exp - iat` = 10800 วินาที · แก้ใน [US3 DTO & API Spec](../../US3/T05/US3-DTO-API-Spec.md) และ [US3 Extended API Class Diagram](../../US3/T06/US3-T06-Extended-API-Class-Diagram.md) แล้ว |
| `auth/tu/StubTuApiClient.java` | เพิ่มบัญชี demo `6609000000` (active, CS ภาคปกติ, "สมพร ตัวอย่าง") รหัสเดียวกับนักศึกษา demo ของ US1 จึง login แล้วเห็นตารางเรียนที่ใช้ทดสอบเดิมได้ ตรวจแล้ว login ได้ token, `/api/users/me` ตอบ `{studentId: 6609000000, firstName: สมพร, lastName: ตัวอย่าง}` และ `/api/timetable` ตอบ 200 |
| `config/SecurityConfig.java` | ไม่ต้องแก้ ของ US3-T08 `permitAll` เฉพาะ `POST /api/auth/login` อยู่แล้ว `/logout` จึงต้องมี token (ตรงกับ US4-T06 สมมติฐานข้อ 3) |

## Unit Test

คำสั่ง `cd backend && ./mvnw clean test` ต้องเปิด Docker และ `docker compose up -d sqlserver db-init` และมี `JWT_SECRET` ใน `.env` ก่อน

> ถ้าเคย build บน `main` แล้วสลับมา branch นี้ ต้องใช้ `clean` ไม่อย่างนั้น `DemoStudentProvider.class` ที่ค้างใน `target/` (US3-T08 ลบ source ไปแล้ว) ทำให้ `BackendApplicationTests` ล้มด้วย `Could not resolve placeholder 'app.timetable.demo-student-id'`

| Test class | ชั้น | Tests | ผ่าน | เวลา (s) |
| --- | --- | --- | --- | --- |
| `auth.AuthControllerTest` | Controller (US3 + **US4 1 test**) | 9 | 9 | 4.667 |
| `auth.AuthServiceTest` | Service (US3 + **US4 1 test**) | 16 | 16 | 0.574 |
| `config.SecurityConfigTest` | Security filter chain + JWT จริง (US3 + **US4 4 test**) | 10 | 10 | 0.550 |
| `auth.JwtServiceTest` | Service (US3) | 5 | 5 | 0.143 |
| `auth.LoginAttemptServiceTest` | Service (US3) | 8 | 8 | 0.096 |
| `auth.tu.HttpTuApiClientTest` | TU API client (US3) | 7 | 7 | 0.095 |
| `auth.tu.StubTuApiClientTest` | TU API stub (US3 + **บัญชี demo 1 test**) | 5 | 5 | 0.009 |
| `auth.dto.LoginRequestTest` | DTO / validation (US3) | 4 | 4 | 0.042 |
| `user.UserControllerTest` | Controller (US3) | 2 | 2 | 0.295 |
| `user.UserServiceTest` | Service (US3) | 2 | 2 | 0.006 |
| `user.dto.UserProfileResponseTest` | DTO / JSON (US3) | 1 | 1 | 0.046 |
| `common.student.SecurityContextStudentProviderTest` | common (US3) | 3 | 3 | 0.008 |
| `auth.LoginAttemptRepositoryTest` | DAO (US3-T12) | 6 | 6 | 17.35 * |
| `user.UserRepositoryTest` | DAO (US3-T12) | 4 | 4 | 0.144 |
| `course.CourseControllerTest` | Controller (US1) | 7 | 7 | 0.499 |
| `timetable.TimetableControllerTest` | Controller (US1) | 8 | 8 | 0.567 |
| `course.CourseServiceTest` | Service (US1) | 4 | 4 | 0.206 |
| `timetable.TimetableServiceTest` | Service (US1) | 12 | 12 | 0.147 |
| `course.dto.CourseResponseTest` | DTO / JSON (US1) | 3 | 3 | 0.209 |
| `timetable.dto.TimetableResponseTest` | DTO / JSON (US1) | 6 | 6 | 0.127 |
| `course.CourseRepositoryTest` | DAO (US1-T12) | 5 | 5 | 0.754 |
| `course.SectionRepositoryTest` | DAO (US1-T12) | 5 | 5 | 0.762 |
| `timetable.TimetableRepositoryTest` | DAO (US1-T12) | 4 | 4 | 0.429 |
| `timetable.TimetableEntryRepositoryTest` | DAO (US1-T12) | 6 | 6 | 0.608 |
| `timetable.TimetableDeleteControllerTest` | Controller (US2) | 8 | 8 | 0.414 |
| `timetable.TimetableDeleteServiceTest` | Service (US2) | 9 | 9 | 0.132 |
| `timetable.TimetableEntryDeleteRepositoryTest` | DAO (US2-T12) | 8 | 8 | 0.609 |
| `SchemaConstraintTest` | DAO | 6 | 6 | 0.738 |
| `common.exception.GlobalExceptionHandlerTest` | common | 2 | 2 | 0.031 |
| `item.ItemControllerTest` | ตัวอย่างเดิม | 6 | 6 | 0.438 |
| `BackendApplicationTests` | context | 1 | 1 | 1.956 |
| **รวม** | | **182** | **182** | |

\* รวมเวลา start SQL Server container ครั้งแรก

**สิ่งที่ unit test ของ US4 ครอบคลุม**

| กฎ / พฤติกรรม | Test |
| --- | --- |
| Logout ตอบ `204` body ว่าง และเรียก `AuthService.logout()` 1 ครั้ง | `AuthControllerTest.logout_returns204WithoutBody` |
| `logout()` ไม่ invalidate token ไม่เรียก DAO และไม่เรียก TU API (stateless ตาม US4-T06) | `AuthServiceTest.logout_doesNotTouchAnyDependency` (`verifyNoInteractions` ทุก dependency) |
| token ถูกต้อง → `204` ผ่าน filter chain จริง | `SecurityConfigTest.logout_withValidToken_returns204` |
| ไม่มี token → `401` `application/problem+json` และไม่ถึง controller | `SecurityConfigTest.logout_withoutToken_returns401ProblemDetail` |
| token ไม่ถูกต้อง (secret อื่น / ไม่ใช่ JWT) → `401` และไม่ถึง controller | `SecurityConfigTest.logout_withInvalidToken_returns401` |
| token เดิมหลัง Logout ยังเรียก `/api/users/me` ได้ (IT-08) | `SecurityConfigTest.sameToken_afterLogout_stillWorks` |
| บัญชี demo `6609000000` ใน stub เป็นนักศึกษา CS ภาคปกติ active | `StubTuApiClientTest.demoStudent_correctPassword_isActiveCsStudent` |
| token หมดอายุ → ไม่ผ่าน `isTokenValid()` | `JwtServiceTest.expiredToken_invalid` (ของ US3 Logout ใช้ filter ทางเดียวกัน) |

ไม่ได้เขียนกรณี token หมดอายุใน `SecurityConfigTest` เพราะ `JwtService` ออก token ที่ `exp` ก่อน `iat` ไม่ได้ (`expiresAt must be after issuedAt`) และ constructor ที่รับ `Clock` เป็น package-private ของ `auth`

## Postman

ไฟล์ในโฟลเดอร์นี้:

- [`US4-T08.postman_collection.json`](./US4-T08.postman_collection.json) collection v2.1 import เข้า Postman ได้ ตัวแปร `baseUrl` ค่าเริ่มต้น `http://localhost:8080` ต้องรันทั้ง collection ตามลำดับ เพราะ request 02–07 และ 09 ใช้ token ที่ request 01 เก็บไว้
- [`US4-T08-newman-cli.txt`](./US4-T08-newman-cli.txt) ผลรันจาก newman

คำสั่งที่ใช้รัน

```bash
# terminal 1: backend ใช้ TU API stub
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=stub-tu

# terminal 2
cd .doc/US4/T08
npx -y newman run US4-T08.postman_collection.json
```

| # | Request | Test case | ผลที่คาดหวัง | ผล |
| --- | --- | --- | --- | --- |
| 00 | POST `/api/auth/logout` ไม่มี token | US4-T05 | 401 `application/problem+json` `title: Unauthorized` detail "กรุณาเข้าสู่ระบบก่อนใช้งาน" ไม่มี `instance` | PASS |
| 01 | POST login `6609000001` | (เตรียม token) | 200 ได้ JWT เก็บเป็น `token` | PASS |
| 02 | GET `/api/users/me` ด้วย token | IT-06 | 200 `studentId` = `6609000001` | PASS |
| 03 | POST `/api/auth/logout` ด้วย token | IT-01, IT-02 | 204 ไม่มี body | PASS |
| 04 | GET `/api/users/me` ไม่ส่ง token (Client ล้างแล้ว) | IT-07 | 401 ProblemDetail | PASS |
| 05 | GET `/api/users/me` ด้วย token เดิมหลัง Logout | IT-08 | 200 (stateless JWT ไม่มี denylist) | PASS |
| 06 | POST `/api/auth/logout` ซ้ำด้วย token เดิม | — | 204 backend ไม่เก็บสถานะ | PASS |
| 07 | POST `/api/auth/logout` token ถูกแก้ลายเซ็น | — | 401 | PASS |
| 08 | POST `/api/auth/logout` `Bearer not-a-jwt` | — | 401 | PASS |
| 09 | POST `/api/auth/logout` ใช้ scheme `Basic` | — | 401 | PASS |

เวลาตอบเฉลี่ย 16 ms (สูงสุด 57 ms คือ login) รวม 0.97 วินาที (รันหลังเปลี่ยนอายุ token เป็น 3 ชั่วโมง)

รันซ้ำได้ทันทีโดยไม่ต้องล้างข้อมูล เพราะ Logout ไม่เขียน DB และ login ด้วยรหัสถูกไม่สร้างแถวใน `login_attempt` (ตาราง `users` มีแถวของบัญชีสมมติ `6609000001` ซึ่ง login ทำ upsert)

## การจับคู่กับ US4-T13 และ US4-T16

| Test case | ทดสอบใน T08 | หมายเหตุ |
| --- | --- | --- |
| IT-01 ส่ง `POST /api/auth/logout` พร้อม Bearer ไม่มี body | request 03 | การที่ UI ส่ง request 1 ครั้งเป็นงาน UI |
| IT-02 `204 No Content` ไม่มี body | request 03 · `logout_returns204WithoutBody`, `logout_withValidToken_returns204` | |
| IT-03, IT-04, IT-05, IT-09 | — | `clearSession()`, กลับหน้า Login และ `authApi.logout()` → `apiFetch()` เป็นงาน frontend |
| IT-06 API ใช้ได้ก่อน Logout | request 02 | |
| IT-07 ไม่มี token หลัง Logout → 401 | request 04 | |
| IT-08 token เดิมหลัง Logout → 200 | request 05 · `sameToken_afterLogout_stillWorks` | ข้อจำกัดของ stateless JWT ตามการออกแบบ ถ้าเพิ่ม denylist ต้องเปลี่ยนเป็น 401 |
| IT-10, IT-11 (500 / network error) | — | mock ที่ฝั่ง UI |
| IT-12 Session หมดอายุ → 401 | `JwtServiceTest.expiredToken_invalid` | ทดสอบผ่าน Postman ต้องรอ token หมดอายุ 3 ชั่วโมง |
| US4-T16 TC1–3 | — | UAT ผ่านหน้าเว็บ (Logout, กดย้อนกลับ, inactivity timeout ฝั่ง Client) |

## การเปลี่ยนแปลงจากเอกสารออกแบบ

| เรื่อง | ออกแบบไว้ | ทำจริง | เหตุผล |
| --- | --- | --- | --- |
| ตัวอย่าง Body ของ `401` | มี `"instance": "/api/auth/logout"` | ไม่มี `instance` · `detail` = "กรุณาเข้าสู่ระบบก่อนใช้งาน" | Body มาจาก `AuthenticationEntryPoint` ของ US3 ซึ่งใช้ร่วมกับทุก `/api/**` ทีมเลือกแก้ Spec แทนแก้โค้ดของ US3 แก้ใน [DTO & API Spec](../T05/US4-DTO%20%26%20API%20Spec.md) แล้ว |
| แก้ `SecurityConfig` (T06 สมมติฐานข้อ 3) | ต้องจำกัด white-list เหลือ `POST /api/auth/login` | ไม่ต้องแก้ | US3-T08 ทำไว้แล้ว ยืนยันด้วย request 00 และ `logout_withoutToken_returns401ProblemDetail` |

## ข้อจำกัด

- branch นี้ต่อจาก `feature/US3-T08-develop-api-dto` ที่ยังไม่ merge เข้า `main` ต้อง merge US3-T08 ก่อน (หรือ rebase หลัง US3 merge) และบน origin ของ US3-T08 มี commit merge `main` ที่ใหม่กว่าจุดที่แตก branch มา
- Logout เป็น stateless token ที่ถูกคัดลอกออกไปก่อน Logout ยังใช้ได้จนหมดอายุ (3 ชั่วโมง) ตามที่ออกแบบใน US4-T05/T06 ถ้าต้องการให้ใช้ไม่ได้ทันทีต้องเพิ่ม denylist ซึ่งอยู่นอกขอบเขต US4
- Postman ใช้ TU API stub เพื่อเอา token เท่านั้น Logout ไม่เรียก TU API จึงไม่ต่างกับตอนใช้ TU API จริง

**เอกสารที่เกี่ยวข้อง:** [DTO & API Spec](../T05/US4-DTO%20%26%20API%20Spec.md) · [API Class Diagram](../T05/US4-API-Class-Diagram.md) · [Extended API Class Diagram](../T06/US4-T06-Extended-API-Class-Diagram.md) · [Sequence Diagram](../T06/US4-T06-Sequence-Diagram.md) · [US4-T13 Integration Test](../US4-T13%20Design%20Integration%20Test%20ระหว่าง%20UI%20กับ%20API.md) · [US4-T16 UAT](../US4-T16-uat-test-cases.md) · [US3-T08 Test Result](../../US3/T08/US3-T08-Test-Result.md)
