# Integration Test Cases: US1 - ระหว่าง API กับ DAO (API & DAO Integration)

เอกสารฉบับนี้อธิบายกรณีการทดสอบแบบผสมผสาน (Integration Test) ระหว่างชั้น API (Controller/Service) และชั้น DAO (Repository) สำหรับ User Story 1 (ตาม Task US1-T14) โดยอ้างอิงสถาปัตยกรรมและ Sequence Flow จาก US1-T06

---

## ภาพรวมการทดสอบ (Overview)
* **เป้าหมาย:** ตรวจสอบการทำงานร่วมกันระหว่างชั้น Controller/Service (`TimetableController`, `TimetableService`) และชั้น DAO (`SectionRepository`, `TimetableRepository`, `TimetableEntryRepository`) จนถึงฐานข้อมูลจริง
* **ขอบเขต:** ทดสอบการส่งผ่าน Request จาก API ผ่าน Service ชั้นต่างๆ ไปยัง DAO เพื่อจัดการข้อมูลตาม Business Rule และข้อกำหนดของ Database Constraints

---

## รายการ Integration Test Cases

### 1. IT-API-DAO-01 : เพิ่มวิชาลงตารางเรียนสำเร็จ (Add Entry Success)
* **Description:** ทดสอบเมื่อส่ง `POST /api/timetable/entries` ด้วยข้อมูลที่ถูกต้อง ครบถ้วน ระบบจะตรวจสอบผ่าน DAO และบันทึกข้อมูลลงตาราง `timetable` และ `timetable_entry` สำเร็จ
* **Pre-conditions:** 
  * มีข้อมูล `Section` ในระบบ
  * ข้อมูลวิชาไม่ซ้ำ และไม่เกินขีดจำกัดหน่วยกิตรวม (`maxCredits`)
* **Test Steps:**
  1. ส่ง HTTP Request `POST /api/timetable/entries` พร้อมระบุ `sectionId` ที่ถูกต้อง
  2. `TimetableService` เรียก `SectionRepository.findById` เพื่อตรวจสอบ Section
  3. ตรวจสอบตารางเรียนผ่าน `TimetableRepository` และ `TimetableEntryRepository`
  4. บันทึกข้อมูลลงฐานข้อมูล (`INSERT` หรือ `UPDATE` timetable และ `INSERT INTO timetable_entry`)
* **Expected Result:** 
  * API ตอบกลับด้วยสถานะ `201 Created` พร้อมโครงสร้างตารางเรียนและรายการ conflicts (ถ้ามี)
  * ข้อมูลถูกบันทึกลงในฐานข้อมูลจริงผ่าน DAO ครบถ้วนถูกต้อง

---

### 2. IT-API-DAO-02 : ปฏิเสธการเพิ่มวิชาซ้ำ (Duplicate Course Rejection)
* **Description:** ทดสอบเมื่อพยายามเพิ่มรายวิชาที่มีอยู่ในตารางเรียนแล้ว (ไม่ว่าจะคนละกลุ่มเรียน) ระบบจะปฏิเสธคำขอและไม่มีการบันทึกซ้ำลงฐานข้อมูล
* **Pre-conditions:** มีรายวิชาดังกล่าวอยู่ในตารางเรียนของนักศึกษาแล้ว
* **Test Steps:**
  1. ส่ง HTTP Request `POST /api/timetable/entries` ด้วย `sectionId` ของรายวิชาที่มีอยู่แล้วในตาราง
  2. `TimetableService` เรียกเมธอดตรวจสอบ `checkNotAlreadyAdded(entries, section)` แล้วพบว่าซ้ำ
* **Expected Result:** 
  * ระบบโยน `BusinessRuleException` และ API ตอบกลับด้วยสถานะ `409 Conflict` พร้อมรหัสข้อผิดพลาด `COURSE_ALREADY_IN_TIMETABLE`
  * ตรวจสอบฐานข้อมูลผ่าน DAO แล้ว **ไม่มีการบันทึกแถวข้อมูลใหม่** เพิ่มเติมใน `timetable_entry`

---

### 3. IT-API-DAO-03 : ปฏิเสธเมื่อหน่วยกิตเกินขีดจำกัด (Credit Limit Exceeded)
* **Description:** ทดสอบเมื่อผลรวมหน่วยกิตของวิชาในตารางบวกกับวิชาที่ต้องการเพิ่มเกินค่า `maxCredits` (22 หน่วยกิต) ระบบจะปฏิเสธการเพิ่มข้อมูล
* **Pre-conditions:** หน่วยกิตปัจจุบันในตารางรวมกับวิชาใหม่เกินกว่ากำหนด
* **Test Steps:**
  1. ส่ง HTTP Request `POST /api/timetable/entries` เพื่อเพิ่มรายวิชาใหม่
  2. `TimetableService` ตรวจสอบเงื่อนไขผ่าน `checkCreditLimit(entries, section)` แล้วพบว่าเกินลิมิต
* **Expected Result:** 
  * ระบบโยน `BusinessRuleException` และ API ตอบกลับด้วยสถานะ `409 Conflict` พร้อมรหัสข้อผิดพลาด `CREDIT_LIMIT_EXCEEDED`
  * ตรวจสอบในฐานข้อมูลผ่าน DAO แล้ว **ไม่มีการบันทึกข้อมูลใดๆ เพิ่มเติม**

---

### 4. IT-API-DAO-04 : จัดการกรณีไม่พบ Section (Resource Not Found)
* **Description:** ทดสอบเมื่อส่ง `sectionId` ที่ไม่มีอยู่จริงในระบบ ระบบจะจัดการข้อผิดพลาดและตอบกลับอย่างถูกต้องโดยไม่มีการติดต่อ DAO ส่วนอื่นๆ ต่อ
* **Pre-conditions:** `sectionId` ที่ส่งมาไม่มีอยู่ในฐานข้อมูล
* **Test Steps:**
  1. ส่ง HTTP Request `POST /api/timetable/entries` ด้วย `sectionId` ที่ไม่ถูกต้อง (เช่น `99999`)
  2. `SectionRepository.findById` คืนค่าเป็น Empty (`Optional.empty()`)
* **Expected Result:** 
  * ระบบโยน `ResourceNotFoundException` และ API ตอบกลับด้วยสถานะ `404 Not Found` (ProblemDetail)