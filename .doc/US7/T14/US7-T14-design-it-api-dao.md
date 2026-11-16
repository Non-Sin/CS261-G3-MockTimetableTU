# US7-T14: Integration Test Cases ระหว่าง API กับ DAO: ค้นหาช่องทางขอโควตา

| รายการ | รายละเอียด |
| --- | --- |
| User Story | US7: ค้นหาช่องทางและรอบเวลายื่นคำร้องขอโควตาในแต่ละรายวิชา (Priority: Medium, Estimate: 5 points) |
| Task | US7-T14 Design Integration Test ระหว่าง API กับ DAO |
| Branch | `docs/US7-T14-design-it-api-dao` |
| ขอบเขต | ทุก Endpoint ของ US7 ที่แตะฐานข้อมูล ได้แก่ `GET /api/quota/courses` และ `GET /api/quota/courses/{courseCode}` ตรวจความถูกต้องของการ Query ข้อมูลจาก SQL Server ผ่าน Spring Data JPA / Hibernate ไปจนถึง Response ที่ API ตอบกลับ |
| อ้างอิง | [US7 DTO & API Spec (T05)](../T05/US7-DTO-API-Spec.md), [US7 DTO Class Diagram (T05)](../T05/US7-DTO-Class-Diagram.md), [US7 API Class Diagram (T05)](../T05/US7-API-Class-Diagram.md) ร่วมกับ [US7-T06 ER Diagram](../../US7-T06/US7-T06-ER-Diagram.md), [US7-T06 DAO Class Diagram](../../US7-T06/US7-T06-DAO-Class-Diagram.md), [US7-T06 Extended API Class Diagram](../../US7-T06/US7-T06-Extended-API-Class-Diagram.md), [US7-T06 Sequence Diagrams](../../US7-T06/) |
| ต่อจาก | [US7-T11 Unit Test ส่วน UI](../T11/US7-T11-Unit-Test-UI.md) และแนวทางการทดสอบแบบเดียวกับ [US1-T14](../../US1/T14/US1-T14-design-it-api-dao.md), [US3-T14](../../US3/T14/US3-T14-design-it-api-dao.md), [US8-T14](../../US8/T14/US8-T14-design-it-api-dao.md) |
| ใช้ใน | US7-T18 Run Integration Test ระหว่าง API กับ DAO |

---

## 1. แนวทางและสภาพแวดล้อม (Test Approach)

ทดสอบการทำงานเชื่อมโยงเต็มเส้นทางตาม Sequence Diagram ของ US7-T06 ตั้งแต่ Spring Security Filter (`JwtAuthenticationFilter`) $\rightarrow$ `QuotaController` $\rightarrow$ `QuotaService` (จัดการ Transaction แบบ `readOnly = true`) $\rightarrow$ Repositories (`CourseRepository`, `SectionRepository`, `TimetableRepository`, `TimetableEntryRepository`, `QuotaInfoRepository`, `QuotaRoundRepository`) $\rightarrow$ ฐานข้อมูล Microsoft SQL Server

| รายการ | ข้อกำหนด |
| --- | --- |
| คลาสทดสอบ | `QuotaApiDaoIntegrationTest` ใน package `th.ac.tu.cs261.group3.backend.quota` |
| Annotation หลัก | `@SpringBootTest` + `@AutoConfigureMockMvc` + `@Import(TestcontainersConfig.class)` |
| ฐานข้อมูลทดสอบ | Microsoft SQL Server (`mcr.microsoft.com/mssql/server:2025-latest`) ผ่าน Testcontainers จัดการ Schema อัตโนมัติด้วย Flyway Migration (`db/migration`) รวมถึงตารางของ US1, US3 และตารางใหม่ของ US7 (`course_quota_info`, `quota_condition`, `quota_round`, `quota_channel`, `quota_contact` และคอลัมน์ `course_name_th` ใน `course`) |
| สิ่งที่ Mock | **ไม่มีการ Mock ในชั้น DAO/Service** ใช้ Spring Beans จริงและ Database Container จริงทั้งหมด ยกเว้น `JwtService` ที่ใช้สร้าง Token จำลองสำหรับยืนยันตัวตนของนักศึกษา |
| การจัดการ Transaction | **ไม่ใส่ `@Transactional` ที่คลาสเทสต์** เพื่อให้คำสั่ง SQL ของ Service ถูกประมวลผลบน Connection จริง และพิสูจน์พฤติกรรม `@Transactional(readOnly = true)` ของ `QuotaService` |
| ข้อมูลทดสอบ | สร้างชุดข้อมูลเฉพาะสำหรับการทดสอบ API-DAO (หัวข้อ 2) ด้วย `JdbcTemplate` ทั้งข้อมูลนักศึกษา, รายวิชา, ตอนเรียน (Section), ข้อมูลโควตา, เงื่อนไข, รอบเวลา, ช่องทาง และช่องทางติดต่อ |
| การล้างข้อมูล | ล้างข้อมูลทดสอบใน `@BeforeEach` และ `@AfterEach` เพื่อให้ผลการทดสอบแต่ละเคสเป็นอิสระต่อกัน |
| คำสั่งรัน | เปิด Docker ไว้แล้วรันคำสั่ง: `cd backend && ./mvnw test -Dtest=QuotaApiDaoIntegrationTest` |

