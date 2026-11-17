# US7-T10: ผลการเชื่อมต่อหน้าค้นหาช่องทางขอโควตา UI ↔ API ↔ DB

| รายการ | รายละเอียด |
| --- | --- |
| User Story | **US7: ค้นหาช่องทางการขอโควตาในแต่ละรายวิชา** |
| Task | US7-T10 Integrate Code UI_API_DAO ตาม Sequence Diagram |
| Branch | `feature/US7-T10-integrate-ui-api-dao` |
| โค้ดฐาน | `develop` commit `58e9690` (รวม US7-T07 `#117`, US7-T08 `#115`, US7-T09 `#116` แล้ว) |
| อ้างอิง | [US7 DTO & API Spec (T05)](../T05/US7-DTO-API-Spec.md), Sequence ของ US7-T06: [Search](../T06/US7-T06-Sequence-Diagram-Search.md), [Detail](../T06/US7-T06-Sequence-Diagram-Detail.md) |

## 1. จุดเชื่อมต่อและโค้ดที่ปรับแก้

หน้าค้นหาช่องทางขอโควตาเรียก API จริงทั้งหมด ไม่มี mock data ในโค้ดจริง (`quotaFixtures.ts` ใช้เฉพาะใน unit test):

| ชั้น | ไฟล์ / คลาส | หน้าที่ |
| --- | --- | --- |
| UI | `frontend/features/quota/QuotaSearchPage.tsx`, `useQuotaSearch.ts`, `QuotaSearchBar.tsx`, `QuotaCourseCard.tsx`, `QuotaConditionBox.tsx`, `QuotaRoundList.tsx`, `QuotaChannelBox.tsx`, `QuotaContactRow.tsx`, `QuotaStatusNotice.tsx`, `QuotaEmptyState.tsx`, `QuotaGuide.tsx` | หน้าค้นหา, checkbox เฉพาะวิชาในแผนของฉัน, การ์ดตาม `quotaStatus`, ลิงก์ฟอร์มขอโควตา, กดชิปรหัสวิชา และหน้า Guide |
| UI → API | `frontend/features/quota/api.ts` ผ่าน `lib/api.ts` (`apiFetch` แนบ JWT) และ Next.js rewrite `/api/*` ไป backend | `GET /api/quota/courses`, `GET /api/quota/courses/{courseCode}` |
| UI ↔ ตาราง US1/US6 | `frontend/features/timetable/TimetableWorkspace.tsx`, `MainMenuPage.tsx` | ส่ง `selectedAcademicYear`, `selectedSemester` และ `myCourseCodes` จากตารางเรียนจำลอง และรองรับปุ่มนำทางมาจากหน้ารายละเอียดวิชาเสรี (US6) |
| API | `QuotaController`, `QuotaService` | ตรวจพารามิเตอร์/สิทธิ์, โหลดรหัสวิชาในตารางของผู้ใช้ และคำนวณ `quotaStatus` (`NOT_OFFERED` → `NO_DATA` → `NOT_REQUIRED` → `REQUIRED`) |
| DAO / DB | `JpaQuotaDataReader`, `CourseRepository`, `SectionRepository`, `QuotaInfoRepository`, `QuotaRoundRepository`, `TimetableRepository`, `TimetableEntryRepository` และ Flyway `V20261117_1811`, `V20261117_1812`, `V20261118_0020` | ค้นหารายวิชาทุกหมวด, โหลดภาคที่เปิดสอน, เงื่อนไข, รอบ, ช่องทาง และช่องทางติดต่อจาก SQL Server จริง |

### บั๊กและข้อมูลที่พบและแก้ไขระหว่าง Integrate

