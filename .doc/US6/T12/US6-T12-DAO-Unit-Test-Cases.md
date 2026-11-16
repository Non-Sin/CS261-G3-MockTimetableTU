# US6-T12 — Design Unit Test Cases ส่วน DAO: วิชาเสรีแนะนำ

## วัตถุประสงค์และเอกสารอ้างอิง

ออกแบบ repository / mapping / schema tests สำหรับ US6 จำนวน **35 เคส** เพื่อใช้เขียนชุดทดสอบเมื่อ implement US6-T09 เอกสารนี้เป็น test specification ยังไม่ได้รันจริง ทุกเคสมีสถานะ **Not Run** ไม่มีผล PASS/FAIL ของระบบจากงานออกแบบนี้

- Branch: `docs/US6-T12-design-unit-test-dao`
- อ้างอิง [T06 DAO Class Diagram][t06-dao], [T06 ER Diagram][t06-er] และ [T06 Extended API Class Diagram][t06-api] รุ่น `f2c69b5` ที่แก้ตามรีวิว PR #92 แล้ว
- T06 ยังไม่อยู่ใน base develop ณ ตอนเริ่มงานนี้ จึงใช้ลิงก์ commit ที่ระบุรุ่น ไม่คัดลอกเอกสาร T06 มาเป็นส่วนหนึ่งของ PR T12
- สัญญา HTTP/DTO อ้างอิง [US6-T05 รุ่น 8213f9a][t05-spec]; default selection ที่ปรับใน T06 ตามรีวิว PR #92 เป็นเรื่อง UI ส่วน DAO ตรวจลำดับ Sec ที่ส่งให้ UI ใช้

## ขอบเขตและ Method under test

| ส่วน | Method / สัญญาที่ตรวจ | TC ID |
|---|---|---|
| ElectiveRepository | `searchRecommended(academicYear, q, group)` | UT-DAO-US6-01 ถึง 12 |
| ElectiveRepository | `findRecommendedByCode(courseCode, academicYear)` และการอ่าน mapping ของผลลัพธ์ | UT-DAO-US6-13 ถึง 18 |
| SectionRepository: query ใหม่ | `findWithSlotsByCourseCodesAndYear(courseCodes, academicYear)` | UT-DAO-US6-19 ถึง 24 |
| SectionRepository: wrapper ใหม่ | `findByCourseCodesAndYear(courseCodes, academicYear)` | UT-DAO-US6-25 ถึง 26 |
| Schema / mapping ใหม่ | PK, FK, CHECK, NOT NULL และ cascade ของสามตาราง metadata | UT-DAO-US6-27 ถึง 35 |

ใช้คำว่า Unit Test ส่วน DAO ตามรูปแบบงานของทีม โดยทดสอบ repository กับ SQL Server จริงผ่าน `@DaoTest` ไม่ mock repository เพราะ mock ไม่ตรวจ JPQL, fetch join, Unicode หรือ constraints

### ขอบเขตตัวกรองตาม T06

| ตัวกรอง/พฤติกรรม | ใครทำตาม T06 | สิ่งที่ T12 ตรวจ |
|---|---|---|
| academicYear, q, group, eligibility | ElectiveRepository | เรียก query จริงและตรวจผลในเคส 01–18 |
| courseCodes และ section ทั้งปี | SectionRepository | ตรวจปี/รหัส/คาบ/ลำดับ/รายการว่างในเคส 19–26 |
| semester, day, timeSlot, excludeConflicts และการใช้หลายตัวพร้อมกันระดับคาบ | ElectiveService.matchesSection | DAO ต้องโหลด Sec และคาบครบ; ตารางส่งต่อ Service tests ท้ายเอกสารระบุเคสตรรกะที่ต้องทดสอบต่อ |
| selectable, inTimetable, conflictWith | ElectiveService / ScheduleOverlap | ไม่ assert ว่า repository สร้าง DTO flags เหล่านี้ |
| เลือก Sec แรกอัตโนมัติ | UI | DAO ตรวจลำดับ semester แล้ว sectionNo; ไม่เพิ่มการเลือก Sec ลงใน query |
| HTTP 400/401/404/409 และการ POST เพิ่ม | Controller/Security/Service หรือ API เดิม US1 | ไม่คาดหวัง HTTP status จาก repository; หาไม่พบคืน `[]` / `Optional.empty()` |

การ์ด T12 ขอครอบคลุมตัวกรองแต่ละตัวและหลายตัวร่วมกัน จึงแสดง coverage ทั้งส่วนที่เป็น DAO จริงและส่วนส่งต่อ Service ชัดเจน ไม่ย้ายตรรกะกรองวัน/เวลา/ชนตารางเข้า DAO ให้ต่างจาก T06

## Dependency และสภาพแวดล้อมสำหรับรันในอนาคต

US6 ยังไม่มี entity/repository และ metadata migrations ในโค้ด base ที่ใช้เขียนเอกสารนี้ ต้องมี implementation ตาม T06 ใน US6-T09 ก่อนนำเคสไปรัน หากแบบ schema/method เปลี่ยนต้องปรับ fixture และ traceability ตามการ review ใหม่

| รายการ | ข้อกำหนด |
|---|---|
| Framework | JUnit 5, AssertJ/JUnit Assertions, TestEntityManager |
| Annotation | `@DaoTest` ที่มีใน `backend/.../support/DaoTest.java`: DataJpaTest + replace NONE + TestcontainersConfig |
| Database | SQL Server ผ่าน MSSQLServerContainer ตาม TestcontainersConfig เดิม (`mcr.microsoft.com/mssql/server:2025-latest`) |
| Migration | ใช้ `classpath:db/migration` รวม migration ใหม่ของ US6; ไม่รัน `db/seed` และไม่เพิ่ม dependency ใหม่จากงานเอกสารนี้ |
| Transaction | แต่ละเคส/แต่ละ parameterized invocation rollback หลังจบ; เคส constraint ที่คาดว่า error ต้องเป็นขั้นสุดท้ายของ transaction นั้น |
| Query test | เตรียม fixture → flush → clear → เรียก method → ตรวจผล; ไม่ใช้ object ที่ persist ค้างใน context เป็นผลการอ่าน |
| Fetch test | ใช้ PersistenceUnitUtil.isLoaded กับ association ที่สัญญาว่า fetch แล้ว; clear หลัง query เพื่อทดสอบการอ่านค่าที่โหลดมาจริงตามเคส |
| Query counter | เคส 26 ใช้ Hibernate Statistics เปิดเฉพาะ test config และอ่าน delta ของ prepareStatementCount เฉพาะช่วงเรียก wrapper หลัง fixture เสร็จ; รันเคสนี้ไม่ขนานกับ test ที่ใช้ counter เดียวกัน |
| ผลทดสอบ | บันทึกผลจริงภายหลังในงานรันเทส ไม่เติม PASS จากการอ่านเอกสาร |

