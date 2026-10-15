# US5-T11 Design Unit Test Cases ส่วน UI

## User story
US5: บันทึกตารางเรียนส่งออกเป็นภาพ

## Objective
ออกแบบ Unit Test Cases สำหรับ UI ของ US5 เพื่อทดสอบปุ่ม PNG การส่งออกตารางที่มีวิชาและตารางว่าง
ชื่อไฟล์ที่ได้ และการจัดการสถานะระหว่างสร้างภาพและเมื่อเกิด error

## Scope
ครอบคลุม Conditions of Satisfaction (CoS) ของ US5 ดังนี้:
- Test Case 1: กดปุ่ม Export ภาพ ต้องได้ไฟล์ภาพที่มีข้อมูลตารางครบตรงกับที่แสดงบนหน้าจอ
- Test Case 2: ตารางที่ยังไม่มีวิชาเลย กดส่งออก ต้องได้ภาพตารางเปล่า โดยไม่เกิด error

และสัญญาฝั่ง frontend ใน [US5-T05 DTO & API Spec](../T05/US5-DTO%20&%20API%20Spec.md):
`ExportPngButton`, `exportElementToPng`, `buildExportFileName`

## Test Approach
- ออกแบบ Unit Test Cases โดยอ้างอิงจาก User Story, CoS, UI Prototype จาก Google Stitch และ US5-T05
- ทดสอบที่ระดับ component / function ไม่ต้องเชื่อมต่อ Backend จริง ใช้ Mock Data ของ `Timetable` (DTO ของ US1)
- **Mock ไลบรารี `html-to-image`** ให้ `toPng` คืน data URL ปลอม เช่น `"data:image/png;base64,TEST"` เพราะ unit test ไม่ได้วัดว่าภาพสวยแค่ไหน แต่วัดว่า component เรียก `toPng` ถูก element ถูก option และดาวน์โหลดถูกชื่อ ส่วนการเทียบภาพจริงกับหน้าจออยู่ใน UAT (US5-T16)
- **Mock การดาวน์โหลด** โดย spy `HTMLAnchorElement.prototype.click` แล้วตรวจ `download` และ `href` ของลิงก์
- jsdom ไม่คำนวณ layout ทำให้ `scrollWidth` / `scrollHeight` เป็น 0 จึงกำหนดค่าเองใน test ด้วย `Object.defineProperty`
- เครื่องมือที่เสนอ: Vitest + React Testing Library (frontend ยังไม่มี test runner ต้องยืนยันกับทีมก่อนเพิ่ม dependency ใน `package.json` ซึ่งเป็นไฟล์ร่วม)
- ยังไม่ได้ดำเนินการทดสอบจริง เพราะ Frontend อยู่ระหว่างพัฒนา (US5-T07) ชื่อ Component และวิธี Mock อาจปรับตาม Implementation จริง
- ปุ่ม PNG แสดงอยู่เสมอบนหัวกล่องตาราง แต่ถ้าตารางมีเวลาชน (`conflicts` ไม่ว่าง) ไม่อนุญาตให้บันทึกภาพ (ยืนยันจากผู้ออกแบบ UI)
- ภาคเรียนที่ใช้ทดสอบคือ 2/2569 (ภาคที่ตั้งใจใช้ใน UI) และ 1/2568 (ตรงกับข้อมูล seed ของ backend) ไม่รวมภาคฤดูร้อน เพราะทีมตกลงว่าจะไม่พัฒนาส่วนภาคฤดูร้อน

## Mock Data

**ตารางที่มีวิชา** (ตาม UI Prototype หน้า "ตารางเรียนจำลอง" 6 วิชา 18 หน่วยกิต ภาคเรียน 2/2569):

| รหัสวิชา | Sec | วัน | เวลา | ห้อง |
| --- | --- | --- | --- | --- |
| CS180 | 820001 | จันทร์ | 13:30 - 16:30 | LC5-S202 |
| MA211 | 020001 | อังคาร, พฤหัสบดี | 09:30 - 11:00 | SC-3015 |
| CS111 | 030001 | อังคาร, พฤหัสบดี | 11:00 - 12:30 | LC3-121 |
| LAS101 | 780004 | พุธ | 09:30 - 12:30 | SC-1026 |
| TU101 | 900001 | พุธ | 13:30 - 16:30 | SC-1058 |
| TU106 | 540001 | พฤหัสบดี | 13:30 - 16:30 | LC2-203 |

**ตารางว่าง:** `{ academicYear: 2569, semester: 2, entries: [], conflicts: [], totalCredits: 0, maxCredits: 22, updatedAt: null }`

