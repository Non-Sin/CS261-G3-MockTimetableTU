# US4-T19 รายงานผล System Test

Nov 2, 2026 · @Non

## สรุปผล

| Test Case | CoS | เรื่อง | ทางที่ทดสอบ | ผล |
| --- | --- | --- | --- | --- |
| ST-01 | TC1 | logout ปกติ | UI + API + DB | **Pass** |
| ST-02 | TC2 | กด Back หลัง logout | UI | **Pass** |
| ST-03 | TC2 | เปิด URL หน้าเมนูหลักตรงๆ หลัง logout | UI | **Pass** |
| ST-04 | TC1 | login ใหม่หลัง logout | UI + API | **Pass** |
| ST-05 | TC1 | สลับบัญชี | UI + API | **Pass** |
| ST-06 | - | ข้อมูลไม่หายหลัง logout | UI + API + DB | **Pass** |
| ST-07 | TC1 | ดับเบิลคลิก ออกจากระบบ | UI + API | **Pass** |
| ST-08 | TC1 | logout ซ้ำจากอีกแท็บ | UI + API | **Pass** |
| ST-09 | TC1 | logout ตอน token หมดอายุแล้ว | UI + API | **Pass** |
| ST-10 | - | ใช้ token เดิมหลัง logout (ข้อจำกัดของระบบ) | API | **Pass** (ได้ 200 ตามข้อจำกัด และ 401 หลังหมดอายุ) |
| ST-11 | TC3 | หมดอายุแล้วใช้งานต่อ | UI + API + DB | **Pass** |
| ST-12 | TC3 | หมดอายุแต่ไม่ทำอะไร | UI + API | **Pass** |
| ST-13 | TC3 | banner แสดงเฉพาะตอนหมดอายุ | UI | **Pass** |
| ST-14 | TC3 | หมดอายุกลางการเพิ่มวิชา | UI + API + DB | **Pass** |
| ST-15 | TC3 | หมดอายุแล้ว login ใหม่ | UI + DB | **Pass** |
| ST-16 | TC3 | refresh หลังหมดอายุ | UI + API | **Pass** |
| ST-17 | TC3 | ทุก API ที่ต้อง Authentication ตอบ 401 เหมือนกัน | API + DB | **Pass** |
| ST-18 | TC3 | ขอบเขตเวลาหมดอายุ | API | **Pass** (มีข้อสังเกตเรื่อง clock skew) |
| ST-19 | TC1, TC3 | วงจรเต็ม | UI + API + DB | **Pass** |
| ST-20 | - | login สองที่ด้วยบัญชีเดียวกัน (ข้อจำกัดของระบบ) | UI + API | **Pass** (เบราว์เซอร์ 2 ยังใช้ได้ตามข้อจำกัด) |
| ST-21 | TC1 | ปุ่ม logout อยู่ที่ Navbar ทุกเมนู | UI + API | **Pass** |

**ผ่าน 21 / 21** · test case จาก [US4-T15](../T15/US4-T15-system-test-cases.md) · อ้างอิง US4-T06 Sequence Diagram · branch `test/US4-T19-run-system-test`

ทุกเคสตรวจครบชั้นที่เกี่ยวข้องตาม Sequence Diagram คือ หน้าเว็บ (path, ที่เก็บ token, banner, ข้อมูลบนจอ), request/response ที่หน้าเว็บส่งจริง (ดักจาก Network ของ Chrome) และ DB ก่อน/หลัง (`users`, `login_attempt`, `timetable`, `timetable_entry`) เคสที่ต้องไม่แตะ DB ตรวจเพิ่มจาก SQL log ของ backend (`spring.jpa.show-sql`) ว่าไม่มีคำสั่ง `insert`/`update`/`delete`

ผลละเอียดทุกข้อตรวจ (120 ข้อ) อยู่ใน [system-test/US4-T19-puppeteer-result.md](./system-test/US4-T19-puppeteer-result.md)

## สภาพแวดล้อม

| หัวข้อ | ค่า |
| --- | --- |
| วันที่รัน | 2026-11-02 |
| โค้ด | `main` commit `240db7d` |
| ระบบ | `docker compose up -d --build` (SQL Server + backend :8080 + frontend :3000) · `.env` ตั้ง `SPRING_PROFILES_ACTIVE=stub-tu` |
| บัญชี | A = `6609000001` Somchai Jaidee, A2 = `6609000000` Somporn Tuayang (บัญชีของ TU API ปลอม รหัสผ่าน `Passw0rd!`) |
| ข้อมูล | ก่อนเคสที่เกี่ยวกับตารางเรียน สคริปต์ล้างตาราง 1/2568 แล้วเพิ่มวิชาผ่าน API (A = CS180, MA211 · A2 = LAS101) |
| อายุ token | Flow 1 (Logout) ใช้ค่าจริง 3 ชั่วโมง · Flow 2 (Session หมดอายุ) สคริปต์ restart backend ด้วย [compose.short-jwt.yaml](./system-test/compose.short-jwt.yaml) ให้ token อายุ 30 วินาที แล้วคืนค่า 3 ชั่วโมงตอนจบ |
| Browser | Chrome 131 headless ควบคุมด้วย puppeteer 23.11.1 จอ 1366 × 900 บน Windows 11 |
| สคริปต์ | [system-test/run-system-test.mjs](./system-test/run-system-test.mjs) · ผลดิบ [evidence/run-output.txt](./system-test/evidence/run-output.txt) · request และสภาพ DB [evidence/run-evidence.json](./system-test/evidence/run-evidence.json) · ภาพหน้าจอ [screenshots/](./system-test/screenshots/) |