คลาสที่เสนอ: `ElectiveRepositoryTest` (01–18, package elective), `ElectiveSectionRepositoryTest` (19–26, package course) และ `ElectiveSchemaConstraintTest` (27–35, package elective) ใช้ fixture ใหม่ `support/ElectiveDaoFixture` ไม่เพิ่มข้อมูลใน DaoFixture หรือคลาสเทสเดิมของ US1

เมื่อมี migration, entity, repository และคลาสเทสข้างต้นแล้ว จึงใช้คำสั่งนี้จากโฟลเดอร์ backend (เป็นคำสั่งสำหรับอนาคต ยังไม่ได้รันในงาน T12):

```bash
./mvnw test -Dtest='ElectiveRepositoryTest,ElectiveSectionRepositoryTest,ElectiveSchemaConstraintTest'
```

## Test Fixture F0

ข้อมูลต่อไปนี้สร้างเฉพาะ test ไม่ใช่ seed หลัก 18 วิชา ใช้รหัสขึ้นต้น T6 เพื่อลดการชนกับ fixture ของ story อื่น โดย F/P จำลองลักษณะของ FR205/PY250 ใน Prototype แต่ใช้ code ทดสอบของตัวเอง

### 1. รายวิชา

ทุกวิชา credits = 3; category ตามตาราง ไม่มี student/timetable/entry ใน F0 เพราะ method ใหม่ของ DAO ไม่รับ studentId

| Key | course_code | course_name | courseNameTh ใน metadata | category |
|---|---|---|---|---|
| F | T6FR205 | FRENCH FOR EVERYDAY LIFE | ภาษาฝรั่งเศสในชีวิตประจำวัน | FREE_ELECTIVE |
| N | T6NT001 | INTRODUCTION TO COMMUNICATION | การสื่อสารเบื้องต้น | FREE_ELECTIVE |
| P | T6PY250 | PSYCHOLOGY OF PERSONALITY AND ADJUSTMENT | จิตวิทยาบุคลิกภาพและการปรับตน | FREE_ELECTIVE |
| S | T6SO101 | SOCIETY AND HEALTH | สังคมและสุขภาพ | FREE_ELECTIVE |
| E | T6EL001 | ONLINE SCIENCE | วิทยาศาสตร์ออนไลน์ | FREE_ELECTIVE |
| M | T6ME101 | OBJECT-ORIENTED MEDIA WORKSHOP | การสื่อดิจิทัลเชิงวัตถุ | FREE_ELECTIVE |
| X | T6X001 | DATA 100%_! [LAB] BASICS | ข้อมูลทดสอบอักขระพิเศษ | FREE_ELECTIVE |
| NI | T6NI001 | NO METADATA COURSE | ไม่มี metadata | FREE_ELECTIVE |
| NR | T6NR001 | UNREVIEWED LANGUAGE | วิชาที่ยังไม่มีรีวิว | FREE_ELECTIVE |
| OY | T6OY001 | OLD YEAR ELECTIVE | วิชาที่เปิดเฉพาะปีอื่น | FREE_ELECTIVE |
| NS | T6NS001 | NO SECTION ELECTIVE | วิชาที่ยังไม่เปิดกลุ่มเรียน | FREE_ELECTIVE |
| MA | T6MA001 | SOFTWARE ENGINEERING | วิชาเอกทดสอบ | MAJOR |
| GE | T6GE001 | GENERAL EDUCATION | วิชาศึกษาทั่วไปทดสอบ | GENERAL_EDUCATION |

NI ไม่มีแถว elective_info ชื่อไทยในช่องนั้นเป็นคำอธิบาย fixture ไม่ใช่ค่าที่ insert; MA/GE จงใจมี metadata เพื่อพิสูจน์ว่า query ยังบังคับ FREE_ELECTIVE ไม่ใช่ดูแค่ metadata กรณีนี้ SQL schema ของ T06 อนุญาต แต่ไม่ใช่ข้อมูลที่ควรเผยแพร่ใน seed จริง

### 2. Metadata / tags / review points

| Key | interest_group | requires_quota | tags | description |
|---|---|---|---|---|
| F | LANGUAGE | true | KIND_INSTRUCTOR, NO_PREREQUISITE | R-F0 และ R-F1 ตามตารางด้านล่าง |
| N | LANGUAGE | false | [] | default 1 ข้อ |
| P | PSYCHOLOGY | false | NO_ATTENDANCE, NO_GROUP_WORK | default 1 ข้อ |
| S | SOCIETY | false | [] | default 1 ข้อ |
| E | SCIENCE | false | [] | default 1 ข้อ |
| M | MEDIA | false | [] | default 1 ข้อ |
| X | SCIENCE | false | [] | default 1 ข้อ |
| NR | LANGUAGE | false | [] | [] — ไม่มีแถว review point |
| OY | LANGUAGE | false | [] | default 1 ข้อ |
| NS | LANGUAGE | false | [] | default 1 ข้อ |
| MA | LANGUAGE | false | [] | default 1 ข้อ |
| GE | SOCIETY | false | [] | default 1 ข้อ |

default 1 ข้อ = `(sort_order=0, review_text="รีวิวทดสอบ <course_code>")` เช่น N ได้ `รีวิวทดสอบ T6NT001` แต่ F ใช้ข้อความต่อไปนี้และ **insert sort_order=1 ก่อน 0**:

| Review key | Course | sort_order | review_text |
|---|---|---|---|
| R-F0 | F | 0 | ฝึกสนทนาภาษาฝรั่งเศส |
| R-F1 | F | 1 | มีแบบฝึกหัดในชั้นเรียน |

