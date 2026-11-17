# US7-T10: ผลการเชื่อมต่อหน้าค้นหาช่องทางขอโควตา UI ↔ API ↔ DB

| รายการ | รายละเอียด |
| --- | --- |
| User Story | **US7: ค้นหาช่องทางการขอโควตาในแต่ละรายวิชา** |
| Task | US7-T10 Integrate Code UI_API_DAO ตาม Sequence Diagram |
| Branch | `feature/US7-T10-integrate-ui-api-dao` |
| โค้ดฐาน | `develop` commit `58e9690` (รวม US7-T07 `#117`, US7-T08 `#115`, US7-T09 `#116` แล้ว) |
| อ้างอิง | [US7 DTO & API Spec (T05)](../T05/US7-DTO-API-Spec.md), Sequence ของ US7-T06: [Search](../T06/US7-T06-Sequence-Diagram-Search.md), [Detail](../T06/US7-T06-Sequence-Diagram-Detail.md) |

---

## 1. จุดเชื่อมต่อทั้ง 3 ชั้น (UI ↔ API ↔ DAO/DB)

หน้าค้นหาช่องทางขอโควตาเรียก API จริงทั้งหมด ไม่มี mock data ในโค้ดหน้าเว็บ (`frontend/features/quota/quotaFixtures.ts` ใช้เฉพาะในไฟล์ unit test `*.test.ts(x)`):

| ชั้น | ไฟล์ / คลาส | หน้าที่และจุดเชื่อมต่อ |
| --- | --- | --- |
| **UI Components** | `frontend/features/quota/QuotaSearchPage.tsx`, `useQuotaSearch.ts`, `QuotaSearchBar.tsx`, `QuotaCourseCard.tsx`, `QuotaConditionBox.tsx`, `QuotaRoundList.tsx`, `QuotaChannelBox.tsx`, `QuotaContactRow.tsx`, `QuotaStatusNotice.tsx`, `QuotaEmptyState.tsx`, `QuotaGuide.tsx`, `formatThaiDate.ts` | จัดการสถานะหน้า (`idle` / `loading` / `success` / `notFound` / `error`), ช่องค้นหา (`maxLength=50`), checkbox `"เฉพาะวิชาในแผนของฉัน"`, แสดงการ์ดตาม `quotaStatus`, ลิงก์เปิดแท็บใหม่ (`target="_blank" rel="noopener noreferrer"`), ชิปรหัสวิชาที่อ้างถึง และแปลงวันที่ ISO เป็นภาษาไทย พ.ศ. |
| **UI → API** | `frontend/features/quota/api.ts` ผ่าน `lib/api.ts` (`apiFetch` แนบ JWT) และ Next.js rewrite `/api/*` → `BACKEND_URL` | `searchQuotaCourses` → `GET /api/quota/courses?academicYear=&semester=&q=&mine=`<br>`getCourseQuota` → `GET /api/quota/courses/{courseCode}?academicYear=&semester=` |
| **UI ↔ ตาราง US1/US6** | `frontend/features/timetable/TimetableWorkspace.tsx`, `MainMenuPage.tsx` | ส่ง `selectedAcademicYear`, `selectedSemester` และ `myCourseCodes` (`state.entries.map(e => e.courseCode)`) จากตารางเรียนจำลอง และรองรับการเปิดเมนูจากปุ่ม `"ค้นหาช่องทางขอโควตา →"` ใน modal รายละเอียดวิชาเสรี (US6) |
| **API Layer** | `QuotaController`, `QuotaService`, `CurrentStudentProvider`, `GlobalExceptionHandler`, `SecurityConfig` | ตรวจ JWT (`401`), validate `@RequestParam` (`@Min(1) @Max(2)`, `@Size(max = 50)` → `400`), ตรวจ `q` หรือ `mine=true` (`400 QUOTA_SEARCH_QUERY_REQUIRED`), ตรวจไม่พบวิชา (`404 ResourceNotFoundException`), โหลดวิชาในตารางผู้ใช้ และตัดสิน `quotaStatus` ตามลำดับ `NOT_OFFERED` → `NO_DATA` → `NOT_REQUIRED` → `REQUIRED` |
| **DAO / DB** | `JpaQuotaDataReader`, `CourseRepository`, `SectionRepository`, `QuotaInfoRepository`, `QuotaRoundRepository`, `TimetableRepository`, `TimetableEntryRepository` | Query แบบ batch ลด N+1 (`searchAllCourses`, `findOfferedSemestersByCourseCodesAndYear`, `findWithDetailsByCourseCodes`, `findByCourseCodesAndTerm`) บนตาราง `course`, `section`, `timetable`, `timetable_entry`, `course_quota_info`, `quota_condition`, `quota_round`, `quota_channel`, `quota_contact` |
| **Flyway Schema & Seed** | `V20261117_1811__create_quota_tables.sql`, `V20261117_1812__seed_quota_examples.sql`, `V20261118_0020__seed_quota_from_sheets.sql` | สร้างตารางโควตา + คอลัมน์ `course_name_th` และเติมข้อมูลวิชาจากชีทอ้างอิง |

