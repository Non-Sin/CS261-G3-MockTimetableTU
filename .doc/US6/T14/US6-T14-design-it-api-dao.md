# US6-T14: Design Integration Test Cases (API to DAO)

| รายการ | รายละเอียด |
|---|---|
| User Story | **US6: ดูวิชาเสรีแนะนำ** (Priority: High) |
| Task | US6-T14 Design Integration Test ระหว่าง API กับ DAO ของหน้าแนะนำวิชาเสรี |
| ขอบเขต | ทดสอบการทำงานร่วมกันตั้งแต่ Controller Layer, Service Layer ผ่านไปยัง Repository (DAO) และ Database สำหรับการค้นหา, กรองข้อมูล และการเพิ่มวิชาลงตาราง (อ้างอิง US6-T06 และ US6-T05) |
| ตำแหน่งไฟล์จัดเก็บ | `.doc/US6/T14/US6-T14-design-it-api-dao.md` |

## 1. วัตถุประสงค์ของการทดสอบ (Objective)
เพื่อตรวจสอบความถูกต้องของ Integration ระหว่าง API Endpoints และ Data Access Object (DAO / Repositories) ว่าสามารถประมวลผลคำขอ, แปลงพารามิเตอร์เป็น SQL Query ที่ถูกต้อง, ดึงข้อมูลจากฐานข้อมูลจริง (หรือ Test Container / H2), กรองข้อมูลตามเงื่อนไข (เช่น ตัวกรองความขัดแย้งกับตารางเรียนของผู้ใช้) และบันทึกข้อมูลลงตาราง `timetable_entry` ได้อย่างถูกต้องสมบูรณ์

---

## 2. ขอบเขตและสภาพแวดล้อมการทดสอบ (Scope & Environment)
- **Framework / Tools:** Spring Boot Test (`@SpringBootTest`, `@AutoConfigureMockMvc`, `@Transactional`), JUnit 5, Mockito / Testcontainers (หรือ H2 Database ตามมาตรฐานโปรเจกต์)
- **บัญชีทดสอบ:** จำลองผ่าน `CurrentStudentProvider` ด้วยรหัสประจำตัวนักศึกษาที่มีอยู่จริงใน Seed Data (เช่น `6609000000`)
- **Endpoints ที่เกี่ยวข้อง:**
  1. `GET /api/electives` (ค้นหาและกรองรายวิชาเสรี)
  2. `GET /api/electives/{courseCode}` (ดึงรายละเอียดรายวิชาและรีวิว)
  3. `POST /api/timetable/entries` (เพิ่มวิชาลงตารางเรียน - ทำงานร่วมกับ US1)

---

## 3. Integration Test Cases

### [IT-API-DAO-US6-01] ค้นหาและกรองรายวิชาเสรีผ่าน API ส่งต่อ Query ไปยัง DAO ได้ถูกต้อง
| รายการ | รายละเอียด |
|---|---|
| **Preconditions** | มีข้อมูล Seed วิชาเสรีในฐานข้อมูล (เช่น `FR205`, `PY250`) |
| **Test Data** | Request Parameters: `academicYear=2568`, `currentSemester=1`, `q=FR205`, `group=LANGUAGE` |
| **Test Steps** | 1. ส่งคำขอ `GET /api/electives?academicYear=2568&currentSemester=1&q=FR205&group=LANGUAGE` พร้อม Bearer Token<br>2. ตรวจสอบผลลัพธ์ HTTP Status และข้อมูลที่ถูก Query กลับมาจาก DAO |
| **Expected Result** | - ได้รับ HTTP Status `200 OK`<br>- ข้อมูลใน Response Body แสดงเฉพาะรายวิชาที่ตรงกับคำค้นหา `FR205` และหมวดหมู่ `LANGUAGE`<br>- DAO (`ElectiveRepository.searchRecommended`) ประกอบ SQL/JPQL Query พร้อมเงื่อนไข `LIKE` และ `interest_group` ได้อย่างถูกต้องถูกต้อง |