NR มี parent แต่ไม่มี review ได้ในระดับ FK/PK ของ DB ตาม ER; query ต้องคัดออก ไม่ออกแบบให้การไม่มีแถวลูกขั้นต่ำเกิด constraint exception

### 3. Sections และคาบเรียน

insert ตามลำดับตารางที่ตั้งใจไม่เรียง sectionNo/semester; เก็บ section_id/slot_id ที่ DB สร้างใน fixture map ใช้ key ต่อไปนี้อ้างผล ไม่สมมติ ID เป็น 1,2,3

หากไม่ระบุ room ให้เป็น NULL; instructor เป็น NULL ยกเว้น S-F1 = `อาจารย์ทดสอบ เอฟ` และ S-P1 = `อาจารย์ทดสอบ พี`

| Key | Course key | academic_year | semester | section_no | slots (วัน เวลา ห้อง) |
|---|---|---|---|---|---|
| S-F2 | F | 2568 | 1 | 260002 | TUESDAY 19:00–20:00 |
| S-F1 | F | 2568 | 1 | 260001 | TUESDAY 16:30–18:00 SC3-M10; THURSDAY 16:30–18:00 SC3-M10 |
| S-F3 | F | 2568 | 2 | 260003 | MONDAY 09:30–12:30 |
| S-F69 | F | 2569 | 1 | 260001 | WEDNESDAY 08:00–10:00 |
| S-P2 | P | 2568 | 2 | 230001 | TUESDAY 09:30–12:30 |
| S-P1 | P | 2568 | 1 | 820001 | MONDAY 13:30–16:30 LC1-201 |
| S-N1 | N | 2568 | 1 | 010001 | WEDNESDAY 09:30–12:30 |
| S-S1 | S | 2568 | 1 | 010001 | FRIDAY 13:30–16:30 |
| S-E1 | E | 2568 | 1 | 010001 | ไม่มีคาบ |
| S-M1 | M | 2568 | 1 | 010001 | SATURDAY 08:00–10:00 |
| S-X1 | X | 2568 | 1 | 010001 | TUESDAY 08:00–09:00 |
| S-NI1 | NI | 2568 | 1 | 010001 | WEDNESDAY 08:00–09:00 |
| S-NR1 | NR | 2568 | 1 | 010001 | THURSDAY 08:00–09:00 |
| S-OY69 | OY | 2569 | 1 | 010001 | FRIDAY 08:00–09:00 |
| S-MA1 | MA | 2568 | 1 | 010001 | MONDAY 08:00–09:00 |
| S-GE1 | GE | 2568 | 1 | 010001 | MONDAY 10:00–11:00 |

F0 รวม 13 courses, 12 elective_info, 4 elective_tag, 12 review points, 16 sections และ 16 schedule slots ไม่รวมข้อมูลของ framework ที่ไม่ใช่ fixture นี้ ทุกเคสใช้เฉพาะแถว T6 ของตัวเองในการนับ

### 4. Fixture เพิ่มเฉพาะเคส

- **F-WILD (เคส 08):** เพิ่ม course `T6XC001`, ชื่ออังกฤษ `DATA 100ZZZ LATER BASICS`, ชื่อไทย `ข้อมูลตัวควบคุมการค้นหา`, FREE_ELECTIVE, 3 หน่วยกิต; metadata SCIENCE, quota=false, tags=[], description default 1 ข้อ; Sec ปี 2568 ภาค 1 หมายเลข 010001 มีคาบ MONDAY 08:00–09:00 แล้ว flush/clear อีกครั้ง ใช้เป็นตัวควบคุมที่ไม่ควรตรงคำค้น literal `%`, `_`, `!`, `[LAB]`
- **F-SCHEMA (เคส 27–35):** เริ่มจาก F0 และเปลี่ยน/insert เฉพาะแถวที่เคสกำหนด; error cases ทดสอบแยก transaction/parameter invocation ไม่ต่อ invalid inserts หลายครั้งใน session ที่เสียแล้ว

## ขั้นตอนร่วมและหลักการ assert

1. เตรียม Course/Section/ScheduleSlot เดิมด้วย TestEntityManager ให้ได้ generated IDs ส่วน metadata สามตารางใหม่ใช้ native SQL แบบ bind parameter เพื่อไม่ใช้ mapping ที่กำลังทดสอบเป็นผู้สร้าง expected data เอง ใส่คอลัมน์ NOT NULL ครบตาม T06
2. บันทึก metadata/ลูกตาม fixture และตรวจจำนวนแถวเริ่มต้น จากนั้น `em.flush()` + `em.clear()` ก่อน query ทุกเคส
3. ใช้ expected codes/section keys ในเอกสารเป็น oracle ไม่เรียก method อื่นที่กำลังทดสอบเพื่อสร้าง expected result
4. ผล `searchRecommended` ตรวจชุด courseCode แบบไม่สนลำดับและจำนวนต้องตรง ไม่มีรหัสซ้ำ เพราะ T06 ให้ service เรียง InterestGroup; ไม่อ้างว่า repository เรียงตามหมวดให้แล้ว
5. ผล section query ตรวจลำดับตาม `courseCode`, `semester`, `sectionNo` แบบแน่นอนและจำนวน sectionId ไม่ซ้ำ การมีหลายคาบต้องไม่ทำให้จำนวน Sec เพิ่ม
6. อ่าน description ที่เป็น LAZY **ภายใน transaction** ตาม T06 ไม่บังคับว่าต้อง fetch มาพร้อม metadata; ต่างจาก course/tags/slots ที่ query สัญญาว่า fetch ไว้
7. ตรวจกับ fixture ใหม่ก่อนทุกเคส ไม่พึ่งข้อมูลที่เคสก่อนหน้าเพิ่ม/ลบ

## A. ElectiveRepository.searchRecommended — 12 เคส

### UT-DAO-US6-01 — ค้นหาปกติทั้งปี

**Fixture/Input:** F0; `(2568, null, null)`

**ขั้นตอน:** เรียก searchRecommended แล้วอ่าน courseCode ของผลทั้งหมด

