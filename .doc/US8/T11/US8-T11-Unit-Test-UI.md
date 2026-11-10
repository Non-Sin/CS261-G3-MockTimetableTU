# US8-T11: Design Unit Test Cases ส่วน UI

## User Story

US8: จัดตารางเรียนจำลองตามแผนในเล่มหลักสูตร

## Objective

ออกแบบ Unit Test Cases สำหรับ UI การจัดตารางตามแผนการเรียน โดยครอบคลุมการเลือกชั้นปี/ภาคเรียน/แผน/วิชาโท การดูสรุปวิชาที่จะเพิ่มและวิชาที่ถูกข้าม การยืนยันหรือยกเลิก และการแสดงสถานะเมื่อกำลังโหลดหรือเกิดข้อผิดพลาด

## Scope

- ปุ่มและตัวเลือกสำหรับเปิดแผนการเรียน
- รายการแผนและกรณีไม่มีแผน
- ตัวเลือกแผนการศึกษาสำหรับชั้นปีที่ 3–4 และตัวเลือกวิชาโท
- หน้าหรือกล่องสรุปผล preview (`dryRun: true`)
- รายการวิชาที่จะเพิ่มและรายการวิชาที่ข้ามพร้อมเหตุผล
- การยืนยัน (`dryRun: false`) และการยกเลิก
- สถานะ loading, error และการป้องกันการส่งคำขอซ้ำ

การทดสอบนี้อยู่ระดับ UI โดย mock API และไม่เชื่อมต่อ backend/ฐานข้อมูลจริง ไม่ได้ทดสอบอัลกอริทึมเลือก section หรือการจัดเก็บข้อมูล

## เอกสารอ้างอิงและ Dependency

- US8-T05: [DTO & API Spec](../T05/US8-DTO-API-Spec.md), [DTO Class Diagram](../T05/US8-DTO-Class-Diagram.md), [API Class Diagram](../T05/US8-API-Class-Diagram.md)
- US8-T06: sequence diagram การเลือกแผน, preview และ confirm
- US8-T16: [UAT Test Cases](../T16/US8-T16-uat-test-cases.md)
- Frontend ใช้ Vitest และ React Testing Library ที่มีอยู่ใน `frontend/package.json`; ไม่เพิ่ม dependency จากงานออกแบบนี้

**ขอบเขตกรณีวิชาที่เคยเรียนผ่าน:** PR #83 ของ US8-T05 ได้รับ approval แล้วตามสถานะที่ทีมแจ้ง แต่ยังไม่ merge เข้า `develop` ณ ตอนจัดทำเอกสารนี้ จึงอ้างอิง spec รุ่นล่าสุดใน branch ที่ approve แล้ว ซึ่งยังไม่มี API/DTO สำหรับประวัติวิชาที่เรียนผ่าน เอกสาร UAT ของ US8-T16 ระบุว่า CoS เรื่องนี้ถูกตัดออกและระบบไม่ตรวจประวัติวิชา ดังนั้น T11 จึงไม่ทดสอบการกรองวิชาจาก transcript; จะทดสอบเฉพาะวิชาที่อยู่ในตารางปัจจุบันแล้ว (`COURSE_ALREADY_IN_TIMETABLE`) ตามสัญญา API ปัจจุบัน หากทีมเปลี่ยน CoS หรือเพิ่ม API ตรวจประวัติวิชาในภายหลัง ให้เพิ่ม test case ตามสัญญาใหม่นั้น

## Test Approach

- Render หน้า/ส่วน UI ด้วยข้อมูลทดสอบควบคุมได้
- Mock boundary ของ API ให้คืน `StudyPlanList` และ `ApplyPlanResponse` ตาม US8-T05
- ใช้ user interaction ผ่าน React Testing Library; ตรวจองค์ประกอบด้วย accessible role/name หรือข้อความที่แสดงต่อผู้ใช้
- ใช้ `dryRun: true` เพื่อจำลอง preview และ `dryRun: false` เพื่อจำลองการยืนยัน
- ตรวจว่า preview ไม่ทำให้ตารางเปลี่ยน และหลังยืนยัน UI ใช้ `timetable` ที่ได้จาก response ของ confirm
- ชื่อ component, route และข้อความ UI ให้ปรับตาม implementation จริง โดยคงพฤติกรรมที่ระบุใน Expected Result
- เอกสารนี้เป็นการออกแบบ test cases เท่านั้น ยังไม่ได้รันทดสอบจริง

