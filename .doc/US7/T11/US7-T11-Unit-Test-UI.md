# US7-T11: Design Unit Test Cases ส่วน UI

## User Story

US7: ในฐานะนักศึกษามหาวิทยาลัยธรรมศาสตร์ ที่กำลังวางแผนลงทะเบียนเรียน  
I want to: ค้นหาช่องทางและรอบเวลายื่นคำร้องขอโควตาในแต่ละรายวิชา  
So that: ฉันสามารถเตรียมตัวยื่นคำร้องขอโควตาได้ถูกต้อง ทันเวลา และไม่พลาดวิชาที่ต้องการเรียน

---

## 1. วัตถุประสงค์ (Objective)

ออกแบบ Unit Test Cases สำหรับส่วนต่อประสานผู้ใช้ (UI Components) ของหน้า **"ค้นหาช่องทางขอโควตา"** (`frontend/features/quota/`) และฟังก์ชันยูทิลิตี `formatThaiDate.ts` เพื่อใช้เป็นข้อกำหนดในการเขียน Unit Test ด้วย Vitest และ React Testing Library (US7-T17) ครอบคลุมการทำงานของ Component หลักทุกตัว การโต้ตอบของผู้ใช้ (User Interactions) การเปิดลิงก์ภายนอกอย่างปลอดภัย การแสดงผลตามสถานะโควตาทั้ง 4 รูปแบบ การจัดการข้อมูลว่าง และข้อผิดพลาดจาก API

---

## 2. ขอบเขตการทดสอบ (Scope)

- หน้าเริ่มต้นและคำแนะนำ (`QuotaGuide`): การแสดงผลการ์ด 4 ขั้นตอนการขอโควตาเมื่อยังไม่มีการค้นหา
- แถบค้นหาและตัวกรอง (`QuotaSearchBar`): การพิมพ์ค้นหา, การกดปุ่ม "ค้นหาข้อมูล", การกด Enter, การกดปุ่มล้างคำค้น (×), การแสดงผลและควบคุม checkbox "เฉพาะวิชาในแผนของฉัน" (ทั้งกรณีมีวิชาในตารางและตารางว่าง)
- การ์ดรายวิชา (`QuotaCourseCard`): การแสดงข้อมูลส่วนหัว (รหัสวิชาตัวใหญ่, ชื่ออังกฤษ, ชื่อไทย, หมวดวิชาตาม US1, หน่วยกิต, ป้าย "ในแผนการเรียน")
- รายละเอียดของวิชาที่ต้องขอโควตา (`REQUIRED`):
  - เงื่อนไขและข้อกำหนด (`QuotaConditionBox`) พร้อมชิปรหัสวิชาที่กดได้ (`relatedCourseCode`) และกรณีไม่มีชิป
  - ช่วงเวลายื่นคำร้อง (`QuotaRoundList`) ทั้งแบบช่วงวันที่และกำหนดส่งวันเดียวพร้อมเวลาสิ้นสุด
  - ช่องทางการขอโควตา (`QuotaChannelBox`) ทั้งแบบมี URL (เปิดแท็บใหม่) และแบบไม่มี URL (ยื่นเอกสารที่คณะ) รวมถึงกรณีมีหลายช่องทางในกล่องเดียว
  - ช่องทางติดต่อคณะ/ภาควิชา (`QuotaContactRow`) ทั้งกรณีมี URL และไม่มี URL
- ความปลอดภัยของลิงก์ภายนอก: การเปิดลิงก์ในแท็บใหม่ด้วย `target="_blank"` และ `rel="noopener noreferrer"`
- สถานะโควตาอื่น ๆ (`QuotaStatusNotice`): ไม่ต้องขอโควตา (`NOT_REQUIRED`), ไม่เปิดสอนในภาคนี้ (`NOT_OFFERED`) ทั้งกรณีมีภาคที่เปิดและไม่เปิดเลยทั้งปี, และยังไม่มีข้อมูล (`NO_DATA`)
- กรณีค้นหาไม่พบข้อมูล (`QuotaEmptyState`): ผลค้นหาว่าง (`courses: []`) และกรณีดึงวิชาเดี่ยวได้ 404
- การทำงานระดับหน้าจอ (`QuotaSearchPage`): การสลับแสดงหน้า Guide, การกดชิปแล้วดึงข้อมูลวิชาเดี่ยว, Loading Skeleton, และ Error State พร้อมปุ่ม "ลองใหม่"
- ฟังก์ชันยูทิลิตี `formatThaiDate.ts`: การแปลงวันที่เดี่ยว, ช่วงวันในเดือนเดียวกัน, คนละเดือน, ข้ามปี, และการป้องกัน Timezone Shift

---

## 3. ขอบเขตที่ไม่ทดสอบใน Unit Test (Out of Scope)

- ไม่เชื่อมต่อ backend หรือฐานข้อมูลจริง (จำลอง API Response ด้วย Mock ทั้งหมด)
- การตรวจสอบสิทธิ์ JWT และการหมดอายุ (401 Unauthorized) เนื่องจากถูกจัดการโดย `apiFetch` และ `SessionProvider` ส่วนกลางตาม US4
- การบันทึกหรือแก้ไขข้อมูลโควตา (US7 เป็นฟีเจอร์อ่านอย่างเดียว)
- ไม่ทดสอบ CSS สีหรือสไตล์ที่เจาะจง (เช่น เช็กสีแดง/เขียว/เหลืองโดยตรง) โดยเปลี่ยนมาตรวจสอบผ่าน Accessible Role, Accessible Name, Text Content, Badge Content หรือ Semantic Data Attributes เช่น `data-status`

---

## 4. เอกสารอ้างอิงและ Dependency