**Expected:** ได้ชุด `{T6FR205,T6NT001,T6PY250,T6SO101,T6EL001,T6ME101,T6X001}` รวม 7 วิชา ไม่มีซ้ำ แม้ F มีหลาย Sec/หลาย tags และมีวิชาที่ไม่มี tags อยู่ด้วย

### UT-DAO-US6-02 — แยกปีการศึกษา

**Fixture/Input:** F0; `(2569, null, null)`

**ขั้นตอน:** เรียกค้นหาปี 2569 โดยไม่ส่งตัวกรองอื่น

**Expected:** ได้เฉพาะ `{T6FR205,T6OY001}` ไม่ได้ P หรือวิชาที่เปิดเฉพาะ 2568 แสดงว่า EXISTS ของ section ผูกปีถูกต้อง

### UT-DAO-US6-03 — คำค้น null/ว่าง/ช่องว่าง

**Fixture/Input:** F0; ปี 2568, group=null, q แต่ละค่า `null`, `""`, `"   "` (parameterized แยก invocation)

**ขั้นตอน:** เรียกค้นหาด้วยคำค้นแต่ละแบบ

**Expected:** แต่ละแบบได้ชุด 7 วิชาตามเคส 01 ไม่มี exception จาก null LIKE parameter และไม่กรองทุกวิชาทิ้งเพราะช่องว่าง

### UT-DAO-US6-04 — รหัสวิชา prefix และไม่สนตัวพิมพ์

**Fixture/Input:** F0; `(2568, "  t6fr  ", null)`

**ขั้นตอน:** ค้นด้วยรหัส prefix ตัวเล็กและมีช่องว่างรอบคำ

**Expected:** ได้ `{T6FR205}` เพียงวิชาเดียว พิสูจน์ strip/case handling โดยคำค้นนี้ไม่ตรงชื่ออังกฤษของ F

### UT-DAO-US6-05 — ชื่ออังกฤษต้องตรงต้นคำ รวมหลังขีดกลาง

**Fixture/Input:** F0; ปี 2568, group=null; q = `"FRE"`, `"ADJU"`, `"oriented"`, `"JUST"`

**ขั้นตอน:** เรียกค้นหาแต่ละคำแบบ parameterized

**Expected:** ตามลำดับได้ `{T6FR205}`, `{T6PY250}`, `{T6ME101}`, `{}`; JUST อยู่กลาง ADJUSTMENT จึงไม่ผ่าน ขณะที่ ORIENTED อยู่ต้นคำหลัง `-` จึงผ่าน

### UT-DAO-US6-06 — ชื่อไทยค้น substring

**Fixture/Input:** F0; `(2568, "บุคลิก", null)`

**ขั้นตอน:** ค้นคำที่อยู่กลางชื่อไทยของ P

**Expected:** ได้ `{T6PY250}` และเมื่ออ่าน courseNameTh ต้องตรง `จิตวิทยาบุคลิกภาพและการปรับตน` ไม่เพี้ยนจาก NVARCHAR

### UT-DAO-US6-07 — กรองแต่ละ InterestGroup

**Fixture/Input:** F0; ปี 2568, q=null; group แต่ละ enum ที่ถูกต้อง

**ขั้นตอน:** เรียกค้นหาทีละหมวด (5 parameterized invocations)

**Expected:** LANGUAGE → `{T6FR205,T6NT001}`; PSYCHOLOGY → `{T6PY250}`; SOCIETY → `{T6SO101}`; SCIENCE → `{T6EL001,T6X001}`; MEDIA → `{T6ME101}` ไม่คืน GE แม้ metadata เป็น SOCIETY

### UT-DAO-US6-08 — LIKE special characters เป็นตัวอักษรจริง

**Fixture/Input:** F0 + F-WILD; ปี 2568, group=null; q = `"100%"`, `"100%_"`, `"100%_!"`, `"[LAB]"`

**ขั้นตอน:** ค้นทีละคำและตรวจชุดรหัส ไม่ตรวจเพียงว่ามี X อยู่ในผล

**Expected:** ทุกคำได้ `{T6X001}` เท่านั้น ไม่ได้ T6XC001 หรือวิชาอื่นที่ SQL wildcard อาจจับผิด ต้อง escape `%`, `_`, `[`, `!` ตาม T06 และ query ยังทำงานได้

### UT-DAO-US6-09 — ใช้ q/group/year ร่วมกันแบบ AND

**Fixture/Input:** F0; ชุด `(2568,"T6FR",LANGUAGE)`, `(2568,"T6FR",SCIENCE)`, `(2569,"T6PY",PSYCHOLOGY)`

**ขั้นตอน:** เรียกค้นหาแต่ละชุดโดยใช้ทั้งสามเงื่อนไข

**Expected:** ชุดแรกได้ `{T6FR205}` อีกสองชุดได้ `[]`; ห้ามใช้ OR ระหว่างหมวด/ปี/คำค้น

### UT-DAO-US6-10 — คัดวิชาที่ไม่ครบ eligibility

**Fixture/Input:** F0; ปี 2568, group=null; q เป็น code เต็มของ NI, NR, OY, NS, MA, GE ทีละรายการ

**ขั้นตอน:** ค้นแต่ละ code ที่มีอยู่จริง แต่ขาด metadata/รีวิว/Sec ปีนี้ หรือไม่ใช่ FREE_ELECTIVE

**Expected:** แต่ละ invocation ได้ `[]` ไม่ throw; การมี metadata ของ MA/GE ไม่ทำให้เข้าแนะนำ และ parent NR ที่ไม่มี review ต้องถูกตัดออก

### UT-DAO-US6-11 — ไม่พบผลการค้นหา

**Fixture/Input:** F0; `(2568,"T6ZZ999",null)` และ `(2567,null,null)`

**ขั้นตอน:** ค้นรหัสที่ไม่มีและปีที่ไม่มี Sec ใน fixture แยก invocation

**Expected:** ได้ list ว่างทั้งสองแบบ ไม่ใช่ null หรือ exception; repository ไม่ตอบ HTTP 404 เอง

### UT-DAO-US6-12 — fetch course/tags ครบโดยไม่ทำวิชาซ้ำ

**Fixture/Input:** F0; `(2568,"T6FR",null)`

