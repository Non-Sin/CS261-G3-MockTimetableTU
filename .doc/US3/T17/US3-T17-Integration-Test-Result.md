# US3-T17 ผลการรัน Integration Test ระหว่าง UI กับ API: เข้าสู่ระบบ (Login)

Nov 1, 2026 · @Non

## สรุปผล

| ผล | จำนวน | Test case |
| --- | --- | --- |
| **Pass** | 27 | IT-01 ถึง IT-27 |
| **Fail** | 0 | — |
| ไม่ได้รัน | 0 | — |

**User story:** US3 เข้าสู่ระบบด้วย user name และ password เดียวกับสำนักทะเบียน · test case จาก [US3-T13](../T13/US3-T13-integration-test-cases-ui-api.md) · branch `test/US3-T17-run-it-ui-api`

UI กับ API ทำงานด้วยกันได้ถูกต้องครบทุกกรณีของการ์ด ได้แก่ login สำเร็จ, รหัสผิด, ไม่ใช่ CS, บัญชีไม่ Active และถูกระงับ ทั้งสิ่งที่ UI ส่ง, สิ่งที่ API ตอบ (status และ `code`) และหน้าจอที่ UI แสดง

## สภาพแวดล้อม

| หัวข้อ | ค่า |
| --- | --- |
| วันที่รัน | 2026-11-01 |
| โค้ด | `main` commit `240db7d` + บัญชี C2 และ F ที่เพิ่มใน `StubTuApiClient` (branch นี้) |
| ระบบ | `docker compose up -d --build` (SQL Server + backend + frontend) เปิด http://localhost:3000 · frontend เป็น production build จึงไม่ใช้โหมด mock (`.env*` ไม่ถูก copy เข้า image) และเรียก `/api/*` ผ่าน rewrite ของ Next.js ไปที่ backend |
| Backend | Spring Boot · Java 21.0.13 · profile `stub-tu` (`StubTuApiClient`) · `app.auth.max-attempts=5` · `app.auth.lock-seconds=900` (IT-16 ใช้ 30 ดูด้านล่าง) |
| TU Login API | stub ตามบัญชีใน US3-T13 หัวข้อ 3 |
| Browser | Microsoft Edge 156.0.4314.58 (headless) ควบคุมด้วย `playwright-core` 1.49.1 ขนาดจอ 1366 × 900 |
| สคริปต์ | [`run-it-ui-api.mjs`](run-it-ui-api.mjs) ทำตามขั้นตอนของแต่ละ IT เก็บ request/response ของ `/api/*` ทุกรายการและภาพหน้าจอใน [`evidence/`](evidence/) ผลดิบอยู่ใน `evidence/results-main.json` และ `evidence/results-unlock.json` · [`run-navbar-dialog.mjs`](run-navbar-dialog.mjs) เก็บภาพ dropdown ของ Navbar (IT-02) |
| ข้อมูลเริ่มต้น | ล้างตาราง `login_attempt` ก่อนรันและก่อน case ที่นับจำนวนครั้งที่ผิด (IT-05, IT-07, IT-14, IT-17, IT-27, IT-16) |

### วิธีรันซ้ำ

```bash
# 1) ระบบ: .env มี SPRING_PROFILES_ACTIVE=stub-tu
docker compose up -d --build

# 2) ติดตั้ง playwright-core ในโฟลเดอร์ชั่วคราว (ใช้ Edge ที่มีในเครื่อง ไม่ต้องโหลด browser)
npm i playwright-core@1.49.1
node run-it-ui-api.mjs main   .doc/US3/T17/evidence

# 3) IT-16: เปิด backend ด้วยเวลาระงับ 30 วินาที แล้วรัน phase unlock
#    compose.locktest.yaml:  services: { backend: { environment: { APP_AUTH_LOCKSECONDS: "30" } } }
docker compose -f compose.yaml -f compose.locktest.yaml up -d backend
node run-it-ui-api.mjs unlock .doc/US3/T17/evidence
docker compose up -d backend          # กลับเป็น 900 วินาที
```

สคริปต์ล้างตาราง `login_attempt` ผ่าน `docker exec sqlserver sqlcmd` และ IT-25 จะ `docker stop backend` ชั่วคราวแล้วเปิดกลับ

## ผลแต่ละ Test Case

ผลจริงเขียนตามลำดับ **ส่ง → ตอบ → UI** ตามหัวข้อ 5 ของ T13

### 5.1 login สำเร็จ