- US7-T05: [US7 DTO & API Spec](../T05/US7-DTO-API-Spec.md), [US7 DTO Class Diagram](../T05/US7-DTO-Class-Diagram.md), [US7 API Class Diagram](../T05/US7-API-Class-Diagram.md)
- UI Prototype: ภาพหน้าจอทั้ง 6 หน้าใน Canva Prototype (`.doc/US7/T05/ui/`):
  - `US7-UI-01-initial.png`: หน้าแรก 4 ขั้นตอน
  - `US7-UI-02-search-EL395.png`: ผลการค้นหา EL395 (REQUIRED มีเงื่อนไข)
  - `US7-UI-03-my-timetable.png`: เลือกเฉพาะวิชาในแผนของฉัน (MA211, LAS101)
  - `US7-UI-04-not-found.png`: ค้นหาไม่พบข้อมูล (DM201)
  - `US7-UI-05-not-required.png`: วิชาไม่ต้องขอโควตา (CS232)
  - `US7-UI-06-not-offered.png`: วิชาไม่เปิดสอนในภาคนี้ (FR205)
- หมวดหมู่วิชาอ้างอิงตาม US1: `MAJOR` = "วิชาเฉพาะ", `GENERAL_EDUCATION` = "ศึกษาทั่วไป", `FREE_ELECTIVE` = "วิชาเลือกเสรี"
- เครื่องมือทดสอบ: Vitest และ React Testing Library (`@testing-library/react`, `@testing-library/user-event`) ที่มีอยู่ใน `frontend/package.json`

---

## 5. แนวทางการทดสอบ (Test Approach)

- Render Component ด้วย Props หรือ Mock Context ที่ควบคุมได้
- ตรวจสอบพฤติกรรมผ่าน Accessible Queries (`getByRole`, `getByText`, `getByLabelText`, `getByPlaceholderText`) ตามมาตรฐาน React Testing Library
- Mock API Boundary ของฟังก์ชันค้นหา (`GET /api/quota/courses`) และดึงวิชาเดี่ยว (`GET /api/quota/courses/{courseCode}`)
- การทดสอบแบ่งเป็น 2 ระดับ:
  1. **Component-level Unit Tests:** ทดสอบ Input, Events, Conditional Rendering และ Callback ของแต่ละ Component ย่อย
  2. **Page-level Integration Tests (`QuotaSearchPage`):** ทดสอบ State Management, Flow การค้นหา, การสลับหน้าจอระหว่าง Guide/Results/Empty/Error และการกดชิปเพื่อดึงวิชาเดี่ยว
- หมายเหตุ: เอกสารฉบับนี้เป็นการออกแบบกรณีทดสอบล่วงหน้า ชื่อ Component, Route, Test file path และ Props สามารถปรับปรุงให้ตรงกับ Implementation จริงได้ โดยยังคงพฤติกรรมและเงื่อนไขตามที่ระบุใน Expected Result

---

## 6. โครงสร้าง Component ที่ทดสอบ

```
frontend/features/quota/
├── QuotaSearchPage.tsx       # Component หน้าหลัก ควบคุม State คำค้น, ผลลัพธ์ และการเรียก API
├── QuotaSearchBar.tsx        # ช่องกรอกคำค้น ปุ่มค้นหาข้อมูล ปุ่มล้าง (×) และ Checkbox แผนของฉัน
├── QuotaGuide.tsx            # การ์ดคำแนะนำ 4 ขั้นตอนการขอโควตา (หน้าแรก)
├── QuotaCourseCard.tsx       # การ์ดรายวิชา แสดงส่วนหัว และเลือกเนื้อหาตาม quotaStatus
├── QuotaConditionBox.tsx     # แสดงเงื่อนไข พร้อมชิปรหัสวิชา (relatedCourseCode)
├── QuotaRoundList.tsx        # แสดงรายการช่วงเวลายื่นคำร้อง แปลงวันที่ไทย พ.ศ.
├── QuotaChannelBox.tsx       # แสดงช่องทางการขอโควตา และปุ่มลิงก์ภายนอก
├── QuotaContactRow.tsx       # แสดงช่องทางติดต่อคณะ/ภาควิชา
├── QuotaStatusNotice.tsx     # กล่องแจ้งสถานะ NOT_REQUIRED, NOT_OFFERED, NO_DATA
├── QuotaEmptyState.tsx       # แสดงข้อความเมื่อค้นหาไม่พบข้อมูล
└── formatThaiDate.ts         # ยูทิลิตีแปลงวันที่ ISO เป็นภาษาไทย พ.ศ.
```

---

## 7. ข้อมูลทดสอบจำลอง (Mock Test Data)

| รหัสชุดข้อมูล | รายละเอียด | นำไปใช้ในเคส |
|:---|:---|:---|
| `COURSE_EL395` | `quotaStatus: "REQUIRED"`, มี 1 เงื่อนไขอ้างอิง `EL295`, 2 รอบยื่นคำร้อง, ช่องทาง `QUOTA_SYSTEM`, ติดต่อ LITU, `inMyTimetable: false`, `courseNameTh` มีค่า | UT-UI-11, 12, 13, 16, 19, 21, 27 |
| `COURSE_MA211` | `quotaStatus: "REQUIRED"`, ไม่มีเงื่อนไข, 1 รอบกำหนดส่งวันเดียว (`startDate: null`, `endTime: "15:00"`), ช่องทาง `ONLINE_FORM`, `inMyTimetable: true`, `category: "MAJOR"` | UT-UI-11, 15, 17, 19 |
| `COURSE_NO_TH_NAME` | `quotaStatus: "REQUIRED"`, `courseNameTh: null` | UT-UI-12 |
| `COURSE_NO_CHIP` | `quotaStatus: "REQUIRED"`, มี `conditions` แต่ `relatedCourseCode: null` | UT-UI-14 |
| `COURSE_MULTI_CHANNELS` | `quotaStatus: "REQUIRED"`, มี 2 ช่องทาง: ตัวแรกมี `url`, ตัวที่สอง `channelType: "FACULTY_OFFICE"` และ `url: null` มี `note` | UT-UI-20 |
| `COURSE_CONTACT_NO_URL` | `quotaStatus: "REQUIRED"`, `contacts` มี 1 รายการที่ `url: null` | UT-UI-21 |
| `COURSE_NO_ROUNDS` | `quotaStatus: "REQUIRED"`, `rounds: []` | UT-UI-18 |
| `COURSE_CS232` | `quotaStatus: "NOT_REQUIRED"`, `category: "MAJOR"` | UT-UI-22 |
| `COURSE_FR205` | `quotaStatus: "NOT_OFFERED"`, `offeredSemesters: [1]` | UT-UI-23 |
| `COURSE_NOT_OFFERED_YEAR` | `quotaStatus: "NOT_OFFERED"`, `offeredSemesters: []` | UT-UI-24 |
| `COURSE_TU101` | `quotaStatus: "NO_DATA"`, `category: "GENERAL_EDUCATION"` | UT-UI-25 |
| `SEARCH_EMPTY` | `total: 0`, `courses: []` | UT-UI-26 |
| `MY_TIMETABLE_COURSES` | `["MA211", "LAS101"]` (รายวิชาในตารางเรียนของนักศึกษา) | UT-UI-06, 08 |