---

## 2. ปัญหาที่พบและแก้ไขระหว่าง Integrate

### 2.1 บั๊กตารางเรียนว่างค้นหาโควตาไม่ได้ (`frontend/features/quota/useQuotaSearch.ts`)
- **อาการที่พบ:** ใน `useQuotaSearch.ts` เดิมกำหนด `const effectiveState: QuotaSearchState = hasPlan ? state : { status: "idle" }` ทำให้เมื่อผู้ใช้ที่ล็อกอินยังมีตารางเรียนว่าง (`myCourseCodes = []` → `hasPlan = false`) พิมพ์ค้นหาวิชาหรือกดชิปรหัสวิชา แม้ API ตอบ `200 OK` กลับมาแล้ว หน้าเว็บยังคงถูกบังคับกลับเป็น `idle` (`QuotaGuide`) และไม่แสดงผลการค้นหาเลย
- **สาเหตุที่หลุดรอดจาก unit test เดิม:** เคสทดสอบส่วนใหญ่ใน `QuotaSearchPage.test.tsx` ใช้ `MY_TIMETABLE_COURSES` (ไม่ว่าง) ส่วนเคส `myCourseCodes={[]}` ทดสอบเฉพาะการรีเซ็ตหลังเปิด filter `"เฉพาะวิชาในแผนของฉัน"`
- **การแก้ไข:**
  - ปรับ `useQuotaSearch.ts` ให้รีเซ็ตเป็น `{ status: "idle" }` เฉพาะกรณี `!hasPlan` และคำขอก่อนหน้าใช้ filter `mine === true` (`isStaleMineSearch`) เพื่อให้ค้นหาด้วยคำค้นปกติและกดชิปรหัสวิชาได้ตามปกติเมื่อตารางเรียนว่าง
  - ปรับ `clear()` ให้ส่ง `mine: effectiveMine` และ `retry()` ให้ตรวจ `effectiveState.status === "error"`
  - เพิ่ม regression test `"ค้นหาด้วยรหัสวิชาและกดชิปวิชาที่อ้างถึงได้ปกติแม้ตารางเรียนว่าง (myCourseCodes ว่าง)"` ใน `frontend/features/quota/QuotaSearchPage.test.tsx`