| IT | ผล | ผลจริง | หลักฐาน |
| --- | --- | --- | --- |
| IT-01 | **Pass** | ส่ง `POST /api/auth/login` `{username: "6609000001", password: ตรงกับที่กรอก}` → `200` token (JWT ยาว 207 ตัว) · ไม่มี error พาไป `/` เมนู "จัดตารางเรียนจำลอง" มี `aria-current="page"` | [it01-02-after-login.png](evidence/it01-02-after-login.png) |
| IT-02 | **Pass** | ส่ง `GET /api/users/me` พร้อม `Authorization: Bearer <token จาก IT-01>` → `200 {"studentId":"6609000001","firstName":"Somchai","lastName":"Jaidee","firstNameTh":"สมชาย","lastNameTh":"ใจดี"}` · Navbar มุมขวาแสดง "Somchai Jaidee" และ "6609000001" · ชื่อไทยแสดงใน dropdown เมื่อกดที่ Navbar ("สมชาย ใจดี / SOMCHAI JAIDEE") ตามข้อสรุป T13 หัวข้อ 4.1 ข้อ 6 | [it01-02-after-login.png](evidence/it01-02-after-login.png), [it02-navbar-dialog.png](evidence/it02-navbar-dialog.png) |
| IT-03 | **Pass** | บัญชี F (`6609000008`) รหัสใหม่ `NewPassw0rd!` → `200` พาไป `/` | [it03-new-password.png](evidence/it03-new-password.png) |
| IT-04 | **Pass** | บัญชี F รหัสเดิม `Passw0rd!` → `401 INVALID_CREDENTIALS` · UI แสดงกล่อง "เข้าสู่ระบบไม่สำเร็จ ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง…" · ไม่มี token | [it04-old-password.png](evidence/it04-old-password.png) |

### 5.2 รหัสผิด

| IT | ผล | ผลจริง | หลักฐาน |
| --- | --- | --- | --- |
| IT-05 | **Pass** | → `401` `code: "INVALID_CREDENTIALS"` (ProblemDetail มี `title`, `status`, `detail`, `instance` ดูข้อสังเกตข้อ 2) · UI แสดงกล่อง "เข้าสู่ระบบไม่สำเร็จ / ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง" ช่องกรอกขอบแดง 2/2 ช่อง ช่องรหัสผ่านไม่ถูกล้าง ไม่มี token ไม่เรียก `users/me` | [it05-wrong-password.png](evidence/it05-wrong-password.png) |
| IT-06 | **Pass** | Username `6609999999` (ไม่มีใน stub) → `401 INVALID_CREDENTIALS` `detail` "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง" เหมือน IT-05 ทุกตัวอักษร · UI เหมือน IT-05 | [it06-unknown-user.png](evidence/it06-unknown-user.png) |
| IT-07 | **Pass** | บัญชี A ผิด 4 ครั้ง → `401, 401, 401, 401` · กล่องรหัสผิดแสดงทุกครั้ง · `failed_attempts` ใน DB = 4 | [it07-four-wrong.png](evidence/it07-four-wrong.png) |

### 5.3 ไม่ใช่ CS ภาคปกติ และบัญชีไม่ Active

| IT | ผล | ผลจริง | หลักฐาน |
| --- | --- | --- | --- |
| IT-08 | **Pass** | บัญชี B → `403 NOT_CS_STUDENT` · UI หน้า "ไม่สามารถเข้าใช้งานระบบได้" ข้อความ "…เฉพาะนักศึกษาสาขาวิทยาการคอมพิวเตอร์ ภาคปกติ…" · ไม่มี token ไม่เรียก `users/me` | [it08-not-cs.png](evidence/it08-not-cs.png) |
| IT-09 | **Pass** | บัญชี B2 (`6609650001`) → `403 NOT_CS_STUDENT` · UI หน้าเดียวกับ IT-08 | [it09-not-cs.png](evidence/it09-not-cs.png) |
| IT-10 | **Pass** | กด "กลับสู่หน้าเข้าสู่ระบบ" → ฟอร์ม login ช่องว่างทั้งสองช่อง · login บัญชี A ต่อ → `200` พาไป `/` | [it10-back-to-login.png](evidence/it10-back-to-login.png) |
| IT-11 | **Pass** | บัญชี C → `403` `code: "ACCOUNT_INACTIVE"` · ไม่มี token ใน response | [it11-inactive.png](evidence/it11-inactive.png) |
| IT-12 | **Pass** | UI แสดงกล่องรหัสผิดเหมือน IT-05 ช่องกรอกขอบแดง 2/2 · ไม่แสดงหน้า Access Denied · ไม่มี token ไม่เรียก `users/me` | [it11-inactive.png](evidence/it11-inactive.png) |
| IT-13 | **Pass** | บัญชี C2 (`6609000007` ไม่ Active และไม่ใช่ CS) → `403 ACCOUNT_INACTIVE` · UI เหมือน IT-12 | [it13-inactive.png](evidence/it13-inactive.png) |

### 5.4 ถูกระงับ