---

## 8. กรณีทดสอบ (Unit Test Cases)

### กลุ่มที่ 1: ช่องค้นหา ตัวกรอง และหน้าเริ่มต้น

#### [UT-UI-01] แสดงผลหน้าเริ่มต้นเมื่อยังไม่มีการค้นหา (Initial State)
- Component: `QuotaSearchPage`
- สถานการณ์: ผู้ใช้เปิดเข้ามายังหน้า "ค้นหาช่องทางขอโควตา" เป็นครั้งแรก
- Preconditions: Render ด้วย `academicYear=2568`, `semester=1`, ช่องค้นหาเป็นค่าว่าง และ checkbox ไม่ได้เลือก
- Test Steps:
  1. Render `QuotaSearchPage`
  2. ตรวจสอบองค์ประกอบบนหน้าจอ
- Expected Result:
  - แสดงหัวข้อหน้า "ค้นหาช่องทางขอโควตา" พร้อมป้าย "ภาคเรียนที่ 1/2568"
  - แสดงกล่องข้อความ "ข้อควรรู้สำคัญเกี่ยวกับการขอโควตารายวิชา"
  - ช่องค้นหามี placeholder "ค้นหาด้วยรหัสวิชา หรือชื่อวิชา เช่น MA211" และมีค่าว่าง
  - แสดง Component `QuotaGuide` แสดง "4 ขั้นตอนการขอโควตาสำหรับนักศึกษา มธ."
  - ไม่แสดงข้อความสรุปผลลัพธ์ ("พบทั้งหมด...") และไม่แสดงการ์ดวิชา
  - ไม่มีการเรียก API `GET /api/quota/courses`

---

#### [UT-UI-02] พิมพ์คำค้นแล้วกดปุ่มค้นหาหรือ Enter ส่งคำค้นหาถูกต้องตาม Spec
- Component: `QuotaSearchBar`
- สถานการณ์: ผู้ใช้กรอกคำค้นในช่องค้นหาแล้วกดปุ่มค้นหาหรือกดปุ่ม Enter
- Preconditions: Mock callback `onSearch`
- Test Steps:
  1. พิมพ์คำว่า `EL395` ในช่องค้นหา
  2. คลิกปุ่ม "ค้นหาข้อมูล"
  3. ล้างช่องค้นหา พิมพ์ `แคลคูลัส` แล้วกดปุ่ม `Enter`
- Expected Result:
  - ข้อ 2: `onSearch` ถูกเรียก 1 ครั้ง ด้วย Object `{ q: "EL395", mine: false }` (ใช้ key `q` ตาม DTO Spec)
  - ข้อ 3: `onSearch` ถูกเรียกอีก 1 ครั้ง ด้วย Object `{ q: "แคลคูลัส", mine: false }`

---

#### [UT-UI-03] การทำงานของปุ่มล้างคำค้น (Clear Button ×)
- Component: `QuotaSearchBar`
- สถานการณ์: มีข้อความในช่องค้นหา แล้วคลิกปุ่ม ×
- Preconditions: มี mock callback `onSearchChange` และ `onClear`
- Test Steps:
  1. Render `QuotaSearchBar` พร้อมค่า input มีข้อความ `CS`
  2. ตรวจสอบว่าปุ่มล้างคำค้น (×) แสดงอยู่ใน Document
  3. คลิกปุ่มล้างคำค้น (×)
- Expected Result:
  - ค่าในช่องค้นหาถูกล้างเป็นค่าว่าง
  - `onSearchChange` ถูกเรียกด้วยค่า `""` (หรือ `onClear` ถูกเรียก)
  - เมื่อ input ว่าง ปุ่มล้างคำค้น (×) จะไม่แสดงใน Document (`expect(queryByRole('button', { name: /ล้าง|clear/i })).not.toBeInTheDocument()`)

---

#### [UT-UI-04] คลิกปุ่มล้างคำค้น (×) ขณะที่ไม่ได้ติ๊ก checkbox แล้วกลับสู่หน้าแรก
- Component: `QuotaSearchPage`
- สถานการณ์: มีผลการค้นหาแสดงอยู่ ผู้ใช้กดปุ่มล้างคำค้น (×) และไม่ได้ติ๊ก checkbox
- Preconditions: อยู่ในหน้าผลการค้นหา และ checkbox "เฉพาะวิชาในแผนของฉัน" ไม่ได้เลือก
- Test Steps:
  1. คลิกปุ่มล้างคำค้น (×)
- Expected Result:
  - ช่องค้นหากลายเป็นค่าว่าง
  - รายการผลการค้นหาหายไป
  - หน้าจอสลับกลับมาแสดง `QuotaGuide` ("4 ขั้นตอนการขอโควตา") โดยไม่เรียก API

---

#### [UT-UI-05] สั่งค้นหาขณะช่องค้นหาว่างและไม่ได้ติ๊ก checkbox ต้องไม่เรียก API
- Component: `QuotaSearchPage`
- สถานการณ์: ผู้ใช้กดปุ่ม "ค้นหาข้อมูล" หรือกด Enter ขณะที่ช่องค้นหาเป็นค่าว่างและไม่ได้ติ๊ก checkbox
- Preconditions: ช่องค้นหาว่าง (`q = ""`), `mine = false`, มี mock API spy
- Test Steps:
  1. คลิกปุ่ม "ค้นหาข้อมูล"
  2. โฟกัสช่องค้นหาแล้วกดปุ่ม Enter
