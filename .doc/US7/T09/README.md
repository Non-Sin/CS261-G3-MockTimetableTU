# US7-T09 — DAO, Entity และการเชื่อม API โควตากับฐานข้อมูล

เพิ่มฐานข้อมูลและตัวอ่านข้อมูลจริงให้ API ของ T08 บน branch `feature/US7-T09-develop-dao-entity` ขณะแยกงาน branch นี้ต่อจาก T08 commit `63a7d95` เมื่อ T08 เข้า `develop` แล้วต้องปรับฐานให้ PR เหลือเฉพาะ T09 ก่อนส่ง review

## การทำงาน

`QuotaController → QuotaService → QuotaDataReader (JpaQuotaDataReader) → Repository → SQL Server`

- `CourseRepository.searchAllCourses` ค้นทุกวิชา รวมวิชาที่ไม่เปิดสอน: รหัสขึ้นต้นคำค้น, คำในชื่ออังกฤษขึ้นต้นคำค้น, ชื่อไทยมีคำค้น และ escape `! % _ [` เป็นตัวอักษรปกติ
- `courseCodes=null` ไม่กรองรหัส; ชุดว่างคืนรายการว่างทันที; ชุดที่มีรหัสใช้ AND กับคำค้น
- `SectionRepository` อ่านภาคที่เปิดสอนแบบ DISTINCT ในปีที่ขอ
- `QuotaInfoRepository` fetch conditions/channels/contacts ด้วย Set ที่เรียง sortOrder จึงอ่านต่อหลังจบ transaction ได้ และไม่เกิด MultipleBagFetchException
- `QuotaRoundRepository` อ่านเฉพาะปี/ภาคที่ขอ เรียง courseCode แล้ว roundNo
- `JpaQuotaDataReader.loadDetails` ใช้ **3 batch queries** สำหรับหลายวิชาพร้อมกัน และสร้าง key ครบแม้ไม่มีข้อมูล (`quotaRequired=null` ต่างจาก `false`)
- กฎสถานะ, การกรองตารางของเจ้าของ JWT, จำนวนผลสูงสุด และ JSON contract อยู่ใน T08 เช่นเดิม ไม่เปลี่ยน DTO/frontend types
- Entity เก็บ startTime ตาม ER แต่ API ยังคืนเฉพาะ endTime ตาม T05 ไม่เพิ่ม field ใน JSON เอง

## Migration และความเข้ากันได้กับ US6

ไฟล์ใหม่เท่านั้น:

1. `V20261117_1811__create_quota_tables.sql`: เพิ่ม `course.course_name_th NVARCHAR(200) NULL` และตารางทั้ง 5 พร้อม PK/FK/UQ/CHECK/ON DELETE CASCADE ตาม T06
2. `V20261117_1812__seed_quota_examples.sql`: ตัวอย่างช่องทาง/เงื่อนไข/รอบ และคัดลอกชื่อไทยจากข้อมูล US6 สำหรับ dev

**ยังเก็บคอลัมน์เดิม `elective_info.course_name_th` ไว้** เพราะ US6 Entity/query และ seed ที่ merge แล้วใช้อยู่ ข้อมูลที่มีอยู่ถูก backfill เฉพาะ course ที่ชื่อไทยยังเป็น NULL ทั้งระหว่าง schema migration และ dev seed โดยไม่เขียนทับชื่อไทยที่มีอยู่ การย้าย US6 ให้ใช้ชื่อไทยจาก course เพียงจุดเดียวยังเป็นงานแยก: ระหว่างนี้การแก้ชื่อไทยในตารางใดตารางหนึ่งภายหลังไม่ได้ sync ไปอีกตารางอัตโนมัติ

ไม่แก้ migration/seed เดิม และไม่เพิ่ม trigger เพื่อซ่อนการ sync ตรวจด้วย SQL Server ทั้ง fresh install และ upgrade จากเวอร์ชันก่อน T09 โดยรักษาตารางเรียนเดิมไว้

## ข้อมูลตัวอย่างสำหรับทดสอบ

ข้อมูล dev ใช้ปี **2568** และวันที่ **ค.ศ. 2025** ตามตัวอย่าง T05 เป็นข้อมูลสาธิต ไม่ใช่กำหนดการปัจจุบันของมหาวิทยาลัย ไม่มีการสร้าง timetable ให้นักศึกษา

