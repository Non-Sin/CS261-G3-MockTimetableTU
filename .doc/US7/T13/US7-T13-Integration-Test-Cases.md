# US7-T13 — Integration Test Cases ระหว่าง UI กับ API: ค้นหาช่องทางขอโควตา

เอกสารฉบับนี้ออกแบบกรณีทดสอบ Integration Test ระหว่างฝั่งหน้าเว็บ (UI ใน `frontend/features/quota/`) กับฝั่ง API (`/api/quota/*` และ `/api/timetable`) สำหรับ User Story 7 (Task US7-T13) โดยอ้างอิงจาก [US7 — DTO & API Spec](../T05/US7-DTO-API-Spec.md), [US7 — DTO Class Diagram](../T05/US7-DTO-Class-Diagram.md) และ [US7 — API Class Diagram](../T05/US7-API-Class-Diagram.md)

---

## 1. ขอบเขตและแนวทางการทดสอบ

Integration Test ระหว่าง UI กับ API ตรวจการทำงานร่วมกัน 3 ชั้นต่อกันในทุก test case:
1. **สิ่งที่ UI ส่ง** (HTTP method, path, query parameters, header `Authorization: Bearer <token>`)
2. **สิ่งที่ API ตอบ** (HTTP status code, JSON body หรือ `ProblemDetail`)
3. **สิ่งที่ UI แสดงผล** (การ์ดสถานะโควตา, ป้าย "ในแผนการเรียน", ข้อความ Empty State, Loading skeleton, และ Error handling)

### Endpoints ที่หน้าเว็บเรียก

| ลำดับ | Method & Path | จุดที่หน้าเว็บเรียกใช้ |
| --- | --- | --- |
| 1 | `GET /api/timetable?academicYear={y}&semester={s}` | โหลดรายวิชาในตารางเรียนของนักศึกษา เพื่อแสดงรหัสในวงเล็บข้าง checkbox "เฉพาะวิชาในแผนของฉัน" (ของ US1) |
| 2 | `GET /api/quota/courses?academicYear={y}&semester={s}&q={q}&mine={mine}` | กดค้นหา / กด Enter / ติ๊กหรือเลิกติ๊ก "เฉพาะวิชาในแผนของฉัน" |
| 3 | `GET /api/quota/courses/{courseCode}?academicYear={y}&semester={s}` | กดชิปรหัสวิชา (`relatedCourseCode`) ภายในการ์ดเงื่อนไข |

### สภาพแวดล้อม

- รัน frontend (Next.js) จริง ชี้ไปยัง backend (Spring Boot) และฐานข้อมูล SQL Server จริงที่มี seed ของ US1, US3 และ US7 (US7-T09)
- เข้าสู่ระบบด้วย JWT จริงผ่าน `Authorization: Bearer <token>` (US3)
- ตรวจสอบ Network request/response ผ่าน Playwright หรือ DevTools tab Network
- กรณี Error ที่เกิดจากฝั่งเซิร์ฟเวอร์/เครือข่ายไม่ได้จากการกด UI ปกติ (400, 401, 500, Offline, 404 ของชิปอ้างอิงที่ไม่มีใน DB) ใช้การดัก/จำลอง response (เช่น Playwright `page.route` หรือ DevTools)

---

## 2. ข้อมูลทดสอบตั้งต้น (Test Data / Preconditions)

ใช้ภาคเรียนที่เลือกในหน้าจัดตารางเป็น **`academicYear=2568`, `semester=1`** (ยกเว้นเคสที่ระบุภาค `2`)

