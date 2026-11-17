# US7-T08 — API และ DTO ของการค้นหาช่องทางขอโควตา

> สถานะหลัง T09: มี `JpaQuotaDataReader` เชื่อมฐานข้อมูลจริงแล้ว ดู [US7-T09](../T09/README.md) ข้อความด้านล่างอธิบายขอบเขตตอนส่ง T08; test server ในเอกสารนี้ยังใช้ fixture แยกจากฐานข้อมูลเช่นเดิม

งานนี้พัฒนา T08 ก่อน T09 ตามลำดับที่ตกลง จึงมี Controller, Service, DTO และ tests ของ API พร้อมแล้ว แต่ยังไม่เพิ่ม Entity, Repository query, schema หรือ seed ของโควตา

## การทำงานของ API

| Endpoint | ผลลัพธ์ |
|---|---|
| `GET /api/quota/courses?academicYear=2568&semester=1&q=EL395&mine=false` | `QuotaSearchResponse` พร้อมข้อมูลแต่ละวิชา; ไม่พบตอบ 200 และรายการว่าง |
| `GET /api/quota/courses/{courseCode}?academicYear=2568&semester=1` | `QuotaCourseResponse`; ไม่มีรหัสวิชาในระบบตอบ 404 |

ทั้งสอง endpoint ต้องมี JWT ใช้ `CurrentStudentProvider` เดิม ไม่รับ studentId จากผู้เรียก

- `q` ต้องไม่เกิน 50 ตัว และต้องมีคำค้นที่ไม่ว่างหรือ `mine=true`
- `semester` ต้องเป็น 1 หรือ 2; ใช้ validation ของ Spring MVC โดยไม่ใส่ `@Validated` บน Controller
- สถานะเรียงลำดับตัดสิน `NOT_OFFERED` → `NO_DATA` → `NOT_REQUIRED` → `REQUIRED`
- วิชาเปิดสอนแต่ไม่มีข้อมูลโควตาตอบ `NO_DATA` พร้อม `conditions`, `rounds`, `channels`, `contacts` เป็น `[]`
- ค้นหาจากทุกวิชา รวมวิชาที่ไม่เปิดในภาคนั้น; `mine` อ้างตารางของนักศึกษาตามปี/ภาค
- ผลเรียง courseCode, `total` นับก่อนตัดตาม `app.quota.max-results` (default 50)
- วันที่ใช้ ISO ค.ศ. เวลา `HH:mm`; รักษา field ที่มีค่า null ตาม T05

## การแยก T08 และ T09

`quota/data/QuotaDataReader` เป็น interface สำหรับส่งมอบงานอ่านข้อมูลให้ T09 มีเพียง 3 เมธอด:

1. `searchCourses(q, courseCodes)` — คืนข้อมูลพื้นฐานของทุกวิชาที่ตรงคำค้น; null หมายถึงไม่กรองรายชื่อ และ Set ว่างหมายถึงไม่มีวิชาที่อนุญาต
2. `findCourse(normalizedCode)` — อ่านรหัสวิชาที่ strip และแปลงเป็นตัวพิมพ์ใหญ่แล้ว
3. `loadDetails(courseCodes, academicYear, semester)` — อ่านรายละเอียดเป็น batch หลัง Service จำกัดจำนวนวิชาแล้ว

`QuotaService` ใช้ TimetableRepository/TimetableEntryRepository เดิมเพื่ออ่านรายวิชาของผู้ใช้ และใช้ reader สำหรับข้อมูลโควตาที่ยังไม่มี DAO

**ก่อน T09:** reader ยังไม่มี bean ใน production คำขอที่ต้องอ่านข้อมูลจึงตอบ `503 ProblemDetail` พร้อมข้อความระบบยังไม่พร้อม ไม่คืน mock, `NO_DATA` หรือ 404 แทนการขาด implementation คำขอที่ validation ผิดยังตอบ 400 และไม่มี JWT ยังตอบ 401 ตามเดิม

**หลัง T09:** เพิ่ม implementation ของ QuotaDataReader เป็น Spring bean แล้ว Service จะใช้ให้อัตโนมัติ โดยไม่ต้องเปลี่ยน endpoints หรือ DTO ฝั่ง frontend

สิ่งนี้เป็นการแยกขอบเขตเพิ่มเติมจาก T06 เพื่อทำ API ก่อน DAO ส่วน JSON และกฎธุรกิจยังตรง T05/T06

## รัน unit tests

ใช้ JDK 21 จากโฟลเดอร์ `backend`:

```powershell
.\mvnw.cmd '-Dtest=Quota*Test' test
```

Controller/Security/Service/Availability tests ของ US7 ไม่ต้องใช้ฐานข้อมูล ส่วน `mvnw test` ทั้งโปรเจกต์ต้องเปิด Docker เพราะมี DAO tests เดิมที่ใช้ SQL Server Testcontainers

## รัน Postman ก่อน T09 โดยไม่ใช้ DB

Server สำหรับ Postman อยู่ใน `src/test/java` เท่านั้น ใช้ HTTP Controller, Service, DTO, validation และ JWT filter จริง แต่ใช้ FixtureQuotaDataReader และ mocked timetable repositories แทนฐานข้อมูล ไม่มีการติดต่อ TU API ไม่ต้องใช้ application key และไม่มี login endpoint ใน test server นี้

