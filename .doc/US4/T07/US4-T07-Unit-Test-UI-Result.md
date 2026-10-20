# US4-T07 ผลการทดสอบ Unit Test ส่วน UI

Oct 20, 2026

## สรุปผล

รัน Unit Test ฝั่ง Frontend ของ **US4 (ออกจากระบบ / Log-out)** ตามเอกสารออกแบบ [US4-T11 Design Unit Test Cases ส่วน UI](../US4-T11-design-unit-test-ui.md), [US4-T05 DTO & API Spec](../T05/US4-DTO%20%26%20API%20Spec.md) และ [US4-T06 Sequence Diagram & Extended API Class Diagram](../T06/US4-T06-Sequence-Diagram.md) ด้วย Vitest และ React Testing Library **ผ่านครบ 10/10 กรณีใหม่ของ US4** (และเมื่อรันรวมทั้งโปรเจกต์ `npm test` **ผ่านครบ 101/101 กรณี** จาก 10 ไฟล์ทดสอบ)

| ชุดทดสอบ | ไฟล์ | จำนวน Test | ผล |
| --- | --- | :---: | :---: |
| Unit Test ของ UI ออกจากระบบ, ล้างข้อมูลฝั่งหน้าเว็บ, กันปุ่มย้อนกลับ, จับเวลาไม่ใช้งาน และ Banner เซสชันหมดอายุ | `frontend/features/auth/Logout.test.tsx` | 8 | **ผ่าน 8/8** |
| Unit Test ของ `authApi` (Login + Logout `204` / `401`) | `frontend/features/auth/api.test.ts` | 5 (US4: 2) | **ผ่าน 5/5** |
| ชุดทดสอบเดิมของโปรเจกต์ (US1, US2, US3, US5) | `LoginPage.test.tsx`, `MainMenuPage.test.tsx`, `Timetable.test.tsx`, `AddedCoursesList.test.tsx`, `TimetableDelete.test.tsx`, `ExportPngButton.test.tsx`, `TimetableExport.test.tsx`, `exportPng.test.ts` | 88 | **ผ่าน 88/88** |
| **รวมทั้งหมด** | **10 ไฟล์ทดสอบ** | **101** | **ผ่าน 101/101** |

**User Story:** US4 ออกจากระบบ (Log-out) · **Branch:** `feature/US4-T07-develop-ui`

---

## สภาพแวดล้อมการทดสอบ

| หัวข้อ | ค่า |
| --- | --- |
| วันที่รัน | 2026-10-20 |
| คำสั่งที่ใช้รัน | `cd frontend && npm test` (`vitest run`) |
| ตรวจสอบคุณภาพโค้ด | `npm run lint` (ESLint ผ่าน 0 warning / 0 error) และ `npx tsc --noEmit` (TypeScript ผ่าน) |
| Test Runner & Libraries | Vitest 3.2.7 · `@testing-library/react` · `@testing-library/user-event` · `jsdom` |
| ข้อมูลจำลอง (Fixture) | บัญชีนักศึกษาทดสอบ `6809610000` (`Alysa Liu`) และ JWT Token จำลอง |

---

## สิ่งที่พัฒนาในส่วน UI (US4-T07)

1. **เมนูโปรไฟล์และปุ่มออกจากระบบ (`frontend/features/auth/components/UserNavbar.tsx`, `frontend/features/auth/hooks/useLogout.ts` & `frontend/app/page.tsx`)**
   - แสดง Avatar วงกลมสีพีชพร้อมตัวอักษรย่อชื่อ-นามสกุล (เช่น `AL`) ชื่อนักศึกษา และรหัสนักศึกษาที่ Navbar มุมขวาบน (ทั้งในหน้าเมนูหลัก `/dashboard` และหน้าจัดตารางเรียนจำลอง `/`)
   - เมื่อคลิกที่โปรไฟล์มุมขวาบน จะเปิดกล่อง Popover แสดง Avatar ขนาดใหญ่ รหัสนักศึกษา ชื่อ-นามสกุล และปุ่ม `ออกจากระบบ` พร้อมไอคอน `logout` ตาม UI Prototype
   - เมื่อคลิกปุ่ม `ออกจากระบบ` จะเรียก `authApi.logout()` (`POST /api/auth/logout` พร้อม Header `Authorization: Bearer <token>` และไม่มี Request Body)
   - ปิดใช้งานปุ่ม (`disabled`) และแสดงข้อความ `กำลังออกจากระบบ…` ระหว่างรอผลลัพธ์ เพื่อป้องกันการกดซ้ำ
