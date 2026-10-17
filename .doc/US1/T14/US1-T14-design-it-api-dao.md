# Integration Test Cases: US1 - ระหว่าง API กับ DAO (API & DAO Integration)

Integration Test ระหว่างชั้น API (Controller/Service) และชั้น DAO (Repository) สำหรับ User Story 1 (ตาม Task US1-T14) โดยอ้างอิงสถาปัตยกรรม Sequence Flow จาก US1-T06 และใช้ชุดข้อมูลทดสอบจาก Seed (ปีการศึกษา 1/2568)

---

## ภาพรวมการทดสอบ (Overview)
* **เป้าหมาย:** ตรวจสอบการทำงานร่วมกันระหว่างชั้น Controller/Service (`TimetableController`, `TimetableService`) และชั้น DAO (`SectionRepository`, `TimetableRepository`, `TimetableEntryRepository`) จนถึงฐานข้อมูลจริง
* **ขอบเขต:** ทดสอบการส่งผ่าน Request จาก API ผ่าน Service ชั้นต่างๆ ไปยัง DAO เพื่อจัดการข้อมูลตาม Business Rule, ลำดับการตรวจสอบ (เช็กวิชาซ้ำก่อนหน่วยกิต) และข้อกำหนดของ Database Constraints

---

## รายการ Integration Test Cases

### 1. IT-API-DAO-01 : เพิ่มวิชาลงตารางเรียนสำเร็จ (สร้างตารางใหม่เมื่อเพิ่มวิชาแรก)
* **Description:** ทดสอบเมื่อส่ง `POST /api/timetable/entries` ด้วยข้อมูล Section ที่ถูกต้อง (เช่น เพิ่ม `CS111` Sec `030001` ในภาคการศึกษา `1/2568`) ระบบจะสร้างตารางเรียน (`timetable`) ใหม่สำหรับนักศึกษาหากยังไม่มี และบันทึกข้อมูลลงตาราง `timetable_entry` สำเร็จ
* **Pre-conditions:** 
  * ข้อมูลทดสอบอ้างอิงตาม Seed ปีการศึกษา `1/2568`
  * นักศึกษายังไม่มีตารางเรียนในภาคการศึกษานี้ (Timetable เป็น Empty / ยังไม่มีแถวข้อมูล)
* **Test Steps:**
  1. ส่ง HTTP Request `POST /api/timetable/entries` พร้อมระบุ `sectionId` ของวิชา `CS111` (Sec `030001`)
  2. `TimetableService` ตรวจสอบผ่าน `SectionRepository.findById` และพบว่ายังไม่มีตารางเรียน จึงสร้างแถวใหม่ในตาราง `timetable` (ตั้งค่า `updated_at`)
  3. บันทึกข้อมูลลงตาราง `timetable_entry` ผ่าน `TimetableEntryRepository.save(entry)`
* **Expected Result:** 
  * API ตอบกลับด้วยสถานะ `201 Created` พร้อมโครงสร้างตารางเรียนและรายการ conflicts (ถ้ามี)
  * ตรวจสอบใน Database พบข้อมูลเพิ่มขึ้นในตาราง `timetable` จำนวน **1 แถว** และตาราง `timetable_entry` จำนวน **1 แถว** อย่างถูกต้อง

---

### 2. IT-API-DAO-02 : ปฏิเสธการเพิ่มวิชาซ้ำคนละกลุ่ม (Duplicate Course Rejection)
* **Description:** ทดสอบเมื่อพยายามเพิ่มรายวิชาที่มีอยู่ในตารางเรียนแล้วแต่คนละกลุ่มเรียน (เช่น มี `CS111` Sec `030001` อยู่แล้ว แล้วพยายามเพิ่ม `CS111` Sec `030002`) ระบบจะต้องตรวจพบความซ้ำซ้อนและปฏิเสธคำขอก่อนที่จะไปเช็กหน่วยกิต
* **Pre-conditions:** มีรายวิชา `CS111` (Sec `030001`) อยู่ในตารางเรียนของนักศึกษาแล้ว
* **Test Steps:**
  1. ส่ง HTTP Request `POST /api/timetable/entries` ด้วย `sectionId` ของวิชา `CS111` (Sec `030002`)
  2. `TimetableService` เรียกเมธอดตรวจสอบ `checkNotAlreadyAdded(entries, section)` ก่อนตรวจสอบหน่วยกิต แล้วพบว่ามีรหัสวิชาเดียวกันอยู่ในตารางแล้ว
  3. ระบบโยน `BusinessRuleException` โดยใช้ constructor `(status, code, detail, properties)`
* **Expected Result:** 
  * API ตอบกลับด้วยสถานะ `409 Conflict` พร้อมรหัสข้อผิดพลาด `COURSE_ALREADY_IN_TIMETABLE`
  * ตรวจสอบฐานข้อมูลผ่าน DAO แล้ว **ไม่มีการบันทึกแถวข้อมูลใหม่** เพิ่มเติมในตาราง `timetable_entry` (จำนวนแถวใน DB ยังคงเดิม)