เปิด PowerShell ที่ repository root:

```powershell
.\.doc\US7\T08\Start-PostmanTestServer.ps1 -JavaHome 'C:\Program Files\Java\jdk-21.0.12'
```

เปลี่ยน JavaHome ให้ตรงกับที่ติดตั้ง เครื่องที่กำหนด JAVA_HOME เป็น JDK 21 แล้วไม่ต้องส่ง argument นี้ Server ฟังเฉพาะ `127.0.0.1:18087` และหยุดด้วย Ctrl+C

Import [US7-T08.postman_collection.json](./US7-T08.postman_collection.json) แล้วกำหนดตัวแปร:

| ตัวแปร | ค่าใน test server |
|---|---|
| `baseUrl` | `http://127.0.0.1:18087` |
| `token` | อ่านจาก `backend/target/quota-postman-token.txt` (บัญชีสมมติ 6609000001) |
| `tokenOther` | อ่านจาก `backend/target/quota-postman-other-token.txt` (บัญชีสมมติ 6609000002) |

Collection ที่เก็บใน Git ไม่มี token อยู่ภายใน Token อายุหนึ่งชั่วโมงและใช้ได้กับ test server นี้เท่านั้น อย่าใส่ token ของระบบจริงในไฟล์ Collection ที่ commit

หรือรันผ่าน Newman จาก `backend`:

```powershell
$quotaToken = (Get-Content -Raw target/quota-postman-token.txt).Trim()
$quotaOtherToken = (Get-Content -Raw target/quota-postman-other-token.txt).Trim()
npx --yes newman@6 run ../.doc/US7/T08/US7-T08.postman_collection.json `
  --env-var 'baseUrl=http://127.0.0.1:18087' `
  --env-var "token=$quotaToken" --env-var "tokenOther=$quotaOtherToken"
```

Fixture หลัก: EL395/EL295/MA211/LAS101 ต้องขอโควตา, CS232 ไม่ต้องขอ, TU101 ไม่มีข้อมูล, FR205 เปิดเฉพาะภาค 1 และไม่มีรอบประกาศ, SP001 มีอักขระพิเศษ และ ZZ000–ZZ054 ใช้ตรวจขีดจำกัด 50/total 55

Collection 35 requests นี้ออกแบบสำหรับ fixture ดังกล่าว เมื่อ T09 พร้อมให้ทดสอบซ้ำกับฐานข้อมูลจริงโดยปรับ dataset/expectations ให้ตรง seed ห้ามถือว่าการผ่าน fixture server เป็นผลยืนยัน JPQL, LIKE escaping หรือ migration

## งานที่ T09 ต้องเชื่อม

- เพิ่ม Entity/Repository/seed และ migration ใหม่ตาม T06 โดยไม่แก้ migration ที่ merge แล้ว
- เพิ่ม bean ที่ implement QuotaDataReader แล้ว delegate ไป Repository ตามแบบ T06
- `searchCourses`: รหัส prefix, English word prefix คั่นช่องว่าง/ขีดกลาง, Thai substring, ไม่สน case และ escape `! % _ [` ที่ SQL
- อย่าใช้ CourseRepository.search ของ US1 แทนตรง ๆ เพราะกรองเฉพาะวิชาที่เปิดในภาค ทำให้สถานะ NOT_OFFERED หายไป
- `loadDetails`: batch offered semesters ของทั้งปี, quota info พร้อม conditions/channels/contacts และรอบของปี/ภาคที่ขอ; ไม่ query ทีละวิชา
- ต้องมี QuotaDetailsData สำหรับทุก code แม้ไม่เปิดสอนหรือไม่มี quota info; `quotaRequired=null` หมายถึงไม่มีข้อมูล และ false หมายถึงไม่ต้องขอ
- รายการต้องไม่เป็น null; เรียง conditions/channels/contacts ตาม sortOrder และ rounds ตาม roundNo ก่อนคืน reader
- DTO ไม่อ้าง Entity ของ T09 โดยตรง ให้ adapter แปลง Entity เป็น read models/รายการ response แทน static `from(entity)` ที่ออกแบบไว้ก่อนหน้า
- แก้ข้อสรุปชื่อไทยระหว่าง `course.course_name_th` ตาม US7-T06 กับ `elective_info.course_name_th` ของ US6 ที่ merge แล้ว รวมถึง backfill และผลกระทบกับ query/seed ของ US6 ก่อนเปลี่ยนโครงสร้าง
- ตรวจ DAO tests ของ US7-T12 และ integration กับฐานข้อมูลจริงตาม T14 หลังเชื่อมเสร็จ

## เอกสารที่เกี่ยวข้อง

- [US7-T05 DTO & API Spec](../T05/US7-DTO-API-Spec.md)
- [T06 Sequence Search](../T06/US7-T06-Sequence-Diagram-Search.md)
- [T06 Sequence Detail](../T06/US7-T06-Sequence-Diagram-Detail.md)
- [T06 Extended API](../T06/US7-T06-Extended-API-Class-Diagram.md)
- [ผลทดสอบ T08](./US7-T08-Test-Result.md)