**ภาคเรียน 1/2568:** ใช้รายวิชาชุดเดียวกับตารางที่มีวิชา แต่ `academicYear: 2568, semester: 1` ใช้ทดสอบว่าชื่อไฟล์เปลี่ยนตามภาคเรียนของตารางที่แสดงอยู่

**ตารางที่มีเวลาชน** (ตาม UI Prototype หน้าที่มีเวลาชน 7 วิชา 21 หน่วยกิต): ตารางที่มีวิชาข้างบน + TU109 Sec 780001 วันพุธ 09:30 - 12:30 ห้อง SC3-413 (TU109 ชนกับ LAS101) หน่วยกิตรวมไม่เกิน 22 เพราะระบบไม่ยอมให้เพิ่มวิชาจนเกินกำหนด (409 `CREDIT_LIMIT_EXCEEDED`) ตารางที่หน่วยกิตเกินจึงไม่มีทางแสดงบนหน้าจอ

## Test Cases

### [UT-UI-01] ตั้งชื่อไฟล์จากปีการศึกษาและภาคเรียน

**Related CoS:** Test Case 1, Test Case 2

**Preconditions:**
- ฟังก์ชัน `buildExportFileName` พร้อมสำหรับการทดสอบ

**Test Data:**
- (2569, 2)
- (2569, 1)
- (2568, 1)
- (2568, 2)

**Test Steps:**
1. เรียก `buildExportFileName` ด้วยข้อมูลแต่ละชุด
2. ตรวจสอบค่าที่คืนมา

**Expected Result:**
- (2569, 2) ได้ `timetable-2569-2.png`
- (2569, 1) ได้ `timetable-2569-1.png`
- (2568, 1) ได้ `timetable-2568-1.png`
- (2568, 2) ได้ `timetable-2568-2.png`
- ชื่อไฟล์เป็นตัวอักษรอังกฤษ ตัวเลข และ `-` เท่านั้น และลงท้ายด้วย `.png`

### [UT-UI-02] แสดงปุ่ม PNG บนหัวกล่องตารางเรียนจำลอง

**Related CoS:** Test Case 1

**Preconditions:**
- Render กล่องตารางเรียนจำลองพร้อม `ExportPngButton` ด้วย Mock Data ตารางที่มีวิชา
- ไม่จำเป็นต้องเชื่อมต่อ Backend จริง

**Test Data:**
- Mock Data ตารางที่มีวิชา (6 วิชา)

**Test Steps:**
1. Render UI
2. ค้นหาปุ่มด้วยชื่อ "PNG"

**Expected Result:**
- UI แสดงปุ่มที่มีข้อความ "PNG" พร้อมไอคอนดาวน์โหลด
- ปุ่มกดได้ (ไม่ disabled)
- ปุ่มมี attribute `data-export-ignore`

### [UT-UI-03] กดปุ่ม PNG แล้วสร้างภาพจากกล่องตารางและดาวน์โหลดไฟล์

**Related CoS:** Test Case 1

**Preconditions:**
- Render UI ด้วย Mock Data ตารางที่มีวิชา
- Mock `toPng` ให้คืน `"data:image/png;base64,TEST"`
- Spy `HTMLAnchorElement.prototype.click`
- กำหนด `scrollWidth` = 1600 และ `scrollHeight` = 720 ให้กล่องตาราง

**Test Data:**
- Mock Data ตารางที่มีวิชา ภาคเรียน 2/2569
- Mock Data ตารางที่มีวิชา ภาคเรียน 1/2568

**Test Steps:**
1. Render UI ด้วย Mock Data ภาคเรียน 2/2569 แล้วคลิกปุ่ม PNG
2. รอให้การส่งออกเสร็จ แล้วตรวจสอบการเรียก `toPng` และลิงก์ดาวน์โหลด
3. ทำซ้ำข้อ 1–2 ด้วย Mock Data ภาคเรียน 1/2568

**Expected Result:**
- `toPng` ถูกเรียก 1 ครั้งต่อการคลิก ด้วย element กล่อง "ตารางเรียนจำลอง" (element เดียวกับ `targetRef`)
- option ที่ส่งให้ `toPng` มี `pixelRatio: 2`, `backgroundColor: "#ffffff"`, `width: 1600`, `height: 720`
- ภาคเรียน 2/2569: ลิงก์ดาวน์โหลดถูกคลิก 1 ครั้ง โดย `download` = `timetable-2569-2.png` และ `href` = `"data:image/png;base64,TEST"`
- ภาคเรียน 1/2568: ลิงก์ดาวน์โหลดถูกคลิก 1 ครั้ง โดย `download` = `timetable-2568-1.png`
- UI ไม่แสดงข้อความ error