- Expected Result:
  - ไม่มี request ใด ๆ ส่งไปยัง API (ป้องกันการเกิด Error 400 `QUOTA_SEARCH_QUERY_REQUIRED`)
  - หน้าจอยังคงแสดง `QuotaGuide` ตามเดิม ไม่เกิด Error

---

#### [UT-UI-06] แสดง Checkbox "เฉพาะวิชาในแผนของฉัน" เมื่อนักศึกษามีวิชาในตาราง
- Component: `QuotaSearchBar`
- สถานการณ์: นักศึกษามีวิชาในตารางเรียนของภาค เช่น `MA211` และ `LAS101`
- Preconditions: ส่ง `myCourseCodes = ["MA211", "LAS101"]`
- Test Steps:
  1. Render `QuotaSearchBar`
  2. ตรวจสอบข้อความป้ายกำกับและสถานะการเปิดใช้งาน
- Expected Result:
  - แสดงป้ายกำกับ `"เฉพาะวิชาในแผนของฉัน (MA211, LAS101)"`
  - Checkbox อยู่ในสถานะเปิดใช้งาน (`disabled={false}`)

---

#### [UT-UI-07] Checkbox "เฉพาะวิชาในแผนของฉัน" ถูก Disabled เมื่อตารางเรียนว่าง
- Component: `QuotaSearchBar`
- สถานการณ์: นักศึกษายังไม่มีวิชาในตารางเรียนของภาคนั้น
- Preconditions: ส่ง `myCourseCodes = []`
- Test Steps:
  1. Render `QuotaSearchBar`
  2. ตรวจสอบป้ายกำกับและสถานะ Disabled
- Expected Result:
  - แสดงป้ายกำกับ `"เฉพาะวิชาในแผนของฉัน"` โดยไม่มีวงเล็บรหัสวิชาต่อท้าย
  - Checkbox อยู่ในสถานะ Disabled (`disabled={true}`) ไม่สามารถคลิกได้

---

#### [UT-UI-08] ติ๊กเลือก Checkbox "เฉพาะวิชาในแผนของฉัน" ตอนช่องค้นหาว่าง แล้วสั่งค้นหาทันที
- Component: `QuotaSearchPage`
- สถานการณ์: ผู้ใช้คลิกติ๊กถูกที่ Checkbox โดยที่ช่องค้นหาว่าง
- Preconditions: `myCourseCodes = ["MA211", "LAS101"]`, mock API `GET /api/quota/courses`
- Test Steps:
  1. คลิกเลือก Checkbox "เฉพาะวิชาในแผนของฉัน"
- Expected Result:
  - ระบบเรียก API `GET /api/quota/courses?academicYear=2568&semester=1&mine=true` ทันที
  - หน้าจอเปลี่ยนจากหน้า Guide ไปแสดงรายการผลการค้นหาตาม response

---

#### [UT-UI-09] ยกเลิกการติ๊ก Checkbox ขณะช่องค้นหาว่าง ต้องกลับสู่หน้าแรกโดยไม่เรียก API
- Component: `QuotaSearchPage`
- สถานการณ์: Checkbox ติ๊กอยู่และช่องค้นหาว่าง ผู้ใช้คลิกยกเลิกการติ๊ก
- Preconditions: Checkbox ถูกเลือกอยู่, ช่องค้นหาว่าง, กำลังแสดงผลของ `mine=true`
- Test Steps:
  1. คลิกยกเลิก Checkbox "เฉพาะวิชาในแผนของฉัน"
- Expected Result:
  - ไม่มีการส่ง request ไปยัง API
  - หน้าจอสลับกลับไปแสดง `QuotaGuide` (หน้าเริ่มต้น 4 ขั้นตอน) ทันที

---

#### [UT-UI-10] แสดงสรุปจำนวนวิชาที่พบ และข้อความจำกัด 50 วิชาแรก
- Component: `QuotaSearchPage`
- สถานการณ์: API ตอบกลับผลการค้นหา 2 กรณี (ไม่เกิน 50 วิชา และเกิน 50 วิชา)
- Preconditions: Mock API response
- Test Steps:
  1. Mock API ให้ `total: 2`, `courses` มี 2 รายการ แล้ว render
  2. Mock API ให้ `total: 65`, `courses` มี 50 รายการ แล้ว render
- Expected Result:
  - ข้อ 1: แสดงหัวข้อ "ช่องทางและรอบเวลายื่นคำร้อง" และข้อความสรุป `"พบทั้งหมด 2 วิชา"`
  - ข้อ 2: แสดงข้อความสรุป `"พบทั้งหมด 65 วิชา (แสดง 50 วิชาแรก)"`

---

### กลุ่มที่ 2: การ์ดรายวิชาและรายละเอียดการขอโควตา (`REQUIRED`)

#### [UT-UI-11] แสดงส่วนหัวของการ์ดรายวิชาครบถ้วนตาม Spec
- Component: `QuotaCourseCard`
- สถานการณ์: แสดงการ์ดวิชา `EL395` และ `MA211`
- Preconditions: ส่งข้อมูล `COURSE_EL395` (inMyTimetable=false) และ `COURSE_MA211` (inMyTimetable=true)
- Test Steps:
  1. Render `QuotaCourseCard` ด้วยข้อมูล `COURSE_EL395`
  2. Render `QuotaCourseCard` ด้วยข้อมูล `COURSE_MA211`
- Expected Result:
  - แสดงรหัสวิชาตัวใหญ่ (Large typography) เช่น `EL395`, `MA211`
  - แสดงชื่อภาษาอังกฤษ `courseName`
  - แสดงป้ายหมวดวิชาภาษาไทยตรงตาม US1: `COURSE_EL395` แสดง `"ศึกษาทั่วไป"`, `COURSE_MA211` แสดง `"วิชาเฉพาะ"`
  - แสดงป้ายหน่วยกิต `"3.0 หน่วยกิต"`
  - การ์ด `EL395` ไม่แสดงป้าย `"ในแผนการเรียน"`
  - การ์ด `MA211` แสดงป้าย `"ในแผนการเรียน"`

---