**ขั้นตอน:** ค้น F ตรวจ isLoaded(course/tags) ก่อนอ่าน getter แล้ว clear context และอ่าน courseName, courseNameTh, quota, tags ของผลที่ detached โดยไม่อ่าน description

**Expected:** ได้ root F เพียงหนึ่งรายการ; course/tags โหลดแล้ว; ชื่ออังกฤษ/ไทยและ quota=true ตรง fixture; tags เป็นชุด `{KIND_INSTRUCTOR,NO_PREREQUISITE}` อ่านหลัง detach ได้ ไม่คาดหวังลำดับของ Set และไม่คาดหวังว่า description ถูก initialize แล้ว

## B. ElectiveRepository.findRecommendedByCode / mapping — 6 เคส

### UT-DAO-US6-13 — อ่านรายละเอียดวิชาที่ครบข้อมูล

**Fixture/Input:** F0; `(T6FR205,2568)`

**ขั้นตอน:** เรียก findRecommendedByCode และอ่าน metadata/course/tags ภายใน transaction

**Expected:** Optional มีค่าเดียว เป็น F; courseCode, courseName, courseNameTh, credits=3, interestGroup=LANGUAGE, requiresQuota=true และชุด tags ตรง fixture แม้ fetch join ได้หลายแถวของ tags ต้องไม่เกิด NonUniqueResultException; repository คืน ElectiveInfo ไม่ใช่ ElectiveDetailResponse

### UT-DAO-US6-14 — รหัสที่ไม่มี

**Fixture/Input:** F0; `(T6ZZ999,2568)`

**ขั้นตอน:** เรียก findRecommendedByCode ด้วยรหัสที่ไม่อยู่ใน fixture

**Expected:** `Optional.empty()` ไม่เป็น null ไม่โยน ResourceNotFoundException; การแปลงเป็น HTTP 404 เป็นเรื่อง service/controller

### UT-DAO-US6-15 — มี course แต่ไม่ใช่วิชาแนะนำที่ครบเงื่อนไข

**Fixture/Input:** F0; รหัส NI, NR, OY, NS, MA, GE ตามลำดับ โดย academicYear=2568

**ขั้นตอน:** เรียก detail repository ของแต่ละ code แยก invocation

**Expected:** Optional ว่างทุกแบบเพราะใช้ eligibility เดียวกับ search; มี course อยู่จริงอย่างเดียวไม่พอ และวิชาไม่มี review ไม่ผ่านแม้มี elective_info

### UT-DAO-US6-16 — ใช้ปีที่ขอในการตรวจ Sec เปิด

**Fixture/Input:** F0; `(T6FR205,2569)` และ `(T6PY250,2569)`

**ขั้นตอน:** เรียก detail repository ของ F และ P สำหรับปี 2569 แยก invocation

**Expected:** F มีค่าเพราะมี S-F69; P ได้ Optional.empty แม้มี Sec ใน 2568 การมี Sec ของคนละปีต้องไม่ทำให้ผ่าน

### UT-DAO-US6-17 — รีวิวภาษาไทยเรียง sort_order

**Fixture/Input:** F0; `(T6FR205,2568)` ซึ่ง insert review R-F1 ก่อน R-F0

**ขั้นตอน:** เรียก detail repository; initialize description ภายใน transaction แล้วอ่าน list ทั้งหมด จากนั้น clear และอ่าน list ที่ initialize แล้วซ้ำ

**Expected:** ได้ `["ฝึกสนทนาภาษาฝรั่งเศส","มีแบบฝึกหัดในชั้นเรียน"]` ตาม sort_order 0,1 ไม่ใช่ลำดับ insert; ข้อความไทยไม่เพี้ยน ไม่ซ้ำแม้ F มีหลาย tags อ่านหลัง clear ได้เพราะ initialize ไว้แล้ว ไม่บังคับให้ query metadata fetch review มาพร้อมกัน

### UT-DAO-US6-18 — วิชาไม่มี tags ยังอ่านได้

**Fixture/Input:** F0; `(T6NT001,2568)`

**ขั้นตอน:** เรียก detail repository ตรวจ tags และ initialize description ใน transaction

**Expected:** Optional มีค่า, tags เป็นชุดว่าง, description มี `รีวิวทดสอบ T6NT001` หนึ่งข้อ; LEFT JOIN FETCH tags ต้องไม่คัด N ออกเหมือน inner join

## C. SectionRepository query / wrapper — 8 เคส

เคส 19–24 เรียก `findWithSlotsByCourseCodesAndYear` โดยตรงเพื่อทดสอบ JPQL ใหม่; เคส 25–26 ทดสอบ wrapper สาธารณะที่ service เรียก ไม่เพิ่มการกรองวัน/เวลา/ไม่ชนลงใน method นี้

### UT-DAO-US6-19 — โหลดหลายวิชาและเรียงตามสัญญา

**Fixture/Input:** F0; `courseCodes=[T6PY250,T6FR205]`, year=2568

**ขั้นตอน:** เรียก query method และอ่านลำดับ sectionId เปรียบเทียบกับ key ใน fixture

**Expected:** ลำดับตรง `[S-F1,S-F2,S-F3,S-P1,S-P2]` รวม 5 Sec ไม่เรียงตามลำดับ code ที่ส่งหรือ identity ที่ insert และไม่คืน Sec ของวิชาอื่น

### UT-DAO-US6-20 — ไม่ปะปน Sec ข้ามปี

**Fixture/Input:** F0; `courseCodes=[T6FR205,T6PY250]`, year=2569

**ขั้นตอน:** เรียก query method

**Expected:** ได้ `[S-F69]` เท่านั้น ไม่ได้ S-F1 ที่ section_no เหมือนกันแต่คนละปี และไม่ได้ P ปี 2568

### UT-DAO-US6-21 — ได้ Sec ทั้งสองภาคและเรียงภาคก่อน Sec

**Fixture/Input:** F0; `courseCodes=[T6PY250]`, year=2568

**ขั้นตอน:** เรียก query method โดยไม่ส่ง semester (method ไม่มี param นี้)

**Expected:** ได้ `[S-P1,S-P2]` คือภาค 1 Sec 820001 ก่อนภาค 2 Sec 230001 แม้ insert P2 ก่อนและ section_no ของ P2 น้อยกว่า ไม่คัด Sec อีกภาคทิ้ง