| IT | ผล | ผลจริง | หลักฐาน |
| --- | --- | --- | --- |
| IT-14 | **Pass** | บัญชี D ผิด 5 ครั้ง → `401, 401, 401, 401, 429` · ครั้งที่ 5 `code: "ACCOUNT_LOCKED"` `retryAfterSeconds: 900` · UI หน้า "ระงับการเข้าสู่ระบบชั่วคราว" ตัวนับ 14:59 | [it14-locked.png](evidence/it14-locked.png) |
| IT-15 | **Pass** | ผ่านไป ~7 วินาที ใส่รหัสถูก → `429 ACCOUNT_LOCKED` `retryAfterSeconds: 893` · ตัวนับ 14:52 | [it15-locked-correct-password.png](evidence/it15-locked-correct-password.png) |
| IT-16 | **Pass** | backend `APP_AUTH_LOCKSECONDS=30` · ผิดครั้งที่ 5 → `429` `retryAfterSeconds: 30` ตัวนับเริ่ม 00:29 · นับถึง 0 → UI "ปลดการระงับการเข้าสู่ระบบแล้ว" พร้อมฟอร์ม · login รหัสถูก → `200` พาไป `/` | [it16-1-locked-short.png](evidence/it16-1-locked-short.png), [it16-2-unlocked.png](evidence/it16-2-unlocked.png), [it16-3-login-after-unlock.png](evidence/it16-3-login-after-unlock.png) |
| IT-17 | **Pass** | บัญชี D ผิด 4 ครั้ง → `401` ×4 · รหัสถูก → `200` (`failed_attempts` = 0) · ผิดอีก 4 ครั้ง → `401` ×4 (ไม่ใช่ `429`) | [it17-reset-count.png](evidence/it17-reset-count.png) |
| IT-18 | **Pass** | ระหว่าง D ถูกระงับ login A2 → `200` พาไป `/` | [it18-other-user.png](evidence/it18-other-user.png) |
| IT-27 | **Pass** | บัญชี C ผิด 4 ครั้ง → `401` ×4 · รหัสถูก → `403 ACCOUNT_INACTIVE` (`failed_attempts` = 0) · ผิดอีก 4 ครั้ง → `401` ×4 (ไม่ใช่ `429`) | [it27-reset-count.png](evidence/it27-reset-count.png) |

### 5.5 ข้อมูลที่ส่งและรับ

| IT | ผล | ผลจริง | หลักฐาน |
| --- | --- | --- | --- |
| IT-19 | **Pass** | ตรวจ login request ที่หน้าเว็บส่งทั้งหมด 48 รายการในรอบนี้: ทุกรายการเป็น `POST` `Content-Type: application/json` body มีแค่ `username`, `password` และ URL ไม่มี query string | `evidence/results-main.json` |
| IT-20 | **Pass** | ยิงตรง `username` ว่าง → `400` `errors: {"username": "must not be blank"}` · ยิงบัญชี E (`6609000099` ถ้ายิง TU จะได้ `503`) ด้วย `password` ว่าง → `400` แสดงว่าไม่ยิง TU · `failed_attempts` ของ E = 0 · ผ่าน UI (แก้ body ระหว่างทางให้ `username` ว่าง) → `400` UI แสดง "เข้าสู่ระบบไม่สำเร็จ / เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" ไม่ crash | [it20-blank-username.png](evidence/it20-blank-username.png) |
| IT-21 | **Pass** | บัญชี E → `503 TU_API_UNAVAILABLE` · UI "ไม่สามารถเชื่อมต่อระบบของมหาวิทยาลัยได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง" (ไม่ใช่ข้อความรหัสผิด) · `failed_attempts` ของ E = 0 | [it21-tu-unavailable.png](evidence/it21-tu-unavailable.png) |
| IT-22 | **Pass** | ใช้ response จริงจาก backend แต่แทนค่า `detail` ด้วยข้อความอื่นก่อนถึงหน้าเว็บ (ไม่ได้แก้โค้ด backend) · `INVALID_CREDENTIALS`, `ACCOUNT_INACTIVE` → กล่องรหัสผิด · `NOT_CS_STUDENT` → หน้า Access Denied · `ACCOUNT_LOCKED` → หน้าระงับ · UI ตัดสินจาก `code` ทุกกรณี | [invalid](evidence/it22-invalid_credentials.png), [inactive](evidence/it22-account_inactive.png), [not CS](evidence/it22-not_cs_student.png), [locked](evidence/it22-account_locked.png) |

### 5.6 หลัง login: users/me และเครือข่าย