1. **บั๊กตารางเรียนว่าง (`frontend/features/quota/useQuotaSearch.ts` + `QuotaSearchPage.test.tsx`):**
   - **ปัญหา:** เดิม `useQuotaSearch` คำนวณ `effectiveState = hasPlan ? state : { status: "idle" }` ทำให้เมื่อตารางเรียนของนักศึกษาว่าง (`myCourseCodes = []`, `hasPlan = false`) ไม่สามารถค้นหาด้วยคำค้นหรือกดชิปวิชาที่อ้างถึงได้เลย (หน้าจะค้างอยู่ที่ `QuotaGuide` ตลอด)
   - **การแก้ไข:** ปรับให้รีเซ็ตเป็น `idle` เฉพาะกรณี `!hasPlan` และคำขอก่อนหน้าเป็นคำขอแบบ `mine === true` (`isStaleMineSearch`) เพื่อให้ค้นหาด้วยคำค้นปกติและกดชิปรหัสวิชาได้แม้ตารางเรียนว่าง รวมถึงปรับ `clear()` ให้ใช้ `effectiveMine` และ `retry()` ให้ตรวจ `effectiveState.status === "error"`
2. **ข้อมูล seed โควตาให้ตรงชีท (`backend/src/main/resources/db/seed/V20261118_0020__seed_quota_from_sheets.sql` + `QuotaMigrationTest.java`):**
   - **ปัญหา:** `V20261117_1812` มีเฉพาะ 6 วิชาตัวอย่าง โดยใส่ `EL295` เป็น `NOT_REQUIRED` (`0`) แทน `REQUIRED` และไม่ได้ใส่ข้อมูลวิชาต้องขอโควตาจากชีท (`EL105`, `ST216`, `AN347`, `FD216`, `IS313`, `TH291`, `EG214`, `FR205`, `JC217`, `AS201`, `PB317`) รวมถึงวิชา `CS*` / `โควตา=FALSE` ที่ต้องเป็น `NOT_REQUIRED`
   - **การแก้ไข:** เพิ่มไฟล์ Flyway seed ใหม่ (ไม่แก้ไฟล์เดิมที่ merge แล้ว) เพื่อปรับ `EL295` เป็น `REQUIRED` และเติมข้อมูลจากชีทให้ครบ โดยผูกรอบคำร้องจากชีทไว้เฉพาะ **ภาคเรียนที่ 2 (`semester = 2`, `academic_year = 2568`)** ส่วนภาค 1 ของวิชาใหม่ (`EL295`, `EL105`, `ST216`, `FD216`, `IS313`, `TH291`, `EG214`) จะยังไม่มีรอบเพื่อให้หน้าเว็บแสดง *"ยังไม่ประกาศช่วงเวลายื่นคำร้องของภาคนี้"* (คงรอบภาค 1 เดิมของ `EL395`/`MA211`/`LAS101` และคง `TU101` เป็น `NO_DATA` เพื่อไม่กระทบเทสต์เดิม) พร้อมอัปเดต `QuotaMigrationTest` ให้ตรวจจำนวนไฟล์หลัง `20261116.1734` เป็น `3`

## 2. สภาพแวดล้อม

- รันครบทั้งชุดด้วย `docker compose up -d --build` (`sqlserver`, `db-init`, `backend` profile `stub-tu`, `frontend` บน `http://localhost:3000`)
- ทดสอบผ่านเบราว์เซอร์จริงที่ `http://localhost:3000` ด้วยบัญชี `6609000001` (มีตารางภาค 1/2568 7 วิชา) และ `6609000004` (ภาค 2/2568 ตารางว่าง 0 วิชา) และยิง API ตรงที่ `http://localhost:8080` สำหรับเส้นทางที่ UI บล็อกไว้ล่วงหน้า (`401`, `400` `QUOTA_SEARCH_QUERY_REQUIRED`, `semester=3`, `q` > 50 ตัวอักษร, `GET /api/quota/courses/DM201` → `404`)
- ข้อมูลตัวอย่างโควตามาจาก Flyway seed `V20261117_1812__seed_quota_examples.sql` และ `V20261118_0020__seed_quota_from_sheets.sql` (ยืนยันผ่าน API จริงทั้งภาค 1 และ 2: `EL295`, `FD216`, `IS313`, `TH291`, `EG214` คืน `REQUIRED` แบบ `rounds=[]` ในภาค 1 และคืนรอบตามชีทในภาค 2; `AN347` คืน `NOT_OFFERED` ในภาค 1 และ `REQUIRED` 4 รอบในภาค 2; `CS100`–`CS440` คืน `NOT_REQUIRED`; `TU101` คง `NO_DATA`; `FR205` ภาค 2 คง `NOT_OFFERED`; หมายเหตุ: `EL105` และ `ST216` ยังมี section เฉพาะภาค 1 ใน seed เดิมของ US8 จึงคืน `REQUIRED` (`rounds=[]`) ในภาค 1 และ `NOT_OFFERED` ในภาค 2)

