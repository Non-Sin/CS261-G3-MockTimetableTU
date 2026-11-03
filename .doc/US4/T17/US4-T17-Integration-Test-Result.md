# US4-T17 ผลการรัน Integration Test ระหว่าง UI กับ API: ออกจากระบบ (Logout)

Nov 1, 2026 · @Non

## สรุปผล

| ผล | จำนวน | Test case |
| --- | --- | --- |
| **Pass** | 12 | IT-01 ถึง IT-12 |
| **Fail** | 0 | — |
| ไม่ได้รัน | 0 | — |

**User story:** US4 ออกจากระบบ · test case จาก [US4-T13](../US4-T13%20Design%20Integration%20Test%20ระหว่าง%20UI%20กับ%20API.md) · branch `test/US4-T17-run-it-ui-api`

UI กับ API ทำงานร่วมกันได้ถูกต้องในทุกกรณีของการ์ด ได้แก่
- logout สำเร็จ
- พฤติกรรมของ API ก่อนและหลัง logout
- logout ไม่สำเร็จเพราะ server error หรือ network error
- session หมดอายุ

แต่ละ case ตรวจทั้ง request ที่ UI ส่ง, response จาก API, สถานะ session ฝั่ง client และหน้าจอที่ UI แสดง

> **ต้องให้ทีมยืนยัน:** IT-10 และ IT-11 ตัดสินผลตาม UI Spec ใน [US4-T06 Sequence Diagram](../T06/US4-T06-Sequence-Diagram.md) หัวข้อหมายเหตุ ซึ่งกำหนดว่า "ล้าง Session ฝั่ง Client เสมอ" แม้เรียก API ไม่สำเร็จ ผลที่ได้คือ UI ไม่แสดงกล่อง error แต่ล้าง session แล้วพากลับหน้า Login แต่ข้อความใน T13 เขียนว่า "UI แสดง Error ตาม UI Spec" ซึ่งอ่านได้สองแบบ ดู[ข้อสังเกต](#ข้อสังเกต)

## สภาพแวดล้อม

| หัวข้อ | ค่า |
| --- | --- |
| วันที่รัน | 2026-11-01 |
| โค้ด | `main` commit `240db7d` (ไม่ได้แก้โค้ดของแอป) |
| ระบบ | รันทั้งระบบด้วย `docker compose up -d --build` (SQL Server + backend + frontend) แล้วเปิด http://localhost:3000 <br>• frontend เป็น production build จึงไม่ใช้โหมด demo (`demoApi.ts`) <br>• frontend เรียก `/api/*` ผ่าน rewrite ของ Next.js ไปที่ backend จริง |
| Backend | Spring Boot · Java 21.0.13 · profile `stub-tu` (`StubTuApiClient`) · JWT HS256 อายุ 3 ชั่วโมง (`app.auth.jwt.expiration-ms=10800000`) |
| บัญชีทดสอบ | `6609000001` / `Passw0rd!` (Somchai Jaidee, บัญชี A ของ stub เดียวกับ US3-T13) |
| Browser | Microsoft Edge 156.0.4314.58 (headless) ควบคุมด้วย `playwright-core` 1.49.1 ขนาดจอ 1366 × 900 |
| สคริปต์ | [`run-it-ui-api.mjs`](run-it-ui-api.mjs) ทำตามขั้นตอนของแต่ละ IT และเก็บ request/response ของ `/api/*` ทุกรายการ <br>• ภาพหน้าจออยู่ใน [`evidence/`](evidence/) <br>• ผลดิบอยู่ใน [`evidence/results.json`](evidence/results.json) <br>• ไม่บันทึกค่า token ลงไฟล์ |

### วิธีรันซ้ำ

```bash
# 1) ระบบ: .env มี SPRING_PROFILES_ACTIVE=stub-tu
docker compose up -d --build

# 2) ติดตั้ง playwright-core ในโฟลเดอร์ชั่วคราว (ใช้ Edge ที่มีในเครื่อง ไม่ต้องโหลด browser)
#    แล้วชี้ PLAYWRIGHT_CORE ไปที่โฟลเดอร์นั้น
npm i playwright-core@1.49.1
export PLAYWRIGHT_CORE=<โฟลเดอร์ชั่วคราว>/node_modules/playwright-core

# 3) JWT_SECRET ต้องตรงกับ .env (ใช้สร้าง token ที่หมดอายุแล้วสำหรับ IT-12)
export JWT_SECRET=$(grep ^JWT_SECRET= .env | cut -d= -f2-)
node .doc/US4/T17/run-it-ui-api.mjs .doc/US4/T17/evidence
```

### วิธีสร้างสถานการณ์

| IT | วิธี |
| --- | --- |
| IT-01 ถึง IT-05 | login ผ่านหน้าเว็บ → กดชื่อผู้ใช้บน Navbar → กด "ออกจากระบบ" ใน dropdown แล้วดักดู request/response ของ `/api/*` |
| IT-06 | ใช้ `GET /api/users/me` ที่หน้าแรกเรียกเองหลัง login |
| IT-07 | หลัง logout ใช้ `fetch` ในหน้าเว็บแบบเดียวกับแอป คือแนบ `Authorization` เฉพาะเมื่อมี token ใน session |
| IT-08 | หลัง logout ใช้ token เดิมเรียก API โดยตรง (`context.request`) |
| IT-09 | หลัง logout เปิด `/` แล้วกดปุ่ม back ของ browser |
| IT-10 | ใช้ `page.route` ให้ `POST /api/auth/logout` ตอบ `500` เป็น ProblemDetail |
| IT-11 | ใช้ `page.route(...).abort("internetdisconnected")` ทำให้ request ล้มเหลวโดยไม่มี response |
| IT-12 | สร้าง JWT ที่หมดอายุไปแล้ว 1 ชั่วโมง (เซ็นด้วย secret และรูปแบบเดียวกับ `JwtService`) แล้วใส่แทน token ใน `sessionStorage` จากนั้น reload หน้าแรก วิธีนี้จำลองว่าใช้งานต่อหลัง token หมดอายุ โดยไม่ต้องรอ 3 ชั่วโมง |

## ผลแต่ละ Test Case

ผลจริงเขียนตามลำดับ **ส่ง → ตอบ → Session → UI** ตามหัวข้อ 1 ของ T13

### 3. Logout สำเร็จ

| IT | ผล | ผลจริง | หลักฐาน |
| --- | --- | --- | --- |
| IT-01 | **Pass** | กด "ออกจากระบบ" → ส่ง `POST /api/auth/logout` **1 ครั้ง** · `Authorization: Bearer <token ที่ได้จาก login>` · ไม่มี request body | [it01-account-menu.png](evidence/it01-account-menu.png) |
| IT-02 | **Pass** | API ตอบ `204` · response body ว่าง | [it04-after-logout.png](evidence/it04-after-logout.png) |
| IT-03 | **Pass** | หลังได้ `204`: <br>• `sessionStorage` และ `localStorage` ไม่มี `mocktimetable.auth.token` <br>• ไม่มี `mocktimetable.auth.expired` <br>แปลว่าเรียก `clearSession()` ไม่ใช่ `expireSession()` | [it04-after-logout.png](evidence/it04-after-logout.png) |
| IT-04 | **Pass** | กลับไป `/login` · หน้าจอไม่มีรหัสนักศึกษาหรือชื่อผู้ใช้เดิม · ไม่แสดงข้อความ "เซสชันของคุณหมดอายุแล้ว" | [it04-after-logout.png](evidence/it04-after-logout.png) |
| IT-05 | **Pass** | request ไปที่ `http://localhost:3000/api/auth/logout` คือ same-origin `/api/*` ที่ `apiFetch()` สร้าง และ header `Authorization` มาจาก `authApi.logout()` · เส้นทางในโค้ดคือ `UserNavbar` → `useLogout()` → `authApi.logout()` → `apiFetch()` ดู[หมายเหตุ](#หมายเหตุ) | [it01-account-menu.png](evidence/it01-account-menu.png) |

### 4. หลัง Logout

| IT | ผล | ผลจริง | หลักฐาน |
| --- | --- | --- | --- |
| IT-06 | **Pass** | หลัง login แอปส่ง `GET /api/users/me` พร้อม `Bearer <token>` → `200 {"studentId":"6609000001","firstName":"Somchai","lastName":"Jaidee","firstNameTh":"สมชาย","lastNameTh":"ใจดี"}` · Navbar แสดง "Somchai Jaidee 6609000001" | [it06-before-logout.png](evidence/it06-before-logout.png) |
| IT-07 | **Pass** | หลัง logout เรียก `GET /api/users/me` แบบที่แอปเรียก: ไม่มี token จึง **ไม่ส่ง** `Authorization` → `401 {"type":"about:blank","title":"Unauthorized","status":401,"detail":"กรุณาเข้าสู่ระบบก่อนใช้งาน"}` | `results.json` |
| IT-08 | **Pass** | ใช้ token เดิมเรียก `GET /api/users/me` โดยตรง → `200` ได้ข้อมูลของ `6609000001` เป็นไปตามข้อจำกัดของ stateless JWT ที่ T13 ระบุไว้ (ไม่ใช่ข้อบกพร่อง) | `results.json` |
| IT-09 | **Pass** | หลัง logout: <br>• เปิด `/` → ถูกพากลับไป `/login` <br>• กด back → ยังอยู่ `/login` <br>• ทั้งสองหน้าไม่แสดงข้อมูลผู้ใช้เดิม <br>• แอปไม่เรียก `users/me` เลย (0 ครั้ง) เพราะ `useCurrentUser` พบว่าไม่มี token จึงพากลับหน้า login ก่อนเรียก API <br>ส่วนที่ T13 ระบุว่า "ได้ `401` จาก API" ยืนยันได้จาก IT-07 | [it09-open-home-after-logout.png](evidence/it09-open-home-after-logout.png), [it09-back-after-logout.png](evidence/it09-back-after-logout.png) |

### 5. Error

| IT | ผล | ผลจริง | หลักฐาน |
| --- | --- | --- | --- |
| IT-10 | **Pass** \* | mock ให้ API ตอบ `500` (ส่ง request 1 ครั้ง) แล้ว UI: <br>• ล้าง token <br>• กลับ `/login` และไม่แสดงข้อมูลผู้ใช้เดิม <br>• ปุ่ม**ไม่ค้าง**ที่ "กำลังออกจากระบบ…" <br>• **ไม่แสดงกล่อง error** <br>• ไม่มี unhandled error ใน console | [it10-logout-500.png](evidence/it10-logout-500.png) |
| IT-11 | **Pass** \* | request ล้มเหลว (`net::ERR_INTERNET_DISCONNECTED`, ไม่มี HTTP status) แล้ว UI ทำแบบเดียวกับ IT-10 คือ ล้าง token กลับ `/login` ปุ่มไม่ค้าง ไม่แสดงกล่อง error และไม่มี unhandled error · ไม่มีข้อความแจ้งว่า "logout สำเร็จ" | [it11-logout-network-error.png](evidence/it11-logout-network-error.png) |

\* ตัดสินตาม UI Spec ของ US4-T06 ดู[ข้อสังเกต](#ข้อสังเกต)

### 6. Session หมดอายุ

| IT | ผล | ผลจริง | หลักฐาน |
| --- | --- | --- | --- |
| IT-12 | **Pass** | ตรวจด้วย token ที่หมดอายุแล้ว: <br>• เรียก API โดยตรง → `401` (ยืนยันว่า backend ปฏิเสธจริง) <br>• ใช้ในแอป: หน้าแรกส่ง `GET /api/users/me` พร้อม token นั้น → `401` <br>หลังได้ `401` แอปเรียก `expireSession()` แล้ว: <br>• ล้าง token <br>• กลับ `/login` <br>• แสดงข้อความ "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่อีกครั้ง" <br>• ไม่แสดงข้อมูลผู้ใช้เดิม | [it12-session-expired.png](evidence/it12-session-expired.png) |

## ความครอบคลุมตาม T13 หัวข้อ 8

| Requirement | Test case | ผล |
| --- | --- | --- |
| กด Logout จาก UI · เรียก `POST /api/auth/logout` · ส่ง Authorization · ไม่มี Request Body | IT-01, IT-02 | Pass |
| ล้าง Session | IT-03 | Pass |
| กลับหน้า Login | IT-04 | Pass |
| API ใช้งานได้ก่อน Logout | IT-06 | Pass |
| API ถูกปฏิเสธหลัง Logout ผ่านแอป (`401`) | IT-07 | Pass |
| Token เดิมหลัง Logout (`200` ตามข้อจำกัด stateless) | IT-08 | Pass |
| ไม่แสดงข้อมูลผู้ใช้เดิม | IT-09 | Pass |
| Logout Error / Network Error | IT-10, IT-11 | Pass \* |
| Session หมดอายุ | IT-12 | Pass |

## ข้อสังเกต

1. **IT-10 และ IT-11 อ่าน T13 ได้สองแบบ** <br>T13 คาดว่า "UI แสดง Error ตาม UI Spec และไม่ค้างอยู่ในสถานะกำลัง Logout" ส่วน UI Spec ใน US4-T06 กำหนดว่า "ล้าง Session ฝั่ง Client เสมอ ทั้งกรณี `204`, `401`, เรียก API ไม่สำเร็จ (เช่น network error)" และโค้ดก็ทำตามนั้น คือ `useLogout()` กลืน error แล้วล้าง session และพาไป `/login` <br>• ถ้าทีมยึด UI Spec ทั้งสอง case **Pass** (ตามที่บันทึกไว้) และควรแก้ข้อความใน T13 ให้ตรง เช่น "UI ล้าง Session และกลับหน้า Login โดยไม่ค้างอยู่ในสถานะกำลัง Logout" <br>• ถ้าทีมต้องการให้แสดงกล่อง error ด้วย ทั้งสอง case จะเป็น **Fail** และต้องแก้ทั้ง UI Spec และโค้ด
2. **IT-08 เป็นข้อจำกัดตามการออกแบบ** <br>token ที่ถูกขโมยไปยังใช้ได้จนครบ 3 ชั่วโมงแม้ผู้ใช้กด logout แล้ว ถ้าภายหลังเพิ่ม token denylist ต้องเปลี่ยน expected ของ IT-08 เป็น `401` และแก้ `SecurityConfigTest` ที่อ้าง IT-08 ไว้ด้วย
3. **IT-09 ไม่ได้รับ `401` จาก API ตามที่ T13 เขียน** <br>เพราะแอปพากลับหน้า login ทันทีเมื่อไม่มี token โดยไม่เรียก API เลย ผลต่อผู้ใช้เหมือนกันและลดการเรียก API ที่ไม่จำเป็น จึงถือว่า Pass

## หมายเหตุ

- **IT-05 ตรวจจาก network และโค้ด:** การทดสอบแบบ black-box บน browser มองไม่เห็นชื่อฟังก์ชันที่ถูกเรียก จึงยืนยันจากรูปแบบ request ที่ได้ (same-origin `/api/auth/logout`, มี `Authorization`, ส่ง 1 ครั้ง) ประกอบกับเส้นทางในโค้ด `frontend/features/auth/hooks/useLogout.ts` → `frontend/features/auth/api.ts` (`authApi.logout`) → `frontend/lib/api.ts` (`apiFetch`) ส่วนการเรียกฟังก์ชันจริงครอบคลุมโดย unit test ใน `frontend/features/auth/Logout.test.tsx` และ `api.test.ts` (US4-T07)
- IT-01, IT-02, IT-06, IT-07 และ IT-08 เคยผ่านในระดับ API ด้วย Postman ใน [US4-T08](../T08/US4-T08-Test-Result.md) รอบนี้ผลตรงกันเมื่อเรียกผ่าน UI

**เอกสารที่เกี่ยวข้อง:** [US4-T13 Integration Test](../US4-T13%20Design%20Integration%20Test%20ระหว่าง%20UI%20กับ%20API.md) · [Sequence Diagram](../T06/US4-T06-Sequence-Diagram.md) · [DTO & API Spec](../T05/US4-DTO%20%26%20API%20Spec.md) · [US4-T07 Unit Test UI](../T07/US4-T07-Unit-Test-UI-Result.md) · [US4-T08 Test Result](../T08/US4-T08-Test-Result.md) · [US3-T17](../../US3/T17/US3-T17-Integration-Test-Result.md) (อยู่บน branch `test/US3-T17-run-it-ui-api` ลิงก์จะใช้ได้เมื่อ merge แล้ว)