### ข้อแตกต่างจากการทดสอบระดับอื่น

| ระดับการทดสอบ | สิ่งที่ Mock | สิ่งที่การทดสอบ API-DAO Integration นี้พิสูจน์ |
| --- | --- | --- |
| **Unit Test Service (`QuotaServiceTest`)** | Mock ทุก Repository ด้วย `@Mock` / `@MockitoBean` | พิสูจน์ตรรกะทางธุรกิจใน Service โดยไม่เชื่อมต่อ DB |
| **Unit Test DAO (`QuotaRepositoryTest`)** | ไม่มี Mock แต่เรียก Repository ตรง ๆ | ทดสอบคำสั่ง JPQL / Native Query ในแต่ละ Repository แบบแยกส่วน |
| **API-DAO Integration Test (T14)** | **ไม่มี Mock ในฝั่ง Backend** | พิสูจน์ทั้งเส้นทาง: การแปลงพารามิเตอร์, DTO Mapping, Transaction, การ Join Fetch หลายตารางเพื่อแก้ปัญหา N+1, และความถูกต้องของข้อมูลจาก DB สู่ JSON Response |

---

## 2. ข้อมูลทดสอบตั้งต้น (Test Data / Preconditions)

### 2.1 นักศึกษาทดสอบ (`users` table)

ใช้รหัสนักศึกษาช่วง `66090007xx` เพื่อป้องกันการชนกับรหัสของ US อื่นในระบบ:

| นักศึกษา | `student_id` | `department` | `track` | รายละเอียดตารางเรียนในภาค 2568/1 | ใช้ทดสอบ |
| --- | --- | --- | --- | --- | --- |
| **S1** | `6609000701` | `ภาควิชาวิทยาการคอมพิวเตอร์` | `ภาคปกติ` | มีตารางเรียนภาค 1/2568: ลงวิชา `MA211` (Sec 070001) และ `LAS101` (Sec 230001) | ทดสอบ `mine=true`, `inMyTimetable=true` |
| **S2** | `6609000702` | `ภาควิชาวิทยาการคอมพิวเตอร์` | `ภาคปกติ` | **ไม่มีตารางเรียน** ในภาค 1/2568 (ตารางว่าง) | ทดสอบ `mine=true` เมื่อตารางว่าง |

---

### 2.2 รายวิชาและข้อมูลโควตาในฐานข้อมูล

ข้อมูลทดสอบสร้างตามโครงสร้างใน [US7-T06 ER Diagram](../../US7-T06/US7-T06-ER-Diagram.md) ครอบคลุมทุกสถานะโควตา (`REQUIRED`, `NOT_REQUIRED`, `NO_DATA`, `NOT_OFFERED`) และครอบคลุมทั้งกรณีมีช่องทางเดียว, หลายช่องทาง, มีเงื่อนไข และไม่มีเงื่อนไข