| ชุดข้อมูล / รหัสวิชา | รายละเอียดในระบบ | ใช้ทดสอบ |
| --- | --- | --- |
| นักศึกษา A (มีตาราง 2568/1) | ในตารางมี `MA211`, `LAS101` | ป้าย checkbox, `mine=true`, `inMyTimetable` |
| นักศึกษา B (ตารางว่าง) | ยังไม่มีตารางเรียนในภาค 2568/1 | ปิด checkbox เมื่อไม่มีวิชาในแผน, `mine=true` ได้ว่าง |
| `EL395` | `REQUIRED`, มีเงื่อนไขอ้าง `relatedCourseCode: "EL295"`, 2 รอบ, `QUOTA_SYSTEM` (LITU), มีช่องทางติดต่อ | เคสปกติ, ชิปวิชาที่อ้างถึง, หลายรอบ, เปิดลิงก์แท็บใหม่ |
| `EL295` | `REQUIRED`, `conditions: []`, `QUOTA_SYSTEM` (LITU) | endpoint วิชาเดียวเมื่อกดชิป `EL295` |
| `MA211` | `REQUIRED`, `conditions: []`, รอบ `startDate: null` + `endDate` + `endTime: "15:00"`, `ONLINE_FORM` (Google Form) | กำหนดส่งวันเดียวพร้อมเวลา, `mine=true`, ค้นด้วยชื่อไทย/อังกฤษ |
| `LAS101` | `REQUIRED`, 2 รอบ, `QUOTA_SYSTEM` (คณะศิลปศาสตร์) | `mine=true` ร่วมกับ `MA211` |
| วิชาที่มี 2 ช่องทาง | `REQUIRED`, `channels` 2 รายการ โดย 1 รายการเป็น `FACULTY_OFFICE` ที่ `url: null` | แสดงหลายช่องทาง + ช่องทางไม่มีลิงก์ |
| `CS232` | `NOT_REQUIRED` | การ์ดไม่ต้องขอโควตา |
| `FR205` | เปิดสอนเฉพาะภาค 1/2568 (ไม่มี section ในภาค 2/2568) | `NOT_OFFERED` เมื่อค้นหาในภาค 2/2568 |
| `TU101` | มีในตาราง `course` และเปิดสอนใน 2568/1 แต่ไม่มีข้อมูลโควตา | `NO_DATA` |
| `DM201` | ไม่มีในตาราง `course` | ผลค้นหาว่าง (`200`) และ endpoint วิชาเดียว (`404`) |

---

## 3. Test Cases

### 3.1 หน้าแรกและการเชื่อมต่อกับตารางเรียน (`GET /api/timetable`)

| IT ID | กรณี | สถานการณ์ | ขั้นตอน | ผลที่คาดหวัง (UI → API → UI) |
| --- | --- | --- | --- | --- |
| **IT-US7-01** | ปกติ | เปิดหน้า "ค้นหาช่องทางขอโควตา" เมื่อมีวิชาในตาราง | 1. Login เป็นนักศึกษา A<br>2. กดเมนู "ค้นหาช่องทางขอโควตา" | **ส่ง:** `GET /api/timetable?academicYear=2568&semester=1` พร้อม JWT (และ**ไม่เรียก** `/api/quota/courses`)<br>**ตอบ:** `200` มี `entries` ของ `MA211`, `LAS101`<br>**UI:** แสดงป้าย "ภาคเรียนที่ 1/2568", การ์ด "4 ขั้นตอนการขอโควตาสำหรับนักศึกษา มธ.", และ checkbox "เฉพาะวิชาในแผนของฉัน (MA211, LAS101)" กดได้ |
| **IT-US7-02** | ข้อมูลว่าง | เปิดหน้าเมื่อตารางเรียนว่าง | 1. Login เป็นนักศึกษา B<br>2. กดเมนู "ค้นหาช่องทางขอโควตา" | **ส่ง:** `GET /api/timetable?academicYear=2568&semester=1`<br>**ตอบ:** `200` `entries: []`<br>**UI:** checkbox "เฉพาะวิชาในแผนของฉัน" ไม่มีวงเล็บต่อท้ายและอยู่ในสถานะ `disabled` |

### 3.2 ค้นหาวิชา (`GET /api/quota/courses`) — กรณีปกติ