## 3. ผลการทดสอบอัตโนมัติ

| ส่วน | คำสั่ง | ผล |
| --- | --- | --- |
| Frontend Unit & Integration Tests | `cd frontend && npm test` | **PASS** 29 test files / 258 tests (รวม `QuotaSearchPage.test.tsx` เคสตารางว่างที่เพิ่มใหม่) |
| Frontend Lint & Type Check | `cd frontend && npm run lint && npx tsc --noEmit` | **PASS** 0 errors |
| Backend Tests ทั้งชุด (Unit, DAO, Service, Controller, IT, Context) | `cd backend && sh ./mvnw test` | **PASS** 536 tests (0 failures, 0 errors, 0 skipped — รวม `Quota*` 101 tests, `QuotaApiDaoIntegrationTest` 9/9 และ `BackendApplicationTests`) |

## 4. ผลการทดสอบครบทุกเส้นทางใน Sequence Diagram ของ US7-T06

### 4.1 Search (`GET /api/quota/courses`)

| # | เส้นทาง | วิธีทดสอบ | ผลที่ได้ | สถานะ |
| --- | --- | --- | --- | --- |
| S-01 | เปิดเมนูครั้งแรก (`idle`) | UI `6609000001` เปิดเมนู "ค้นหาช่องทางขอโควตา" | แสดง "ภาคเรียนที่ 1/2568" และ "4 ขั้นตอนการขอโควตาสำหรับนักศึกษา มธ." โดยไม่ยิง API | PASS |
| S-02 | ค้นหาวิชา `REQUIRED` (`EL395`) | UI พิมพ์ `EL395` → กด "ค้นหาข้อมูล" | `200 OK` `total: 1` แสดงการ์ด `EL395` ครบเงื่อนไข (ชิป `EL295`), 2 รอบ, 2 ช่องทาง (`quota-litu.web.app` + ติดต่อหน่วยงาน) และ LITU Facebook | PASS |
| S-03 | ค้นหาวิชา `REQUIRED` พร้อมลิงก์ Google Form (`MA211`) | UI พิมพ์ `MA211` → กด "ค้นหาข้อมูล" และคลิกลิงก์ "ไปยัง forms.gle" | `200 OK` แสดงกำหนดการยื่นคำร้อง, ลิงก์ `https://forms.gle/NWTyPnsVWtyDak3W8` (`target="_blank" rel="noopener noreferrer"`) และเปิดแท็บ/URL ภายนอกไปยัง `forms.gle` | PASS |
| S-04 | วิชาที่ไม่มีข้อมูลโควตา (`NO_DATA`) | UI ค้นหา `TU101` | `200 OK` แสดงการ์ด `TU101` สถานะ `NO_DATA`: "ยังไม่มีข้อมูลช่องทางขอโควตาของรายวิชานี้ กรุณาติดต่อคณะ/ภาควิชาเจ้าของวิชา" | PASS |
| S-05 | วิชาที่ไม่เปิดสอนในภาคที่เลือก (`NOT_OFFERED`) | UI สลับเป็นภาค 2/2568 แล้วค้นหา `FR205` | `200 OK` แสดงป้าย "ภาคเรียนที่ 2/2568" และการ์ด `FR205` สถานะ `NOT_OFFERED`: "วิชานี้เปิดสอนเฉพาะภาคเรียนที่ 1" | PASS |
| S-06 | วิชาที่ไม่มีในระบบ (`DM201` → ผลว่าง) | UI ค้นหา `DM201` | `200 OK` `total: 0`, `courses: []` แสดง "พบทั้งหมด 0 วิชา" และ "ไม่พบข้อมูลช่องทางขอโควตาสำหรับวิชานี้" | PASS |
| S-07 | เฉพาะวิชาในแผนของฉัน (`mine=true`) | UI `6609000001` ติ๊ก "เฉพาะวิชาในแผนของฉัน" (ทดสอบทั้งตารางเดิมและหลังเพิ่ม `MA211` ชั่วคราว) จากนั้นเอาติ๊กออก | `200 OK` `mine=true` แสดงเฉพาะวิชาในตารางพร้อมป้าย "ในแผนการเรียน"; เอาติ๊กออกกลับสู่หน้า Guide | PASS |
| S-08 | ตารางเรียนว่าง (`6609000004` ภาค 2) ค้นหาปกติ | UI ล็อกอิน `6609000004` ภาค 2 (0 วิชา) แล้วค้นหา `EL395` และ `DM201` | checkbox "เฉพาะวิชาในแผนของฉัน" ถูก disable; ค้นหา `EL395` แสดงการ์ดได้ปกติและค้นหา `DM201` แสดง empty state ถูกต้อง (ยืนยันการแก้บั๊ก `useQuotaSearch.ts`) | PASS |
| S-09 | Error พารามิเตอร์ / ไม่มีสิทธิ์ (`400`, `401`) | API ตรง `http://localhost:8080`: ไม่ส่ง token, ไม่ส่ง `q` และ `mine=false`, `semester=3`, `q` ยาว 51 ตัว | ได้ `401` ("กรุณาเข้าสู่ระบบก่อนใช้งาน"), `400` (`QUOTA_SEARCH_QUERY_REQUIRED`), `400` (`Validation failure`) ครบทุกเงื่อนไข | PASS |