| รหัสวิชา | ชื่อวิชา (EN / TH) | สถานะใน DB | Section ที่เปิดสอน (`academicYear/sem`) | รายละเอียดโควตาใน DB (`course_quota_info` และตารางลูก) | วัตถุประสงค์ในการทดสอบ |
|:---|:---|:---:|:---:|:---|:---|
| **`EL395`** | ACADEMIC ENGLISH AND STUDY SKILLS 2<br>ภาษาอังกฤษเชิงวิชาการและทักษะศึกษา 2 | `REQUIRED`<br>(`quota_required = 1`) | 2568/1, 2568/2 | • **เงื่อนไข:** 1 รายการ (`sort_order=1`, `condition_text="ต้องสอบได้วิชา EL295..."`, `related_course_code="EL295"`)<br>• **รอบ (2568/1):** 2 รอบ (รอบที่ 1: 2025-08-04 ถึง 2025-08-08 label "คำร้องช่วงต้น", รอบที่ 2: 2025-08-18 ถึง 2025-08-21 label "คำร้องรอบสอง")<br>• **ช่องทาง:** 1 ช่องทาง (`QUOTA_SYSTEM`, `label="ผ่านเว็บไซต์ระบบโควตา LITU"`, `url="https://quota-litu.web.app/login"`)<br>• **ติดต่อ:** 1 รายการ (`organization_name="สถาบันภาษา มธ."`, `label="Facebook: LITU"`, `url="https://www.facebook.com/litu.thammasat"`) | ตรวจสอบข้อมูลครบทุกฟิลด์, การ Join Fetch ข้อมูลจากตารางลูก, การแปลงวันที่ |
| **`EL295`** | ACADEMIC ENGLISH AND STUDY SKILLS 1<br>ภาษาอังกฤษเชิงวิชาการและทักษะศึกษา 1 | `REQUIRED`<br>(`quota_required = 1`) | 2568/1, 2568/2 | • เงื่อนไข: ว่าง (`[]`)<br>• ช่องทาง: 1 ช่องทาง (`QUOTA_SYSTEM`)<br>• รอบ (2568/1): 1 รอบ | วิชาที่ถูกอ้างอิงใน `related_course_code` ของ EL395 |
| **`MA211`** | CALCULUS 1<br>แคลคูลัส 1 | `REQUIRED`<br>(`quota_required = 1`) | 2568/1, 2568/2 | • เงื่อนไข: ว่าง (`[]`)<br>• **รอบ (2568/1):** 1 รอบ กำหนดส่งวันเดียว (`start_date = NULL`, `end_date = "2025-08-20"`, `end_time = "15:00"`), `label = NULL`<br>• **ช่องทาง:** 1 ช่องทาง (`ONLINE_FORM`, `label="ผ่าน Google Form"`, `url="https://forms.gle/NWTyPnsVWtyDak3W8"`)<br>• **ติดต่อ:** 1 รายการ (ภาควิชาคณิตศาสตร์และสถิติ) | ตรวจสอบรอบแบบ `start_date IS NULL` และมีเวลา `end_time`, อยู่ในตารางเรียนของ S1 |
| **`LAS101`** | CRITICAL THINKING, READING, AND WRITING<br>การคิดเชิงวิพากษ์ การอ่าน และการเขียน | `REQUIRED`<br>(`quota_required = 1`) | 2568/1, 2568/2 | • เงื่อนไข: ว่าง (`[]`)<br>• รอบ (2568/1): 2 รอบ<br>• ช่องทาง: 1 ช่องทาง (`QUOTA_SYSTEM`, คณะศิลปศาสตร์) | อยู่ในตารางเรียนของ S1 ใช้ทดสอบ `mine=true` |
| **`SOC201`** | SOCIAL RESEARCH METHODOLOGY<br>ระเบียบวิธีวิจัยทางสังคมศาสตร์ | `REQUIRED`<br>(`quota_required = 1`) | 2568/1 | • **ช่องทาง (หลายช่องทาง 1:N):** 2 ช่องทาง เรียงตาม `sort_order`:<br>  1. `sort_order=1`, `channel_type="QUOTA_SYSTEM"`, `label="ระบบโควตาออนไลน์"`, `url="https://quota.socanth.tu.ac.th/"`<br>  2. `sort_order=2`, `channel_type="FACULTY_OFFICE"`, `label="ยื่นเอกสารที่คณะ"`, `url=NULL`, `note="ห้องบริการการศึกษา ชั้น 2"`<br>• **ติดต่อ (หลายช่องทาง):** 2 รายการ (มี URL 1 รายการ และ `url=NULL` 1 รายการ เช่น ติดต่อผ่านเบอร์โทรศัพท์/MS Teams) | **ตรวจสอบวิชาที่มีหลายช่องทาง (1:N) ต้องได้ครบทุกช่องทางและเรียงตาม `sort_order`** |
| **`CS232`** | INTRODUCTION TO CLOUD COMPUTING TECHNOLOGY<br>เทคโนโลยีการประมวลผลแบบคลาวด์เบื้องต้น | `NOT_REQUIRED`<br>(`quota_required = 0`) | 2568/1, 2568/2 | • มีแถวใน `course_quota_info` แต่ `quota_required = 0`<br>• ตารางลูกทั้งหมดว่าง (`[]`) | ตรวจสอบสถานะ `NOT_REQUIRED` |
| **`FR205`** | FRENCH FOR EVERYDAY LIFE<br>ภาษาฝรั่งเศสในชีวิตประจำวัน | `REQUIRED`<br>(`quota_required = 1`) | **เฉพาะ 2568/1**<br>(ไม่มีในภาค 2) | • มีข้อมูลโควตาใน DB ครบถ้วน | ตรวจสอบสถานะ `NOT_OFFERED` เมื่อขอในภาค 2568/2 (`offeredSemesters = [1]`) |
| **`PHYS99`** | ADVANCED ASTRONOMY<br>ดาราศาสตร์ขั้นสูง | `REQUIRED`<br>(`quota_required = 1`) | **ไม่มี Section ในปี 2568 เลย** | • มีข้อมูลโควตาใน DB | ตรวจสอบสถานะ `NOT_OFFERED` ตลอดทั้งปี (`offeredSemesters = []`) |
| **`TU101`** | THAILAND, ASEAN, AND THE WORLD<br>ไทย อาเซียน และโลก | `NO_DATA`<br>(**ไม่มีแถวใน `course_quota_info`**) | 2568/1, 2568/2 | • **ไม่มีแถวใน `course_quota_info`** และไม่มีข้อมูลในตารางลูกเลย | **ตรวจสอบวิชาที่ไม่มีข้อมูลโควตา ต้องได้รายการว่าง และ `quotaStatus = "NO_DATA"` (ไม่ใช่ 404)** |
| **`DM201`** | — | **ไม่มีใน `course`** | — | • ไม่มีรหัสวิชานี้ในตาราง `course` | ตรวจสอบกรณีไม่พบวิชาในระบบ ตอบ `404 Not Found` สำหรับ Endpoint 2 |