| IT ID | กรณี | สถานการณ์ | ขั้นตอน | ผลที่คาดหวัง (UI → API → UI) |
| --- | --- | --- | --- | --- |
| **IT-US7-03** | ปกติ | ค้นหาวิชาที่ต้องขอโควตา (`EL395`) | 1. พิมพ์ `EL395` ในช่องค้นหา<br>2. กดปุ่ม "ค้นหาข้อมูล" | **ส่ง:** `GET /api/quota/courses?academicYear=2568&semester=1&q=EL395&mine=false`<br>**ตอบ:** `200` `total: 1`, `quotaStatus: "REQUIRED"`, `conditions` มีชิป `EL295`, `rounds` มี 2 รอบ, `channels`, `contacts`<br>**UI:** แสดง "พบทั้งหมด 1 วิชา", การ์ด `EL395` ครบ 4 ส่วน, ปุ่มลิงก์ฟอร์ม/ติดต่อมี `target="_blank" rel="noopener noreferrer"` |
| **IT-US7-04** | ปกติ | ค้นหาด้วย Prefix / ชื่ออังกฤษ / ชื่อไทย / ไม่สนตัวพิมพ์ | 1. ค้นหา `el3` (ตัวเล็ก)<br>2. ค้นหา `calculus`<br>3. ค้นหา `แคลคูลัส` | **ส่ง:** `GET /api/quota/courses` ด้วย `q` ตามที่พิมพ์<br>**ตอบ:** `200` คืน `EL395` ในข้อ 1 และ `MA211` ในข้อ 2–3<br>**UI:** แสดงการ์ดวิชาที่ตรงคำค้นถูกต้อง เรียงตาม `courseCode` |
| **IT-US7-05** | ปกติ | กด Enter เพื่อค้นหา และตัดช่องว่างหน้า/หลังคำค้น | 1. พิมพ์ `"  EL395  "` ในช่องค้นหา<br>2. กดปุ่ม `Enter` | **ส่ง:** `GET /api/quota/courses?academicYear=2568&semester=1&q=EL395&mine=false` (ตัดช่องว่างหน้า/หลังออก)<br>**ตอบ:** `200` คืนข้อมูล `EL395`<br>**UI:** แสดงผลค้นหา `EL395` เหมือนการกดปุ่ม "ค้นหาข้อมูล" |
| **IT-US7-06** | ปกติ | การ์ด `REQUIRED` แบบส่งวันเดียวและมีหลายช่องทาง (รวม `url: null`) | 1. ค้นหา `MA211`<br>2. ค้นหาวิชาตัวอย่างที่มี 2 ช่องทาง | **ส่ง:** `GET /api/quota/courses?...`<br>**ตอบ:** `200` (`MA211` มี `startDate: null`, `endTime: "15:00"`; วิชา 2 ช่องทางมีทั้งรายการที่มี `url` และ `url: null`)<br>**UI:** `MA211` แสดงป้าย "กำหนดการ" และข้อความ "ยื่นคำร้องภายใน ... เวลา 15:00 น."; วิชา 2 ช่องทางแสดงครบทั้ง 2 กล่อง โดยช่องทางที่ `url: null` แสดง `label` กับ `note` **ไม่มีปุ่มลิงก์** |
| **IT-US7-07** | ปกติ | ค้นหาวิชาที่ไม่ต้องขอโควตา (`NOT_REQUIRED`) | 1. พิมพ์ `CS232` แล้วกดค้นหา | **ส่ง:** `GET /api/quota/courses?academicYear=2568&semester=1&q=CS232&mine=false`<br>**ตอบ:** `200` `quotaStatus: "NOT_REQUIRED"`, list ทั้ง 4 ส่วนเป็น `[]`<br>**UI:** แสดงกล่องสีเขียว "รายวิชานี้ไม่ต้องขอโควตา" ไม่แสดงส่วนเงื่อนไข/รอบ/ช่องทาง/ติดต่อ |
| **IT-US7-08** | ปกติ | ค้นหาวิชาที่ไม่เปิดสอนในภาคที่เลือก (`NOT_OFFERED`) | 1. เปลี่ยนภาคเป็น `2/2568`<br>2. พิมพ์ `FR205` แล้วกดค้นหา | **ส่ง:** `GET /api/quota/courses?academicYear=2568&semester=2&q=FR205&mine=false`<br>**ตอบ:** `200` `quotaStatus: "NOT_OFFERED"`, `offeredSemesters: [1]`, list อื่นเป็น `[]`<br>**UI:** แสดงกล่องสีเหลือง "วิชานี้เปิดสอนเฉพาะภาคเรียนที่ 1" |
| **IT-US7-09** | ปกติ | ค้นหาวิชาที่ยังไม่มีข้อมูลโควตา (`NO_DATA`) | 1. พิมพ์ `TU101` แล้วกดค้นหา | **ส่ง:** `GET /api/quota/courses?academicYear=2568&semester=1&q=TU101&mine=false`<br>**ตอบ:** `200` `quotaStatus: "NO_DATA"`, list อื่นเป็น `[]`<br>**UI:** แสดงกล่องสีเทา "ยังไม่มีข้อมูลช่องทางขอโควตาของรายวิชานี้ กรุณาติดต่อคณะ/ภาควิชาเจ้าของวิชา" |
| **IT-US7-10** | ปกติ | กรองเฉพาะวิชาในแผนของฉัน (`mine=true`) | 1. Login เป็นนักศึกษา A<br>2. ปล่อยช่องค้นหาว่าง แล้วติ๊ก checkbox "เฉพาะวิชาในแผนของฉัน" | **ส่ง:** `GET /api/quota/courses?academicYear=2568&semester=1&mine=true` (ไม่ส่ง `q` หรือไม่ส่งค่าว่าง)<br>**ตอบ:** `200` `total: 2`, `query: null`, `courses` มี `LAS101` และ `MA211` โดย `inMyTimetable: true` ทั้งคู่<br>**UI:** แสดง "พบทั้งหมด 2 วิชา", การ์ด `LAS101` และ `MA211` พร้อมป้าย "ในแผนการเรียน" |
| **IT-US7-11** | ปกติ | ค้นหาคำค้นร่วมกับ `mine=true` | 1. ติ๊ก "เฉพาะวิชาในแผนของฉัน"<br>2. พิมพ์ `MA` แล้วกดค้นหา | **ส่ง:** `GET /api/quota/courses?academicYear=2568&semester=1&q=MA&mine=true`<br>**ตอบ:** `200` `total: 1`, คืนเฉพาะ `MA211`<br>**UI:** แสดงการ์ด `MA211` เพียงใบเดียวพร้อมป้าย "ในแผนการเรียน" |
| **IT-US7-12** | ปกติ | ผลค้นหามากกว่า 50 วิชา (`total > courses.length`) | 1. จำลอง/ค้นหาคำที่ตรงเกิน 50 วิชา (เช่น `q=C` เมื่อมีข้อมูลครบ) | **ส่ง:** `GET /api/quota/courses?...&q=C&mine=false`<br>**ตอบ:** `200` `courses.length === 50` และ `total > 50`<br>**UI:** แสดงข้อความหัวผลค้นหา `"พบทั้งหมด {total} วิชา (แสดง 50 วิชาแรก)"` |