### 2.2 ข้อมูล Seed โควตาไม่ตรงกับชีทต้นทาง (`V20261118_0020__seed_quota_from_sheets.sql`)
- **อาการที่พบ:** `V20261117_1812__seed_quota_examples.sql` (จาก US7-T09) ใส่ข้อมูลไว้เฉพาะ 6 วิชาตัวอย่าง โดยใส่ `EL295` เป็น `quota_required = 0` (`NOT_REQUIRED`) แทน `REQUIRED`, และยังไม่ได้ใส่ข้อมูลวิชาต้องขอโควตาตัวอื่นจากชีท รวมถึงวิชา `CS*` (ยกเว้น `CS232`) ทำให้หลายวิชาขึ้น `NO_DATA`
- **การแก้ไข (ตามกติกา Flyway ใน `CONTRIBUTING.md` โดยไม่แก้ไฟล์ seed/migration ที่ merge แล้ว):**
  - สร้างไฟล์ใหม่ `backend/src/main/resources/db/seed/V20261118_0020__seed_quota_from_sheets.sql`:
    - อัปเดต `EL295` จาก `0` เป็น `1` (`REQUIRED`) พร้อมช่องทางและติดต่อ LITU ตามชีท
    - เติมวิชาต้องขอโควตาจากชีท (`EL105`, `ST216`, `AN347`, `FD216`, `IS313`, `TH291`, `EG214`) พร้อมช่องทาง, ช่องทางติดต่อ และรอบยื่นคำร้อง และใส่ `quota_required = 1` ให้ `FR205`, `JC217`, `AS201`, `PB317`
    - เติม `quota_required = 0` (`NOT_REQUIRED`) ให้วิชา `CS*` (`CS100`–`CS440`) และวิชาที่ระบุ `โควตา = FALSE` ในชีท โดย **คง `TU101` ไว้ไม่มีแถวใน `course_quota_info` (`NO_DATA`)** และคงข้อมูลเดิมของ `EL395`, `MA211`, `LAS101`, `PC280`, `CS232` เพื่อไม่กระทบเทสต์เดิม
    - ผูกรอบคำร้องจากชีทไว้เฉพาะ **ภาคเรียนที่ 2 (`semester = 2`, `academic_year = 2568`)** เพื่อให้ภาคเรียนที่ 2 แสดงวัน/เวลาตามชีท และภาคเรียนที่ 1 ของวิชาที่เพิ่มใหม่ (`EL295`, `EL105`, `ST216`, `FD216`, `IS313`, `TH291`, `EG214`) ไม่มีรอบ → หน้าเว็บแสดง *"ยังไม่ประกาศช่วงเวลายื่นคำร้องของภาคนี้"* (ส่วน `EL395`, `MA211`, `LAS101` คงรอบภาค 1 เดิมจาก `V20261117_1812` ไว้ตาม `QuotaApiDaoIntegrationTest`)
  - อัปเดต `QuotaMigrationTest.java` บรรทัดที่ 54 ให้ตรวจจำนวน migration/seed หลัง `20261116.1734` จาก `2` เป็น `3`

---

## 3. สภาพแวดล้อมการทดสอบ

- **Stack ทั้งชุด:** `docker compose down -v && docker compose up -d --build` (`sqlserver` SQL Server 2025, `db-init`, `backend` Spring Boot 4.1.1 profile `stub-tu` บน `http://localhost:8080`, `frontend` Next.js บน `http://localhost:3000`)
- **บัญชีทดสอบ (stub):**
  - `6609000001` / `Passw0rd!` (ทดสอบทั้งกรณีมีตาราง 7 วิชา และหลังรีเซ็ต DB ตารางว่าง 0 วิชา ในภาค 1/2568 และภาค 2/2568)
  - `6609000004` / `Passw0rd!` (ทดสอบกรณีตารางเรียนว่าง 0 วิชาในภาค 2/2568)
- **ช่องทางทดสอบ:**
  - ทดสอบผ่านเบราว์เซอร์จริงที่ `http://localhost:3000` สำหรับ flow ที่ผู้ใช้กดจากหน้าเว็บได้
  - ทดสอบยิง API ตรงที่ `http://localhost:8080` (แนบ JWT จาก `POST /api/auth/login`) สำหรับกรณีที่ UI ป้องกันไว้ล่วงหน้า (`401`, `400`, `404` วิชาเดี่ยว และตรวจเทียบภาค 1 กับภาค 2 ครบทุกวิชาจากชีท)

---

## 4. ผลการทดสอบอัตโนมัติ (Automated Tests)

รันซ้ำหลังแก้ไขโค้ดและไฟล์ seed รอบสุดท้ายครบทุกชุด:

| ชุดทดสอบ | คำสั่ง | ผลลัพธ์ |
| --- | --- | --- |
| **Frontend Unit & Integration** | `cd frontend && npm test` | **PASS** — 29 test files / 258 tests (รวม `features/quota/` 7 test files และเคส regression ตารางว่างที่เพิ่มใหม่) |
| **Frontend Lint & Type Check** | `cd frontend && npm run lint && npx tsc --noEmit` | **PASS** — 0 errors |
| **Backend Tests ทั้งชุด** | `cd backend && sh ./mvnw test` | **PASS** — 536 tests (0 failures, 0 errors, 0 skipped) รวม `Quota*` 101 tests, `QuotaApiDaoIntegrationTest` 9/9, `QuotaMigrationTest` 2/2 และ `BackendApplicationTests` 1/1 |

---

## 5. ผลการทดสอบครบทุกเส้นทางใน Sequence Diagram ของ US7-T06

### 5.1 Search (`GET /api/quota/courses`)

| # | เส้นทางใน Sequence / เงื่อนไข | วิธีทดสอบและข้อมูลที่ใช้ | ผลที่สังเกตได้จริง (HTTP + UI) | สถานะ |
| --- | --- | --- | --- | --- |
| **S-01** | เปิดหน้าครั้งแรก (`idle`) ไม่เรียก API | UI `6609000001` กดเมนู `"ค้นหาช่องทางขอโควตา"` | แสดงป้าย `"ภาคเรียนที่ 1/2568"` และการ์ด `"4 ขั้นตอนการขอโควตาสำหรับนักศึกษา มธ."` (`GUIDE & PROCESS`) ไม่ยิง request ใด ๆ | **PASS** |
| **S-02** | ค้นหาวิชา `REQUIRED` มีเงื่อนไข + หลายช่องทาง + ติดต่อ (`EL395`) | UI ภาค 1 พิมพ์ `EL395` → กด `"ค้นหาข้อมูล"` | `200 OK` (`total: 1`) แสดงการ์ด `EL395`, เงื่อนไขพร้อมชิป `EL295`, รอบ 2 รอบ (`คำร้องช่วงต้น`, `คำร้องรอบสอง`), 2 ช่องทาง (`ไปยัง quota-litu.web.app` และ `ติดต่อสถาบันภาษา`) และติดต่อ LITU | **PASS** |
| **S-03** | ค้นหาวิชา `REQUIRED` และเปิดลิงก์ฟอร์มขอโควตา (`MA211`) | UI ภาค 1 พิมพ์ `MA211` → กด `"ค้นหาข้อมูล"` และคลิกปุ่ม `"ไปยัง forms.gle"` | `200 OK` แสดง `"กำหนดการ · ยื่นคำร้องภายใน 20 สิงหาคม 2568 เวลา 15:00 น."`, ลิงก์ `href="https://forms.gle/NWTyPnsVWtyDak3W8"` (`target="_blank" rel="noopener noreferrer"`) และการคลิกส่งออกไปยัง `https://forms.gle` | **PASS** |
| **S-04** | วิชา `REQUIRED` ภาค 1 ที่ยังไม่ประกาศรอบ (`EL295`) vs ภาค 2 (`EL295`) | UI ภาค 1 (กดชิป `EL295`) และสลับไปภาค 2 ค้นหา `EL295` | ภาค 1 ได้ `200 OK` (`rounds: []`) แสดง `"ยังไม่ประกาศช่วงเวลายื่นคำร้องของภาคนี้"` · ภาค 2 ได้ `200 OK` แสดง `"เปิดรับทั้งหมด 2 รอบ"` (`5 - 9 ตุลาคม 2568` และ `1 - 4 ธันวาคม 2568`) พร้อมปุ่ม `ไปยัง quota-litu.web.app` | **PASS** |
| **S-05** | วิชา `REQUIRED` ภาค 2 แยกรอบตามรหัสนักศึกษา (`AN347`) | UI ภาค 2 ค้นหา `AN347` | `200 OK` (`total: 1`) แสดง `AN347 ARCHAEOLOGY OF DEATH / โบราณคดีความตาย`, `"เปิดรับทั้งหมด 4 รอบ"` (`รหัส 65-66` 6 ต.ค., `รหัส 67` 7 ต.ค., `รหัส 68` 8 ต.ค., `รหัส 69` 9 ต.ค. `เวลา 16:00 น.`), ปุ่ม `ไปยัง quota.socanth.tu.ac.th` และ Facebook คณะ | **PASS** |
| **S-06** | วิชาที่ไม่ต้องขอโควตา (`NOT_REQUIRED`) | UI ภาค 1 ค้นหา `CS100` | `200 OK` (`total: 1`, `quotaStatus: "NOT_REQUIRED"`) แสดง `"รายวิชานี้ไม่ต้องขอโควตา"` | **PASS** |
| **S-07** | วิชาที่มีในระบบแต่ยังไม่มีข้อมูลโควตา (`NO_DATA`) | UI ภาค 1 ค้นหา `TU101` | `200 OK` (`total: 1`, `quotaStatus: "NO_DATA"`) แสดง `"ยังไม่มีข้อมูลช่องทางขอโควตาของรายวิชานี้ กรุณาติดต่อคณะ/ภาควิชาเจ้าของวิชา"` | **PASS** |
| **S-08** | วิชาที่ไม่เปิดสอนในภาคที่เลือก (`NOT_OFFERED`) | UI สลับเป็นภาค 2/2568 แล้วค้นหา `FR205` | `200 OK` (`total: 1`, `quotaStatus: "NOT_OFFERED"`, `offeredSemesters: [1]`) แสดง `"วิชานี้เปิดสอนเฉพาะภาคเรียนที่ 1"` | **PASS** |
| **S-09** | วิชาที่ไม่มีในระบบ (`DM201` → `courses: []`) | UI ค้นหา `DM201` (ทดสอบทั้งภาค 1 และภาค 2) | `200 OK` (`total: 0`, `courses: []`) แสดง `"พบทั้งหมด 0 วิชา"` และ `"ไม่พบข้อมูลช่องทางขอโควตาสำหรับวิชานี้ · ยังไม่มีข้อมูลช่องทางการขอโควตา สำหรับรายวิชา DM201 ในระบบ"` | **PASS** |
| **S-10** | ตัวกรอง `"เฉพาะวิชาในแผนของฉัน"` (`mine=true`) เมื่อมีตารางเรียน | UI `6609000001` (มี 7 วิชา และทดลองเพิ่ม `MA211`) ติ๊ก checkbox แล้วเอาออก | `200 OK` (`mine=true`) แสดงเฉพาะวิชาในตารางพร้อมป้าย `"ในแผนการเรียน"`; เมื่อเอาติ๊กออกตอนช่องว่าง กลับสู่หน้า Guide โดยไม่ยิง API | **PASS** |
| **S-11** | ค้นหาเมื่อตารางเรียนว่าง 0 วิชา (ตรวจแก้บั๊ก `useQuotaSearch.ts`) | UI `6609000001` (ภาค 1 ตารางว่างหลังรีเซ็ต DB) และ `6609000004` (ภาค 2 ตารางว่าง) | checkbox `"เฉพาะวิชาในแผนของฉัน"` ถูก `disabled`; ค้นหา `EL395`, `CS100`, `TU101`, `DM201` แสดงผลลัพธ์ได้ครบปกติไม่ค้างที่หน้า Guide | **PASS** |
| **S-12** | Validation / Business Rule / Security Error (`400`, `401`) | API ตรง `http://localhost:8080`: (ก) ไม่มี token (ข) ไม่ส่ง `q` และ `mine=false` (ค) `semester=3` (ง) `q` ยาว 51 ตัวอักษร | (ก) `401` `"กรุณาเข้าสู่ระบบก่อนใช้งาน"`<br>(ข) `400` `QUOTA_SEARCH_QUERY_REQUIRED`<br>(ค) `400` `Validation failure`<br>(ง) `400` `Validation failure` | **PASS** |