### UT-DAO-US6-22 — หลายคาบได้ Sec เดียวและ association ครบ

**Fixture/Input:** F0; `courseCodes=[T6FR205]`, year=2568

**ขั้นตอน:** เรียก query method ตรวจ isLoaded(course/slots) ของทุก Sec ก่อนอ่าน getter; clear context แล้วตรวจข้อมูลของผล detached

**Expected:** ได้ `[S-F1,S-F2,S-F3]` รวม 3 sectionId ไม่ซ้ำ แม้ JPQL ใช้ `select s` ไม่มี DISTINCT; S-F1 มีคาบครบ 2 คาบ `{TUESDAY 16:30–18:00 SC3-M10, THURSDAY 16:30–18:00 SC3-M10}` และ instructor=`อาจารย์ทดสอบ เอฟ`; course/slots ที่ fetch แล้วอ่านหลัง detach ได้ ตรวจ slots แบบไม่สนลำดับเพราะ repository ไม่สัญญาเรียงคาบ

### UT-DAO-US6-23 — คาบว่างและ nullable fields ไม่ทำ Sec หาย

**Fixture/Input:** F0; `courseCodes=[T6EL001,T6PY250]`, year=2568

**ขั้นตอน:** เรียก query method และตรวจ Sec พร้อม slots/instructor/room

**Expected:** ได้ `[S-E1,S-P1,S-P2]`; E1 มี slots=[] และ instructor=null; P2 instructor=null และ room ของคาบเป็น null; ไม่ตัด E1 ทิ้งเพราะไม่มี schedule_slot และไม่เปลี่ยน null เป็นข้อความ UI ที่ชั้น DAO

### UT-DAO-US6-24 — ไม่พบรหัสหรือปีที่มี Sec

**Fixture/Input:** F0; `([T6ZZ999],2568)` และ `([T6FR205],2567)`

**ขั้นตอน:** เรียก query method แยกแต่ละชุด

**Expected:** คืน `[]` ไม่เป็น null และไม่ throw เพียงเพราะไม่มีแถวที่ตรงเงื่อนไข

### UT-DAO-US6-25 — wrapper รับหลาย code รวม code ซ้ำ/ไม่พบ

**Fixture/Input:** F0; `courseCodes=[T6FR205,T6ZZ999,T6FR205]`, year=2568

**ขั้นตอน:** เรียก `findByCourseCodesAndYear` แล้วตรวจผลกับ fixture โดยตรง ไม่เรียก query method อีกครั้งเพื่อสร้าง expected

**Expected:** ได้ `[S-F1,S-F2,S-F3]` รวม 3 sectionId ที่ไม่ซ้ำ รหัสที่ไม่มีไม่ทำให้ผลของ F หาย และ list มีค่าเดินทางไป query ทั้งปีได้ตาม wrapper

### UT-DAO-US6-26 — wrapper list ว่างไม่ออก SQL

**Fixture/Input:** F0; `courseCodes=[]`, year=2568

**ขั้นตอน:** หลัง flush/clear fixture เสร็จ เปิด counter ตาม Test Approach อ่านค่า prepareStatementCount ก่อนเรียก wrapper แล้วอ่านค่าหลังเรียกโดยยังไม่ทำ query อื่น

**Expected:** ได้ `[]` และ delta SQL prepared statements = 0 ไม่ส่ง `IN ()` ไป SQL Server ทดสอบผ่าน wrapper เท่านั้น ไม่กำหนดสัญญารับ empty list ให้ internal query method ที่ wrapper กันไว้แล้ว

## D. Schema / constraints ใหม่ — 9 เคส

ทุกเคสใช้ F-SCHEMA และ flush/clear ตามขั้นตอนร่วม ก่อนทำคำสั่งที่คาดว่าจะผิดต้องยืนยันว่า fixture ส่วนที่เป็น parent มีอยู่แล้ว เพื่อไม่ให้ผิด constraint คนละตัว

ใช้ native SQL แบบ bind parameter ทดสอบ constraints ของตารางใหม่โดยตรง ไม่ใช้ enum ของ Java สร้างค่า invalid enum เพราะจะถูกกันก่อนถึง DB; `PersistenceException`/Hibernate constraint exception อาจเกิดตั้งแต่ `executeUpdate()` ให้ครอบทั้งคำสั่งและ flush ใน assertThrows แล้วตรวจ root cause ว่าเป็น PK/FK/CHECK/NOT NULL ที่ต้องการ ไม่ยึดข้อความ error ทั้งประโยคที่เปลี่ยนตาม driver/ภาษาเครื่อง

ค่า NULL ใน native SQL ต้อง bind ด้วยชนิดที่ตรงคอลัมน์ (NVARCHAR/INTEGER/BIT ตามแต่ละเคส) เพื่อให้ทดสอบ NOT NULL จริง ไม่ล้มเพราะ driver อนุมานชนิด parameter ผิด

แต่ละ invalid parameter ต้องเป็นคนละ test invocation หลัง exception ให้จบ test และ rollback ไม่ query ตรวจต่อใน session ที่ล้มเหลวแล้ว การตรวจ error จาก SQL ตรงนี้ไม่ใช่ HTTP 400/409

### UT-DAO-US6-27 — elective_info ใช้ shared primary key ไม่ซ้ำ

**Fixture/Input:** F0 ซึ่งมี elective_info ของ F แล้ว; insert elective_info อีกแถวด้วย course_code=T6FR205 และค่าอื่นถูกต้อง

**ขั้นตอน:** พยายาม insert parent metadata ซ้ำด้วย native SQL แล้ว flush ภายใน assertThrows

**Expected:** DB ปฏิเสธด้วย PK `pk_elective_info`; ไม่ใช่ FK error เพราะ course ของ F มีจริง

### UT-DAO-US6-28 — metadata ต้องมี course เป็น parent

**Fixture/Input:** F0; code `T6MISS01` ไม่มีใน course; ค่าอื่น LANGUAGE, quota=false, ชื่อไทยไม่ว่าง

**ขั้นตอน:** insert elective_info ของ code ที่ไม่มีด้วย native SQL

**Expected:** FK `fk_elective_info_course` ปฏิเสธการ insert ไม่เกิด metadata กำพร้า

