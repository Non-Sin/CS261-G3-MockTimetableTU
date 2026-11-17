# US6-T14: Design Integration Test Cases (API to DAO)

| รายการ | รายละเอียด |
|---|---|
| User Story | **US6: ดูวิชาเสรีแนะนำ** (Priority: Low) |
| Task | US6-T14 Design Integration Test ระหว่าง API กับ DAO ของหน้าแนะนำวิชาเสรี |
| ขอบเขต | ทดสอบการทำงานร่วมกันตั้งแต่ Controller Layer, Service Layer ผ่านไปยัง Repository (DAO) และฐานข้อมูล SQL Server สำหรับการค้นหา, กรองข้อมูล และการเพิ่มวิชาลงตาราง (อ้างอิง US6-T06, US6-T05 และ US6-API-Class-Diagram) |
| ตำแหน่งไฟล์จัดเก็บ | `.doc/US6/T14/US6-T14-design-it-api-dao.md` |

## 1. วัตถุประสงค์ของการทดสอบ (Objective)
เพื่อตรวจสอบความถูกต้องของ Integration ระหว่าง API Endpoints และ Data Access Object (DAO / Repositories) ว่าสามารถประมวลผลคำขอ, แปลงพารามิเตอร์เป็น SQL Query ที่ถูกต้อง, ดึงข้อมูลจากฐานข้อมูล SQL Server จริง, กรองข้อมูลตามเงื่อนไข (เช่น ตัวกรองความขัดแย้งกับตารางเรียนของผู้ใช้ผ่าน `ScheduleOverlap`) และบันทึกข้อมูลลงตาราง `timetable_entry` ได้อย่างถูกต้องสมบูรณ์ รวมถึงการจัดการ Error Codes และ Response ต่าง ๆ ตามสเปคของ US6

---

## 2. ขอบเขตและสภาพแวดล้อมการทดสอบ (Scope & Environment)
- **Framework / Tools:** Spring Boot Test (`@SpringBootTest`, `@AutoConfigureMockMvc`, `@Transactional`), JUnit 5, Testcontainers (SQL Server)
- **บัญชีทดสอบ:** จำลองผ่าน `CurrentStudentProvider` (อ้างอิง `SecurityContextStudentProvider` ของ US3) ด้วยรหัสประจำตัวนักศึกษาที่มีอยู่จริงใน Seed Data
- **Endpoints ที่เกี่ยวข้อง:**
  1. `GET /api/electives` (ค้นหาและกรองรายวิชาเสรี พร้อมเงื่อนไข `q`, `semester`, `day`, `timeSlot`, `group`, `excludeConflicts`)
  2. `GET /api/electives/FR205` หรือ `GET /api/electives/PY250` (ดึงรายละเอียดรายวิชา Sec ทั้งปี และรีวิวตามรหัสวิชา)
  3. `POST /api/timetable/entries` (เพิ่มวิชาลงตารางเรียน - ทำงานร่วมกับ US1)

---

## 3. Integration Test Cases

### [IT-API-DAO-US6-01] ค้นหาและกรองรายวิชาเสรีผ่าน API ส่งต่อ Query ไปยัง DAO ได้ถูกต้อง
| รายการ | รายละเอียด |
|---|---|
| **Preconditions** | มีข้อมูล Seed วิชาเสรีในฐานข้อมูล SQL Server (เช่น `FR205`, `PY250`) |
| **Test Data** | Request Parameters: `academicYear=2568`, `currentSemester=1`, `q=FR205`, `group=LANGUAGE` |
| **Test Steps** | 1. ส่งคำขอ `GET /api/electives?academicYear=2568&currentSemester=1&q=FR205&group=LANGUAGE` พร้อม Bearer Token<br>2. ตรวจสอบผลลัพธ์ HTTP Status และข้อมูลที่ถูก Query กลับมาจาก DAO (`ElectiveRepository.searchRecommended`) |
| **Expected Result** | - ได้รับ HTTP Status `200 OK`<br>- ข้อมูลใน Response Body แสดงเฉพาะรายวิชาที่ตรงกับคำค้นหา `FR205` และหมวดหมู่ `LANGUAGE`<br>- DAO ประกอบ SQL/JPQL Query พร้อมเงื่อนไข `LIKE` และ `interest_group` ได้อย่างถูกต้อง |