#### [UT-UI-12] การแสดงชื่อภาษาไทย (`courseNameTh`) และกรณีที่ไม่มีชื่อภาษาไทย
- Component: `QuotaCourseCard`
- สถานการณ์: เปรียบเทียบวิชาที่มี `courseNameTh` กับวิชาที่เป็น `null`
- Preconditions: ข้อมูล `COURSE_EL395` (`courseNameTh` มีค่า) และ `COURSE_NO_TH_NAME` (`courseNameTh: null`)
- Test Steps:
  1. Render `QuotaCourseCard` ด้วย `COURSE_EL395`
  2. Render `QuotaCourseCard` ด้วย `COURSE_NO_TH_NAME`
- Expected Result:
  - ข้อ 1: แสดงบรรทัดชื่อภาษาไทย `"ภาษาอังกฤษเชิงวิชาการและทักษะการศึกษา 2"` ใต้ชื่อภาษาอังกฤษ
  - ข้อ 2: ไม่แสดงบรรทัดชื่อภาษาไทย (ไม่มี Element ว่างหรือคำว่า `null` ปรากฏ)

---

#### [UT-UI-13] แสดงเงื่อนไขและข้อกำหนด พร้อมชิปรหัสวิชาที่กดได้
- Component: `QuotaConditionBox`
- สถานการณ์: วิชามีเงื่อนไขและระบุ `relatedCourseCode`
- Preconditions: ส่ง `conditions` ของ `COURSE_EL395` (`relatedCourseCode: "EL295"`)
- Test Steps:
  1. Render `QuotaConditionBox`
- Expected Result:
  - แสดงกล่องข้อความภายใต้หัวข้อ "เงื่อนไขและข้อกำหนดสำคัญ"
  - แสดงข้อความเงื่อนไขครบถ้วน
  - รหัสวิชา `EL295` แสดงผลเป็นชิปปุ่มกด (Accessible Role `button` หรือมีชื่อปุ่มว่า `EL295`)

---

#### [UT-UI-14] เงื่อนไขที่ไม่มี `relatedCourseCode` ต้องไม่แสดงเป็นชิปปุ่มกด
- Component: `QuotaConditionBox`
- สถานการณ์: วิชามีข้อความเงื่อนไข แต่ไม่มีรหัสวิชาอ้างอิง (`relatedCourseCode: null`)
- Preconditions: ส่งข้อมูล `COURSE_NO_CHIP`
- Test Steps:
  1. Render `QuotaConditionBox`
- Expected Result:
  - แสดงข้อความเงื่อนไขตาม `text`
  - ไม่แสดง Element ชิปที่เป็นปุ่มกดสำหรับรหัสวิชา (`queryByRole('button')` ไม่มีชิปรหัสวิชา)

---

#### [UT-UI-15] แสดงข้อความเมื่อวิชาไม่มีเงื่อนไข (`conditions: []`)
- Component: `QuotaConditionBox`
- สถานการณ์: รายวิชาไม่มีเงื่อนไขพิเศษใด ๆ
- Preconditions: ส่ง `conditions: []`
- Test Steps:
  1. Render `QuotaConditionBox`
- Expected Result:
  - แสดงข้อความ `"ไม่มีเงื่อนไข สามารถยื่นขอโควตาได้ตามกำหนดเวลา"`

---

#### [UT-UI-16] แสดงช่วงเวลายื่นคำร้องแบบช่วงวันที่ แปลงปี พ.ศ. และป้ายจำนวนรอบ
- Component: `QuotaRoundList`
- สถานการณ์: รายวิชามีรอบยื่นคำร้อง 2 รอบ (`COURSE_EL395`)
- Preconditions: ส่ง `rounds` ของ `COURSE_EL395` (รอบ 1: `2025-08-04` ถึง `2025-08-08` label: "คำร้องช่วงต้น", รอบ 2: `2025-08-18` ถึง `2025-08-21` label: "คำร้องรอบสอง")
- Test Steps:
  1. Render `QuotaRoundList`
- Expected Result:
  - แสดงป้ายมุมขวา `"เปิดรับทั้งหมด 2 รอบ"`
  - รอบที่ 1 แสดงป้ายรอบพร้อม label `"รอบที่ 1 คำร้องช่วงต้น"` (หรือแสดงคู่กันตาม Prototype) และแสดงวันที่ภาษาไทย `"4 - 8 สิงหาคม 2568"`
  - รอบที่ 2 แสดงป้ายรอบพร้อม label `"รอบที่ 2 คำร้องรอบสอง"` และแสดงวันที่ภาษาไทย `"18 - 21 สิงหาคม 2568"`

---

#### [UT-UI-17] แสดงรอบคำร้องแบบกำหนดส่งวันเดียว (`startDate: null`) พร้อมเวลาสิ้นสุด
- Component: `QuotaRoundList`
- สถานการณ์: รอบคำร้องมีเฉพาะกำหนดส่งวันเดียว (`COURSE_MA211`)
- Preconditions: `startDate: null`, `endDate: "2025-08-20"`, `endTime: "15:00"`
- Test Steps:
  1. Render `QuotaRoundList`
- Expected Result:
  - แสดงป้าย `"กำหนดการ"` แทนคำว่า "รอบที่ 1"
  - แสดงข้อความ `"ยื่นคำร้องภายใน 20 สิงหาคม 2568 เวลา 15:00 น."`

---

#### [UT-UI-18] แสดงข้อความเมื่อยังไม่ประกาศช่วงเวลายื่นคำร้อง (`rounds: []`)
- Component: `QuotaRoundList`
- สถานการณ์: วิชาต้องขอโควตา แต่ยังไม่มีรอบกำหนดการในระบบ
- Preconditions: ส่ง `rounds: []`
- Test Steps:
  1. Render `QuotaRoundList`
- Expected Result:
  - แสดงข้อความ `"ยังไม่ประกาศช่วงเวลายื่นคำร้องของภาคนี้"`

---

### กลุ่มที่ 3: ช่องทางการขอโควตาและช่องทางติดต่อ