### 4.2 Detail (`GET /api/quota/courses/{courseCode}`) และจุดเชื่อมต่อจาก US6

| # | เส้นทาง | วิธีทดสอบ | ผลที่ได้ | สถานะ |
| --- | --- | --- | --- | --- |
| D-01 | กดชิปรหัสวิชาที่อ้างถึง (`EL295`) | UI ในการ์ด `EL395` กดปุ่มชิป `EL295` | ช่องค้นหาเปลี่ยนเป็น `EL295`, เรียก `GET /api/quota/courses/EL295` ได้ `200 OK`, แทนที่ด้วยการ์ด `EL295` (หลังเติม seed `V20261118_0020` คืน `REQUIRED`: ภาค 1 แสดง *"ยังไม่ประกาศช่วงเวลายื่นคำร้องของภาคนี้"* และภาค 2 แสดง 2 รอบ + LITU ตามชีท) | PASS |
| D-02 | ดึงรายละเอียดวิชาไม่มีข้อมูล (`NO_DATA`) | API `GET /api/quota/courses/TU101?academicYear=2568&semester=1` | `200 OK` `quotaStatus: "NO_DATA"` (ไม่ใช่ 404) ตาม Sequence Diagram | PASS |
| D-03 | ดึงรายละเอียดวิชาไม่เปิดในภาค (`NOT_OFFERED`) | API `GET /api/quota/courses/FR205?academicYear=2568&semester=2` | `200 OK` `quotaStatus: "NOT_OFFERED"` | PASS |
| D-04 | ดึงรายละเอียดวิชาที่ไม่มีในตาราง `course` (`404`) | API `GET /api/quota/courses/DM201?academicYear=2568&semester=1` | `404 Not Found` (`detail: "ไม่พบรายวิชา DM201"`) | PASS |
| D-05 | เปิดเมนูจากหน้าแนะนำวิชาเสรี (US6) | UI เปิด modal `FR205` ในหน้า "ดูวิชาเสรีแนะนำ" → กด "ค้นหาช่องทางขอโควตา →" | สลับมายังหน้า "ค้นหาช่องทางขอโควตา" ได้ทันที | PASS |