### UT-DAO-US6-29 — field บังคับและหมวดถูกค่า

**Fixture/Input:** F0; ใช้ NI ซึ่งมี course แต่ยังไม่มี elective_info; ข้อมูลปกติสำหรับ insert = ชื่อไทย `ข้อมูลทดสอบ`, group=LANGUAGE, quota=false แล้วเปลี่ยนทีละ field เป็น `group=UNKNOWN`, `group=NULL`, `course_name_th=NULL`, `course_name_th="   "`, `requires_quota=NULL`

**ขั้นตอน:** insert แยกแต่ละ variant ด้วย native SQL และ assertThrows

**Expected:** UNKNOWN ผิด `ck_elective_info_group`, ชื่อ whitespace ผิด `ck_elective_info_name`, ค่า NULL ผิด NOT NULL ของ field นั้น ไม่ใช่ PK/FK เพราะ NI ไม่มี metadata และมี course parent แล้ว

### UT-DAO-US6-30 — tag เดิมซ้ำในวิชาเดียวกันไม่ได้

**Fixture/Input:** F0; insert `(T6FR205,KIND_INSTRUCTOR)` ซึ่งมีอยู่แล้ว

**ขั้นตอน:** insert elective_tag ซ้ำด้วย native SQL

**Expected:** PK `(course_code,tag)` ปฏิเสธ; คนละวิชามี tag เดียวกันได้ตามโครงสร้าง PK ไม่ได้ออกแบบให้ tag unique ทั้งระบบ

### UT-DAO-US6-31 — ค่า tag ต้องเป็น enum และไม่เป็น NULL

**Fixture/Input:** F0; N มี elective_info และไม่มี tags; insert tag `UNKNOWN_TAG` และ NULL แยก invocation

**ขั้นตอน:** insert elective_tag ของ N ด้วย native SQL

**Expected:** UNKNOWN_TAG ผิด `ck_elective_tag_value`; NULL ผิด NOT NULL ของ tag โดยไม่มี duplicate PK มาเป็นสาเหตุแทน

### UT-DAO-US6-32 — review sort_order ไม่ซ้ำภายในวิชา

**Fixture/Input:** F0; insert review ของ F ที่ sort_order=0 อีกแถวพร้อมข้อความถูกต้อง

**ขั้นตอน:** insert elective_review_point ด้วย native SQL

**Expected:** PK `(course_code,sort_order)` ปฏิเสธ ไม่เก็บสอง bullet ในตำแหน่งเดียวกัน

### UT-DAO-US6-33 — review order/text ต้องเป็นค่าที่ถูกต้อง

**Fixture/Input:** F0; N มี review order=0 อยู่แล้ว; เริ่มข้อมูล insert ปกติ `(T6NT001,sort_order=1,review_text="รีวิวเพิ่ม")` แล้วเปลี่ยนเป็น order=-1, order=NULL, text="   " หรือ text=NULL ทีละ variant

**ขั้นตอน:** insert แยก invocation ด้วย native SQL และ assertThrows

**Expected:** order=-1 ผิด `ck_elective_review_order`; text whitespace ผิด `ck_elective_review_text`; ค่า NULL ผิด NOT NULL ของ field นั้น; ไม่มี order ชนกับแถวเดิม

### UT-DAO-US6-34 — ลบข้อมูลแนะนำ cascade เฉพาะลูกของวิชานั้น

**Fixture/Input:** F0; ลบ elective_info ของ F เท่านั้น

**ขั้นตอน:** native DELETE parent `T6FR205` → flush/clear → query จำนวนแถวของ F และข้อมูล control P จาก DB โดยตรง

**Expected:** elective_info/tags/reviews ของ F เหลือ 0; course F ยังอยู่ 1 แถว, sections F ยังครบ 4 และ slots ของ F ยังครบ 5; metadata ของ P ยังอยู่ 1, tags 2, reviews 1 ไม่ถูกลบ การลบ metadata ไม่ลบวิชาหรือ section จาก US1

### UT-DAO-US6-35 — tag/review ต้องอ้าง parent elective_info

**Fixture/Input:** F0; NI มี course แต่ไม่มี elective_info; insert tag KIND_INSTRUCTOR ของ NI หรือ review `(NI,0,"รีวิวทดสอบ")` แยก invocation

**ขั้นตอน:** insert ลูกแต่ละตารางด้วย native SQL

**Expected:** ผิด `fk_elective_tag_info` / `fk_elective_review_info` ตามตาราง การมี course อย่างเดียวไม่พอให้มีลูก metadata ได้

## ตารางส่งต่อ Service / UI tests ตามขอบเขตตัวกรองใน T06

รายการต่อไปนี้เป็น coverage ที่ต้องมีในชั้นที่รับผิดชอบ ไม่รวมในจำนวน 35 DAO cases และไม่อ้างว่าทดสอบ logic เหล่านี้สำเร็จจาก repository tests แล้ว ให้ผู้ implement Service/UI tests สร้าง fixture ของ snapshot ตารางและ response แยกจาก F0

| ตัวกรอง/กรณี | สิ่งที่ต้องตรวจต่อ | DAO cases ที่รองรับข้อมูล |
|---|---|---|
| semester | กรองภาค 1/2 ถูก แต่ offeredSemesters ยังมาจากทั้งปี | 19–21 |
| day | มีอย่างน้อยหนึ่งคาบใน Sec ตรงวัน; Sec ไม่มีคาบไม่ผ่านเมื่อระบุวัน | 22–23 |
| timeSlot | ดูเวลาเริ่มใน [from,to), รวมขอบ 12:30/16:30 ตาม T05 | 22–23 |
| day + timeSlot | ต้องตรงคาบเดียวกัน; คนละคาบใน Sec เดียวกันไม่ทำให้ผ่าน | 22 |
| หลายตัวกรองข้าม Sec | วันผ่าน Sec A และช่วงเวลาผ่าน Sec B ต้องไม่ผ่าน | 19, 22 |
| excludeConflicts | โหลดตาราง currentSemester, ตัดวิชาที่อยู่ในตารางแล้ว; คาบต่อกันไม่ชน; e-learning ไม่ชน | 19–23 และ method snapshot เดิม US1 |
| excludeConflicts + semester อีกภาค | ผล service ว่าง ไม่ใช่ error; ห้ามใช้ปี/ภาค dropdown ผิดเป็นบริบทตาราง | 20–21 |
| รายละเอียด/เพิ่ม | selectable, inTimetable, conflictWith, default Sec แรกตามรีวิว PR #92; การกันวิชาอยู่ในตารางแล้วเป็น logic Service/UI | 19–23 ให้ลำดับและข้อมูล Sec ครบ |
| ไม่พบรายละเอียด/param ผิด | Optional.empty ถูกแปลง 404 ที่ service; ภาคไม่ถูกต้อง 400 และ 401 จาก security ไม่ใช่ DAO | 14–16 |