#### [UT-UI-19] ปุ่มช่องทางขอโควตาต้องเปิดลิงก์ในแท็บใหม่และมี rel ปลอดภัย
- Component: `QuotaChannelBox`
- สถานการณ์: ช่องทางประเภท `ONLINE_FORM` หรือ `QUOTA_SYSTEM` ที่มี URL
- Preconditions: ส่งข้อมูลช่องทาง `url: "https://forms.gle/NWTyPnsVWtyDak3W8"`, `label: "ผ่าน Google Form"`
- Test Steps:
  1. Render `QuotaChannelBox`
  2. ตรวจสอบแท็ก Element ลิงก์ `<a>`
- Expected Result:
  - แสดงปุ่มพร้อมข้อความระบุ hostname เช่น `"ไปยัง forms.gle"`
  - แท็ก `<a>` มีแอตทริบิวต์ `href="https://forms.gle/NWTyPnsVWtyDak3W8"`
  - มีแอตทริบิวต์ `target="_blank"`
  - มีแอตทริบิวต์ `rel="noopener noreferrer"`

---

#### [UT-UI-20] แสดงหลายช่องทางในกล่องเดียว โดยมีทั้งช่องทางที่มี URL และไม่มี URL
- Component: `QuotaChannelBox`
- สถานการณ์: รายวิชามี 2 ช่องทาง เช่น ระบบออนไลน์และยื่นเอกสารที่คณะ (`COURSE_MULTI_CHANNELS`)
- Preconditions: ช่องทางที่ 1 มี `url`, ช่องทางที่ 2 มี `channelType: "FACULTY_OFFICE"`, `url: null`, `note: "ห้องบริการการศึกษา ชั้น 2"`
- Test Steps:
  1. Render `QuotaChannelBox`
- Expected Result:
  - แสดงรายการช่องทางครบทั้ง 2 ช่องทางในกล่องเดียวกัน
  - ช่องทางที่ 1 มีปุ่มลิงก์เปิดแท็บใหม่
  - ช่องทางที่ 2 แสดงข้อความระบุช่องทางและหมายเหตุ `note` แต่**ไม่แสดง**ปุ่มลิงก์ภายนอก

---

#### [UT-UI-21] แสดงช่องทางติดต่อคณะ/ภาควิชา ทั้งกรณีมี URL และไม่มี URL
- Component: `QuotaContactRow`
- สถานการณ์: ทดสอบรายการติดต่อทั้งแบบมี URL และ `url: null`
- Preconditions: รายการที่ 1 มี `url: "https://www.facebook.com/litu.thammasat"`, รายการที่ 2 มี `url: null`
- Test Steps:
  1. Render `QuotaContactRow` ด้วยรายการที่ 1
  2. Render `QuotaContactRow` ด้วยรายการที่ 2
- Expected Result:
  - รายการที่ 1 แสดงชื่อองค์กร พร้อมปุ่มลิงก์เปิดแท็บใหม่ (`target="_blank"`, `rel="noopener noreferrer"`)
  - รายการที่ 2 แสดงชื่อองค์กรและข้อความ label แต่ไม่แสดงเป็นปุ่มลิงก์แท็ก `<a>`

---

### กลุ่มที่ 4: สถานะโควตาอื่น ๆ และกรณีค้นหาไม่พบ

#### [UT-UI-22] แสดงสถานะไม่ต้องขอโควตา (NOT_REQUIRED)
- Component: `QuotaStatusNotice` หรือ `QuotaCourseCard`
- สถานการณ์: วิชาไม่ต้องขอโควตา เช่น `CS232`
- Preconditions: ส่งข้อมูล `COURSE_CS232` (`quotaStatus: "NOT_REQUIRED"`)
- Test Steps:
  1. Render การ์ดวิชาด้วยสถานะ `NOT_REQUIRED`
- Expected Result:
  - กล่องข้อความมีสถานะที่ตรงกับ `NOT_REQUIRED` (ตรวจผ่าน `data-status="NOT_REQUIRED"` หรือข้อความที่เข้าถึงได้)
  - แสดงข้อความชัดเจน `"รายวิชานี้ไม่ต้องขอโควตา"`
  - ไม่แสดงส่วนของเงื่อนไข, รอบคำร้อง หรือช่องทางการขอโควตา

---

#### [UT-UI-23] แสดงสถานะไม่เปิดสอนในภาคเรียนนี้ (NOT_OFFERED) กรณีมีภาคที่เปิดสอน
- Component: `QuotaStatusNotice` หรือ `QuotaCourseCard`
- สถานการณ์: ค้นหาวิชาในภาค 2 แต่วิชามีเปิดสอนเฉพาะภาค 1 (`COURSE_FR205`)
- Preconditions: `quotaStatus: "NOT_OFFERED"`, `offeredSemesters: [1]`
- Test Steps:
  1. Render การ์ดวิชาด้วยข้อมูลดังกล่าว
- Expected Result:
  - มีสถานะตรงกับ `NOT_OFFERED`
  - แสดงข้อความแจ้งเตือน `"วิชานี้เปิดสอนเฉพาะภาคเรียนที่ 1"`

---

#### [UT-UI-24] แสดงสถานะไม่เปิดสอนในภาคเรียนนี้ (NOT_OFFERED) กรณีไม่เปิดสอนเลยทั้งปี
- Component: `QuotaStatusNotice` หรือ `QuotaCourseCard`
- สถานการณ์: วิชาไม่มี section เปิดสอนเลยตลอดปีการศึกษา (`COURSE_NOT_OFFERED_YEAR`)
- Preconditions: `quotaStatus: "NOT_OFFERED"`, `offeredSemesters: []`, `academicYear=2568`
- Test Steps:
  1. Render การ์ดวิชาด้วยข้อมูลดังกล่าว
- Expected Result:
  - แสดงข้อความแจ้งเตือน `"วิชานี้ไม่เปิดสอนในปีการศึกษา 2568"`

---

#### [UT-UI-25] แสดงสถานะยังไม่มีข้อมูลโควตาในระบบ (NO_DATA)
- Component: `QuotaStatusNotice` หรือ `QuotaCourseCard`
- สถานการณ์: วิชามีเปิดสอนแต่ยังไม่มีข้อมูลโควตาในระบบ (`COURSE_TU101`)
- Preconditions: `quotaStatus: "NO_DATA"`
- Test Steps:
  1. Render การ์ดวิชาด้วยสถานะ `NO_DATA`