| IT | ผล | ผลจริง | หลักฐาน |
| --- | --- | --- | --- |
| IT-23 | **Pass** | ไม่มี token → ไม่เรียก `users/me` พากลับ `/login` · token ปลอม (`not.a.jwt`) → `users/me` `401` ล้าง token กลับ `/login` แสดง banner "เซสชันของคุณหมดอายุแล้ว…" · token จริงที่ถูกแก้ลายเซ็น → เหมือน token ปลอม | [none](evidence/it23-none.png), [fake](evidence/it23-fake.png), [tamper](evidence/it23-tamper.png) |
| IT-24 | **Pass** | login A → Navbar "Somchai Jaidee 6609000001" · logout ผ่านเมนูใน Navbar แล้ว login A2 → Navbar "Somporn Tuayang 6609000000" ไม่ปนกับ A | [it24-switch-account.png](evidence/it24-switch-account.png) |
| IT-25 | **Pass** | `docker stop backend` แล้วกด login → rewrite ของ Next.js ตอบ `500` · UI "เข้าสู่ระบบไม่สำเร็จ / เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" ปุ่มกดได้ ไม่ค้าง | [it25-backend-down.png](evidence/it25-backend-down.png) |
| IT-26 | **Pass** | preflight `OPTIONS /api/auth/login` จาก `Origin: http://localhost:3000` → `200` `Access-Control-Allow-Origin: http://localhost:3000` · หน้าเว็บใน Docker เรียกผ่าน rewrite (same origin) ทุก request · console ไม่มี CORS error | `evidence/results-main.json` |

## ข้อสังเกต

1. **IT-02 ชื่อใน Navbar:** รอบแรกตัดสินว่า Fail เพราะ T13 คาดหวังชื่อไทย "สมชาย ใจดี" ตาม UI Prototype ทีมตัดสินใจให้ Navbar แสดงชื่ออังกฤษตาม hotfix #64 (`0bebae3`) จึงแก้ผลที่คาดหวังใน T13 (หัวข้อ 4.1 ข้อ 6) และเปลี่ยนผลเป็น Pass โดยไม่ต้องรันใหม่ เพราะผลจริงตรงกับผลที่คาดหวังใหม่อยู่แล้ว
2. **ProblemDetail ไม่มี `type`:** error response ของ login มี `title`, `status`, `detail`, `instance`, `code` แต่ไม่มี `type` ตามที่ T13 หัวข้อ 2 ระบุ ไม่กระทบ UI เพราะ UI ใช้ `code` แต่ควรตรวจว่า API Spec ต้องการ `type` หรือไม่
3. **IT-06, IT-21, IT-23 ถึง IT-26 เป็น "ข้อเสนอ" ใน T13** (ยังไม่ได้ยืนยันกับทีม หัวข้อ 4.3) ผลด้านบนเทียบกับข้อเสนอนั้น พฤติกรรมจริงที่ได้: TU ล่มตอบ `503 TU_API_UNAVAILABLE` และไม่นับเป็นครั้งที่ผิด · token ผิดได้ `401` และหน้าเว็บแสดง banner เซสชันหมดอายุ · token เก็บใน `sessionStorage`
4. **IT-20 และ IT-22 ผ่าน UI ด้วยการแก้ข้อมูลระหว่างทาง** IT-20 แก้ body ของ request ให้ `username` ว่าง (เพราะฟอร์มกันไว้ก่อน) IT-22 แก้ `detail` ของ response จริง เพื่อไม่ต้องแก้โค้ด backend ทุก request ยังไปถึง backend จริง
5. **IT-26 ใน Docker หน้าเว็บไม่ได้ข้าม origin** เพราะเรียกผ่าน rewrite ของ Next.js จึงตรวจ CORS ด้วย preflight ตรงไปที่ backend แทน ถ้ารัน `npm run dev` พร้อม `NEXT_PUBLIC_API_URL=http://localhost:8080` (ค่าใน `frontend/.env.local`) หน้าเว็บจะเรียกข้าม origin ตามที่ preflight นี้อนุญาต
6. **ข้อความบนหน้าระงับ** เขียนตายตัวว่า "ระงับการใช้งานชั่วคราวเป็นเวลา 15 นาที" แม้ `lock-seconds` จะตั้งเป็นค่าอื่น (เห็นใน IT-16) ไม่กระทบผลเพราะตัวนับใช้ `retryAfterSeconds`

## เอกสารที่เกี่ยวข้อง

- [US3-T13 — Integration Test Cases ระหว่าง UI กับ API](../T13/US3-T13-integration-test-cases-ui-api.md)
- [US3 — DTO & API Spec](../T05/US3-DTO-API-Spec.md)
- [US3 — Sequence Diagram (T06)](../T06/US3-T06-Sequence-Diagram.md)
- [US3-T08 — ผลการทดสอบ Unit Test และ API (Postman)](../T08/US3-T08-Test-Result.md)
