# US2-T15: System Test Case Specification

## 1. Overview

**User Story:** US2 – ลบรายวิชาออกจากตารางเรียน  
**Task:** US2-T15 – Design System Test ตาม Sequence Diagram  
**Reference:** US2-T06 Sequence Diagram  
**Test Level:** System Testing  
**Test Status:** Not Executed (Design Only)

**หมายเหตุ:** Entry ID และ Student ID ที่ระบุในเอกสารนี้
เป็นข้อมูลสมมติสำหรับการออกแบบ Test Case
โดยต้องเตรียมและตรวจสอบข้อมูลจริงก่อนดำเนินการทดสอบ

## CoS 

[ดู CoS ของ US2](https://trello.com/c/hrPN2uxL)

### Objective

ออกแบบกรณีทดสอบการลบรายวิชาออกจากตารางเรียน โดยตรวจสอบการทำงานตั้งแต่ผู้ใช้ส่งคำสั่งลบผ่านหน้าเว็บ การประมวลผลของ Backend การเปลี่ยนแปลงข้อมูลใน Database และการแสดงผลลัพธ์กลับมายังหน้าเว็บ

## 2. Test Scenarios

| Test Case ID | Scenario | Expected HTTP Status |
|---|---|---|
| ST-US2-01 | ลบรายวิชาเดียวสำเร็จ | 200 |
| ST-US2-02 | ลบหลายรายวิชาสำเร็จ | 200 |
| ST-US2-03 | ส่ง Entry ID ที่ไม่ใช่ตัวเลข | 400 |
| ST-US2-04 | ไม่ส่ง Entry ID | 400 |
| ST-US2-05 | ส่งรายการ Entry ID ว่าง | 400 |
| ST-US2-06 | ลบ Entry ID ที่ไม่มีอยู่จริง | 404 |
| ST-US2-07 | ลบ Entry ID ของนักศึกษาคนอื่น | 404 |
| ST-US2-08 | ลบ Entry ID จากคนละตารางเรียน | 400 |
| ST-US2-09 | ส่ง Entry ID ซ้ำกัน | 200 |
| ST-US2-10 | ลบรายวิชาสุดท้ายจนตารางว่าง | 200 |

## 3. Detailed Test Cases

### ST-US2-01: ลบรายวิชาเดียวสำเร็จ

**Objective:** ตรวจสอบว่าระบบสามารถลบรายวิชาเดียวออกจากตารางเรียนได้อย่างถูกต้อง

**Preconditions:**
- นักศึกษาเข้าสู่ระบบแล้ว
- ตารางเรียนของนักศึกษามีรายวิชาอย่างน้อย 2 รายการ
- Entry ID ที่ต้องการลบเป็นของนักศึกษาที่เข้าสู่ระบบ

**Test Data:**
- Student ID: `student-A`
- Entry ID: `7`
- API: `DELETE /api/timetable/entries/7`

**Test Steps:**
1. นักศึกษาเปิดหน้าตารางเรียน
2. กดปุ่มลบของรายวิชาที่มี Entry ID เท่ากับ `7`
3. ระบบส่งคำขอลบไปยัง Backend
4. Backend ตรวจสอบสิทธิ์และลบรายการ
5. ระบบส่งข้อมูลตารางเรียนที่อัปเดตกลับมายังหน้าเว็บ

**Expected Results:**
1. API ตอบกลับ HTTP 200 พร้อม `TimetableResponse`
2. รายการ Entry ID `7` ถูกลบออกจาก Database
3. รายวิชาอื่นในตารางเรียนยังคงอยู่
4. `updatedAt` ของตารางเรียนถูกอัปเดต
5. หน้าเว็บแสดงตารางเรียนและจำนวนหน่วยกิตใหม่อย่างถูกต้อง
6. Checkbox ถูกล้าง และสถานะ UI กลับเป็น `idle`

**Actual Result:** Not Executed  
**Status:** Not Executed

---

### ST-US2-02: ลบหลายรายวิชาสำเร็จ

**Objective:** ตรวจสอบว่าระบบสามารถลบหลายรายวิชาจากตารางเรียนเดียวกันได้ในคำขอเดียว

**Preconditions:**
- นักศึกษาเข้าสู่ระบบแล้ว
- ตารางเรียนมี Entry ID `7` และ `8`
- ทั้งสองรายการเป็นของนักศึกษาคนเดียวกันและอยู่ในตารางเรียนเดียวกัน

**Test Data:**
- Entry IDs: `7,8`
- API: `DELETE /api/timetable/entries?entryIds=7,8`

**Test Steps:**
1. นักศึกษาเลือก Checkbox ของรายวิชา 2 รายการ
2. กดปุ่มลบรายการที่เลือก
3. ตรวจสอบว่าปุ่มลบถูกปิดใช้งานระหว่างประมวลผล
4. ระบบส่งคำขอลบไปยัง Backend
5. ตรวจสอบผลลัพธ์หลังการลบ

**Expected Results:**
1. API ตอบกลับ HTTP 200 พร้อม `TimetableResponse`
2. Entry ID `7` และ `8` ถูกลบออกจาก Database
3. รายการอื่นที่ไม่ได้เลือกยังคงอยู่
4. `updatedAt` ถูกอัปเดต
5. หน้าเว็บแสดงตารางเรียน หน่วยกิต และข้อมูลเวลาชนที่คำนวณใหม่
6. Checkbox ถูกล้าง และสถานะกลับเป็น `idle`

**Actual Result:** Not Executed  
**Status:** Not Executed

---

### ST-US2-03: ส่ง Entry ID ที่ไม่ใช่ตัวเลข

**Objective:** ตรวจสอบว่าระบบปฏิเสธคำขอลบที่มี Entry ID ไม่ถูกต้องตามรูปแบบ

**Preconditions:**
- มีรายวิชาอยู่ในตารางเรียนของนักศึกษา
- ระบบ Backend พร้อมรับคำขอ

**Test Data:**
- Entry ID: `abc`
- API: `DELETE /api/timetable/entries/abc`

**Test Steps:**
1. บันทึกรายการวิชาที่มีอยู่ในตารางเรียนก่อนทดสอบ
2. ส่ง HTTP DELETE Request โดยระบุ Entry ID เป็น abc
3. ตรวจสอบ HTTP Response และข้อมูลตารางเรียนหลังส่งคำขอ

**Expected Results:**
1. API ตอบกลับ HTTP 400 พร้อม ProblemDetail
2. คำขอถูกปฏิเสธก่อนเข้าสู่ Controller Method
3. ไม่มีรายวิชาใดถูกลบออกจาก Database
4. ข้อมูลตารางเรียนเดิมไม่เปลี่ยนแปลง

**Actual Result:** Not Executed  
**Status:** Not Executed

---

### ST-US2-04: ไม่ส่ง Entry ID

**Objective:** ตรวจสอบว่าระบบปฏิเสธคำขอลบที่ไม่ได้ระบุ Entry ID

**Preconditions:**
- มีรายวิชาอยู่ในตารางเรียนของนักศึกษา
- ระบบ Backend พร้อมรับคำขอ

**Test Data:**
- API: `DELETE /api/timetable/entries`
- Query Parameter: `ไม่ระบุ entryIds`

**Test Steps:**
1. บันทึกข้อมูลตารางเรียนก่อนทดสอบ
2. ส่ง HTTP DELETE Request โดยไม่ระบุ entryIds
3. ตรวจสอบ HTTP Response และข้อมูลตารางเรียน

**Expected Results:**
1. API ตอบกลับ HTTP 400 พร้อม ProblemDetail
2. คำขอถูกปฏิเสธเนื่องจากไม่มีพารามิเตอร์ที่จำเป็น
3. ไม่มีรายการวิชาใดถูกลบ
4. ข้อมูลตารางเรียนเดิมไม่เปลี่ยนแปลง

**Actual Result:** Not Executed  
**Status:** Not Executed

---

### ST-US2-05: ส่งรายการ Entry ID ว่าง

**Objective:** ตรวจสอบว่าระบบไม่อนุญาตให้ลบรายวิชาเมื่อไม่มี Entry ID ที่ใช้ดำเนินการ

**Preconditions:**
- มีรายวิชาอยู่ในตารางเรียนของนักศึกษา
- ระบบ Backend พร้อมรับคำขอ

**Test Data:**
- API:`DELETE /api/timetable/entries?entryIds=`

**Test Steps:**
1. บันทึกข้อมูลตารางเรียนก่อนทดสอบ
2. ส่ง HTTP DELETE Request พร้อม entryIds ที่เป็นค่าว่าง
3. ตรวจสอบ HTTP Response
4. ตรวจสอบข้อมูลตารางเรียนหลังส่งคำขอ

**Expected Results:**
1. API ตอบกลับ HTTP 400 พร้อม ProblemDetail
2. ระบบปฏิเสธการลบเนื่องจากไม่มี Entry ID ที่ใช้งานได้
3. ไม่มีรายวิชาใดถูกลบออกจาก Database
4. ข้อมูลตารางเรียนเดิมไม่เปลี่ยนแปลง

**Actual Result:** Not Executed  
**Status:** Not Executed

---

### ST-US2-06: ลบ Entry ID ที่ไม่มีอยู่จริง

**Objective:** ตรวจสอบว่าระบบจัดการคำขอลบรายวิชาที่ไม่มีอยู่ในฐานข้อมูลได้อย่างถูกต้อง โดยไม่กระทบข้อมูลเดิม

**Preconditions:**
- นักศึกษาเข้าสู่ระบบแล้ว
- ตารางเรียนของนักศึกษามีรายวิชาอย่างน้อย 1 รายการ
- Entry ID ที่ใช้ทดสอบไม่มีอยู่ใน Database

**Test Data:**
- Student ID: `student-A`
- Entry ID: `99999`  (สมมติว่าไม่มีอยู่จริง ต้องตรวจสอบก่อนทดสอบ)
- API: `DELETE /api/timetable/entries/99999`

**Test Steps:**
1. นักศึกษาเปิดหน้าตารางเรียนและบันทึกรายการวิชาปัจจุบัน
2. ส่งคำขอลบ Entry ID 99999 ผ่าน API
3. Backend ตรวจสอบรายการใน Database
4. ตรวจสอบ HTTP Response
5. ตรวจสอบว่าข้อมูลตารางเรียนใน Database ไม่เปลี่ยนแปลง
6. จำลองสถานการณ์ที่ UI ได้รับ HTTP 404 แล้วตรวจสอบการตอบสนองของหน้าเว็บ

**Expected Results:**
1. API ตอบกลับ HTTP 404 พร้อม ProblemDetail
2. ระบบไม่ลบหรือเปลี่ยนแปลงรายการวิชาใดใน Database
3. UI แจ้งผู้ใช้ว่าข้อมูลตารางเรียนมีการเปลี่ยนแปลง
4. UI ส่ง GET /api/timetable เพื่อโหลดข้อมูลล่าสุดจาก Server
5. รายการวิชาที่แสดงตรงกับข้อมูลล่าสุด และ Checkbox ที่เลือกถูกล้าง

**Actual Result:** Not Executed  
**Status:** Not Executed

--- 

### ST-US2-07: พยายามลบ Entry ID ของนักศึกษาคนอื่น

**Objective:** ตรวจสอบว่าระบบป้องกันไม่ให้นักศึกษาลบรายวิชาที่ไม่ได้เป็นเจ้าของ และไม่เปิดเผยข้อมูลของนักศึกษาคนอื่น

**Preconditions:**
- นักศึกษา A เข้าสู่ระบบแล้ว
- นักศึกษา A มีตารางเรียนของตนเอง
- นักศึกษา B มีตารางเรียนที่ประกอบด้วย Entry ID ที่ใช้ทดสอบ
- Entry ID ของนักศึกษา B ไม่มีสิทธิ์ถูกลบโดยนักศึกษา A

**Test Data:**
- Current Student: `student-A`
- Entry ID: `200` (สมมติว่าเป็นของ `student-b`)
- API: `DELETE /api/timetable/entries/200`

**Test Steps:**
1. เตรียมข้อมูล Entry ID 200 ให้เป็นรายการของนักศึกษา B
2. เข้าสู่ระบบด้วยบัญชีนักศึกษา A
3. บันทึกข้อมูลตารางเรียนของนักศึกษาทั้ง A และ B ก่อนทดสอบ
4. ส่งคำขอลบ Entry ID 200 ด้วยสิทธิ์ของนักศึกษา A
5. ตรวจสอบ HTTP Response
6. ตรวจสอบข้อมูลใน Database หลังส่งคำขอ
7. จำลองการได้รับ HTTP 404 บน UI และตรวจสอบการแสดงผล

**Expected Results:**
1. API ตอบกลับ HTTP 404 พร้อม ProblemDetail
2. ระบบไม่ลบ Entry ID 200 ของนักศึกษา B
3. ข้อมูลตารางเรียนของนักศึกษา A ไม่เปลี่ยนแปลง
4. Response ไม่เปิดเผยข้อมูลส่วนตัวหรือรายละเอียดตารางเรียนของนักศึกษา B
5. UI แจ้งว่าข้อมูลตารางเรียนมีการเปลี่ยนแปลง และโหลดตารางของนักศึกษา A ใหม่
6. Checkbox ที่เลือกถูกล้างหลังโหลดข้อมูลใหม่

**Actual Result:** Not Executed  
**Status:** Not Executed

---

### ST-US2-08: ลบ Entry ID จากคนละตารางเรียน

**Objective:** ตรวจสอบว่าระบบปฏิเสธคำขอลบหลายรายวิชาที่อยู่คนละตารางเรียน เช่น คนละปีการศึกษาหรือภาคเรียน แม้ว่าทุกรายการจะเป็นของนักศึกษาคนเดียวกัน

**Preconditions:**
- นักศึกษาเข้าสู่ระบบแล้ว
- นักศึกษามีตารางเรียนอย่างน้อย 2 ตาราง จากคนละปีการศึกษาหรือภาคเรียน
- แต่ละตารางมีรายวิชาที่สามารถใช้ทดสอบการลบได้

**Test Data:**
- Student ID: `student-A`
- Entry ID: `7` อยู่ในตารางเรียนภาคเรียน 1/2569
- Entry ID: `8` อยู่ในตารางเรียนภาคเรียน 2/2569
- API: `DELETE /api/timetable/entries?entryIds=7,8`

**Test Steps:**
1. เตรียมข้อมูล Entry ID 7 และ 8 ให้อยู่คนละตารางเรียนของนักศึกษาคนเดียวกัน
2. บันทึกข้อมูลรายวิชาของทั้งสองตารางก่อนทดสอบ
3. ส่ง HTTP DELETE Request พร้อม entryIds=7,8
4. Backend ตรวจสอบความเป็นเจ้าของและจำนวน timetable_id ที่ไม่ซ้ำกัน
5. ตรวจสอบ HTTP Response
6. ตรวจสอบข้อมูลทั้งสองตารางเรียนใน Database หลังส่งคำขอ

**Expected Results:**
1. API ตอบกลับ HTTP 400 พร้อม ProblemDetail
2. ระบบปฏิเสธคำขอเนื่องจาก Entry ID อยู่คนละตารางเรียน
3. ไม่มีรายวิชาใดถูกลบจากทั้งสองตาราง
4. ข้อมูลรายวิชาและจำนวนหน่วยกิตของทั้งสองตารางยังคงเดิม
5. ไม่มีการอัปเดต updatedAt จากการลบที่ไม่สำเร็จ

**Actual Result:** Not Executed  
**Status:** Not Executed

---

### ST-US2-09: ส่ง Entry ID ซ้ำกัน

**Objective:** ตรวจสอบว่าระบบสามารถจัดการ Entry ID ที่ซ้ำกันในคำขอลบ โดยลบรายการจริงเพียงครั้งเดียว

**Preconditions:**
- นักศึกษาเข้าสู่ระบบแล้ว
- ตารางเรียนของนักศึกษามี Entry ID 7
- Entry ID 7 เป็นของนักศึกษาที่เข้าสู่ระบบ

**Test Data:**
- Student ID: `student-A`
- Entry IDs: `7,7`
- API: `DELETE /api/timetable/entries?entryIds=7,7`

**Test Steps:**
1. เตรียมข้อมูลตารางเรียนที่มี Entry ID 7
2. บันทึกข้อมูลตารางเรียนก่อนทดสอบ
3. ส่ง HTTP DELETE Request พร้อม entryIds=7,7
4. Backend ตัด Entry ID ที่ซ้ำกันก่อนค้นหาและลบรายการ
5. ตรวจสอบ HTTP Response
6. ตรวจสอบข้อมูลตารางเรียนใน Database และหน้าเว็บหลังลบ

**Expected Results:**
1. API ตอบกลับ HTTP 200 พร้อม TimetableResponse
2. ระบบจัดการ Entry ID ที่ซ้ำกันโดยไม่เกิดข้อผิดพลาด
3. Entry ID 7 ถูกลบออกจาก Database
4. รายวิชาอื่นที่ไม่ได้เลือกยังคงอยู่
5. updatedAt ถูกอัปเดต และ TimetableResponse แสดงข้อมูลรายวิชาที่เหลือถูกต้อง
6. หน้าเว็บแสดงตารางเรียนใหม่ และล้าง Checkbox ที่เลือก

**Actual Result:** Not Executed  
**Status:** Not Executed

---

### ST-US2-10: ลบรายวิชาสุดท้ายจนตารางเรียนว่าง

**Objective:** ตรวจสอบว่าระบบสามารถลบรายวิชาสุดท้ายออกจากตารางเรียนได้ และแสดงตารางว่างอย่างถูกต้องโดยไม่เกิดข้อผิดพลาด

**Preconditions:**
- นักศึกษาเข้าสู่ระบบแล้ว
- ตารางเรียนมีรายวิชาเหลือเพียง 1 รายการ
- รายการดังกล่าวเป็นของนักศึกษาที่เข้าสู่ระบบ

**Test Data:**
- Student ID: `student-A`
- Entry ID: `7`
- API: `DELETE /api/timetable/entries/7`

**Test Steps:**
1. นักศึกษาเปิดหน้าตารางเรียนที่มีรายวิชาเหลือเพียง 1 รายการ
2. กดลบรายวิชาสุดท้าย
3. UI เปลี่ยนสถานะเป็น deleting และปิดการใช้งานปุ่มลบระหว่างรอ
4. Backend ตรวจสอบและลบรายการใน Database
5. Backend ส่ง TimetableResponse ที่อัปเดตแล้วกลับมา
6. ตรวจสอบผลลัพธ์ใน Database และหน้าเว็บ

**Expected Results:**
1. API ตอบกลับ HTTP 200 พร้อม TimetableResponse
2. entries เป็น Array ว่าง ([])
3. totalCredits เท่ากับ 0
4. conflicts เป็น Array ว่าง ([])
5. ตารางเรียนยังคงอยู่ใน Database แต่ไม่มีรายการวิชา
6. updatedAt ถูกอัปเดตและไม่เป็น null
7. UI แสดงตารางเรียนว่าง โดยยังคงหัววันและเวลา
8. ปุ่มลบถูกปิดใช้งาน เพราะไม่มีรายวิชาให้ลบอีก
9. Checkbox ถูกล้าง และสถานะ UI กลับเป็น idle

**Actual Result:** Not Executed  
**Status:** Not Executed

---

## 4. Test Completion Criteria

การออกแบบ Test Case ถือว่าครบถ้วนเมื่อครอบคลุมเส้นทางการทำงานที่ระบุใน US2-T06 ได้แก่

- การลบรายวิชาเดียวและหลายรายวิชาสำเร็จ
- การตรวจสอบรูปแบบ Entry ID
- การตรวจสอบสิทธิ์เจ้าของรายการ
- การตรวจสอบรายการจากคนละตารางเรียน
- การจัดการ Entry ID ซ้ำ
- การอัปเดตตารางเรียนหลังลบ
- การจัดการ Error Response และการแสดงผลบน UI
- การลบรายวิชาสุดท้ายจนตารางเรียนว่าง
- การปิดใช้งานปุ่มลบเมื่อตารางเรียนไม่มีรายวิชา

**หมายเหตุ:** เอกสารนี้เป็น Test Case Specification ยังไม่มีการดำเนินการทดสอบจริง