รันซ้ำได้ด้วย:

```bash
docker compose up -d --build
cd .doc/US4/T19/system-test
npm install
npm test                 # ทั้ง 2 flow (~5 นาที เพราะรอ token หมดอายุ)
npm run test:logout      # เฉพาะ Flow 1
npm run test:expiry      # เฉพาะ Flow 2
```

## การปรับจากเอกสาร T15

| จุด | ทำอย่างไร |
| --- | --- |
| บัญชี A `6809610000` (Alysa Liu) ไม่มีใน `StubTuApiClient` | ใช้ `6609000001` (Somchai Jaidee) เป็น A และ `6609000000` (Somporn Tuayang) เป็น A2 |
| token อายุ 3 ชั่วโมงรอจริงไม่ได้ (หัวข้อ 3.2) | ตั้ง `APP_AUTH_JWT_EXPIRATIONMS=30000` ผ่าน compose override เฉพาะ Flow 2 ไม่แก้โค้ดหรือ `application.yaml` และยืนยันค่าจริงแยกไว้ใน ST-18a (`exp − iat = 10800`) |
| "ล้าง React Auth Context และ cache ตารางเรียน" ตรวจตรงไม่ได้จากภายนอก | ตรวจจากผลที่ผู้ใช้เห็น: Navbar และรายการวิชาที่เพิ่มแล้วหายจาก DOM และเมื่อ login บัญชีอื่น (ST-05) ไม่เห็นวิชาของ A |
| ST-02 กด Back | login ใช้ `router.replace` จึงไม่มีหน้า `/` ในประวัติ สคริปต์เปิดหน้าเมนูหลักอีกครั้งก่อน logout เพื่อให้ Back กลับไปหน้าที่ต้อง login ได้จริง |
| ST-08 สองแท็บ | token เก็บใน `sessionStorage` ซึ่งแยกต่อแท็บ แท็บใหม่ที่เปิดเองต้อง login ใหม่ จึงจำลองแท็บ 2 แบบ "ทำสำเนาแท็บ" ที่คัดลอก `sessionStorage` มาด้วย |
| ST-11 "กดฟังก์ชันที่เรียก API" | เปลี่ยนภาคเรียนในส่วนค้นหารายวิชา ซึ่งเรียก `GET /api/timetable` และ `GET /api/courses` |
| ST-17 "UI ทุกหน้าตอบสนองเหมือนกัน" | ระบบมีหน้าเดียว ใช้ผลของ ST-11 (GET timetable), ST-14 (POST entries) และ ST-16 (GET users/me) ที่ได้ banner เหมือนกัน |
| ST-19 วงจรเต็ม | ใช้บัญชี A2 เพราะมีการเพิ่ม/ลบวิชา ไม่ให้กระทบตารางของ A ที่เคสอื่นตรวจในรอบเดียวกัน |
| ST-21 "ทุกหน้า" | ระบบมีหน้าเดียว (`/`) ที่สลับเมนูใน header (`/dashboard` redirect มา `/`) จึงตรวจทั้ง 3 เมนู |

## ผลแต่ละ Test Case

### Flow 1: Logout (token อายุ 3 ชั่วโมง)