---

### 3. IT-API-DAO-03 : ปฏิเสธเมื่อหน่วยกิตเกินขีดจำกัด (Credit Limit Exceeded)
* **Description:** ทดสอบเมื่อผลรวมหน่วยกิตของวิชาในตารางบวกกับวิชาที่ต้องการเพิ่มเกินค่า `maxCredits` (22 หน่วยกิต) ระบบจะปฏิเสธการเพิ่มข้อมูล (แม้หน้า UI จะบล็อกไม่ให้กดเพิ่ม แต่ชั้น API ยังคงป้องกันและตอบรับด้วยรหัส Error ที่ถูกต้องสำหรับการทดสอบระบบ)
* **Pre-conditions:** หน่วยกิตปัจจุบันในตารางรวมกับวิชาใหม่เกินกว่า 22 หน่วยกิต
* **Test Steps:**
  1. ส่ง HTTP Request `POST /api/timetable/entries` เพื่อเพิ่มรายวิชาใหม่ที่ทำให้เกินโควตาหน่วยกิต
  2. `TimetableService` ผ่านการตรวจวิชาซ้ำเรียบร้อย แล้วมาตรวจสอบเงื่อนไขผ่าน `checkCreditLimit(entries, section)` แล้วพบว่าเกินลิมิต
  3. ระบบโยน `BusinessRuleException` ด้วย constructor `(status, code, detail, properties)`
* **Expected Result:** 
  * API ตอบกลับด้วยสถานะ `409 Conflict` พร้อมรหัสข้อผิดพลาด `CREDIT_LIMIT_EXCEEDED`
  * ตรวจสอบในฐานข้อมูลผ่าน DAO แล้ว **ไม่มีการบันทึกข้อมูลใดๆ เพิ่มเติม**

---

### 4. IT-API-DAO-04 : จัดการกรณีเวลาเรียนชนกัน (Time Conflict Detection)
* **Description:** ทดสอบกรณีเพิ่มวิชาที่มีช่วงเวลาคาบเรียนทับซ้อนกับวิชาที่มีอยู่แล้วในตาราง (เช่น เพิ่มวิชา `TU109` ชนกับ `LAS101` ตามข้อมูล Seed 1/2568) ระบบจะต้องอนุญาตให้บันทึกข้อมูลลง DB ได้สำเร็จ แต่จะคำนวณและส่งคืนข้อมูลเวลาชน (`conflicts`) กลับมาใน Response
* **Pre-conditions:** มีวิชา `LAS101` อยู่ในตารางเดิมแล้ว และต้องการเพิ่มวิชา `TU109` ซึ่งมีช่วงเวลา `ScheduleSlot` ทับซ้อนกัน
* **Test Steps:**
  1. ส่ง HTTP Request `POST /api/timetable/entries` เพื่อเพิ่มวิชา `TU109`
  2. `TimetableService` บันทึกข้อมูลลงตาราง `timetable_entry` ผ่าน DAO สำเร็จ (เนื่องจากเวลาชนไม่ใช่เงื่อนไขห้ามบันทึก)
  3. ระบบประมวลผลคำนวณผ่าน private method `findConflicts(entries)` ในหน่วยความจำ
* **Expected Result:** 
  * API ตอบกลับด้วยสถานะ `201 Created` (ไม่ใช่ Error)
  * ใน JSON Response ส่วนของ `conflicts` จะต้องระบุรายละเอียดคาบเรียนที่ทับกันอย่างถูกต้อง และข้อมูลถูกบันทิกลงตาราง `timetable_entry` ใน DB เพิ่มขึ้น **1 แถว** เรียบร้อย

---

### 5. IT-API-DAO-05 : จัดการกรณีไม่พบ Section (Resource Not Found)
* **Description:** ทดสอบเมื่อส่ง `sectionId` ที่ไม่มีอยู่จริงในระบบ (ไม่อยู่ใน Seed ข้อมูล 1/2568) ระบบจะจัดการข้อผิดพลาดและตอบกลับอย่างถูกต้องโดยไม่มีการติดต่อ DAO ส่วนอื่นๆ ต่อ
* **Pre-conditions:** `sectionId` ที่ส่งมา (เช่น `99999`) ไม่มีอยู่ในฐานข้อมูล
* **Test Steps:**
  1. ส่ง HTTP Request `POST /api/timetable/entries` ด้วย `sectionId` ที่ไม่ถูกต้อง
  2. `SectionRepository.findById` คืนค่าเป็น Empty (`Optional.empty()`)
* **Expected Result:** 
  * ระบบโยน `ResourceNotFoundException` และ API ตอบกลับด้วยสถานะ `404 Not Found` (พร้อม ProblemDetail)