### [UT-UI-04] ภาพมีข้อมูลตารางครบ และตัดปุ่มออกจากภาพ

**Related CoS:** Test Case 1

**Preconditions:**
- Render UI ด้วย Mock Data ตารางที่มีวิชา
- Mock `toPng` และเก็บ option `filter` ที่ถูกส่งเข้ามา

**Test Data:**
- Mock Data ตารางที่มีวิชา (6 วิชา 18 หน่วยกิต)

**Test Steps:**
1. คลิกปุ่ม PNG
2. นำฟังก์ชัน `filter` ที่ส่งให้ `toPng` มาทดสอบกับ element ต่าง ๆ ในกล่องตาราง

**Expected Result:**
- `filter` คืน `false` สำหรับปุ่ม PNG และปุ่ม "ไปยัง REG-TU" (มี `data-export-ignore`)
- `filter` คืน `true` สำหรับหัวข้อ "ตารางเรียนจำลอง", chip รหัสวิชา, บล็อกวิชาทั้ง 6 วิชา และแถบสรุป "วิชาในตารางเรียน: …"

### [UT-UI-05] ส่งออกตารางว่างได้โดยไม่เกิด error

**Related CoS:** Test Case 2

**Preconditions:**
- Render UI ด้วย Mock Data ตารางว่าง
- Mock `toPng` ให้คืน `"data:image/png;base64,TEST"`
- Spy `HTMLAnchorElement.prototype.click`

**Test Data:**
- Mock Data ตารางว่าง (`entries: []`) ภาคเรียน 2/2569

**Test Steps:**
1. ตรวจสอบสถานะปุ่ม PNG
2. คลิกปุ่ม PNG
3. รอให้การส่งออกเสร็จ

**Expected Result:**
- ปุ่ม PNG กดได้แม้ตารางไม่มีวิชา
- `toPng` ถูกเรียก 1 ครั้งด้วยกล่องตาราง ซึ่งมีหัวข้อ หัววัน และหัวเวลา แต่ไม่มีบล็อกวิชา chip รหัสวิชา หรือแถบสรุป (ตามหน้าตารางว่างใน UI Prototype)
- ลิงก์ดาวน์โหลดถูกคลิก โดย `download` = `timetable-2569-2.png`
- UI ไม่แสดงข้อความ error

### [UT-UI-06] ระหว่างสร้างภาพ ปุ่มกดซ้ำไม่ได้

**Related CoS:** Test Case 1

**Preconditions:**
- Render UI ด้วย Mock Data ตารางที่มีวิชา
- Mock `toPng` ให้คืน Promise ที่ยังไม่ resolve (ควบคุมเวลา resolve เองใน test)

**Test Data:**
- Mock Data ตารางที่มีวิชา

**Test Steps:**
1. คลิกปุ่ม PNG
2. ตรวจสอบสถานะปุ่มก่อน `toPng` resolve
3. คลิกปุ่มอีก 2 ครั้ง
4. ให้ `toPng` resolve แล้วตรวจสอบสถานะปุ่มอีกครั้ง

**Expected Result:**
- ระหว่างรอ ปุ่มเป็น disabled โดยข้อความบนปุ่มยังเป็น "PNG" (ไม่มีข้อความ "กำลังสร้างภาพ…")
- `toPng` ถูกเรียกเพียง 1 ครั้ง และดาวน์โหลดเพียง 1 ไฟล์
- หลัง resolve ไฟล์ถูกดาวน์โหลดทันที และปุ่มกลับมากดได้อีกครั้ง

### [UT-UI-07] รอฟอนต์โหลดครบก่อนสร้างภาพ

**Related CoS:** Test Case 1

**Preconditions:**
- Render UI ด้วย Mock Data ตารางที่มีวิชา
- Mock `document.fonts.ready` ให้เป็น Promise ที่ยังไม่ resolve
- Mock `toPng`

**Test Data:**
- Mock Data ตารางที่มีวิชา

**Test Steps:**
1. คลิกปุ่ม PNG
2. ตรวจสอบการเรียก `toPng` ก่อน `document.fonts.ready` resolve
3. ให้ `document.fonts.ready` resolve
4. ตรวจสอบการเรียก `toPng` อีกครั้ง