---

## 3. Test Cases Specification

ทุก Request ส่ง Header `Authorization: Bearer <JWT Token>` ของนักศึกษาในแต่ละเคส เว้นแต่เคสที่ระบุว่าไม่ส่ง

### 3.1 Endpoint 1: ค้นหาช่องทางขอโควตา (`GET /api/quota/courses`)

| รหัสเคส | สถานการณ์ทดสอบ | ขั้นตอนการทดสอบ (API Request) | ผลที่คาดหวังของ API (Response) | ผลที่คาดหวังใน Database (DAO / DB Assertion) |
|:---|:---|:---|:---|:---|
| **IT-API-DAO-US7-01** | ค้นหาด้วยรหัสวิชาตรงตัว ได้ข้อมูลโควตาครบถ้วนตรงกับ DB | S1 ส่ง `GET /api/quota/courses?academicYear=2568&semester=1&q=EL395&mine=false` | • Status: `200 OK`<br>• `total`: 1, `courses`: ขนาด 1 รายการ<br>• `courses[0].courseCode`: `"EL395"`<br>• `courses[0].courseNameTh`: `"ภาษาอังกฤษเชิงวิชาการและทักษะศึกษา 2"` (อ่านจากคอลัมน์ใหม่ใน `course`)<br>• `courses[0].quotaStatus`: `"REQUIRED"`<br>• `courses[0].offeredSemesters`: `[1, 2]` (เรียงจากน้อยไปมาก)<br>• `courses[0].conditions`: 1 รายการ มี `relatedCourseCode = "EL295"`<br>• `courses[0].rounds`: 2 รายการ เรียงตาม `roundNo` (1, 2) ข้อมูลวันที่และ label ตรงกับ DB<br>• `courses[0].channels`: 1 รายการ (`QUOTA_SYSTEM`, URL ถูกต้อง)<br>• `courses[0].contacts`: 1 รายการ (`url` ถูกต้อง)<br>• `courses[0].inMyTimetable`: `false` (เนื่องจาก S1 ไม่มี EL395 ในตาราง) | • ข้อมูลทุกตารางคงเดิม ไม่มีการบันทึกหรือแก้ไข (`readOnly = true`)<br>• ยืนยันการ Query ผ่าน `CourseRepository.searchAllCourses`, `SectionRepository`, `QuotaInfoRepository`, `QuotaRoundRepository` ครบถ้วน |
| **IT-API-DAO-US7-02** | **[โจทย์หลัก] วิชาที่มีหลายช่องทาง (1:N) ต้องได้ครบทุกช่องทางตาม DB** | S1 ส่ง `GET /api/quota/courses?academicYear=2568&semester=1&q=SOC201` | • Status: `200 OK`<br>• `courses[0].channels` มี **2 รายการครบถ้วน** เรียงตาม `sort_order` จาก DB:<br>  - รายการที่ 1: `channelType = "QUOTA_SYSTEM"`, `label = "ระบบโควตาออนไลน์"`, `url = "https://quota.socanth.tu.ac.th/"`, `note = null`<br>  - รายการที่ 2: `channelType = "FACULTY_OFFICE"`, `label = "ยื่นเอกสารที่คณะ"`, `url = null`, `note = "ห้องบริการการศึกษา ชั้น 2"`<br>• `courses[0].contacts` มี **2 รายการครบถ้วน** (รายการแรกมี URL, รายการสอง `url = null`) | • ข้อมูลใน `quota_channel` และ `quota_contact` ถูกดึงผ่าน Batch Query ของ `QuotaInfoRepository.findWithDetailsByCourseCodes` โดยไม่เกิด `MultipleBagFetchException` และเรียงตาม `sortOrder ASC` |
| **IT-API-DAO-US7-03** | **[โจทย์หลัก] วิชาที่ไม่มีข้อมูลโควตาใน DB (`course_quota_info` ไม่มีแถว) ต้องได้รายการว่าง** | S1 ส่ง `GET /api/quota/courses?academicYear=2568&semester=1&q=TU101` | • Status: `200 OK`<br>• `total`: 1, `courses`: ขนาด 1 รายการ<br>• `courses[0].courseCode`: `"TU101"`<br>• `courses[0].quotaStatus`: `"NO_DATA"`<br>• `courses[0].conditions`: `[]` (List ว่าง ไม่เป็น null)<br>• `courses[0].rounds`: `[]`<br>• `courses[0].channels`: `[]`<br>• `courses[0].contacts`: `[]` | • `CourseRepository` ค้นพบ `TU101`<br>• `QuotaInfoRepository` คืนผลลัพธ์ว่างสำหรับรหัสนี้ ทำให้ Service ตัดสิน `quotaInfo == null` และสร้างสถานะ `NO_DATA` พร้อม List ว่าง |
| **IT-API-DAO-US7-04** | วิชาที่ไม่ต้องขอโควตา (`quota_required = 0`) | S1 ส่ง `GET /api/quota/courses?academicYear=2568&semester=1&q=CS232` | • Status: `200 OK`<br>• `courses[0].quotaStatus`: `"NOT_REQUIRED"`<br>• `conditions`, `rounds`, `channels`, `contacts` เป็น `[]` ทั้งหมด | • `CourseQuotaInfo.isQuotaRequired() == false` ใน DB ถูกนำมาแมปสถานะอย่างถูกต้อง |
| **IT-API-DAO-US7-05** | วิชาไม่เปิดสอนในภาคเรียนที่ขอ (`NOT_OFFERED`) | S1 ส่ง `GET /api/quota/courses?academicYear=2568&semester=2&q=FR205` (ขอในภาค 2) | • Status: `200 OK`<br>• `courses[0].quotaStatus`: `"NOT_OFFERED"` (ตัดสินก่อนสถานะ REQUIRED แม้ใน DB จะมีข้อมูลโควตาก็ตาม)<br>• `courses[0].offeredSemesters`: `[1]` (มีเปิดเฉพาะภาค 1)<br>• `rounds`: `[]` (ไม่มีรอบของภาค 2) | • `SectionRepository` ตรวจพบว่าภาค 2 ไม่มี Section สำหรับวิชา `FR205` ทำให้ Service ตัดสินเป็น `NOT_OFFERED` |
| **IT-API-DAO-US7-06** | วิชาไม่เปิดสอนตลอดทั้งปีการศึกษา | S1 ส่ง `GET /api/quota/courses?academicYear=2568&semester=1&q=PHYS99` | • Status: `200 OK`<br>• `courses[0].quotaStatus`: `"NOT_OFFERED"`<br>• `courses[0].offeredSemesters`: `[]` (List ว่าง ไม่พบ Section เลยทั้งปี 2568) | • คิวรี `SectionRepository` คืนผลลัพธ์ว่างสำหรับปี 2568 |
| **IT-API-DAO-US7-07** | ค้นหาด้วยชื่อวิชาภาษาอังกฤษแบบคำขึ้นต้น (Prefix of Word) | S1 ส่ง `GET /api/quota/courses?academicYear=2568&semester=1&q=calc` | • Status: `200 OK`<br>• พบ `MA211` (`courseName = "CALCULUS 1"`) | • พิสูจน์ฟังก์ชันคำขึ้นต้นของ `CourseRepository.searchAllCourses` |
| **IT-API-DAO-US7-08** | ค้นหาด้วยชื่อวิชาภาษาไทย (Substring LIKE %q%) | S1 ส่ง `GET /api/quota/courses?academicYear=2568&semester=1&q=แคลคูลัส` | • Status: `200 OK`<br>• พบ `MA211` (`courseNameTh = "แคลคูลัส 1"`) | • พิสูจน์การจับคู่ Substring บนคอลัมน์ `course_name_th` ที่เพิ่มใน US7 |
| **IT-API-DAO-US7-09** | ป้องกันและ Escape อักขระพิเศษของ SQL LIKE (`%`, `_`, `[`) | S1 ส่ง `GET /api/quota/courses?academicYear=2568&semester=1&q=EL%` | • Status: `200 OK`<br>• ค้นหาด้วยคำว่า `EL%` ตัวอักษรตรง ๆ ไม่ถูกมองเป็น Wildcard (ถ้าไม่มีวิชาที่มีเครื่องหมาย `%` ในชื่อ จะตอบ `total: 0, courses: []`) | • ระบบ Escape อักขระพิเศษก่อนส่งเข้า DAO ป้องกัน SQL Wildcard Abuse |
| **IT-API-DAO-US7-10** | กรอง "เฉพาะวิชาในแผนของฉัน" (`mine=true`) เมื่อมีตารางเรียน | S1 ส่ง `GET /api/quota/courses?academicYear=2568&semester=1&mine=true` (ช่อง `q` ว่าง) | • Status: `200 OK`<br>• `total`: 2, `courses`: ได้เฉพาะ `MA211` และ `LAS101`<br>• ทั้งสองวิชามี `inMyTimetable`: `true` | • `TimetableRepository` และ `TimetableEntryRepository` อ่านรหัสวิชาในตารางของ S1 ได้ `{"MA211", "LAS101"}`<br>• ส่ง `courseCodes` ให้ `CourseRepository.searchAllCourses` กรองเฉพาะ 2 วิชานี้ |
| **IT-API-DAO-US7-11** | กรอง "เฉพาะวิชาในแผนของฉัน" (`mine=true`) เมื่อตารางเรียนว่าง | S2 (ไม่มีตารางเรียน) ส่ง `GET /api/quota/courses?academicYear=2568&semester=1&mine=true` | • Status: `200 OK`<br>• `total`: 0, `courses`: `[]` (ไม่ใช่ Error) | • `TimetableRepository` ไม่พบตารางของ S2 ทำให้ `myCourseCodes` เป็น Set ว่าง<br>• DAO คืน List ว่างทันทีโดยไม่รัน Query ค้นหาที่สิ้นเปลือง |
| **IT-API-DAO-US7-12** | รวมเงื่อนไขคำค้นหาและตารางเรียน (`q` AND `mine=true`) | S1 ส่ง `GET /api/quota/courses?academicYear=2568&semester=1&q=MA&mine=true` | • Status: `200 OK`<br>• `total`: 1, `courses`: ได้เฉพาะ `MA211` (ตรงทั้งชื่อ/รหัส และอยู่ในตาราง S1) | • `CourseRepository.searchAllCourses("MA", ["MA211", "LAS101"])` กรองทั้งคำค้นและรายการวิชาพร้อมกัน |
| **IT-API-DAO-US7-13** | การจำกัดจำนวนผลลัพธ์ไม่เกิน 50 รายการ (`maxResults`) | เตรียมข้อมูลวิชาที่ขึ้นต้นด้วย `CS` จำนวน 55 วิชา แล้ว S1 ส่ง `q=CS` | • Status: `200 OK`<br>• `total`: 55 (นับจำนวนที่ตรงทั้งหมดใน DB)<br>• `courses.size()`: 50 (จำกัดไม่เกิน `app.quota.max-results = 50`)<br>• เรียงตาม `courseCode` | • ตรวจสอบ Logic การตัดจำนวนวิชาใน Service ก่อนส่งรายการไป Batch Query ข้อมูลเสริม |
| **IT-API-DAO-US7-14** | ค้นหาไม่พบข้อมูลในระบบ (Empty Result) | S1 ส่ง `GET /api/quota/courses?academicYear=2568&semester=1&q=XYZ999` | • Status: `200 OK`<br>• `total`: 0, `courses`: `[]` | • `CourseRepository` ไม่พบแถวใน `course` ส่งผลให้ไม่เรียก Repository อื่นต่อ |