### 3.3 ค้นหาวิชา (`GET /api/quota/courses`) — กรณีข้อมูลว่างและขอบเขตคำค้น

| IT ID | กรณี | สถานการณ์ | ขั้นตอน | ผลที่คาดหวัง (UI → API → UI) |
| --- | --- | --- | --- | --- |
| **IT-US7-13** | ข้อมูลว่าง | ค้นหาวิชาที่ไม่มีในระบบ (`DM201`) | 1. พิมพ์ `DM201` แล้วกดค้นหา | **ส่ง:** `GET /api/quota/courses?academicYear=2568&semester=1&q=DM201&mine=false`<br>**ตอบ:** **`200`** `{ "total": 0, "courses": [] }` (**ไม่ใช่ 404**)<br>**UI:** แสดง Empty State `"ไม่พบข้อมูลช่องทางขอโควตาสำหรับวิชานี้"` และข้อความรอง `"ยังไม่มีข้อมูลช่องทางการขอโควตา สำหรับรายวิชา DM201 ในระบบ"` |
| **IT-US7-14** | ข้อมูลว่าง | ล้างคำค้นหรือกดค้นหาเมื่อช่องว่างและไม่ได้ติ๊ก `mine` | 1. หลังค้นหา `EL395` ให้กดปุ่ม `×` ล้างคำค้น<br>2. ลองกดปุ่ม "ค้นหาข้อมูล" ซ้ำตอนช่องว่างและไม่ได้ติ๊ก checkbox | **ส่ง:** **ไม่เรียก API** `GET /api/quota/courses` (ป้องกัน error `400 QUOTA_SEARCH_QUERY_REQUIRED`)<br>**UI:** กลับไปแสดงหน้าแรก ("4 ขั้นตอนการขอโควตาสำหรับนักศึกษา มธ.") |
| **IT-US7-15** | ข้อมูลว่าง / ขอบเขต | ค้นหาด้วยอักขระพิเศษของ LIKE (`%`, `_`, `[`) | 1. พิมพ์ `%` หรือ `_` แล้วกดค้นหา | **ส่ง:** `GET /api/quota/courses?...&q=%25&mine=false`<br>**ตอบ:** `200` escape wildcard แล้วไม่คืนทุกวิชาในระบบ (คืนเฉพาะวิชาที่มีอักขระนั้นจริง หรือ `courses: []`)<br>**UI:** แสดง Empty State ตามปกติ ไม่แสดงทุกวิชาในระบบ |
| **IT-US7-16** | ข้อมูลว่าง | เรียก `mine=true` เมื่อตารางว่าง (จำลอง/race condition) | 1. จำลอง response หรือยิง `mine=true` ขณะนักศึกษาไม่มีวิชาในตารางของภาคนั้น | **ส่ง:** `GET /api/quota/courses?academicYear=2568&semester=1&mine=true`<br>**ตอบ:** `200` `{ "total": 0, "courses": [] }`<br>**UI:** แสดง Empty State ไม่พัง |