### 5.2 Detail (`GET /api/quota/courses/{courseCode}`) และการนำทางจาก US6

| # | เส้นทางใน Sequence / เงื่อนไข | วิธีทดสอบและข้อมูลที่ใช้ | ผลที่สังเกตได้จริง (HTTP + UI) | สถานะ |
| --- | --- | --- | --- | --- |
| **D-01** | กดชิปรหัสวิชาที่อ้างถึง (`EL295`) ในเงื่อนไขของ `EL395` | UI ภาค 1/2568 ในการ์ด `EL395` กดปุ่มชิป `EL295` | ช่องค้นหาเปลี่ยนเป็น `EL295`, เรียก `GET /api/quota/courses/EL295?academicYear=2568&semester=1` ได้ `200 OK` (`REQUIRED`, `rounds: []`), แทนที่ด้วยการ์ด `EL295` แสดง `"ยังไม่ประกาศช่วงเวลายื่นคำร้องของภาคนี้"` + ช่องทาง LITU | **PASS** |
| **D-02** | ดึงวิชาไม่มีข้อมูลโควตา (`NO_DATA`) ตอบ `200` ไม่ใช่ `404` | API `GET /api/quota/courses/TU101?academicYear=2568&semester=1` | `200 OK` `quotaStatus: "NO_DATA"` และ list ทั้งหมดเป็น `[]` | **PASS** |
| **D-03** | ดึงวิชาไม่เปิดสอนในภาคที่ขอ (`NOT_OFFERED`) | API `GET /api/quota/courses/FR205?academicYear=2568&semester=2` | `200 OK` `quotaStatus: "NOT_OFFERED"`, `offeredSemesters: [1]` | **PASS** |
| **D-04** | ดึงวิชาที่ไม่มีในตาราง `course` (`404`) | API `GET /api/quota/courses/DM201?academicYear=2568&semester=1` | `404 Not Found` (`detail: "ไม่พบรายวิชา DM201"`) | **PASS** |
| **D-05** | เปิดเมนูจากหน้าแนะนำวิชาเสรี (US6) | UI เปิด modal `FR205` ใน `"ดูวิชาเสรีแนะนำ"` → กด `"ค้นหาช่องทางขอโควตา →"` | สลับมายังเมนู `"ค้นหาช่องทางขอโควตา"` ได้ทันที | **PASS** |