2. **การล้างข้อมูลฝั่งหน้าเว็บ (`frontend/features/auth/session.ts`, `frontend/features/auth/api.ts`, `frontend/lib/api.ts`)**
   - พัฒนา `SessionProvider` (`clearSession()`, `expireSession()`, `isAuthenticated()`, `isSessionExpired()`, `subscribe()`)
   - เมื่อออกจากระบบ (`204` หรือ `401`) จะลบ Token ทั้งใน `sessionStorage` และ `localStorage` พร้อมแจ้ง Subscribers (`useCurrentUser`, `AuthGuard`, `useTimetable`) ให้ล้างข้อมูลโปรไฟล์นักศึกษาและตารางเรียนที่เก็บใน Memory ทันที
3. **การป้องกันปุ่มย้อนกลับไม่ให้แสดงข้อมูลเดิม (`frontend/features/auth/components/AuthGuard.tsx` & `frontend/features/auth/hooks/useCurrentUser.ts`)**
   - พัฒนา `AuthGuard` ตรวจสอบสถานะ `SessionProvider.isAuthenticated()` ก่อนแสดงผลหน้าเว็บที่ต้องเข้าสู่ระบบ
   - ดักจับเหตุการณ์ `popstate` (ปุ่ม Back/Forward ของ Browser) และ `pageshow` (bfcache) หากอยู่ในสถานะ `Unauthenticated` จะไม่แสดงข้อมูลนักศึกษาหรือตารางเรียนเดิม และนำทางกลับไปยัง `/login` ด้วย `router.replace("/login")`
4. **ตัวจับเวลาเมื่อไม่มีการใช้งาน (`frontend/features/auth/components/InactivityTimer.tsx` & `frontend/features/auth/hooks/useInactivityTimer.ts`)**
   - พัฒนา `InactivityTimer` และ `useInactivityTimer` เริ่มจับเวลาเมื่อเข้าสู่ระบบสำเร็จ และรีเซ็ตตัวจับเวลา (`reset()`) ทุกครั้งที่ผู้ใช้มีกิจกรรม (`mousemove`, `mousedown`, `keydown`, `scroll`, `touchstart`, `click`)
   - เมื่อไม่มีการใช้งานครบระยะเวลาที่กำหนด จะเรียก `SessionProvider.expireSession()` ล้างข้อมูลฝั่งหน้าเว็บและนำทางกลับไปยังหน้า `/login` อัตโนมัติโดยไม่เรียก API
5. **Banner สีเหลืองแจ้งเตือนเซสชันหมดอายุในหน้า Login (`frontend/features/auth/components/LoginForm.tsx` & `frontend/features/auth/hooks/useLogin.ts`)**
   - เมื่อเซสชันหมดอายุ (ทั้งจาก `InactivityTimer` หรือจาก API ตอบ `401 Unauthorized` ระหว่างใช้งาน) หน้า `/login` จะแสดง **Banner สีเหลือง** ข้อความ:
     `เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่อีกครั้ง`
   - กรณีผู้ใช้กดปุ่ม `ออกจากระบบ` ด้วยตนเอง (รวมถึงกรณีที่กดปุ่มตอน Token หมดอายุแล้ว) จะไม่แสดง Banner ดังกล่าว และเมื่อเข้าสู่ระบบใหม่สำเร็จ Banner จะถูกล้างออก