| ST | ผลจริง | ผล |
| --- | --- | --- |
| ST-01 | `POST /api/auth/logout` แนบ `Authorization: Bearer <token ปัจจุบัน>` ไม่มี body ได้ `204` body ว่าง · กลับ `/login` ไม่มี banner ([ภาพ](./system-test/screenshots/ST-01.png)) · ไม่มี token ทั้งใน sessionStorage และ localStorage · ไม่มีชื่อ รหัส และตารางเรียนของ A บนจอ · DB ของ A เหมือนเดิมทุกค่า และ backend ไม่รัน `insert`/`update`/`delete` | Pass |
| ST-02 | Back กลับไปที่ `/` แล้วถูกพากลับ `/login` ไม่มี request ใหม่ · Chrome คืนหน้าเดิมจาก bfcache (`persisted=true`) ซึ่ง DOM ยังมีชื่อ A ตอน `pageshow` แต่ `AuthGuard` ล้างก่อนวาดเฟรมแรก (เฟรมแรก/เฟรมที่สอง/100 ms ไม่มีชื่อ) ([ภาพ](./system-test/screenshots/ST-02.png)) | Pass |
| ST-03 | เปิด `/` ตรงๆ ถูกพากลับ `/login` ไม่มี request ไป API ([ภาพ](./system-test/screenshots/ST-03.png)) | Pass |
| ST-04 | login สำเร็จได้ token ใหม่ไม่ซ้ำของ ST-01 · Navbar "Somchai Jaidee 6609000001" · ตาราง CS180, MA211 ([ภาพ](./system-test/screenshots/ST-04.png)) | Pass |
| ST-05 | logout A แล้ว login A2 ในแท็บเดิม: Navbar "Somporn Tuayang 6609000000" ไม่มีชื่อ/รหัสของ A · รายการวิชาที่เพิ่มแล้วเป็น LAS101 ของ A2 เท่านั้น · `GET /api/users/me` และ `/api/timetable` ทุกตัวแนบ token ของ A2 ([ภาพ](./system-test/screenshots/ST-05.png)) | Pass |
| ST-06 | เพิ่ม CS111 ผ่านหน้าเว็บ (201) → logout (204) DB เหมือนเดิมทุกแถว ไม่มี SQL เขียน → login ใหม่เห็น CS180, MA211, CS111 · `entry_id` เดิมทุกตัว แถว `users` ยังอยู่ ([ภาพ](./system-test/screenshots/ST-06.png)) | Pass |
| ST-07 | คลิกปุ่มสองครั้งติดกัน ส่ง `POST /api/auth/logout` แค่ **1 ครั้ง** (ปุ่มกัน request ซ้ำ) ได้ 204 · กลับหน้า Login ไม่มี error บนจอหรือ JavaScript error ([ภาพ](./system-test/screenshots/ST-07.png)) | Pass |
| ST-08 | แท็บ 1 logout (204) แล้วแท็บ 2 ยังอยู่หน้าเมนูหลักพร้อม token ของตัวเอง → กด logout ในแท็บ 2 ได้ **204** (stateless) · ล้าง state และกลับหน้า Login ([ภาพ](./system-test/screenshots/ST-08.png)) | Pass |
| ST-10 ช่วง 1 | logout (204) แล้ว `GET /api/users/me` ด้วย token เดิมได้ **200** `{ studentId: "6609000001", firstName: "Somchai", lastName: "Jaidee" }` ตรงกับข้อจำกัดที่บันทึกใน US4-T05 | Pass |
| ST-18a | token จาก config จริงมี `exp − iat = 10800` วินาที (3 ชั่วโมง) | Pass |
| ST-20 | เบราว์เซอร์ 1 logout (204) แล้วเบราว์เซอร์ 2 reload ได้ `GET /api/users/me` 200 และ `GET /api/timetable` 200 ยังใช้งานได้ตามข้อจำกัด ([ภาพ](./system-test/screenshots/ST-20.png)) | Pass |
| ST-21 | ปุ่มบัญชีผู้ใช้ที่มีเมนู "ออกจากระบบ" อยู่ตำแหน่งเดียวกันทั้ง 3 เมนู · logout จากเมนู "ดูวิชาเสรีแนะนำ" ได้ 204 และกลับหน้า Login ([ก่อน](./system-test/screenshots/ST-21-before.png), [หลัง](./system-test/screenshots/ST-21.png)) | Pass |

### Flow 2: Session หมดอายุ (token อายุ 30 วินาที)