- Expected Result:
  - แสดงข้อความ `"ยังไม่มีข้อมูลช่องทางขอโควตาของรายวิชานี้ กรุณาติดต่อคณะ/ภาควิชาเจ้าของวิชา"`

---

#### [UT-UI-26] แสดงผลกรณีค้นหาไม่พบข้อมูล (Empty State)
- Component: `QuotaEmptyState`
- สถานการณ์: ผลการค้นหาว่างเปล่า (`courses: []`)
- Preconditions: Render `QuotaEmptyState` ด้วย `query="DM201"`
- Test Steps:
  1. Render `QuotaEmptyState`
- Expected Result:
  - แสดงหัวข้อ `"ไม่พบข้อมูลช่องทางขอโควตาสำหรับวิชานี้"`
  - แสดงข้อความรายละเอียด `"ยังไม่มีข้อมูลช่องทางการขอโควตา สำหรับรายวิชา DM201 ในระบบ"`

---

### กลุ่มที่ 5: การทำงานระดับหน้าจอ (`QuotaSearchPage`) และ Interaction

#### [UT-UI-27] คลิกชิปรหัสวิชาที่เกี่ยวข้อง แล้วระบบค้นหาวิชานั้นแบบวิชาเดี่ยว
- Component: `QuotaSearchPage`
- สถานการณ์: ผู้ใช้ดูการ์ด `EL395` แล้วคลิกชิป `EL295` ในกล่องเงื่อนไข
- Preconditions: แสดงผลการ์ด `EL395`, mock API `GET /api/quota/courses/EL295` คืนข้อมูล `EL295`
- Test Steps:
  1. คลิกชิปรหัสวิชา `EL295`
- Expected Result:
  - ช่องค้นหาอัปเดตข้อความเป็น `"EL295"`
  - มีการเรียก API `GET /api/quota/courses/EL295?academicYear=2568&semester=1`
  - หน้าจอแทนที่ผลการค้นหาเดิมด้วยการ์ดของวิชา `EL295`

---

#### [UT-UI-28] คลิกชิปรหัสวิชาที่เกี่ยวข้อง แล้ว API ตอบ 404 ต้องแสดง QuotaEmptyState
- Component: `QuotaSearchPage`
- สถานการณ์: ผู้ใช้คลิกชิปรหัสวิชาที่ไม่มีในระบบฐานข้อมูล `course`
- Preconditions: mock API `GET /api/quota/courses/{code}` ให้ตอบกลับด้วย HTTP 404
- Test Steps:
  1. คลิกชิปรหัสวิชาดังกล่าว
- Expected Result:
  - หน้าจอไม่แสดงการ์ดวิชาเดิม
  - หน้าจอแสดง Component `QuotaEmptyState` ระบุข้อความไม่พบข้อมูลสำหรับวิชานั้น

---

#### [UT-UI-29] แสดง Loading Skeleton ระหว่างรอผลการค้นหา
- Component: `QuotaSearchPage`
- สถานการณ์: อยู่ระหว่างรอ Response จาก API
- Preconditions: Mock API ให้หน่วงเวลา (Pending Promise)
- Test Steps:
  1. สั่งค้นหาคำว่า `EL395`
- Expected Result:
  - แสดง Element Skeleton หรือ Loading Placeholder
  - ไม่แสดงการ์ดวิชาจริง, ไม่แสดง Error และไม่แสดง Empty State ขณะกำลังโหลด

---

#### [UT-UI-30] แสดงข้อความ Error และปุ่ม "ลองใหม่" เมื่อ API ล้มเหลว (500 หรือ Network Error)
- Component: `QuotaSearchPage`
- สถานการณ์: API ตอบกลับด้วยข้อผิดพลาด 500 หรือสัญญาณเครือข่ายขัดข้อง
- Preconditions: Mock API ให้ Reject Promise ด้วย Error
- Test Steps:
  1. สั่งค้นหาคำว่า `EL395`
  2. รอให้เกิดข้อผิดพลาด
  3. ตรวจสอบปุ่มลองใหม่
  4. คลิกปุ่ม "ลองใหม่"
- Expected Result:
  - แสดงกล่องข้อความเตือน `"ไม่สามารถโหลดข้อมูลโควตาได้ กรุณาลองใหม่อีกครั้ง"`
  - แสดงปุ่มที่ระบุชื่อว่า `"ลองใหม่"` (ตรงตาม T05 และไม่ชนกับคำว่า "ลองใหม่อีกครั้ง" ในข้อความเตือน)
  - เมื่อคลิกปุ่ม "ลองใหม่" ระบบจะส่งคำขอค้นหาซ้ำอีกครั้งด้วยค่าเดิม

---

## 9. กรณีทดสอบฟังก์ชันยูทิลิตี `formatThaiDate.ts`

ฟังก์ชัน `formatThaiDate(startDate: string | null, endDate: string)` แปลงวันที่ ISO `yyyy-MM-dd` เป็นวันที่ภาษาไทยปี พ.ศ.

```ts
// ตัวอย่าง Signature
export function formatThaiDate(startDate: string | null, endDate: string): string;
export function formatThaiSingleDate(dateStr: string): string;
```

#### [UT-UTIL-01] แปลงวันที่เดี่ยวเป็นภาษาไทย พ.ศ.
- Input: `endDate = "2025-08-20"` (กรณี `startDate: null`)
- Expected Output: `"20 สิงหาคม 2568"`

#### [UT-UTIL-02] แปลงช่วงวันที่ในเดือนและปีเดียวกัน
- Input: `startDate = "2025-08-04"`, `endDate = "2025-08-08"`
- Expected Output: `"4 - 8 สิงหาคม 2568"`

#### [UT-UTIL-03] แปลงช่วงวันที่คนละเดือนในปีเดียวกัน
- Input: `startDate = "2025-08-28"`, `endDate = "2025-09-02"`
- Expected Output: `"28 สิงหาคม - 2 กันยายน 2568"`

#### [UT-UTIL-04] แปลงช่วงวันที่ข้ามปี ค.ศ.
- Input: `startDate = "2025-12-28"`, `endDate = "2026-01-05"`
- Expected Output: `"28 ธันวาคม 2568 - 5 มกราคม 2569"`