---

### [IT-API-DAO-US6-02] ตัวกรอง "ไม่ชนกับตาราง" (`excludeConflicts=true`) และการตรวจสอบเวลาเรียน
| รายการ | รายละเอียด |
|---|---|
| **Preconditions** | - นักศึกษามีตารางเรียนอยู่ในเทอม `1/2568` แล้ว (มีวิชาที่เรียนวันจันทร์ 13:30 - 16:30)<br>- มีวิชาที่มีเวลาเรียนทับซ้อน (เช่น `PY250` เรียนวันจันทร์เวลาเดียวกัน) และวิชาที่ไม่ชน |
| **Test Data** | Request Parameters: `academicYear=2568`, `currentSemester=1`, `excludeConflicts=true` |
| **Test Steps** | 1. ส่งคำขอ `GET /api/electives?academicYear=2568&currentSemester=1&excludeConflicts=true`<br>2. ตรวจสอบการเรียกใช้งาน `TimetableService.getTimetable` และการกรองข้อมูลของ `ScheduleOverlap` ใน Service/DAO Layer |
| **Expected Result** | - ได้รับ HTTP Status `200 OK`<br>- ระบบดึงข้อมูลตารางเรียนของ Student ID ที่กำลัง Login อยู่ผ่าน `TimetableService`<br>- รายวิชาที่มีเวลาเรียนซ้อนทับจะถูกกรองออก และแสดงเฉพาะวิชาที่ไม่มีเวลาชนและยังไม่ได้เพิ่มในตารางเท่านั้น |

---

### [IT-API-DAO-US6-03] กรณีค้นหาไม่พบข้อมูลวิชา (Empty State Case)
| รายการ | รายละเอียด |
|---|---|
| **Preconditions** | ฐานข้อมูล SQL Server ไม่มีรายวิชารหัส `SA240` ที่ผ่านเงื่อนไขแนะนำ |
| **Test Data** | Request Parameters: `academicYear=2568`, `currentSemester=1`, `q=SA240` |
| **Test Steps** | 1. ส่งคำขอ `GET /api/electives?academicYear=2568&currentSemester=1&q=SA240` |
| **Expected Result** | - ได้รับ HTTP Status `200 OK`<br>- Response Body คืนค่าเป็น Array เปล่า `[]` (ไม่เกิด Exception และไม่คืนค่า Null) |

---

### [IT-API-DAO-US6-04] ดึงรายละเอียดรายวิชา Sec ทั้งปี และรีวิว (`GET /api/electives/FR205`)
| รายการ | รายละเอียด |
|---|---|
| **Preconditions** | มีวิชา `FR205` พร้อมข้อมูล `elective_info`, `tags`, `elective_review_point` และ sections ของทั้งปีในระบบ |
| **Test Data** | Path Variable: `courseCode=FR205`, Query Params: `academicYear=2568`, `currentSemester=1` |
| **Test Steps** | 1. ส่งคำขอ `GET /api/electives/FR205?academicYear=2568&currentSemester=1`<br>2. ตรวจสอบการทำ Join และ Fetch Collections ของ DAO รวมถึงการคำนวณ `selectable`, `inTimetable`, และ `conflictWith` |
| **Expected Result** | - ได้รับ HTTP Status `200 OK`<br>- ข้อมูลรายละเอียดแสดงครบถ้วน รวมถึงรายการ Sections ทั้งปี, Tags, และ Bullet รีวิวที่เรียงลำดับตาม `sort_order` ถูกต้องโดยไม่เกิดปัญหา N+1 Query |