---

## ผลการทดสอบรายกรณี (เทียบกับ US4-T11, US4-T05 และ US4-T06)

### 1. `Logout.test.tsx` (8 กรณี)

| ลำดับ | อ้างอิง US4-T11 | ชื่อกรณีทดสอบ | สิ่งที่ตรวจ | ผล | เวลา |
| :---: | :---: | --- | --- | :---: | :---: |
| 1 | **UT-UI-01** | แสดงปุ่มออกจากระบบเมื่อเข้าสู่ระบบแล้ว และเรียกการทำงาน Logout เมื่อคลิก | แสดงปุ่ม `ออกจากระบบ` บน Navbar เมื่อคลิกจะเรียก `authApi.logout("valid-token")` 1 ครั้ง | **PASS** | 73 ms |
| 2 | **UT-UI-01** | ระหว่างกำลังออกจากระบบ ปุ่มถูกปิดใช้งานและกันการคลิกซ้ำ | ปุ่มเปลี่ยนเป็น `กำลังออกจากระบบ…` มีสถานะ `disabled` และคลิกซ้ำไม่ส่งคำขอเพิ่ม | **PASS** | 38 ms |
| 3 | **UT-UI-02** | หลัง Logout สำเร็จ ล้างข้อมูลฝั่งหน้าเว็บทั้งหมด เปลี่ยนไปหน้า Login และไม่แสดงข้อมูลเดิมหรือ banner เซสชันหมดอายุ | ลบ Token จาก `sessionStorage` และ `localStorage`, ล้างข้อมูลนักศึกษา, นำทางไป `/login` และแสดงฟอร์ม Login โดยไม่มี Banner เซสชันหมดอายุ | **PASS** | 34 ms |
| 4 | **UT-UI-03** | หลัง Logout เมื่อกดย้อนกลับ (Browser Back) สถานะยังเป็น `Unauthenticated` ไม่แสดงข้อมูลเดิมและคงอยู่ที่หน้า Login | จำลอง `popstate` และการเปิดหน้าเมนูหลักซ้ำหลัง Logout สถานะยังเป็น `Unauthenticated`, ไม่แสดงชื่อ/รหัสนักศึกษา และคงอยู่ที่ `/login` | **PASS** | 22 ms |
| 5 | **UT-UI-04** | ไม่มีการใช้งานเกินระยะเวลาที่กำหนด ระบบจะ Logout อัตโนมัติและหน้า Login แสดง banner สีเหลืองแจ้งเซสชันหมดอายุ | เมื่อครบเวลา Inactivity Timeout ระบบล้าง Session อัตโนมัติ นำทางไป `/login` และแสดง Banner สีเหลือง `เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่อีกครั้ง` | **PASS** | 10 ms |
| 6 | **UT-UI-04** | หากมีการใช้งานระหว่างจับเวลา ตัวจับเวลาไม่ใช้งานจะถูกรีเซ็ตและยังไม่ถูก Logout จนกว่าจะหยุดใช้งานครบเวลา | เมื่อมีเหตุการณ์ `mousemove` ระหว่างจับเวลา ตัวจับเวลาถูกรีเซ็ต และจะ Logout เมื่อหยุดใช้งานครบกำหนดเต็มเวลา | **PASS** | 6 ms |
| 7 | — | เมื่อ API ตอบ `401` ระหว่างใช้งาน (token หมดอายุ) จะล้าง session กลับหน้า Login พร้อมแสดง banner สีเหลือง และเมื่อเข้าสู่ระบบใหม่ banner จะหายไป | เมื่อ `GET /api/users/me` ตอบ `401` ระบบล้าง Session พาไป `/login` พร้อมแสดง Banner สีเหลือง และเมื่อ Login ใหม่สำเร็จ Banner จะหายไป | **PASS** | 96 ms |
| 8 | — | เมื่อกดปุ่มออกจากระบบเองแต่เกิดข้อผิดพลาดจาก API ระบบยังล้างข้อมูลฝั่งหน้าเว็บและกลับหน้า Login โดยไม่แสดง banner เซสชันหมดอายุ | แม้ API ตอบ Error ฝั่ง Client ยังล้าง Session พากลับหน้า `/login` และไม่แสดง Banner เซสชันหมดอายุ | **PASS** | 23 ms |