---

### 3.2 Endpoint 2: ดึงช่องทางขอโควตารายวิชาเดี่ยว (`GET /api/quota/courses/{courseCode}`)

| รหัสเคส | สถานการณ์ทดสอบ | ขั้นตอนการทดสอบ (API Request) | ผลที่คาดหวังของ API (Response) | ผลที่คาดหวังใน Database (DAO / DB Assertion) |
|:---|:---|:---|:---|:---|
| **IT-API-DAO-US7-15** | ดึงข้อมูลวิชาเดี่ยวที่ต้องขอโควตา (`REQUIRED`) | S1 ส่ง `GET /api/quota/courses/EL395?academicYear=2568&semester=1` | • Status: `200 OK` (`QuotaCourseResponse`)<br>• `courseCode`: `"EL395"`<br>• `quotaStatus`: `"REQUIRED"`<br>• ข้อมูล `conditions`, `rounds`, `channels`, `contacts` ครบถ้วนตรงกับ DB<br>• `inMyTimetable`: `false` | • อ่านข้อมูลผ่าน `CourseRepository.findById("EL395")` และ Repository อื่น ๆ ถูกต้อง |
| **IT-API-DAO-US7-16** | Case-insensitive รหัสวิชาใน Path | S1 ส่ง `GET /api/quota/courses/el395?academicYear=2568&semester=1` (ตัวพิมพ์เล็ก) | • Status: `200 OK`<br>• `courseCode`: `"EL395"` ข้อมูลตรงกับเคส IT-15 ทุกประการ | • Service ทำการ Normalize `courseCode.strip().toUpperCase()` ก่อนส่งเข้า DAO |
| **IT-API-DAO-US7-17** | **[โจทย์หลัก] ดึงข้อมูลวิชาที่ไม่มีข้อมูลโควตาใน DB (`NO_DATA`) ต้องได้ 200 และรายการว่าง** | S1 ส่ง `GET /api/quota/courses/TU101?academicYear=2568&semester=1` | • Status: `200 OK` (**ไม่ใช่ 404**)<br>• `courseCode`: `"TU101"`<br>• `quotaStatus`: `"NO_DATA"`<br>• `conditions`, `rounds`, `channels`, `contacts` เป็น `[]` ทั้งหมด | • `CourseRepository.findById("TU101")` พบวิชาในตาราง `course`<br>• `QuotaInfoRepository` ไม่พบแถวใน `course_quota_info` Service สร้าง DTO สถานะ `NO_DATA` |
| **IT-API-DAO-US7-18** | ดึงข้อมูลวิชาที่ไม่มีอยู่ในฐานข้อมูล `course` ตอบ 404 | S1 ส่ง `GET /api/quota/courses/DM201?academicYear=2568&semester=1` | • Status: `404 Not Found`<br>• ProblemDetail: `"detail": "ไม่พบรายวิชา DM201"` | • `CourseRepository.findById("DM201")` คืน `Optional.empty()`<br>• Service โยน `ResourceNotFoundException` |
| **IT-API-DAO-US7-19** | ตรวจสอบสถานะ `inMyTimetable` ของวิชาเดี่ยว | 1. S1 เรียกวิชา `MA211` (มีในตาราง S1)<br>2. S1 เรียกวิชา `EL395` (ไม่มีในตาราง S1) | • ข้อ 1: `inMyTimetable`: `true`<br>• ข้อ 2: `inMyTimetable`: `false` | • ตรวจสอบการอ่าน `timetable` และ `timetable_entry` ของ S1 ใน DAO อย่างแม่นยำ |
| **IT-API-DAO-US7-20** | รอบคำร้องแบบกำหนดส่งวันเดียว (`start_date = NULL`, มี `end_time`) | S1 ส่ง `GET /api/quota/courses/MA211?academicYear=2568&semester=1` | • Status: `200 OK`<br>• `rounds[0].startDate`: `null`<br>• `rounds[0].endDate`: `"2025-08-20"`<br>• `rounds[0].endTime`: `"15:00"`<br>• `rounds[0].label`: `null` | • ค่า `NULL` ในคอลัมน์ `start_date` และ `label` ของตาราง `quota_round` ถูกแปลงเป็น `null` ใน JSON อย่างถูกต้อง |