---

### [IT-API-DAO-US6-05] เพิ่มวิชาลงตารางสำเร็จ บันทึกแถวลงตาราง `timetable_entry` ถูกต้อง (ร่วมกับ US1)
| รายการ | รายละเอียด |
|---|---|
| **Preconditions** | - นักศึกษามี Timetable สำหรับเทอม `1/2568` อยู่แล้ว (หรือยังไม่มีระบบสร้างอัตโนมัติ)<br>- มี Section ว่างของวิชา `FR205` ที่ยังไม่ได้ลงทะเบียน และหน่วยกิตรวมยังไม่เกิน 22 หน่วยกิต |
| **Test Data** | Request Body: `{ "sectionId": 101 }` (อ้างอิง Section ของ `FR205`) |
| **Test Steps** | 1. ส่งคำขอ `POST /api/timetable/entries` ด้วย JSON Body ข้างต้น<br>2. ตรวจสอบสถานะการตอบกลับและตรวจสอบข้อมูลในฐานข้อมูล SQL Server (`timetable_entry`) |
| **Expected Result** | - ได้รับ HTTP Status `201 Created` พร้อมข้อมูล `TimetableResponse` (แม้มีเวลาชน ระบบยังบันทึกสำเร็จและส่งรายการ `conflicts` กลับมาตาม US1)<br>- ฐานข้อมูลมีการ Insert แถวใหม่ลงในตาราง `timetable_entry` โดยผูกกับ `timetable_id` และ `section_id` อย่างถูกต้อง |

---

### [IT-API-DAO-US6-06] กรณีข้อผิดพลาด: เพิ่มวิชาเดิมซ้ำ หรือหน่วยกิตเกินลิมิต 22 หน่วยกิต (Error Case)
| รายการ | รายละเอียด |
|---|---|
| **Preconditions** | - เคสซ้ำ: นักศึกษามีวิชา `FR205`อยู่ในตารางอยู่แล้ว (`COURSE_ALREADY_IN_TIMETABLE`)<br>- เคสหน่วยกิตเกิน: หน่วยกิตรวมสะสมเกิน 22 หน่วยกิต (`CREDIT_LIMIT_EXCEEDED`) |
| **Test Data** | Request Body: `{ "sectionId": 102 }` (Section ของวิชาที่ทำให้เกิดเงื่อนไขผิดพลาด) |
| **Test Steps** | 1. ส่งคำขอ `POST /api/timetable/entries` |
| **Expected Result** | - ได้รับ HTTP Status `409 Conflict` พร้อม Error Code ที่ถูกต้องตาม US1 (`COURSE_ALREADY_IN_TIMETABLE` หรือ `CREDIT_LIMIT_EXCEEDED`)<br>- ไม่มีแถวใหม่ถูกบันทึกเพิ่มลงในตาราง `timetable_entry` (Transaction Rollback สมบูรณ์) |

---

### [IT-API-DAO-US6-07] กรณีผิดพลาด: ไม่พบวิชา หรือวิชาไม่ใช่วิชาเสรีแนะนำ (`404 Not Found`)
| รายการ | รายละเอียด |
|---|---|
| **Preconditions** | ฐานข้อมูลไม่มีวิชารหัส `SA240` หรือวิชานั้นไม่ใช่วิชาเสรีแนะนำที่มีรีวิว |
| **Test Data** | Path Variable: `courseCode=SA240`, Query Params: `academicYear=2568`, `currentSemester=1` |
| **Test Steps** | 1. ส่งคำขอ `GET /api/electives/SA240?academicYear=2568&currentSemester=1` |
| **Expected Result** | - ได้รับ HTTP Status `404 Not Found` (ProblemDetail) ผ่าน `ResourceNotFoundException` และ `GlobalExceptionHandler.handleNotFound` |

---