---

## 6. ผลการตรวจข้อมูลโควตาจาก API จริงเทียบภาค 1 และภาค 2 (`2568`)

ผลยิงจริงที่ `GET /api/quota/courses/{courseCode}?academicYear=2568&semester={1|2}` หลังใช้ `V20261118_0020__seed_quota_from_sheets.sql`:

| รหัสวิชา | ภาคเรียนที่ 1 (`2568/1`) | ภาคเรียนที่ 2 (`2568/2`) | หมายเหตุ |
| --- | --- | --- | --- |
| `EL295` | `REQUIRED` (`rounds=0`) | `REQUIRED` (`rounds=2`) | ภาค 1 แสดงยังไม่ประกาศรอบ / ภาค 2 แสดง 2 รอบตามชีท |
| `EL395` | `REQUIRED` (`rounds=2`) | `REQUIRED` (`rounds=2`) | ภาค 1 คงตัวอย่างเดิมของ T09 / ภาค 2 ตามชีท |
| `MA211` | `REQUIRED` (`rounds=1`) | `REQUIRED` (`rounds=1`) | ภาค 1 คงตัวอย่างเดิมของ T09 / ภาค 2 ตามชีท |
| `LAS101` | `REQUIRED` (`rounds=2`) | `REQUIRED` (`rounds=2`) | ภาค 1 คงตัวอย่างเดิมของ T09 / ภาค 2 ตามชีท |
| `FD216` | `REQUIRED` (`rounds=0`) | `REQUIRED` (`rounds=1`) | ภาค 1 ยังไม่ประกาศรอบ / ภาค 2 ตามชีท |
| `IS313` | `REQUIRED` (`rounds=0`) | `REQUIRED` (`rounds=3`) | ภาค 1 ยังไม่ประกาศรอบ / ภาค 2 ครบ 3 รอบตามชีท |
| `TH291` | `REQUIRED` (`rounds=0`) | `REQUIRED` (`rounds=2`) | ภาค 1 ยังไม่ประกาศรอบ / ภาค 2 ตามชีท |
| `EG214` | `REQUIRED` (`rounds=0`) | `REQUIRED` (`rounds=2`) | ภาค 1 ยังไม่ประกาศรอบ / ภาค 2 ตามชีท |
| `AN347` | `NOT_OFFERED` (`rounds=0`) | `REQUIRED` (`rounds=4`) | เปิดเฉพาะภาค 2 แสดงครบ 4 รอบตามรหัสนักศึกษา |
| `EL105` | `REQUIRED` (`rounds=0`) | `NOT_OFFERED` (`rounds=0`) | Seed ของ US8 มี section เฉพาะภาค 1 |
| `ST216` | `REQUIRED` (`rounds=0`) | `NOT_OFFERED` (`rounds=0`) | Seed ของ US8 มี section เฉพาะภาค 1 |
| `CS100` | `NOT_REQUIRED` (`rounds=0`) | `NOT_OFFERED` (`rounds=0`) | วิชา `CS*` ที่เปิดภาค 1 ไม่ต้องขอโควตา |
| `TU101` | `NO_DATA` (`rounds=0`) | `NO_DATA` (`rounds=0`) | คงไว้ตาม `US7-T14` และ `QuotaMigrationTest` |