---

### 3.3 Validation, Security และข้อผิดพลาดของ Request

| รหัสเคส | สถานการณ์ทดสอบ | ขั้นตอนการทดสอบ (API Request) | ผลที่คาดหวังของ API (Response) | ผลที่คาดหวังใน Database (DAO / DB Assertion) |
|:---|:---|:---|:---|:---|
| **IT-API-DAO-US7-21** | ไม่ส่งคำค้นและไม่ได้ติ๊ก checkbox (`QUOTA_SEARCH_QUERY_REQUIRED`) | S1 ส่ง `GET /api/quota/courses?academicYear=2568&semester=1&mine=false` (ไม่ส่งพารามิเตอร์ `q` หรือส่ง `q=""`) | • Status: `400 Bad Request`<br>• ProblemDetail: `code = "QUOTA_SEARCH_QUERY_REQUIRED"`, `title = "Business Rule Violation"` | • Service ตรวจพบเงื่อนไขว่าง โยน `BusinessRuleException` โดยไม่แตะตาราง `course` |
| **IT-API-DAO-US7-22** | Parameter ไม่ครบ หรือค่านอกช่วงที่กำหนด (Spring Validation) | S1 ส่งคำขอแบบ:<br>(ก) ไม่ส่ง `academicYear`<br>(ข) ไม่ส่ง `semester`<br>(ค) `semester = 3` หรือ `0`<br>(ง) `q` มีความยาว 51 ตัวอักษร (เกิน 50) | • Status: `400 Bad Request` ProblemDetail ในทุกกรณี (ก)–(ง) | • ถูก Reject ในระดับ Controller Validation (`@Min`, `@Max`, `@Size`) ก่อนถึง Service และ DAO |
| **IT-API-DAO-US7-23** | เรียกใช้งานโดยไม่มี JWT Token หรือ Token หมดอายุ (401 Unauthorized) | ส่ง Request ไปยังทั้ง 2 Endpoint โดยไม่ส่ง Header `Authorization` | • Status: `401 Unauthorized` | • ถูก Intercept โดย `JwtAuthenticationFilter` ก่อนเข้าถึง Controller และ DAO |