### [IT-API-DAO-US6-08] กรณีผิดพลาด: ส่งพารามิเตอร์ไม่ถูกต้องหรือนอกช่วง (`400 Bad Request`)
| รายการ | รายละเอียด |
|---|---|
| **Preconditions** | ระบบเปิดใช้งานตามปกติ |
| **Test Data** | Request Parameters: `academicYear=2568`, `currentSemester=3` (หรือส่งค่า `group=INVALID`, หรือไม่ส่ง `academicYear`) |
| **Test Steps** | 1. ส่งคำขอ `GET /api/electives?academicYear=2568&currentSemester=3` |
| **Expected Result** | - ได้รับ HTTP Status `400 Bad Request` (ไม่ใช่ 500) ผ่านการตรวจจับของ Service (`ResponseStatusException`) หรือ Spring Validation ผ่าน `ResponseEntityExceptionHandler` |

---

### [IT-API-DAO-US6-09] กรณีผิดพลาด: ไม่มี Token หรือ Token ไม่ถูกต้อง (`401 Unauthorized`)
| รายการ | รายละเอียด |
|---|---|
| **Preconditions** | ผู้ใช้ไม่ได้เข้าสู่ระบบ หรือส่ง JWT Token ที่หมดอายุ/ไม่ถูกต้อง |
| **Test Data** | ไม่มี Header `Authorization` หรือส่งค่า Bearer Token ผิดพลาด |
| **Test Steps** | 1. ส่งคำขอ `GET /api/electives` โดยไม่มี Header `Authorization` |
| **Expected Result** | - ได้รับ HTTP Status `401 Unauthorized` ถูกบล็อกตั้งแต่ชั้น `SecurityConfig` (AuthenticationEntryPoint ของ US3) ก่อนเข้าถึง Controller |

---

## 4. สรุปความครอบคลุมการทดสอบ (Test Coverage Matrix)

| Test Case ID | ประเภทเคส | ครอบคลุม Endpoint / Layer | สอดคล้องกับ DoD / Task |
|---|---|---|---|
| `IT-API-DAO-US6-01` | กรณีปกติ (Happy Path) | `GET /api/electives` -> Repository | ตรวจสอบการค้นหาและกรองข้อมูล (`FR205`) |
| `IT-API-DAO-US6-02` | กรณีเงื่อนไขพิเศษ | `GET /api/electives` (Exclude Conflicts) | ตรวจสอบเงื่อนไขเวลาชนตาราง (`PY250`) |
| `IT-API-DAO-US6-03` | กรณีข้อมูลว่าง (Empty) | `GET /api/electives` (Empty Result) | ตรวจสอบการคืนค่า `[]` เมื่อไม่พบข้อมูล (`SA240`) |
| `IT-API-DAO-US6-04` | กรณีปกติ (Happy Path) | `GET /api/electives/FR205` -> DAO | ตรวจสอบรายละเอียด Sec ทั้งปีและรีวิว |
| `IT-API-DAO-US6-05` | กรณีปกติ (Happy Path) | `POST /api/timetable/entries` -> DB | เพิ่มวิชาลงตารางและบันทึกตารางจริง |
| `IT-API-DAO-US6-06` | กรณีผิดพลาด (Error) | `POST /api/timetable/entries` (409 Conflict) | ตรวจสอบการจัดการความขัดแย้งและลิมิตหน่วยกิต |
| `IT-API-DAO-US6-07` | กรณีผิดพลาด (Error) | `GET /api/electives/SA240` (404 Not Found) | ตรวจสอบกรณีไม่พบวิชาหรือวิชาไม่ถูกต้อง |
| `IT-API-DAO-US6-08` | กรณีผิดพลาด (Error) | `GET /api/electives` (400 Bad Request) | ตรวจสอบการ validate พารามิเตอร์ผิดช่วง/ชนิด |
| `IT-API-DAO-US6-09` | กรณีผิดพลาด (Error) | `GET /api/electives` (401 Unauthorized) | ตรวจสอบความปลอดภัยและการยืนยันตัวตน |