| คำขอ | ผลหลัก |
|---|---|
| `GET /api/quota/courses?academicYear=2568&semester=1&q=EL395` | REQUIRED, เงื่อนไข EL295, 2 รอบ, 2 ช่องทาง (เว็บ + ออฟไลน์) |
| `GET /api/quota/courses/MA211?academicYear=2568&semester=1` | REQUIRED, กำหนดส่งวันเดียว 2025-08-20 เวลา 15:00 |
| `GET /api/quota/courses/CS232?academicYear=2568&semester=1` | NOT_REQUIRED และรายละเอียดเป็นรายการว่าง |
| `GET /api/quota/courses/TU101?academicYear=2568&semester=1` | NO_DATA และรายละเอียดเป็นรายการว่าง |
| `GET /api/quota/courses/FR205?academicYear=2568&semester=2` | NOT_OFFERED, offeredSemesters=[1] |
| `GET /api/quota/courses/PC280?academicYear=2568&semester=2` | REQUIRED, ช่องทางอาจารย์/MS Teams โดย url=null |
| `GET /api/quota/courses?academicYear=2568&semester=1&q=แคลคูลัส` | พบ MA211 |
| `GET /api/quota/courses?academicYear=2568&semester=1&q=DM201` | 200, total=0, courses=[] |
| `GET /api/quota/courses/DM201?academicYear=2568&semester=1` | 404 ProblemDetail |

ทุกคำขอต้องใช้ JWT ของแอปใน `Authorization: Bearer <token>` การทดสอบ mine=true ให้เพิ่มวิชาในตารางของบัญชีทดสอบในปี/ภาคเดียวกันก่อน; ไม่ส่ง studentId เอง

เปิด backend ตาม README หลักเพื่อให้ Flyway อัปเกรดฐานข้อมูล dev ตามปกติ ไม่ต้องลบ volume หรือแก้ flyway_schema_history

## รัน tests

เปิด Docker Desktop และใช้ JDK 21 จากโฟลเดอร์ `backend` tests สร้าง SQL Server containers แยก ไม่ใช้ localhost:1433 ของผู้พัฒนา ไม่เรียก TU Login API

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21.0.12'
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
./mvnw.cmd -B test '-Dtest=QuotaRepositoryTest,QuotaSchemaConstraintTest,JpaQuotaDataReaderTest,QuotaMigrationTest,QuotaApiDaoIntegrationTest'
```

คำสั่งเดียวกับ backend CI (รวม regression ของงานเดิม):

```powershell
./mvnw.cmd -B test '-Dtest=!BackendApplicationTests'
```

`BackendApplicationTests` เป็น smoke test เดิมที่ต้องมี SQL Server ภายนอก จึงถูกข้ามตาม `.github/workflows/ci.yml` ส่วน DAO/migration/API integration ข้างต้นใช้ SQL Server จริงใน Testcontainers

ดูผลและตารางอ้างอิงเคสใน [รายงานผลทดสอบ](./US7-T09-Test-Result.md) ส่วน test server/Postman collection ของ T08 ยังเป็น fixture-only ใช้แยกตรวจ contract ไม่ใช่หลักฐาน DAO

## หลักฐานจากสเปก

| การตัดสินใจในโค้ด | หลักฐาน |
|---|---|
| เก็บ quota info แยกจาก course เพื่อแยก NO_DATA กับ NOT_REQUIRED | [T06 ER](../T06/US7-T06-ER-Diagram.md) หัวข้อ 2 |
| เพิ่มชื่อไทยที่ course และสร้างตารางลูก 1:N รองรับหลายช่องทาง | [T06 ER](../T06/US7-T06-ER-Diagram.md) หัวข้อ 1–3 |
| ค้นทุกวิชา, English word prefix, Thai substring และ guard ชุดรหัสว่าง | [T06 DAO](../T06/US7-T06-DAO-Class-Diagram.md) ตารางรายละเอียด Query |
| ใช้ Set + OrderBy และ batch ภาค/ข้อมูล/รอบ | [T06 DAO](../T06/US7-T06-DAO-Class-Diagram.md) QuotaInfoRepository, SectionRepository และ QuotaRoundRepository |
| เก็บวันที่ ค.ศ., คืน endTime แบบ HH:mm, อนุญาต URL ออฟไลน์เป็น NULL | [T05 API](../T05/US7-DTO-API-Spec.md) รายละเอียดเมื่อ REQUIRED |
| fixture แยก Q7, flush/clear, native SQL จับ constraint | [T12](../T12/US7-T12-DAO-Unit-Test-Cases.md) Test Approach และเคส 01–28 |

การคงคอลัมน์ชื่อไทยเก่าของ US6 เป็นการรองรับโค้ดที่ merge แล้ว ยังไม่ใช่การย้าย US6 ให้ตรงเป้าหมาย single source ของ T06 ทั้งหมด