## Test Data

| ชุดข้อมูล | รายละเอียด |
|---|---|
| StudyPlanList ปี 2 | `studyYear: 2`, `semester: 1`, มีแผนเดียว `planType: null`, `minors: []` |
| StudyPlanList ปี 3 | มี `SPECIAL_PROJECT` และ `CO_OP`; มีวิชาโทอย่างน้อย 1 รายการใน `minors` |
| Preview ปกติ | `added` มีรายวิชาพร้อม `sectionNo`; `skipped` มีอย่างน้อยหนึ่งรายการพร้อม `reason` และ `message`; `timetable: null` |
| Preview วิชาโท | `added` หรือ `skipped` มีรายการ `source: "MINOR"`; วิชาแผนหลักใช้ `source: "PLAN"` |
| Confirm response | `dryRun: false`, มี `timetable` ที่รวมวิชาใหม่และวิชาเดิม |
| Empty plans | `plans: []`, `minors: []` |
| API error | จำลองการ reject ของการโหลดแผน, preview หรือ confirm |

ข้อมูลใน test เป็น mock ไม่อ้างว่าเป็นข้อมูล seed จริงของฐานข้อมูล

## Test Cases

### [UT-UI-01] เปิดส่วนจัดตารางตามแผนและเลือกชั้นปี/ภาคเรียน

**Related CoS:** การจัดตารางตามแผนการเรียน

**Preconditions:** หน้า UI พร้อม render และ mock API โหลดแผนได้

**Test Steps:**
1. Render หน้าโดยยังไม่เลือกชั้นปี
2. ตรวจตัวเลือกชั้นปีและภาคเรียน
3. เลือกชั้นปีที่ 2 และภาคเรียนที่ 1

**Expected Result:**
- UI แสดงตัวเลือกชั้นปีและภาคเรียน
- ก่อนเลือกค่าที่จำเป็น UI ยังไม่แสดงรายการแผนที่ไม่ตรงกับ selection
- เมื่อเลือกครบ UI เรียก API โหลดแผนด้วย `studyYear: 2` และ `semester: 1`
- UI แสดงหัวข้อ/ข้อมูลแผนที่ตรงกับค่าที่เลือกเมื่อ API สำเร็จ

### [UT-UI-02] แสดงสถานะเมื่อไม่มีแผนการเรียน

**Related CoS:** กรณีข้อมูลว่าง

**Preconditions:** Mock API คืน `plans: []` และ `minors: []`

**Test Steps:**
1. เลือกชั้นปีและภาคเรียน
2. รอผลการโหลดแผน

**Expected Result:**
- UI แสดงข้อความแจ้งว่ายังไม่มีแผนสำหรับตัวเลือกนั้น
- UI ไม่แสดงรายการวิชาหรือปุ่ม preview ที่ต้องอาศัยแผน
- UI ไม่แสดง error สำหรับผลลัพธ์ว่างที่ถูกต้อง

### [UT-UI-03] เลือกแผนการศึกษาสำหรับชั้นปีที่ 3–4 และวิชาโท

**Related CoS:** ตัวเลือกแผนการศึกษาชั้นปีที่ 3–4

**Preconditions:** Mock API คืนแผน `SPECIAL_PROJECT`, `CO_OP` และรายการวิชาโท

**Test Steps:**
1. เลือกชั้นปีที่ 3 และภาคเรียนที่ 1
2. ตรวจตัวเลือกแผนการศึกษาและวิชาโท
3. เลือก `CO_OP` และเลือกวิชาโทหนึ่งรายการ
4. เปลี่ยนเป็นชั้นปีที่ 2

**Expected Result:**
- ปี 3 แสดงตัวเลือกทำหัวข้อพิเศษและสหกิจศึกษา และบังคับให้เลือกแผนก่อนแสดงรายวิชาของแผน
- ตัวเลือกวิชาโทมีค่าเริ่มต้นเป็นไม่เรียนวิชาโท และเลือกได้ไม่เกินหนึ่งรายการ
- เมื่อเลือก `CO_OP` UI แสดงรายวิชาของแผนสหกิจ ไม่ปะปนกับแผนทำหัวข้อพิเศษ
- เมื่อเลือกวิชาโท UI ระบุสถานะ/ชื่อวิชาโทที่เลือก
- เมื่อเปลี่ยนเป็นปี 2 UI ซ่อนตัวเลือกแผนการศึกษาและวิชาโท และล้าง selection ที่ไม่รองรับสำหรับปี 2