#### [UT-UTIL-05] การป้องกัน Timezone Shift จากการแปลงวันที่ ISO
- Scenario: เครื่องที่รันเทสต์ตั้งค่า Timezone ติดลบ เช่น UTC-8 หรือ UTC-5
- Test: ส่งสตริง `"2025-08-04"` เข้าฟังก์ชัน
- Expected Output: ต้องได้วันที่ `"4 สิงหาคม 2568"` เสมอ (ห้ามเลื่อนเป็นวันที่ 3 อันเนื่องมาจากการใช้ `new Date("2025-08-04")` ตรง ๆ แบบ UTC ใน Local Timezone ติดลบ)

---

## 10. สรุปความครอบคลุมตามเกณฑ์การตรวจสอบ (Traceability Matrix)

| ข้อกำหนดตามโจทย์และ DoD | สถานะการออกแบบ | Test Cases ที่ครอบคลุม |
|:---|:---:|:---|
| **ช่องค้นหาและรายการวิชา** | ครอบคลุม | `UT-UI-01`, `02`, `03`, `04`, `05`, `06`, `07`, `08`, `09`, `10`, `11` |
| **ส่วนแสดงช่องทางขอโควตา** | ครอบคลุม | `UT-UI-11`, `12`, `13`, `14`, `15`, `16`, `17`, `18`, `19`, `20`, `21` |
| **ลิงก์ฟอร์มเปิดในแท็บใหม่ (`target="_blank"`, `rel="noopener noreferrer"`)** | ครอบคลุม | `UT-UI-19` (ฟอร์มขอโควตา/ระบบโควตา), `UT-UI-20` (หลายช่องทาง), `UT-UI-21` (ช่องทางติดต่อ) |
| **กรณีวิชาไม่มีข้อมูล และค้นหาไม่พบ** | ครอบคลุม | `UT-UI-22` (`NOT_REQUIRED`), `UT-UI-23` (`NOT_OFFERED` มีภาค), `UT-UI-24` (`NOT_OFFERED` ตลอดปี), `UT-UI-25` (`NO_DATA`), `UT-UI-26` (`Empty State` / 404) |
| **ความครอบคลุม Component หลักทุกตัว** | ครบทุกตัว | `QuotaSearchPage`, `QuotaSearchBar`, `QuotaGuide`, `QuotaCourseCard`, `QuotaConditionBox`, `QuotaRoundList`, `QuotaChannelBox`, `QuotaContactRow`, `QuotaStatusNotice`, `QuotaEmptyState` (`UT-UI-01` ถึง `UT-UI-30`) |
| **ฟังก์ชันยูทิลิตีแปลงวันที่** | ครอบคลุม | `UT-UTIL-01` ถึง `UT-UTIL-05` (รวมถึงการป้องกัน Timezone Shift) |
| **ประเภทกรณีทดสอบ (ปกติ / ข้อมูลว่าง / ผิดพลาด)** | ครบทุกกลุ่ม | • กรณีปกติ: `UT-01`, `02`, `06`, `08`, `10`–`13`, `16`–`17`, `19`–`21`, `27`<br>• กรณีข้อมูลว่าง: `UT-03`, `04`, `05`, `07`, `09`, `12` (ไม่มีชื่อไทย), `14` (ไม่มีชิป), `15`, `18`, `20` (URL ว่าง), `21` (URL ว่าง), `24`, `25`, `26`, `28`<br>• กรณีผิดพลาด/ระบบ: `UT-29` (Loading), `UT-30` (Error 500/Network & Retry) |

---

## 11. ข้อสมมติและประเด็นรอยืนยันกับทีม (Assumptions & Open Points)

ประเด็นด้านล่างเป็นช่องว่างใน Spec ของ US7-T05 ที่ยังไม่ได้ระบุชัดเจน เอกสารฉบับนี้ได้ตั้งสมมติฐานไว้ และควรนำเข้าหารือระหว่าง PR Review:

1. **ข้อความ Empty State เมื่อ `mine=true` แล้วผลลัพธ์ว่าง (`q` เป็น `null`):** ใน T05 ระบุตัวอย่างข้อความ Empty State เฉพาะกรณีค้นหาด้วยชื่อหรือรหัสวิชา (`DM201`) แต่ยังไม่ได้ระบุข้อความกรณีติ๊ก "เฉพาะวิชาในแผนของฉัน" แล้วในตารางไม่มีวิชาที่ต้องขอโควตาเลย สมมติฐานปัจจุบันคือใช้ Component `QuotaEmptyState` เดียวกัน แต่ควรยืนยันข้อความภาษาไทยเฉพาะกับทีม เช่น `"ไม่พบรายวิชาในแผนการเรียนของคุณที่มีข้อมูลการขอโควตา"`
2. **ข้อความของรอบวันเดียวที่ไม่มี `endTime` (`startDate: null`, `endTime: null`):** สมมติฐานคือแสดงเป็น `"ยื่นคำร้องภายใน {endDate}"` โดยตัดข้อความส่วนเวลาออก
3. **การจัดการข้อผิดพลาด HTTP 400 (เช่น `q` ยาวเกิน 50 ตัวอักษร):** ใน T05 ระบุว่าเป็น ProblemDetail 400 สมมติฐานคือฝั่ง UI ควบคุมด้วยแอตทริบิวต์ `maxLength={50}` ที่ช่องกรอกล่วงหน้าเพื่อไม่ให้ผู้ใช้ส่งเกิน หาก API ตอบ 400 ให้แสดงข้อความแจ้งเตือนข้อผิดพลาดระดับหน้าจอ
4. **รูปแบบป้ายรอบเวลายื่นคำร้อง:** ใน UI Prototype แสดงทั้งหมายเลขรอบและคำอธิบายรอบ สมมติฐานปัจจุบันคือแสดงป้ายหมายเลขรอบ "รอบที่ {roundNo}" และหากมี `label` จะแสดงชื่อ label ประกอบคู่กัน (เช่น `"รอบที่ 1 คำร้องช่วงต้น"`)