---

### [IT-API-DAO-US6-02] ตัวกรอง "ไม่ชนกับตาราง" (`excludeConflicts=true`) ดึงตารางของนักศึกษาที่ Login อยู่มาตรวจสอบอย่างถูกต้อง
| รายการ | รายละเอียด |
|---|---|
| **Preconditions** | - นักศึกษา (`6609000000`) มีตารางเรียนอยู่ในเทอม `1/2568` แล้ว (มีวิชาที่เรียนวันจันทร์ 13:30 - 16:30)<br>- มีวิชาที่มีเวลาเรียนทับซ้อน (เช่น `PY250` เรียนวันจันทร์เวลาเดียวกัน) และวิชาที่ไม่ชน |
| **Test Data** | Request Parameters: `academicYear=2568`, `currentSemester=1`, `excludeConflicts=true` |
| **Test Steps** | 1. ส่งคำขอ `GET /api/electives?academicYear=2568&currentSemester=1&excludeConflicts=true`<br>2. ตรวจสอบการเรียกใช้งาน `TimetableRepository` และการกรองข้อมูลของ `ScheduleOverlap` ใน Service/DAO Layer |
| **Expected Result** | - ได้รับ HTTP Status `200 OK`<br>- ระบบดึงข้อมูลตารางเรียนของ Student ID ที่กำลัง Login อยู่จริงผ่าน `TimetableService`<br>- รายวิชาที่มีเวลาเรียนซ้อนทับ (เช่น `PY250`) จะถูกกรองออก และแสดงเฉพาะวิชาที่ไม่มีเวลาชนเท่านั้น |

---

### [IT-API-DAO-US6-03] กรณีค้นหาไม่พบข้อมูลวิชา (Empty State Case)
| รายการ | รายละเอียด |
|---|---|
| **Preconditions** | ฐานข้อมูลไม่มีรายวิชารหัส `SA240` ที่ผ่านเงื่อนไขแนะนำ |
| **Test Data** | Request Parameters: `academicYear=2568`, `currentSemester=1`, `q=SA240` |
| **Test Steps** | 1. ส่งคำขอ `GET /api/electives?academicYear=2568&currentSemester=1&q=SA240` |
| **Expected Result** | - ได้รับ HTTP Status `200 OK`<br>- Response Body คืนค่าเป็น Array เปล่า `[]` (ไม่เกิด Exception และไม่คืนค่า Null) |

---

### [IT-API-DAO-US6-04] ดึงรายละเอียดรายวิชาและรีวิว (`GET /api/electives/{courseCode}`)
| รายการ | รายละเอียด |
|---|---|
| **Preconditions** | มีวิชา `FR205` พร้อมข้อมูล `elective_info`, `tags` และ `elective_review_point` ในระบบ |
| **Test Data** | Path Variable: `courseCode=FR205`, Query Params: `academicYear=2568`, `currentSemester=1` |
| **Test Steps** | 1. ส่งคำขอ `GET /api/electives/FR205?academicYear=2568&currentSemester=1`<br>2. ตรวจสอบการทำ Join และ Fetch Collections ของ DAO |
| **Expected Result** | - ได้รับ HTTP Status `200 OK`<br>- ข้อมูลรายละเอียดแสดงครบถ้วน รวมถึงรายการ Sections ทั้งปี, Tags, และ Bullet รีวิวที่เรียงลำดับ (`sort_order`) ถูกต้องโดยไม่เกิดปัญหา N+1 Query |

---