### [UT-UI-04] แสดงรายการวิชาที่จะเพิ่มและวิชาที่ถูกข้ามในหน้า preview

**Related CoS:** แสดงสรุปก่อนยืนยันและรายการที่เพิ่มไม่ได้พร้อมเหตุผล

**Preconditions:** เลือกแผนและภาคเรียนครบ; mock `POST /api/timetable/apply-plan` แบบ preview ให้คืน `dryRun: true`

**Test Data:** `added` มีวิชา `PLAN` พร้อม section; `skipped` มีตัวอย่างเหตุผล `COURSE_ALREADY_IN_TIMETABLE`, `NO_SECTION_AVAILABLE`, `TIME_CONFLICT` และ `CREDIT_LIMIT_EXCEEDED` ตาม response ที่ UI รองรับ

**Test Steps:**
1. กดปุ่มดูสรุป/จัดตารางตามแผน
2. รอ preview response
3. ตรวจรายการในหน้าหรือกล่องสรุป

**Expected Result:**
- UI เรียก apply-plan ด้วย `dryRun: true` และ `planId`, `academicYear` รวมถึง `minorId` เมื่อเลือกวิชาโท
- รายการ `added` แสดงข้อมูลวิชาและ section ตาม response
- รายการ `skipped` แสดงวิชาและเหตุผลจาก `message`/`reason` ที่ response ส่งมา
- รายการที่มี `source: "MINOR"` แสดงป้ายบอกว่าเป็นวิชาโท
- Preview ไม่เปลี่ยนตารางที่แสดงอยู่ และไม่แสดง `timetable` สำหรับผล preview

### [UT-UI-05] แสดงผลเมื่อไม่มีวิชาเพิ่มได้

**Related CoS:** กรณีข้อมูลว่าง/ผลลัพธ์ไม่มีวิชาเพิ่ม

**Preconditions:** Mock preview คืน `added: []` และ `skipped` มีรายการพร้อมเหตุผล

**Test Steps:**
1. ขอ preview ของแผน
2. ตรวจหน้าสรุปผล

**Expected Result:**
- UI แสดงสถานะว่าไม่มีวิชาที่เพิ่มได้ พร้อมรายการที่ถูกข้ามและเหตุผล
- UI ไม่แสดงรายการ `added` ปลอม หรือแสดงจำนวนเพิ่มเป็นค่าที่ไม่ตรงกับ response
- UI จัดการผลลัพธ์ `200` ที่ `added` ว่างได้โดยไม่แสดงข้อผิดพลาดทางเทคนิค

### [UT-UI-06] ยกเลิกหน้าสรุปโดยไม่บันทึกตาราง

**Related CoS:** ปุ่มยืนยันและยกเลิก

**Preconditions:** UI แสดง preview แล้ว; เก็บ snapshot ของตารางก่อนเริ่ม

**Test Steps:**
1. กดปุ่มยกเลิก/ปิดหน้าสรุป
2. ตรวจสถานะหน้าสรุปและตาราง

**Expected Result:**
- UI ปิดหน้าสรุปและกลับสู่หน้าจัดตารางตามพฤติกรรมที่ออกแบบ
- ตารางและหน่วยกิตยังเหมือนก่อน preview
- ไม่มีคำขอ apply-plan แบบ `dryRun: false`

### [UT-UI-07] ยืนยันการจัดตารางและแสดงตารางจาก confirm response

**Related CoS:** ปุ่มยืนยัน

**Preconditions:** มี preview พร้อมยืนยัน; mock confirm ให้คืน `dryRun: false` และ `timetable` ล่าสุด

**Test Steps:**
1. กดปุ่มยืนยันจัดตาราง
2. รอ confirm response
3. ตรวจตารางและสรุปผลหลังยืนยัน