### 2. `api.test.ts` — ส่วนเพิ่มเติมของ US4 (2 กรณี)

| ลำดับ | อ้างอิง | ชื่อกรณีทดสอบ | สิ่งที่ตรวจ | ผล | เวลา |
| :---: | :---: | --- | --- | :---: | :---: |
| 1 | **US4-T05 / IT-01, IT-02, IT-03** | `POST /api/auth/logout` ส่ง Bearer token ไม่มี body และล้าง session เมื่อได้ `204` | ส่ง `POST /api/auth/logout` พร้อม `Authorization: Bearer <token>` ไม่มี `body` และล้าง `sessionStorage` | **PASS** | 1 ms |
| 2 | **US4-T05 / ST-09** | `POST /api/auth/logout` ตอบ `401` ล้าง session เหมือนสำเร็จโดยไม่ติดสถานะเซสชันหมดอายุ | เมื่อ `/api/auth/logout` ตอบ `401` จะล้าง Token และ `isSessionExpired()` เป็น `false` | **PASS** | < 1 ms |

---

## ความครอบคลุมเทียบกับ US4-T11 Test Cases

| Test Case ใน US4-T11 | รายละเอียด | กรณีทดสอบที่ครอบคลุม | สถานะ |
| --- | --- | --- | :---: |
| **[UT-UI-01]** | ทดสอบการกดปุ่ม Logout (แสดงปุ่มและเรียกการทำงาน Logout ตามจำนวนครั้งที่กำหนด) | `Logout.test.tsx` (#1, #2), `api.test.ts` (#4) | **PASS** |
| **[UT-UI-02]** | ทดสอบการแสดงหน้า Login หลัง Logout สำเร็จ (ล้างข้อมูลและแสดงองค์ประกอบหน้า Login) | `Logout.test.tsx` (#3, #8), `api.test.ts` (#4, #5) | **PASS** |
| **[UT-UI-03]** | ทดสอบการกดย้อนกลับหลัง Logout (คงสถานะ `Unauthenticated` ไม่แสดงข้อมูลเดิม และอยู่ที่หน้า Login) | `Logout.test.tsx` (#4) | **PASS** |
| **[UT-UI-04]** | ทดสอบการ Logout อัตโนมัติเมื่อไม่มีการใช้งานเกินระยะเวลาที่กำหนด พร้อมแสดง Banner สีเหลืองแจ้งเซสชันหมดอายุ | `Logout.test.tsx` (#5, #6, #7) | **PASS** |

---

## เอกสารที่เกี่ยวข้อง
- [US4-T11 Design Unit Test Cases ส่วน UI](../US4-T11-design-unit-test-ui.md)
- [US4-T05 DTO & API Spec](../T05/US4-DTO%20%26%20API%20Spec.md)
- [US4-T06 Sequence Diagram](../T06/US4-T06-Sequence-Diagram.md)
- [US4-T06 Extended API Class Diagram](../T06/US4-T06-Extended-API-Class-Diagram.md)
- [US4-T13 Integration Test Cases (UI ↔ API)](../US4-T13%20Design%20Integration%20Test%20ระหว่าง%20UI%20กับ%20API.md)
- [US4-T15 System Test Cases](../T15/US4-T15-system-test-cases.md)
- [US4-T16 User Acceptance Test (UAT)](../US4-T16-uat-test-cases.md)