**Expected Result:**
- ก่อนฟอนต์โหลดครบ `toPng` ยังไม่ถูกเรียก
- หลังฟอนต์โหลดครบ `toPng` ถูกเรียก 1 ครั้ง (กันภาพที่ฟอนต์ไทยยังไม่โหลด)

### [UT-UI-08] สร้างภาพไม่สำเร็จ แสดงข้อความ error และลองใหม่ได้

**Related CoS:** Test Case 1

**Preconditions:**
- Render UI ด้วย Mock Data ตารางที่มีวิชา
- Mock `toPng` ครั้งแรกให้ reject ด้วย `new Error("render failed")` และครั้งที่สองให้คืน `"data:image/png;base64,TEST"`
- Spy `HTMLAnchorElement.prototype.click`

**Test Data:**
- Mock Data ตารางที่มีวิชา

**Test Steps:**
1. คลิกปุ่ม PNG ครั้งแรก
2. ตรวจสอบข้อความและสถานะปุ่ม
3. คลิกปุ่ม PNG ครั้งที่สอง

**Expected Result:**
- ครั้งแรก: UI แสดงข้อความ "ส่งออกภาพไม่สำเร็จ กรุณาลองใหม่" ใต้ปุ่ม ไม่มีการดาวน์โหลด และปุ่มกลับมากดได้
- ครั้งที่สอง: ข้อความ error หายไป และดาวน์โหลด `timetable-2569-2.png` สำเร็จ

### [UT-UI-09] กล่องตารางยังไม่ render แสดงข้อความ error

**Related CoS:** Test Case 1

**Preconditions:**
- Render `ExportPngButton` เดี่ยว ๆ โดยส่ง `targetRef` ที่ `current` เป็น `null`
- Mock `toPng`

**Test Data:**
- `targetRef = { current: null }`, `academicYear = 2569`, `semester = 2`

**Test Steps:**
1. คลิกปุ่ม PNG

**Expected Result:**
- `toPng` ไม่ถูกเรียก และไม่มีการดาวน์โหลด
- UI แสดงข้อความ "ส่งออกภาพไม่สำเร็จ กรุณาลองใหม่"

### [UT-UI-10] ตารางที่มีเวลาชน ไม่อนุญาตให้บันทึกภาพ

**Related CoS:** Test Case 1

**Preconditions:**
- Render UI ด้วย Mock Data ตารางที่มีเวลาชน
- Mock `toPng`
- Spy `HTMLAnchorElement.prototype.click`

**Test Data:**
- Mock Data ตารางที่มีเวลาชน (7 วิชา 21 หน่วยกิต, TU109 ชนกับ LAS101 วันพุธ 09:30 - 12:30)

**Test Steps:**
1. ตรวจสอบปุ่ม PNG บนหัวกล่องตาราง
2. คลิกปุ่ม PNG

**Expected Result:**
- UI ยังแสดงปุ่ม PNG บนหัวกล่องตาราง
- ปุ่ม PNG เป็น disabled เพราะ `conflicts` ไม่ว่าง
- `toPng` ไม่ถูกเรียก และไม่มีการดาวน์โหลด

## สรุปความครอบคลุม

| Test Case | เรื่องที่ทดสอบ | CoS 1 | CoS 2 |
| --- | --- | --- | --- |
| UT-UI-01 | ชื่อไฟล์ | ✓ | ✓ |
| UT-UI-02 | แสดงปุ่ม PNG | ✓ | |
| UT-UI-03 | สร้างภาพจากกล่องตารางและดาวน์โหลด | ✓ | |
| UT-UI-04 | ข้อมูลครบ และตัดปุ่มออกจากภาพ | ✓ | |
| UT-UI-05 | ส่งออกตารางว่าง | | ✓ |
| UT-UI-06 | กันกดซ้ำระหว่างสร้างภาพ | ✓ | |
| UT-UI-07 | รอฟอนต์ไทยโหลดครบ | ✓ | |
| UT-UI-08 | error แล้วลองใหม่ได้ | ✓ | |
| UT-UI-09 | กล่องตารางยังไม่ render | ✓ | |
| UT-UI-10 | ตารางที่มีเวลาชน ไม่อนุญาตให้บันทึกภาพ | ✓ | |

## เอกสารที่เกี่ยวข้อง
- [US5-T05 DTO & API Spec](../T05/US5-DTO%20&%20API%20Spec.md)
- [User Acceptance Test (US5-T16)](../US5-T16-uat-test-cases.md)
- [US1-T11 Unit Test UI](../../US1/T11/US1-T11-Unit-Test-UI.md)