---

## 7. ข้อสังเกตและข้อจำกัด

- **`EL105` และ `ST216` ในภาค 2:** ใน seed เดิมของ US8 (`V20261114_2100__seed_study_plans.sql`) ทั้งสองวิชามีแถวในตาราง `section` เฉพาะ `2568/1` จึงทำให้เมื่อค้นหาใน `2568/2` ระบบตอบ `NOT_OFFERED` ตามลำดับความสำคัญใน `US7-DTO-API-Spec` (ยังไม่เพิ่ม `section` ของ US8/US1 ใน PR นี้เพื่อลดผลกระทบข้าม story)
- **การแสดงผลเวลาของ `AN347`:** `QuotaRoundResponse` มีเฉพาะ `endTime` (ไม่มี `startTime` ใน DTO/UI ของ T05/T07) หน้าเว็บจึงแสดงเฉพาะเวลาสิ้นสุด `"เวลา 16:00 น."`
- **ปีการศึกษา:** รอบคำร้องทั้งหมดผูกกับ `academic_year = 2568` (ค.ศ. 2025) ให้ตรงกับระบบจัดตารางเรียนของ US1/US6/US8 (ข้อมูลวันที่/เดือนในชีทตรงกัน ต่างเฉพาะปี 2569 ในชีทต้นทาง)
- **ลิงก์ภายนอก (`forms.gle`):** ในเบราว์เซอร์ทดสอบของ sandbox ระบบบล็อกการเปิดโดเมนภายนอก `https://forms.gle` เมื่อคลิก แต่ตรวจสอบยืนยัน attribute `href="https://forms.gle/NWTyPnsVWtyDak3W8"`, `target="_blank"`, `rel="noopener noreferrer"` และความพยายามเปิดหน้าต่างใหม่ครบถ้วน

---

## 8. วิธีทำซ้ำ (Reproduction)

1. คัดลอก `.env.example` เป็น `.env` แล้วตั้ง `SPRING_PROFILES_ACTIVE=stub-tu`
2. สตาร์ทระบบทั้งชุด:
   ```bash
   docker compose down -v && docker compose up -d --build
   ```
3. เปิด `http://localhost:3000` แล้วล็อกอินด้วย `6609000001` / `Passw0rd!` (หรือ `6609000004` / `Passw0rd!`)
4. ทดสอบในหน้า `"ค้นหาช่องทางขอโควตา"` ทั้งภาค `1/2568` และภาค `2/2568` ตามตารางหัวข้อ 5
5. รันชุดทดสอบอัตโนมัติ:
   ```bash
   cd frontend && npm test && npm run lint && npx tsc --noEmit
   cd ../backend && sh ./mvnw test
   ```