---

### 3.4 ประสิทธิภาพการคิวรีและความปลอดภัยระดับฐานข้อมูล

| รหัสเคส | สถานการณ์ทดสอบ | ขั้นตอนการทดสอบ (API Request) | ผลที่คาดหวังของ API (Response) | ผลที่คาดหวังใน Database (DAO / DB Assertion) |
|:---|:---|:---|:---|:---|
| **IT-API-DAO-US7-24** | **ยืนยันการแก้ปัญหา N+1 Queries (Batch Loading)** | S1 ส่ง `GET /api/quota/courses?academicYear=2568&semester=1&q=CS` (ผลลัพธ์พบหลายวิชา เช่น 10 วิชา) | • Status: `200 OK` ได้ข้อมูลครบทั้ง 10 วิชา | • ตรวจสอบ Statement SQL ผ่าน Hibernate Query Statistics หรือ Proxy Data Source:<br>  1. `SELECT course` (1 ครั้ง)<br>  2. `SELECT section` ด้วย `IN (:codes)` (1 ครั้ง)<br>  3. `SELECT course_quota_info` พร้อม JOIN FETCH `conditions`, `channels`, `contacts` ด้วย `IN (:codes)` (1 ครั้ง)<br>  4. `SELECT quota_round` ด้วย `IN (:codes)` (1 ครั้ง)<br>  **รวมไม่เกิน 4-5 Queries ไม่เกิดการยิง Query ซ้ำตามจำนวนวิชา N** |
| **IT-API-DAO-US7-25** | ยืนยันพฤติกรรม Read-Only และไม่มีการ Lock แถวข้อมูล | S1 ส่งคำขอค้นหาและดึงข้อมูลวิชาเดี่ยวต่อเนื่องกัน | • Status: `200 OK` ในทุก Request | • ทุกคำสั่งรันด้วย `readOnly = true` ไม่สร้าง Transaction Lock ค้างใน SQL Server และไม่มีการเรียก `INSERT/UPDATE/DELETE` ในทุกตาราง |

---

## 4. ตารางความครอบคลุม (Traceability Matrix)