| ST | ผลจริง | ผล |
| --- | --- | --- |
| ST-09 | กด logout หลัง token หมดอายุ ได้ `401` `application/problem+json` · ล้าง state และกลับหน้า Login **ไม่มี** banner ([ภาพ](./system-test/screenshots/ST-09.png)) | Pass |
| ST-10 ช่วง 2 | token ที่ logout แล้ว ก่อนหมดอายุยังได้ 200 · หลังหมดอายุได้ `401` | Pass |
| ST-11 | เปลี่ยนภาคเรียน → `GET /api/courses` และ `GET /api/timetable` ได้ `401` ProblemDetail · กลับหน้า Login พร้อม banner สีเหลือง "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่อีกครั้ง" ([ภาพ](./system-test/screenshots/ST-11.png)) · ไม่มี token ค้าง · DB ไม่เปลี่ยน ไม่มี SQL เขียน | Pass |
| ST-12 | ปล่อยหน้าไว้เลยเวลาหมดอายุ 77 วินาที หน้ายังอยู่ที่ `/` แสดงชื่อและตารางเดิม ไม่มี banner และไม่มี request ใดถูกส่ง ([ภาพ](./system-test/screenshots/ST-12.png)) | Pass |
| ST-13 | logout ปกติ (ST-01) ไม่มี banner · หมดอายุ (ST-11) มี banner · login แล้ว logout ปกติอีกรอบ banner หายไป ([ภาพ](./system-test/screenshots/ST-13.png)) | Pass |
| ST-14 | ตารางมี 2 วิชา กด "+ เพิ่มวิชา" CS111 → `POST /api/timetable/entries` ได้ `401` · กลับหน้า Login พร้อม banner · DB ยังมี 2 วิชาเหมือนเดิมทุกแถว ไม่มี SQL เขียน ([ภาพ](./system-test/screenshots/ST-14.png)) | Pass |
| ST-15 | login ใหม่จากหน้าที่มี banner สำเร็จ banner และ flag หายไป · ตาราง CS180, MA211 ครบ ตรงกับ DB ([ภาพ](./system-test/screenshots/ST-15.png)) | Pass |
| ST-16 | refresh → `GET /api/users/me` ได้ 401 แล้วพากลับหน้า Login พร้อม banner ภายใน 10 วินาที ไม่ค้าง ([ภาพ](./system-test/screenshots/ST-16.png)) | Pass |
| ST-17 | token หมดอายุ: `GET /api/users/me`, `GET /api/timetable`, `POST /api/timetable/entries`, `DELETE /api/timetable/entries?entryIds=`, `POST /api/auth/logout` ได้ `401` `application/problem+json` ทั้ง 5 ตัว · DB ไม่เปลี่ยน (CS180 ไม่ถูกลบ CS111 ไม่ถูกเพิ่ม) | Pass |
| ST-18 | เรียกก่อน exp 5 วินาทีได้ 200 · หลัง exp ได้ 200 ต่อจนถึง exp + 55 วินาที และได้ **401 ครั้งแรกที่ exp + 60 วินาที** (ดูข้อสังเกตข้อ 1) | Pass |
| ST-19 | (บัญชี A2) เพิ่ม CS111 (201) ลบ CS180 (200) ผ่านหน้าเว็บ → logout (204) → login เห็น MA211, CS111 → หลังหมดอายุเปลี่ยนภาคเรียนได้ 401 กลับหน้า Login พร้อม banner · DB เป็น MA211, CS111 ตามที่ทำล่าสุด ([ภาพ](./system-test/screenshots/ST-19.png)) | Pass |

## ข้อสังเกต

1. **token ใช้ได้เกินเวลา exp อีก ~60 วินาที** backend ตรวจ token ด้วย `NimbusJwtDecoder` ที่ตั้ง clock skew 60 วินาทีเป็นค่าเริ่มต้น (ST-18 วัดได้ 401 ครั้งแรกที่ exp + 60 s) อายุจริงจึงเป็น 3 ชั่วโมง + ไม่เกิน 1 นาที ไม่กระทบ CoS แต่ควรบันทึกไว้ใน US4-T05 API Spec หรือตั้ง clock skew เป็น 0 ใน `JwtService` ถ้าทีมต้องการให้ตรงเวลา
2. **หน้าเว็บมี inactivity timer 15 นาทีที่ T15 ไม่ได้กำหนด** `useInactivityTimer` (ใช้ใน `MainMenuPage`) จะล้าง session และแสดง banner หมดอายุเมื่อไม่มีการขยับเมาส์/คีย์บอร์ด 15 นาที (ตั้งได้ด้วย `NEXT_PUBLIC_INACTIVITY_TIMEOUT_MS`) ซึ่งต่างจากข้อเสนอใน T15 หัวข้อ 3.2 ว่า "ไม่มีตัวจับเวลา" ST-12 ยังผ่านเพราะปล่อยไว้แค่ ~77 วินาที แต่ถ้าปล่อยเกิน 15 นาทีหน้าจะเปลี่ยนเอง รอบนี้**ไม่ได้รัน**กรณี 15 นาที ควรให้ทีมตัดสินว่าจะเพิ่มเป็น test case หรือปรับเอกสาร T06/T15 ให้ตรงกับระบบ
3. ST-02 ผ่านเพราะ `AuthGuard` ฟัง `pageshow` แล้วซ่อนเนื้อหาก่อนวาดเฟรมแรก ถ้าตัด listener นี้ออก หน้าที่คืนจาก bfcache จะแสดงข้อมูลเดิมได้
4. ข้อจำกัดของระบบ stateless (ST-10, ST-20) เป็นไปตามที่บันทึกไว้: token ที่ logout แล้วยังเรียก API ได้จนหมดอายุ
5. หลังรันสคริปต์ ข้อมูลใน DB dev เปลี่ยน: ตาราง 1/2568 ของ A เป็น CS180, MA211 และของ A2 เป็น MA211, CS111 · backend กลับเป็น token อายุ 3 ชั่วโมงแล้ว