**สิ่งที่ไม่ใช่สัญญาของ DAO:** การเรียง search result ตาม InterestGroup, การเรียง tags ตาม enum สำหรับ DTO, ข้อความ “ไม่พบรีวิววิชานี้”, การส่ง POST ของ US1, การบล็อก Sec อีกภาค และการแสดงปุ่มขอโควตา

## Traceability และเกณฑ์ตรวจเอกสาร

| ข้อกำหนด T06 / การ์ด T12 | เคส/หัวข้อใน T12 |
|---|---|
| query ใหม่ทุกตัวใน DAO Class Diagram | search 01–12; detail 13–18; internal section query 19–24; wrapper 25–26 |
| ตัวกรองแต่ละตัวและหลายตัวพร้อมกันที่ทำใน query | ปี 02, q 03–06/08, group 07, ชุด AND 09; ตัวกรองระดับคาบส่งต่อ Service ตามตารางข้างบน |
| ไม่พบวิชาที่ตรงเงื่อนไข | 10–11, 14–16, 24, 26 |
| อ่านรายละเอียดวิชาเสรี | 13, 17–18 และโหลด Sec ทั้งปี 19–23 |
| มี fixture ทุกเคส | F0 ในตาราง Course/Metadata/Section; 08 เพิ่ม F-WILD; 27–35 ใช้ F-SCHEMA พร้อม delta ของแต่ละเคส |
| กรณีปกติ/ข้อมูลว่าง/ผิดพลาด | ปกติใน A–C, ผลว่าง 10–11/14–16/24/26, constraints ผิดพลาด 27–33/35 และ cascade สำเร็จ 34 |
| การแก้ T06 ตาม PR #92 | 19/21 ตรวจลำดับที่ใช้เลือก Sec แรก; 22 ตรวจ root ไม่ซ้ำแม้ select s ไม่มี distinct; UI default selection ส่งต่อ Service/UI tests |
| T06 query/fetch plan | 12, 17–18, 22–23, 26; ไม่ assert จำนวน SQL ของ Service ทั้ง flow ใน DAO test เดี่ยว |

Repository เดิมของ US1 ที่ US6 ใช้ผ่าน TimetableService (`findByStudentIdAndAcademicYearAndSemester`, `findByTimetableId`, `findById`) และการ save เพิ่มวิชาอ้างอิง [US1-T12](../../US1/T12/US1-T12%20Design%20Unit%20Test%20Cases%20ส่วน%20DAO.md) ไม่เพิ่มเคสเขียน timetable ซ้ำใน T12 ของ US6 ซึ่ง query ใหม่เป็น read-only

### แบบบันทึกเมื่อเริ่มรันจริง

| ชุดเคส | สถานะตอนออกแบบ | จำนวน case specifications |
|---|---|---|
| Search 01–12 | Not Run | 12 |
| Detail/mapping 13–18 | Not Run | 6 |
| Section query/wrapper 19–26 | Not Run | 8 |
| Schema 27–35 | Not Run | 9 |
| รวม | Not Run | 35 |

จำนวน invocation จริงอาจมากกว่า 35 เพราะหลายเคสใช้ parameterized input ตอนรันให้บันทึก TC ID, variant, commit implementation, fixture/migration version และผลจริงแยกกัน ไม่ตีความจำนวน case specifications เป็นจำนวน JUnit invocations

เกณฑ์ก่อนส่ง PR: method/field/constraint ตรง T06 รุ่นที่อ้างอิง, expected result ทุกเคสคำนวณจาก fixture นี้, ไม่มีการอ้าง mock repository ว่าพิสูจน์ SQL แล้ว, ลิงก์ถูกต้อง และไม่มีข้อความอ้างว่าได้รันทดสอบจริง

## เอกสารที่เกี่ยวข้อง

- [T06 DAO Class Diagram][t06-dao]
- [T06 ER Diagram][t06-er]
- [T06 Extended API Class Diagram][t06-api]
- [T06 Sequence รายละเอียด รุ่นแก้รีวิว][t06-detail]
- [US6-T05 API Spec][t05-spec]
- [US1-T12 Test Approach](../../US1/T12/US1-T12%20Design%20Unit%20Test%20Cases%20ส่วน%20DAO.md)
- [US2-T12 ตัวอย่างแยก DAO/Service](../../US2/T12/US2-T12-DAO-Unit-Test-Cases.md)

[t06-dao]: https://github.com/Non-Sin/CS261-G3-MockTimetableTU/blob/f2c69b5973ba28da5afcb1f49f36100bbc2953a5/.doc/US6/T06/US6-T06-DAO-Class-Diagram.md
[t06-er]: https://github.com/Non-Sin/CS261-G3-MockTimetableTU/blob/f2c69b5973ba28da5afcb1f49f36100bbc2953a5/.doc/US6/T06/US6-T06-ER-Diagram.md
[t06-api]: https://github.com/Non-Sin/CS261-G3-MockTimetableTU/blob/f2c69b5973ba28da5afcb1f49f36100bbc2953a5/.doc/US6/T06/US6-T06-Extended-API-Class-Diagram.md
[t06-detail]: https://github.com/Non-Sin/CS261-G3-MockTimetableTU/blob/f2c69b5973ba28da5afcb1f49f36100bbc2953a5/.doc/US6/T06/US6-T06-Sequence-Diagram-Detail.md
[t05-spec]: https://github.com/Non-Sin/CS261-G3-MockTimetableTU/blob/8213f9acded350f8837eefc6a1b96564c82a297d/.doc/US6/T05/US6-DTO%20%26%20API%20Spec.md