### 3.4 ช่องทางขอโควตาของวิชาเดียว (`GET /api/quota/courses/{courseCode}`)

| IT ID | กรณี | สถานการณ์ | ขั้นตอน | ผลที่คาดหวัง (UI → API → UI) |
| --- | --- | --- | --- | --- |
| **IT-US7-17** | ปกติ | กดชิปรหัสวิชาในเงื่อนไข (`EL295`) | 1. ค้นหา `EL395`<br>2. คลิกชิปรหัสวิชา `EL295` ในกล่องเงื่อนไข | **ส่ง:** `GET /api/quota/courses/EL295?academicYear=2568&semester=1`<br>**ตอบ:** `200` `QuotaCourseResponse` ของ `EL295` (`quotaStatus: "REQUIRED"`, `conditions: []`)<br>**UI:** แทนผลค้นหาด้วยการ์ด `EL295`, ใส่ `"EL295"` ลงในช่องค้นหา, แสดงข้อความ "ไม่มีเงื่อนไข สามารถยื่นขอโควตาได้ตามกำหนดเวลา" |
| **IT-US7-18** | ข้อมูลว่าง | กดชิปรหัสวิชาที่มีในระบบแต่ยังไม่มีข้อมูลโควตา (`NO_DATA`) | 1. เปิดการ์ดที่มี `relatedCourseCode` ชี้ไปยังวิชาสถานะ `NO_DATA` (เช่น `TU101`) แล้วคลิกชิป | **ส่ง:** `GET /api/quota/courses/TU101?academicYear=2568&semester=1`<br>**ตอบ:** **`200`** `quotaStatus: "NO_DATA"` และ list ว่างทั้งหมด (**ไม่ใช่ 404**)<br>**UI:** แสดงการ์ดวิชานั้นพร้อมกล่องสีเทา "ยังไม่มีข้อมูลช่องทางขอโควตาของรายวิชานี้ กรุณาติดต่อคณะ/ภาควิชาเจ้าของวิชา" |
| **IT-US7-19** | ผิดพลาด (404) | กดชิปรหัสวิชาที่ไม่มีในตาราง `course` (`404`) | 1. จำลองเงื่อนไขที่มี `relatedCourseCode: "DM201"` แล้วคลิกชิป (หรือดัก `/api/quota/courses/*` ให้ตอบ `404 ProblemDetail`) | **ส่ง:** `GET /api/quota/courses/DM201?academicYear=2568&semester=1`<br>**ตอบ:** **`404` ProblemDetail** (`"status": 404`, `"detail": "ไม่พบรายวิชา DM201"`)<br>**UI:** แสดง Empty State `"ไม่พบข้อมูลช่องทางขอโควตาสำหรับวิชานี้"` แบบเดียวกับผลค้นหาว่าง หน้าเว็บไม่ค้างหรือ throw unhandled error |

### 3.5 กรณีผิดพลาด (Error Handling & Loading)