### 4.1 เทียบกับโจทย์และข้อกำหนดใน Task US7-T14

| ข้อกำหนดตามโจทย์ | สถานะ | Test Cases ที่ครอบคลุม |
|:---|:---:|:---|
| **1. ข้อมูลช่องทางใน DB ตรงกับที่ API ตอบ** | ครอบคลุมสมบูรณ์ | `IT-API-DAO-US7-01`, `IT-API-DAO-US7-02`, `IT-API-DAO-US7-15`, `IT-API-DAO-US7-20` |
| **2. วิชาที่ไม่มีข้อมูลได้รายการว่าง (`NO_DATA`)** | ครอบคลุมสมบูรณ์ | `IT-API-DAO-US7-03` (ใน Endpoint 1), `IT-API-DAO-US7-17` (ใน Endpoint 2) |
| **3. วิชาที่มีหลายช่องทางได้ครบทุกช่องทาง (1:N)** | ครอบคลุมสมบูรณ์ | `IT-API-DAO-US7-02` (มีทั้งแบบ URL และแบบยื่นที่คณะ `url = null`, เรียงตาม `sort_order`) |
| **ครบทุก Endpoint ที่แตะเทคโนโลยีฐานข้อมูล** | ครอบคลุมสมบูรณ์ | • `GET /api/quota/courses`: IT-01 ถึง IT-14, IT-21, IT-22, IT-24<br>• `GET /api/quota/courses/{courseCode}`: IT-15 ถึง IT-20, IT-22 |
| **มีครบทั้งกรณีปกติ ข้อมูลว่าง และความผิดพลาด** | ครอบคลุมสมบูรณ์ | • **กรณีปกติ:** IT-01, 02, 04, 05, 07, 08, 10, 12, 13, 15, 16, 19, 20<br>• **กรณีข้อมูลว่าง:** IT-03 (NO_DATA), 06 (ไม่เปิดสอนทั้งปี), 11 (ตารางว่าง), 14 (ไม่พบวิชา), 17 (NO_DATA วิชาเดี่ยว)<br>• **กรณีผิดพลาด:** IT-18 (404 ไม่พบวิชา), 21 (400 ไม่มีเงื่อนไข), 22 (400 Validation), 23 (401 Unauthorized) |
| **ระบุขั้นตอนและผลลัพธ์ทั้งระดับ API และ DB ชัดเจน** | ครอบคลุมสมบูรณ์ | ทุกเคสมีคอลัมน์ระบุ Request, Response JSON และ Database Assertion ครบถ้วน |

---

### 4.2 เทียบกับการทำงานของ DAO และ Entity ตาม US7-T06

| Entity / Repository | เมธอด / ตารางใน DB | เคสทดสอบที่ครอบคลุม |
|:---|:---|:---|
| `CourseRepository` | `searchAllCourses(q, courseCodes)` | IT-01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14 |
| `CourseRepository` | `findById(courseCode)` | IT-15, 16, 17, 18, 19, 20 |
| `SectionRepository` | `findOfferedSemestersByCourseCodesAndYear` | IT-01, 05, 06, 15 |
| `TimetableRepository` / `TimetableEntryRepository` | `findByStudentIdAndAcademicYearAndSemester`, `findByTimetableId` | IT-01, 10, 11, 12, 15, 19 |
| `QuotaInfoRepository` | `findWithDetailsByCourseCodes` (Fetch Conditions, Channels, Contacts) | IT-01, 02, 03, 04, 15, 17, 20, 24 |
| `QuotaRoundRepository` | `findByCourseCodesAndTerm` | IT-01, 05, 15, 20, 24 |
| Database Constraints | `ck_quota_channel_url`, `uq_quota_channel_order`, `uq_quota_round` | IT-01, 02, 15, 20 |

---

## 5. สิ่งที่ต้องเตรียมและยืนยันก่อนการรันเทสต์จริง (US7-T18)

1. **โครงสร้าง Schema ของ Flyway Migration (US7-T09):**
   - ตรวจสอบว่ามีไฟล์ migration ใหม่ (เช่น `V20261114_1800__add_quota_tables.sql`) ที่สร้างตารางทั้ง 5 ตาราง และเพิ่มคอลัมน์ `course_name_th` ใน `course` เรียบร้อยแล้วก่อนเริ่มรัน integration test
2. **การตั้งค่า Batch Size และ Fetching Strategy:**
   - ใน `QuotaInfoRepository.findWithDetailsByCourseCodes` ที่ดึง Collection 3 ชุด (`conditions`, `channels`, `contacts`) ต้องกำหนดความสัมพันธ์บน Entity เป็น `Set<...>` (หรือ `LinkedHashSet`) และใช้ `@OrderBy("sortOrder ASC")` เพื่อป้องกันข้อผิดพลาด `MultipleBagFetchException` ของ Hibernate
3. **การทดสอบบน Testcontainers:**
   - เครื่องของนักพัฒนาหรือ CI Runner ต้องเปิด Docker Daemon เพื่อให้ Testcontainers สามารถสตาร์ต SQL Server 2025 ได้