### [IT-API-DAO-US6-05] เพิ่มวิชาลงตารางสำเร็จ บันทึกแถวลงตาราง `timetable_entry` ถูกต้อง (ร่วมกับ US1)
| รายการ | รายละเอียด |
|---|---|
| **Preconditions** | - นักศึกษามี Timetable สำหรับเทอม `1/2568` อยู่แล้ว<br>- มี Section ว่างที่ยังไม่ได้ลงทะเบียน (เช่น Section ID ของวิชาเสรีที่ต้องการเพิ่ม) และหน่วยกิตรวมยังไม่เกิน 22 หน่วยกิต |
| **Test Data** | Request Body: `{ "sectionId": 101 }` |
| **Test Steps** | 1. ส่งคำขอ `POST /api/timetable/entries` ด้วย JSON Body ข้างต้น<br>2. ตรวจสอบสถานะการตอบกลับและตรวจสอบข้อมูลในฐานข้อมูลจริง (`timetable_entry`) |
| **Expected Result** | - ได้รับ HTTP Status `201 Created` พร้อมข้อมูล `TimetableResponse`<br>- ฐานข้อมูลมีการ Insert แถวใหม่ลงในตาราง `timetable_entry` โดยผูกกับ `timetable_id` และ `section_id` อย่างถูกต้อง<br>- ข้อมูล `updated_at` ในตาราง `timetable` ถูกอัปเดต |

---

### [IT-API-DAO-US6-06] กรณีข้อผิดพลาด: เพิ่มวิชาเดิมซ้ำ หรือหน่วยกิตเกินลิมิต 22 หน่วยกิต (Error Case)
| รายการ | รายละเอียด |
|---|---|
| **Preconditions** | - เคสซ้ำ: นักศึกษามีวิชานี้อยู่ในตารางอยู่แล้ว<br>- เคสหน่วยกิตเกิน: หน่วยกิตรวมปัจจุบันสะสม 21 หน่วยกิต และพยายามเพิ่มวิชาขนาด 3 หน่วยกิต |
| **Test Data** | Request Body: `{ "sectionId": [Section ID ที่ทำให้เกิดเงื่อนไขผิดพลาด] }` |
| **Test Steps** | 1. ส่งคำขอ `POST /api/timetable/entries` |
| **Expected Result** | - ได้รับ HTTP Status `409 Conflict` (พร้อม Error Code เช่น `COURSE_ALREADY_IN_TIMETABLE` หรือ `CREDIT_LIMIT_EXCEEDED`)<br>- ไม่มีแถวใหม่ถูกบันทึกเพิ่มลงในตาราง `timetable_entry` (Transaction Rollback สมบูรณ์) |

---

## 4. สรุปความครอบคลุมการทดสอบ (Test Coverage Matrix)

| Test Case ID | ประเภทเคส | ครอบคลุม Endpoint / Layer | สอดคล้องกับ DoD / Task |
|---|---|---|---|
| `IT-API-DAO-US6-01` | กรณีปกติ (Happy Path) | `GET /api/electives` -> Repository | เขียน test case ครบทุก endpoint ที่แตะฐานข้อมูล |
| `IT-API-DAO-US6-02` | กรณีเงื่อนไขพิเศษ | `GET /api/electives` (Exclude Conflicts) | มีทั้งกรณีปกติ กรณีข้อมูลว่าง และกรณีผิดพลาด |
| `IT-API-DAO-US6-03` | กรณีข้อมูลว่าง (Empty) | `GET /api/electives` (Empty Result) | มีทั้งกรณีปกติ กรณีข้อมูลว่าง และกรณีผิดพลาด |
| `IT-API-DAO-US6-04` | กรณีปกติ (Happy Path) | `GET /api/electives/{courseCode}` -> DAO | ระบุขั้นตอนและผลคาดหวังทุกข้อ |
| `IT-API-DAO-US6-05` | กรณีปกติ (Happy Path) | `POST /api/timetable/entries` -> DB | เพิ่มวิชาแล้วแถวใน `timetable_entry` ถูกต้อง |
| `IT-API-DAO-US6-06` | กรณีผิดพลาด (Error) | `POST /api/timetable/entries` (409 Conflict) | มีทั้งกรณีปกติ กรณีข้อมูลว่าง และกรณีผิดพลาด |