**Expected Result:**
- UI เรียก apply-plan ด้วยค่าที่เลือกเดิมและ `dryRun: false`
- ระหว่างส่งคำขอ ปุ่มยืนยันถูก disable หรือแสดง loading ตามรูปแบบ UI
- เมื่อสำเร็จ UI ปิด/อัปเดตหน้าสรุป และแสดงตารางจาก `timetable` ใน confirm response
- UI แสดงผลเพิ่ม/ข้ามให้ตรงกับ response ล่าสุด ไม่ใช้ผล preview เก่าทับผลยืนยัน
- การคลิกยืนยันซ้ำระหว่างคำขอกำลังทำงานไม่ส่งคำขอซ้ำ

### [UT-UI-08] จัดการ error ขณะโหลดแผนหรือขอ preview

**Related CoS:** กรณีผิดพลาด

**Preconditions:** Mock API ให้ reject ใน request ที่กำลังทดสอบ

**Test Steps:**
1. ทดสอบกรณีโหลดรายการแผนล้มเหลว
2. ทดสอบกรณีขอ preview ล้มเหลว
3. ตรวจข้อความ error และลองทำรายการใหม่

**Expected Result:**
- UI แสดงข้อความผิดพลาดที่ผู้ใช้เข้าใจได้ ไม่แสดง stack trace
- UI ไม่แสดงรายการ preview เก่าราวกับเป็นผลของ request ใหม่
- UI คงตัวเลือกที่ผู้ใช้ทำไว้เมื่อเหมาะสม และเปิดโอกาสให้ลองใหม่
- เมื่อ retry สำเร็จ UI แสดงผลจาก response ใหม่

### [UT-UI-09] จัดการ error ขณะยืนยัน

**Related CoS:** กรณีผิดพลาด

**Preconditions:** มี preview; mock confirm request ให้ reject แล้วสามารถ retry ได้

**Test Steps:**
1. กดยืนยันและจำลอง API error
2. ตรวจสถานะตารางและข้อความแจ้งเตือน
3. ลองยืนยันใหม่เมื่อ request พร้อมทำงาน

**Expected Result:**
- UI แจ้งว่าบันทึกไม่สำเร็จ และไม่แสดงตารางใหม่เป็นผลสำเร็จ
- UI ไม่ล้างวิชาเดิมในตาราง
- ปุ่ม/สถานะกลับมาพร้อมให้ retry หลัง error
- เมื่อ retry สำเร็จ UI แสดง timetable จาก response สำเร็จ

## สรุปความครอบคลุม

| Test Case | เรื่องที่ทดสอบ | ปกติ | ว่าง | ผิดพลาด |
|---|---|:---:|:---:|:---:|
| UT-UI-01 | เลือกชั้นปีและภาคเรียน | ✓ | | |
| UT-UI-02 | ไม่มีแผน | | ✓ | |
| UT-UI-03 | เลือกแผนพิเศษและวิชาโท | ✓ | | |
| UT-UI-04 | แสดง preview และเหตุผลที่ข้าม | ✓ | | |
| UT-UI-05 | ไม่มีวิชาเพิ่มได้ | | ✓ | |
| UT-UI-06 | ยกเลิกโดยไม่บันทึก | ✓ | | |
| UT-UI-07 | ยืนยันและอัปเดตตาราง | ✓ | | |
| UT-UI-08 | โหลดแผน/preview error และ retry | | | ✓ |
| UT-UI-09 | confirm error และ retry | | | ✓ |

## สิ่งที่อยู่นอกขอบเขต Unit Test UI

- การตรวจประวัติวิชาที่เรียนผ่านแล้ว: ไม่อยู่ใน CoS/API contract รุ่นที่ได้รับ approval; UI test ครอบคลุมเฉพาะวิชาที่มีอยู่ในตารางปัจจุบัน
- การเลือก section, ตรวจเวลาชน, เครดิต และการเขียนฐานข้อมูล: เป็นความรับผิดชอบของ backend/API tests; UI test เพียงตรวจการแสดงผลตาม response ที่ mock
- ความถูกต้องของข้อมูล seed และการใช้งานจริงแบบ end-to-end: ตรวจใน integration/UAT

## เอกสารที่เกี่ยวข้อง

- [US8-T05 DTO & API Spec](../T05/US8-DTO-API-Spec.md)
- [US8-T06 Sequence Diagrams](../T06/)
- [US8-T16 UAT Test Cases](../T16/US8-T16-uat-test-cases.md)