| IT ID | กรณี | สถานการณ์ | ขั้นตอน | ผลที่คาดหวัง (UI → API → UI) |
| --- | --- | --- | --- | --- |
| **IT-US7-20** | ปกติ / หน่วง | แสดงสถานะ Loading ระหว่างรอ API ตอบ | 1. หน่วง response ของ `GET /api/quota/courses`<br>2. พิมพ์ `EL395` แล้วกดค้นหา | **ส่ง:** `GET /api/quota/courses?...` 1 ครั้ง<br>**UI:** แสดง skeleton ของการ์ดระหว่างรอ, ป้องกันการยิงซ้ำซ้อน, เมื่อตอบ `200` แล้วแทนด้วยการ์ดจริง |
| **IT-US7-21** | ผิดพลาด (400) | API ตอบ `400 Bad Request` (`QUOTA_SEARCH_QUERY_REQUIRED` หรือ validation error) | 1. ดัก `GET /api/quota/courses` ให้ตอบ `400 ProblemDetail` (`code: "QUOTA_SEARCH_QUERY_REQUIRED"`)<br>2. สั่งค้นหา | **ส่ง:** `GET /api/quota/courses?...`<br>**ตอบ:** `400 ProblemDetail`<br>**UI:** หน้าเว็บไม่พัง ไม่ค้างที่ loading (จัดการ error ได้อย่างเหมาะสม) |
| **IT-US7-22** | ผิดพลาด (401) | Token หมดอายุหรือไม่ถูกต้อง | 1. ดัก `GET /api/quota/courses` ให้ตอบ `401 Unauthorized`<br>2. สั่งค้นหา | **ส่ง:** `GET /api/quota/courses?...` พร้อม `Authorization: Bearer ...`<br>**ตอบ:** `401`<br>**UI:** `apiFetch` เรียก `SessionProvider.expireSession()` และพาผู้ใช้กลับหน้า Login ตาม flow ของ US4 |
| **IT-US7-23** | ผิดพลาด (500) | API ตอบ `500 Internal Server Error` แล้วกดลองใหม่ | 1. ดัก `GET /api/quota/courses` ครั้งแรกให้ตอบ `500`<br>2. ค้นหา `EL395`<br>3. ยกเลิกการดักแล้วกดปุ่ม "ลองใหม่" | **ส่ง:** ครั้งแรกได้ `500`, กดลองใหม่ส่ง `GET /api/quota/courses?...` ซ้ำได้ `200`<br>**UI:** ครั้งแรกแสดง `"ไม่สามารถโหลดข้อมูลโควตาได้ กรุณาลองใหม่อีกครั้ง"` พร้อมปุ่มลองใหม่, หลังกดลองใหม่แสดงการ์ด `EL395` ได้ปกติ |
| **IT-US7-24** | ผิดพลาด (Network) | เครือข่ายล่ม / Offline ระหว่างค้นหา | 1. ตั้งเบราว์เซอร์เป็น Offline (หรือ abort request)<br>2. ค้นหา `EL395` | **ส่ง:** request ล้มเหลวระดับเครือข่าย<br>**UI:** หยุดแสดง skeleton, แสดงข้อความ `"ไม่สามารถโหลดข้อมูลโควตาได้ กรุณาลองใหม่อีกครั้ง"` พร้อมปุ่มลองใหม่ และหน้าเว็บไม่ค้าง |

---

## 4. สรุปความครอบคลุมตาม Definition of Done

| ข้อกำหนด | Test Cases ที่ครอบคลุม |
| --- | --- |
| หน้าเว็บเรียก `GET /api/timetable` (แสดงวิชาในแผนของฉัน) | `IT-US7-01`, `IT-US7-02` |
| หน้าเว็บเรียก `GET /api/quota/courses` (ค้นหาวิชา + `mine=true`) | `IT-US7-03` – `IT-US7-16`, `IT-US7-20` – `IT-US7-24` |
| หน้าเว็บเรียก `GET /api/quota/courses/{courseCode}` (ช่องทางของวิชาเดียว) | `IT-US7-17` – `IT-US7-19` |
| กรณีปกติ (ครบ 4 `quotaStatus`, เงื่อนไข, หลายรอบ/วันเดียว, หลายช่องทาง/ไม่มีลิงก์, `mine=true`, เกิน 50 วิชา) | `IT-US7-01`, `IT-US7-03` – `IT-US7-12`, `IT-US7-17`, `IT-US7-20` |
| กรณีข้อมูลว่าง (ไม่พบวิชา `200 []`, ล้างคำค้นไม่เรียก API, อักขระพิเศษ, ตารางว่าง, `NO_DATA`) | `IT-US7-02`, `IT-US7-13` – `IT-US7-16`, `IT-US7-18` |
| กรณีผิดพลาด (`404`, `400`, `401`, `500`, Network Error) | `IT-US7-19`, `IT-US7-21` – `IT-US7-24` |
