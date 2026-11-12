# US8-T15 Design System Test ตาม Sequence Diagram

## User story
US8: จัดตารางเรียนจำลองตามแผนในเล่มหลักสูตร

**Conditions of Satisfaction** (ฉบับที่ทีมตัด Test case เรื่องวิชาที่เรียนผ่านแล้วออก)
1. นักศึกษามีวิชาที่จำเป็นต้องลงทะเบียน เมื่อระบบตรวจสอบต้องเพิ่มวิชานั้นลงตารางเรียนจำลอง
2. วิชาที่จำเป็นมีอยู่ในตารางเรียนจำลองแล้ว ระบบต้องไม่เพิ่มวิชานั้นซ้ำ
3. วิชาที่ต้องเพิ่มมีเวลาชนกับวิชาในตาราง ระบบต้องตรวจพบและแจ้งเตือนว่าเวลาเรียนชนกัน

หมายเหตุ: ระบบไม่ตรวจสอบวิชาที่เรียนผ่านแล้ว นักศึกษาลบวิชาออกจากตารางเองได้

## Objective
ออกแบบ System Test ของการจัดตารางตามแผนการเรียน ตั้งแต่หน้าเว็บ → API → ฐานข้อมูล ให้ครอบคลุมทุกเส้นทางใน Sequence Diagram ทั้ง 3 ไฟล์ของ US8-T06 ได้แก่
[ดูแผนการเรียน](../T06/US8-T06-Sequence-Diagram-StudyPlans.md),
[ดูสรุปก่อนยืนยัน (Preview)](../T06/US8-T06-Sequence-Diagram-Preview.md) และ
[ยืนยันจัดตาราง (Confirm)](../T06/US8-T06-Sequence-Diagram-Confirm.md)
และใช้ใน US8-T19 (รัน System Test)

## Scope
ทดสอบ `GET /api/study-plans` และ `POST /api/timetable/apply-plan` (`dryRun: true` และ `false`) ทั้งระบบที่รันจริงใน Docker และตรวจตารางด้วย `GET /api/timetable` ของ US1
ครอบคลุมทุกเส้นทางใน Sequence Diagram:

| Sequence Diagram | เส้นทาง | ผล | Test case |
| --- | --- | --- | --- |
| ดูแผนการเรียน | param ไม่ส่ง ไม่ใช่ตัวเลข หรือนอกช่วง | 400 ProblemDetail | ST-US8-04 |
| ดูแผนการเรียน | `plans` ว่าง | 200, "ยังไม่มีแผนการเรียนสำหรับชั้นปีนี้" | ST-US8-02 |
| ดูแผนการเรียน | ปี 1–2 (`planType` เป็น `null`) มีหลายหลักสูตร | 200, ไม่มีปุ่มแผนและวิชาโท | ST-US8-01 |
| ดูแผนการเรียน | ปี 3–4 (มี `planType`) | 200, ปุ่มแผนการศึกษาและวิชาโท | ST-US8-03 |
| Preview | ไม่ส่ง `planId` หรือ `academicYear` / ไม่พบ `planId` | 400 / 404 ไม่เขียน DB | ST-US8-15 |
| Preview | ส่ง `minorId` กับแผนปี 1–2 / ไม่พบ `minorId` / วิชาโทคนละหลักสูตร | 400 `MINOR_NOT_ALLOWED` / 404 / 400 `MINOR_PLAN_MISMATCH` | ST-US8-16 |
| Preview | ยังไม่มีตาราง ทุกวิชาลงได้ | 200, `timetable: null` ไม่เขียน DB | ST-US8-05 |
| Confirm | ยังไม่มีตารางของภาค สร้างตารางใหม่ | 200, บันทึก `added` ทั้งหมด | ST-US8-06, 11, 12 |
| Confirm | `added` ว่าง | 200, ไม่เขียน DB `updatedAt` ไม่เปลี่ยน | ST-US8-07 |
| Confirm | มีตารางเดิม วิชาซ้ำ / ชน / หน่วยกิตเกิน | 200, `skipped` พร้อม `reason` | ST-US8-07, 08, 10 |
| Confirm | คำนวณใหม่ ไม่ใช้ผล preview | ผลยืนยันต่างจาก preview เมื่อตารางถูกแก้ระหว่างนั้น | ST-US8-09 |
| Preview / Confirm | วิชาที่ไม่มี section เปิด | `NO_SECTION_AVAILABLE` | ST-US8-11 |
| Preview / Confirm | แผนปี 3–4 และวิชาโท (`source` PLAN/MINOR) | วิชาแผนหลักมาก่อน วิชาโทถูกข้ามเมื่อชน | ST-US8-13, 14 |

## Test Approach
- System Test ใช้ระบบจริงทั้งชุด ไม่ mock: หน้าเว็บ (Next.js) + backend (Spring Boot) + SQL Server รันด้วย `docker compose up -d --build` ตาม README โดยตั้ง `SPRING_PROFILES_ACTIVE=stub-tu` ใน `.env` เพื่อ login ด้วยบัญชี stub ไม่ต้องใช้ TU API จริง
- รายวิชาใช้ seed ภาคเรียน 1/2568 (`db/seed/V20261014_2010__seed_courses_2568_1.sql`) ซึ่งเป็นภาคที่ทีมตกลงใช้ และตรงกับ [UAT ของ US8-T16](../T16/US8-T16-uat-test-cases.md) ส่วนแผนการเรียนและวิชาโทใช้ "แผนทดสอบ" ที่ใส่ด้วยสคริปต์ SQL ในหัวข้อถัดไป เพราะตอนเขียนเอกสารยังไม่มี seed แผนจริง (US8-T09) และแผนทดสอบทำให้ผลที่คาดหวังแน่นอนทุกข้อ
- ผลที่คาดหวังของทุกข้อคำนวณตามขั้นตอนเลือก section ใน [DTO & API Spec](../T05/US8-DTO-API-Spec.md) ด้วยสคริปต์ก่อนเขียน (เวลาชน หน่วยกิต และ section ที่เลือก) และไม่มีข้อไหนที่ผลขึ้นกับการตัดสินเสมอ (tie-break)
- ผู้ใช้คือบัญชี stub `6609000001` (เกือบทุกข้อ) และ `6609000004` (ST-US8-14 ตรวจว่าตารางของนักศึกษาสองคนแยกกัน) รหัสผ่าน `Passw0rd!` ทั้งคู่เป็นนักศึกษาวิทยาการคอมพิวเตอร์ภาคปกติ จึง login ได้ และ `department` เป็น `ภาควิชาวิทยาการคอมพิวเตอร์`
- นักศึกษา**เลือกชั้นปีเอง**บนหน้าเว็บ (ระบบไม่คำนวณชั้นปี) "นักศึกษาชั้นปีต่าง ๆ" ในการ์ดจึงทดสอบด้วยการเลือกชั้นปีที่ 2, 3 และ 4
- ตรวจผล 3 ชั้นในทุก test case: หน้าเว็บ, API response (DevTools แท็บ Network หรือ Postman) และข้อมูลใน DB
- กรณีที่ทำผ่านหน้าเว็บไม่ได้ (ST-US8-04, 15, 16) ให้ยิง API ตรงด้วย Postman หรือ `curl` พร้อม token
- Test case แต่ละข้อเริ่มจากล้างตารางของนักศึกษาทดสอบ แล้วเตรียมตารางตาม Preconditions ของข้อนั้น ลำดับการรันจึงไม่มีผล
- ยังไม่ได้ดำเนินการทดสอบจริง เพราะหน้าเว็บและ API ของ US8 (US8-T07, T08, T09, T10) ยังไม่ได้พัฒนา ข้อความบนหน้าเว็บอาจปรับตาม Implementation จริง

## สภาพแวดล้อมและการเตรียมข้อมูล

| รายการ | ค่า |
| --- | --- |
| เปิดระบบ | `cp .env.example .env` ตั้ง `SPRING_PROFILES_ACTIVE=stub-tu` แล้ว `docker compose up -d --build` |
| หน้าเว็บ | http://localhost:3000 |
| API | http://localhost:8080 |
| ปีการศึกษา / ภาคเรียน | 2568 ภาคเรียน 1 (ST-US8-12 ใช้ภาคเรียน 2) |
| นักศึกษา | `6609000001` และ `6609000004` รหัสผ่าน `Passw0rd!` |
| `app.timetable.max-credits` | 22 (ค่าเริ่มต้น) |

**ขอ token สำหรับยิง API ตรง:**

```bash
curl -s -X POST http://localhost:8080/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"6609000001","password":"Passw0rd!"}'
```

ใช้ค่า `token` ที่ได้เป็น header `Authorization: Bearer <token>` ในทุก request ของ US8

**คำสั่ง sqlcmd** (ใช้ในหลายขั้นตอน ใส่ SQL ไว้ในไฟล์แล้ว copy เข้า container เพื่อไม่ต้อง escape เครื่องหมายคำพูด):

```bash
docker cp st-us8.sql sqlserver:/tmp/st-us8.sql
docker exec sqlserver bash -c '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -d appdb -i /tmp/st-us8.sql'
```

### 1. ใส่แผนทดสอบ (รันครั้งเดียวก่อนเริ่ม)

ทุกแผนและวิชาโทเป็นของ `ภาควิชาวิทยาการคอมพิวเตอร์` ชื่อหลักสูตรขึ้นต้นด้วย "หลักสูตรทดสอบ ST-" เพื่อแยกจากแผนจริงและลบทิ้งได้ทีหลัง สคริปต์ทดสอบแล้วกับตารางตาม ER Diagram ของ US8-T06 และ seed 1/2568 บน SQL Server 2025 (insert ผ่าน และรันซ้ำหลังล้างข้อมูลได้) ท้ายสคริปต์แสดง `plan_id` / `minor_id` ที่ได้ ให้จดไว้ใช้ในข้อ 15–16

```sql
DECLARE @dept NVARCHAR(100) = N'ภาควิชาวิทยาการคอมพิวเตอร์';
DECLARE @a NVARCHAR(200) = N'หลักสูตรทดสอบ ST-A';
DECLARE @b NVARCHAR(200) = N'หลักสูตรทดสอบ ST-B';
DECLARE @p TABLE (code NVARCHAR(20), plan_id BIGINT);
DECLARE @m TABLE (code NVARCHAR(20), minor_id BIGINT);

INSERT INTO study_plan (department, curriculum_name, study_year, semester, plan_type)
OUTPUT N'?', inserted.plan_id INTO @p VALUES (@dept, @a, 2, 1, NULL);
UPDATE @p SET code = N'A-Y2S1' WHERE code = N'?';
INSERT INTO study_plan (department, curriculum_name, study_year, semester, plan_type)
OUTPUT N'?', inserted.plan_id INTO @p VALUES (@dept, @b, 2, 1, NULL);
UPDATE @p SET code = N'B-Y2S1' WHERE code = N'?';
INSERT INTO study_plan (department, curriculum_name, study_year, semester, plan_type)
OUTPUT N'?', inserted.plan_id INTO @p VALUES (@dept, @a, 2, 2, NULL);
UPDATE @p SET code = N'A-Y2S2' WHERE code = N'?';
INSERT INTO study_plan (department, curriculum_name, study_year, semester, plan_type)
OUTPUT N'?', inserted.plan_id INTO @p VALUES (@dept, @a, 3, 1, 'CO_OP');
UPDATE @p SET code = N'A-Y3S1-COOP' WHERE code = N'?';
INSERT INTO study_plan (department, curriculum_name, study_year, semester, plan_type)
OUTPUT N'?', inserted.plan_id INTO @p VALUES (@dept, @a, 3, 1, 'SPECIAL_PROJECT');
UPDATE @p SET code = N'A-Y3S1-SP' WHERE code = N'?';

INSERT INTO study_plan_course (plan_id, course_code, sort_order)
SELECT p.plan_id, v.course_code, v.sort_order
FROM (VALUES
    (N'A-Y2S1', N'CS111', 1), (N'A-Y2S1', N'MA211', 2), (N'A-Y2S1', N'ST216', 3), (N'A-Y2S1', N'LAS101', 4),
    (N'B-Y2S1', N'CS111', 1), (N'B-Y2S1', N'CS223', 2),
    (N'A-Y2S2', N'CS111', 1), (N'A-Y2S2', N'CS223', 2),
    (N'A-Y3S1-COOP', N'CS111', 1), (N'A-Y3S1-COOP', N'TU106', 2),
    (N'A-Y3S1-SP', N'CS180', 1), (N'A-Y3S1-SP', N'ST216', 2), (N'A-Y3S1-SP', N'TU109', 3)
) AS v (code, course_code, sort_order)
JOIN @p p ON p.code = v.code;

INSERT INTO study_minor (department, curriculum_name, minor_name, sort_order)
OUTPUT N'?', inserted.minor_id INTO @m VALUES (@dept, @a, N'วิทยาการข้อมูล', 1);
UPDATE @m SET code = N'MN-A' WHERE code = N'?';
INSERT INTO study_minor (department, curriculum_name, minor_name, sort_order)
OUTPUT N'?', inserted.minor_id INTO @m VALUES (@dept, @a, N'ปัญญาประดิษฐ์', 2);
UPDATE @m SET code = N'MN-B' WHERE code = N'?';
INSERT INTO study_minor (department, curriculum_name, minor_name, sort_order)
OUTPUT N'?', inserted.minor_id INTO @m VALUES (@dept, @b, N'ความมั่นคงปลอดภัยไซเบอร์', 3);
UPDATE @m SET code = N'MN-C' WHERE code = N'?';

INSERT INTO study_minor_course (minor_id, course_code, study_year, semester, sort_order)
SELECT m.minor_id, v.course_code, v.study_year, v.semester, v.sort_order
FROM (VALUES
    (N'MN-A', N'JP171', 3, 1, 1), (N'MN-A', N'LAS101', 3, 1, 2),
    (N'MN-B', N'CS180', 4, 1, 1),
    (N'MN-C', N'TU106', 3, 1, 1)
) AS v (code, course_code, study_year, semester, sort_order)
JOIN @m m ON m.code = v.code;

SELECT code, plan_id FROM @p UNION ALL SELECT code, minor_id FROM @m;
```

สรุปแผนทดสอบ (เวลาตาม seed 1/2568 ทุกวิชา 3 หน่วยกิต):

| แผน | หลักสูตร | ชั้นปี / ภาค | แผนการศึกษา | วิชาในแผน (ตามลำดับ) | ใช้ใน |
| --- | --- | --- | --- | --- | --- |
| A-Y2S1 | ST-A | 2 / 1 | - | CS111, MA211, ST216, LAS101 (12 หน่วยกิต) | 01, 05–10, 15, 16 |
| B-Y2S1 | ST-B | 2 / 1 | - | CS111, CS223 | 01, 11 |
| A-Y2S2 | ST-A | 2 / 2 | - | CS111, CS223 | 12 |
| A-Y3S1-COOP | ST-A | 3 / 1 | สหกิจศึกษา | CS111, TU106 | 03, 14 |
| A-Y3S1-SP | ST-A | 3 / 1 | ทำหัวข้อพิเศษ | CS180, ST216, TU109 | 03, 13, 16 |

| วิชาโท | หลักสูตร | วิชา (ชั้นปี / ภาค) | ใช้ใน |
| --- | --- | --- | --- |
| MN-A วิทยาการข้อมูล | ST-A | JP171 (3/1), LAS101 (3/1) | 03, 13, 16 |
| MN-B ปัญญาประดิษฐ์ | ST-A | CS180 (4/1) | 03 (ต้องไม่แสดงในภาค 3/1) |
| MN-C ความมั่นคงปลอดภัยไซเบอร์ | ST-B | TU106 (3/1) | 03, 16 (คนละหลักสูตรกับแผน ST-A) |

| รหัสวิชา | Sec (1/2568) | วัน | เวลา |
| --- | --- | --- | --- |
| CS111 | 030001 / 030002 | อังคาร, พฤหัสบดี / จันทร์, ศุกร์ | 11:00–12:30 / 09:30–11:00 |
| MA211 | 020001 | อังคาร, พฤหัสบดี | 09:30–11:00 |
| ST216 | 040001 | อังคาร | 13:30–16:30 |
| LAS101 | 780004 | พุธ | 09:30–12:30 |
| TU109 | 780001 | พุธ | 09:30–12:30 (ชนกับ LAS101) |
| CS180 | 820001 | จันทร์ | 13:30–16:30 |
| TU101 | 900001 | พุธ | 13:30–16:30 |
| TU106 | 540001 | พฤหัสบดี | 13:30–16:30 |
| JP171 | 920001 | ศุกร์ | 13:30–16:30 |
| CS223 | 030001 **เฉพาะ 2/2568** | อังคาร | 13:30–16:30 |

ภาค 2/2568 มี CS111 030001 (จันทร์, พุธ 09:30–11:00) และ CS223 030001 (อังคาร 13:30–16:30) ไม่ชนกัน

### 2. ล้างตารางก่อนแต่ละข้อ

ลบ `timetable` ของนักศึกษาทดสอบ (`timetable_entry` ลบตามด้วย ON DELETE CASCADE) หรือกด "ลบทั้งหมด" (US2) บนหน้าเว็บ

```sql
DELETE FROM timetable WHERE student_id IN (N'6609000001', N'6609000004');
```

### 3. คำสั่งตรวจ DB (ใช้ในหลาย test case)

```sql
SELECT t.student_id, t.academic_year, t.semester, t.timetable_id, t.updated_at, s.course_code, s.section_no
FROM timetable t
LEFT JOIN timetable_entry e ON e.timetable_id = t.timetable_id
LEFT JOIN section s ON s.section_id = e.section_id
WHERE t.student_id IN (N'6609000001', N'6609000004')
ORDER BY t.student_id, t.academic_year, t.semester, e.entry_id;
```

### 4. ลบแผนทดสอบหลังจบ (US8-T19)

```sql
DELETE FROM timetable WHERE student_id IN (N'6609000001', N'6609000004');
DELETE FROM study_plan WHERE curriculum_name LIKE N'หลักสูตรทดสอบ ST-%';
DELETE FROM study_minor WHERE curriculum_name LIKE N'หลักสูตรทดสอบ ST-%';
```

`study_plan_course` และ `study_minor_course` ลบตามด้วย ON DELETE CASCADE ส่วนรายวิชาใน seed ไม่ถูกลบ

## Test Cases

### [ST-US8-01] ชั้นปีที่ 2 ภาค 1 มี 2 หลักสูตร แสดงแผนให้เลือก

**Related CoS:** Test Case 1

**เส้นทาง:** ดูแผนการเรียน → param ถูกต้อง → พบนักศึกษา → ปี 1–2 (`planType` เป็น `null`) → 200

**Preconditions:**
- ใส่แผนทดสอบแล้ว · login ด้วย `6609000001`

**Test Steps:**
1. เปิดหน้าจัดตารางตามแผน เลือกชั้นปีที่ 2 ภาคเรียนที่ 1
2. ตรวจหน้าเว็บ และ response ของ `GET /api/study-plans?studyYear=2&semester=1`

**Expected Result:**
- หน้าเว็บ: แสดง "แผนการเรียนชั้นปีที่ 2" มีให้เลือก 2 หลักสูตร "หลักสูตรทดสอบ ST-A" (CS111, MA211, ST216, LAS101) และ "หลักสูตรทดสอบ ST-B" (CS111, CS223) **ไม่มี**กลุ่มปุ่ม "เลือกแผนการศึกษา" และ "เลือกวิชาโท"
- API: `200 OK` ได้ `department: "ภาควิชาวิทยาการคอมพิวเตอร์"`, `studyYear: 2`, `semester: 1`, `plans` 2 รายการเรียง ST-A ก่อน ST-B ทั้งคู่ `planType: null`, ST-A มี `totalCredits: 12` และ `courses` เรียง CS111, MA211, ST216, LAS101, `minors: []`
- DB: ไม่มีแถวใหม่ใน `timetable` (การดูแผนไม่เขียน DB)

### [ST-US8-02] ชั้นปีหรือภาคที่ไม่มีแผน

**Related CoS:** -

**เส้นทาง:** ดูแผนการเรียน → param ถูกต้อง → `plans` ว่าง → 200

**Preconditions:**
- ใส่แผนทดสอบแล้ว · login ด้วย `6609000001`

**Test Steps:**
1. เลือกชั้นปีที่ 4 ภาคเรียนที่ 2
2. ตรวจหน้าเว็บ และ response ของ `GET /api/study-plans?studyYear=4&semester=2`

**Expected Result:**
- หน้าเว็บ: แสดง "ยังไม่มีแผนการเรียนสำหรับชั้นปีนี้" ไม่มีปุ่ม "ดูสรุป" ให้กด ไม่มีข้อความ error
- API: `200 OK` ได้ `plans: []` และ `minors: []` (ไม่ใช่ 404)

### [ST-US8-03] ชั้นปีที่ 3 เลือกแผนการศึกษาและวิชาโท

**Related CoS:** Test Case 1

**เส้นทาง:** ดูแผนการเรียน → ปี 3–4 (มี `planType`) → UI กรองแผนและวิชาโทเอง (ไม่เรียก API เพิ่ม)

**Preconditions:**
- ใส่แผนทดสอบแล้ว · login ด้วย `6609000001`

**Test Steps:**
1. เลือกชั้นปีที่ 3 ภาคเรียนที่ 1 ตรวจหน้าเว็บและ response ของ `GET /api/study-plans?studyYear=3&semester=1`
2. เลือกแผน "ทำหัวข้อพิเศษ" แล้วเลือกวิชาโท "วิทยาการข้อมูล"
3. เปลี่ยนเป็นแผน "สหกิจศึกษา"
4. เปลี่ยนชั้นปีเป็นชั้นปีที่ 2 แล้วกลับมาชั้นปีที่ 3

**Expected Result:**
- ข้อ 1 API: `200 OK` ได้ `plans` 2 รายการเรียง `SPECIAL_PROJECT` (CS180, ST216, TU109) ก่อน `CO_OP` (CS111, TU106) แม้ CO_OP จะถูก insert ก่อน · `minors` มี MN-A (`courses` JP171, LAS101, `totalCredits: 6`) และ MN-C (TU106) ไม่มี MN-B เพราะ MN-B ไม่มีวิชาในภาค 3/1
- ข้อ 1 หน้าเว็บ: มีกลุ่มปุ่ม "เลือกแผนการศึกษา" (ทำหัวข้อพิเศษ / สหกิจศึกษา) ยังไม่เลือกค่าใดและยังไม่แสดงรายวิชา กลุ่มปุ่ม "เลือกวิชาโท" มี "ไม่เรียนวิชาโท" (เลือกไว้เป็นค่าเริ่มต้น) และ "วิทยาการข้อมูล" เท่านั้น ไม่มี "ความมั่นคงปลอดภัยไซเบอร์" เพราะเป็นของหลักสูตร ST-B
- ข้อ 2: หัวรายการแสดง "วิชาแนะนำสำหรับ: ชั้นปีที่ 3 ภาคเรียนที่ 1 (แผนทำหัวข้อพิเศษ · วิชาโทวิทยาการข้อมูล)" รายวิชาเป็น CS180, ST216, TU109 และวิชาโท JP171, LAS101 พร้อมป้าย "วิชาโท"
- ข้อ 3: รายวิชาเปลี่ยนเป็น CS111, TU106 ไม่มีวิชาของแผนหัวข้อพิเศษปน
- ข้อ 4: ที่ชั้นปีที่ 2 ไม่มีปุ่มแผนและวิชาโท กลับมาชั้นปีที่ 3 แล้วแผนต้องเลือกใหม่ และวิชาโทกลับเป็น "ไม่เรียนวิชาโท"
- ทุกข้อไม่มีการเรียก `POST /api/timetable/apply-plan` และ DB ไม่เปลี่ยน

### [ST-US8-04] ส่ง studyYear หรือ semester ไม่ถูกต้อง

**Related CoS:** -

**เส้นทาง:** ดูแผนการเรียน → param ไม่ส่ง ไม่ใช่ตัวเลข หรืออยู่นอกช่วง → 400 (ไม่ถึง service)

**Preconditions:**
- มี token ของ `6609000001`

**Test Steps:**
1. ส่ง `GET` ผ่าน Postman หรือ `curl` ทีละค่า: `/api/study-plans?semester=1` (ไม่ส่ง `studyYear`), `?studyYear=abc&semester=1`, `?studyYear=0&semester=1`, `?studyYear=5&semester=1`, `?studyYear=2&semester=3`
2. ตรวจ API response

**Expected Result:**
- API: ทุกค่าได้ `400 Bad Request` เป็น ProblemDetail (ไม่ใช่ 500)

### [ST-US8-05] ดูสรุปก่อนยืนยัน ระบบไม่บันทึกลงตาราง

**Related CoS:** Test Case 1

**เส้นทาง:** Preview → พบแผน → ไม่ส่ง `minorId` → ยังไม่มีตาราง → `dryRun = true` ข้ามการบันทึก → 200

**Preconditions:**
- ล้างตารางของ `6609000001` แล้ว · เลือกชั้นปีที่ 2 ภาคเรียนที่ 1 หลักสูตร ST-A

**Test Steps:**
1. กด "ดูสรุป"
2. ตรวจหน้าเว็บ, response ของ `POST /api/timetable/apply-plan` และ DB
3. ออกจากหน้าสรุปโดยไม่ยืนยัน แล้วดูตารางเรียนภาค 1/2568

**Expected Result:**
- หน้าเว็บ: ระหว่างรอปุ่มกดไม่ได้ จากนั้นแสดงรายการวิชาที่จะเพิ่ม 4 วิชา CS111 Sec 030001, MA211 Sec 020001, ST216 Sec 040001, LAS101 Sec 780004 วิชาละ 3 หน่วยกิต ไม่มีวิชาที่ข้าม พร้อมปุ่ม "ยืนยันจัดตาราง" ไม่ได้วาดตาราง
- API: request body `{ "planId": <A-Y2S1>, "minorId": null, "academicYear": 2568, "dryRun": true }` ตอบ `200 OK` ได้ `dryRun: true`, `minorId: null`, `added` 4 รายการ (`source: "PLAN"` ทุกตัว, CS111 ได้ `sectionNo: "030001"` ซึ่งน้อยกว่า 030002), `skipped: []`, `timetable: null`
- DB: ไม่มีแถว `timetable` ของ `6609000001` ภาค 1/2568 (preview ไม่สร้างตาราง)
- ข้อ 3: ตารางว่าง หน่วยกิต 0 / 22 และ `GET /api/timetable?academicYear=2568&semester=1` ได้ `entries: []`, `updatedAt: null`

### [ST-US8-06] ยืนยันจัดตาราง ระบบสร้างตารางและเพิ่มวิชาที่จำเป็น

**Related CoS:** Test Case 1

**เส้นทาง:** Confirm → พบแผน → ยังไม่มีตาราง → `added` ไม่ว่าง → สร้าง `Timetable` + `touch()` + บันทึก entry → `getTimetable` → 200

**Preconditions:**
- ล้างตารางของ `6609000001` แล้ว · ทำ ST-US8-05 ขั้น 1 จนเห็นรายการสรุป

**Test Steps:**
1. กด "ยืนยันจัดตาราง"
2. ตรวจหน้าเว็บ, API response และ DB
3. รีเฟรชหน้าเว็บ

**Expected Result:**
- หน้าเว็บ: ระหว่างบันทึกปุ่มกดไม่ได้ จากนั้นตารางแสดง CS111 (อังคาร, พฤหัสบดี 11:00–12:30), MA211 (อังคาร, พฤหัสบดี 09:30–11:00), ST216 (อังคาร 13:30–16:30) และ LAS101 (พุธ 09:30–12:30) หน่วยกิต 12 / 22 ไม่มีแถบเตือนเวลาชน สรุปว่าเพิ่ม 4 วิชา ข้าม 0 วิชา
- API: `200 OK` ได้ `dryRun: false`, `added` 4 รายการเหมือนข้อ 05, `skipped: []` และ `timetable` เป็น `TimetableResponse` ที่มี `entries` 4 รายการ, `totalCredits: 12`, `conflicts: []`, `updatedAt` ไม่เป็น null (frontend ไม่ต้องเรียก `GET /api/timetable` ซ้ำ)
- DB: มีแถว `timetable` ใหม่ 1 แถวของ `6609000001` 2568/1 และ `timetable_entry` 4 แถว ตรงกับ section ใน `added`
- ข้อ 3: ตารางยังมี 4 วิชาเหมือนเดิม (บันทึกจริง)

### [ST-US8-07] ยืนยันแผนเดิมซ้ำ ระบบไม่เพิ่มวิชาซ้ำ

**Related CoS:** Test Case 2

**เส้นทาง:** Confirm → มีตารางเดิม → ทุกวิชาเป็น `COURSE_ALREADY_IN_TIMETABLE` → `added` ว่าง → ไม่เรียก `saveAdded` → 200

**Preconditions:**
- ผ่าน ST-US8-06 (มี 4 วิชาของ A-Y2S1 ในตาราง) · จดจำนวนแถว `timetable_entry` และ `updated_at` จาก DB ไว้ และเว้นอย่างน้อย 1 วินาที

**Test Steps:**
1. เลือกชั้นปีที่ 2 ภาคเรียนที่ 1 หลักสูตร ST-A กด "ดูสรุป" แล้วกด "ยืนยันจัดตาราง"
2. ตรวจหน้าเว็บ, API response และ DB

**Expected Result:**
- หน้าเว็บ: หน้าสรุปแสดงว่าไม่มีวิชาที่จะเพิ่ม และข้าม 4 วิชาพร้อมเหตุผล เช่น "CS111 อยู่ในตารางแล้ว (Sec 030001)" หลังยืนยันตารางยังมี 4 วิชาเดิม หน่วยกิต 12 / 22
- API: `200 OK` (ไม่ใช่ error) ได้ `added: []` และ `skipped` 4 รายการ `reason: "COURSE_ALREADY_IN_TIMETABLE"` พร้อม `existingSectionNo` (CS111 `030001`, MA211 `020001`, ST216 `040001`, LAS101 `780004`) · `timetable.entries` 4 รายการ
- DB: จำนวนแถว `timetable_entry` เท่าเดิม (4) และ `updated_at` **ไม่เปลี่ยน** (added ว่างไม่เขียน DB)

### [ST-US8-08] ตารางมีวิชาที่เวลาชนอยู่ก่อน ระบบข้ามวิชานั้นและแจ้งว่าชนกับวิชาไหน

**Related CoS:** Test Case 3

**เส้นทาง:** Confirm → มีตารางเดิม → ตัด section ที่ชนกับวิชาเดิม → วิชาที่ไม่เหลือ section เป็น `TIME_CONFLICT` → บันทึกวิชาที่เหลือ → 200

**Preconditions:**
- ล้างตารางของ `6609000001` แล้ว · เพิ่ม TU109 Sec 780001 (พุธ 09:30–12:30) ผ่าน "+ เพิ่มวิชา" ของ US1 · จด `timetable_id` ไว้

**Test Steps:**
1. เลือกชั้นปีที่ 2 ภาคเรียนที่ 1 หลักสูตร ST-A กด "ดูสรุป"
2. กด "ยืนยันจัดตาราง"
3. ตรวจหน้าเว็บ, API response และ DB

**Expected Result:**
- หน้าเว็บ: หน้าสรุปแสดงว่าจะเพิ่ม CS111, MA211, ST216 และข้าม LAS101 พร้อมข้อความว่าเวลาชนกับ TU109 หลังยืนยันตารางมี TU109 (เดิม) และ 3 วิชาที่เพิ่ม หน่วยกิต 12 / 22 ไม่มีแถบเตือนเวลาชน เพราะ LAS101 ไม่ถูกเพิ่ม
- API: `200 OK` ได้ `added` 3 รายการ (CS111 030001, MA211 020001, ST216 040001) และ `skipped` 1 รายการ: LAS101 `reason: "TIME_CONFLICT"`, `conflictWith: ["TU109"]`, `source: "PLAN"` · `timetable.entries` 4 รายการ, `totalCredits: 12`, `conflicts: []`
- DB: `timetable_id` เดิม (ไม่สร้างตารางใหม่) มี `timetable_entry` 4 แถว TU109 ยังอยู่และ section เดิม ไม่มีแถวของ LAS101

**หมายเหตุ:** US8 ข้ามวิชาที่เวลาชนแทนการเพิ่มแล้วเตือนแบบ US1 ตาม US8-T05 "แจ้งเตือนว่าเวลาเรียนชนกัน" ใน CoS ข้อ 3 จึงตรวจจากข้อความของวิชาที่ข้าม

### [ST-US8-09] ตารางถูกแก้ระหว่างดูสรุปกับยืนยัน ระบบคำนวณใหม่

**Related CoS:** Test Case 3

**เส้นทาง:** Preview (ตารางว่าง) → ตารางถูกแก้ในแท็บอื่น → Confirm คำนวณใหม่ทั้งหมด ไม่ใช้ผล preview

**Preconditions:**
- ล้างตารางของ `6609000001` แล้ว · เปิดหน้าเว็บ 2 แท็บ login บัญชีเดียวกัน

**Test Steps:**
1. แท็บที่ 1: เลือกชั้นปีที่ 2 ภาคเรียนที่ 1 หลักสูตร ST-A กด "ดูสรุป" (เห็น 4 วิชาที่จะเพิ่ม)
2. แท็บที่ 2: เพิ่ม TU109 Sec 780001 ผ่าน "+ เพิ่มวิชา" ของ US1
3. แท็บที่ 1: กด "ยืนยันจัดตาราง" โดยไม่กด "ดูสรุป" ใหม่
4. ตรวจหน้าเว็บแท็บที่ 1, API response และ DB

**Expected Result:**
- ข้อ 1: preview มี `added` 4 รายการ `skipped: []`
- ข้อ 3 หน้าเว็บ: สรุปหลังยืนยันแสดงตาม response ของการยืนยัน คือเพิ่ม 3 วิชา และข้าม LAS101 (ชนกับ TU109) **ไม่ใช่** 4 วิชาตาม preview ตารางแสดง TU109 + CS111, MA211, ST216
- API: response ของการยืนยันเหมือน ST-US8-08 (`added` 3, `skipped` LAS101 `TIME_CONFLICT` `conflictWith: ["TU109"]`)
- DB: มี `timetable_entry` 4 แถว ไม่มี LAS101 และไม่มีวิชาที่เวลาชนกัน

### [ST-US8-10] หน่วยกิตรวมจะเกิน 22 ระบบเพิ่มวิชาเอกก่อนและข้ามวิชาที่เหลือ

**Related CoS:** Test Case 1

**เส้นทาง:** Confirm → มีตารางเดิม → ค้นหาไม่ให้หน่วยกิตเกิน `maxCredits` → วิชาที่ไม่ชนแต่เกินหน่วยกิตเป็น `CREDIT_LIMIT_EXCEEDED` → 200

**Preconditions:**
- ล้างตารางของ `6609000001` แล้ว · เพิ่มผ่าน US1: CS180 Sec 820001, TU101 Sec 900001, TU106 Sec 540001, JP171 Sec 920001 (รวม 12 หน่วยกิต ไม่ชนกับวิชาในแผน A-Y2S1)

**Test Steps:**
1. เลือกชั้นปีที่ 2 ภาคเรียนที่ 1 หลักสูตร ST-A กด "ดูสรุป" แล้วกด "ยืนยันจัดตาราง"
2. ตรวจหน้าเว็บ, API response และ DB

**Expected Result:**
- หน้าเว็บ: เพิ่ม CS111, MA211, ST216 ข้าม LAS101 พร้อมข้อความว่าหน่วยกิตเกิน ตารางมี 7 วิชา หน่วยกิต 21 / 22
- API: `200 OK` ได้ `added` 3 รายการ (วิชา MAJOR ทั้งหมดของแผน) และ `skipped` 1 รายการ: LAS101 `reason: "CREDIT_LIMIT_EXCEEDED"`, `currentCredits: 21`, `maxCredits: 22` · `timetable.totalCredits: 21`
- DB: `timetable_entry` 7 แถว 4 วิชาเดิมยังอยู่ครบ

**หมายเหตุ:** ถ้าเพิ่มทั้ง 4 วิชาจะได้ 24 หน่วยกิต ระบบเลือกเก็บวิชา MAJOR ตามเกณฑ์ข้อ 1 ของ Spec วิชาที่ถูกข้ามจึงต้องเป็น LAS101 (GENERAL_EDUCATION) เท่านั้น

### [ST-US8-11] แผนที่มีวิชาไม่เปิดสอนในภาค

**Related CoS:** Test Case 1

**เส้นทาง:** Confirm → ยังไม่มีตาราง → วิชาที่ภาคนี้ไม่มี section เป็น `NO_SECTION_AVAILABLE` → บันทึกวิชาที่เหลือ → 200

**Preconditions:**
- ล้างตารางของ `6609000001` แล้ว

**Test Steps:**
1. เลือกชั้นปีที่ 2 ภาคเรียนที่ 1 หลักสูตร **ST-B** กด "ดูสรุป" แล้วกด "ยืนยันจัดตาราง"
2. ตรวจหน้าเว็บ, API response และ DB

**Expected Result:**
- หน้าเว็บ: เพิ่ม CS111 Sec 030001 ข้าม CS223 พร้อมข้อความว่าภาคนี้ไม่มีกลุ่มเรียนเปิด ตารางมี 1 วิชา หน่วยกิต 3 / 22
- API: `200 OK` ได้ `added` 1 รายการ (CS111 030001) และ `skipped` 1 รายการ: CS223 `reason: "NO_SECTION_AVAILABLE"`
- DB: มีตารางใหม่ของ 2568/1 และ `timetable_entry` 1 แถว (CS111)

### [ST-US8-12] จัดตารางภาคเรียนที่ 2 ตารางของภาคเรียนที่ 1 ไม่ปน

**Related CoS:** Test Case 1

**เส้นทาง:** Confirm → อ่านภาคเรียนจาก `plan.semester` → ยังไม่มีตารางของ 2568/2 → สร้างตารางใหม่ → 200

**Preconditions:**
- ผ่าน ST-US8-06 (ตาราง 2568/1 มี 4 วิชา) · จดแถวของ 2568/1 จาก DB ไว้

**Test Steps:**
1. เลือกชั้นปีที่ 2 **ภาคเรียนที่ 2** ปีการศึกษา 2568 หลักสูตร ST-A กด "ดูสรุป" แล้วกด "ยืนยันจัดตาราง"
2. ตรวจหน้าเว็บ, API response และ DB
3. เปลี่ยนกลับไปดูตารางภาคเรียนที่ 1

**Expected Result:**
- หน้าเว็บ: ตารางภาคเรียนที่ 2 มี CS111 Sec 030001 (จันทร์, พุธ 09:30–11:00) และ CS223 Sec 030001 (อังคาร 13:30–16:30) หน่วยกิต 6 / 22
- API: request ไม่มี field ภาคเรียน (อ่านจากแผน) ตอบ `200 OK` ได้ `added` 2 รายการ `skipped: []` และ `timetable` ของ 2568/2
- DB: มีตาราง 2568/2 ใหม่ 1 แถว `timetable_entry` 2 แถว ตาราง 2568/1 ยังมี 4 วิชาและ `updated_at` เท่าเดิม
- ข้อ 3: ตารางภาคเรียนที่ 1 ยังแสดง 4 วิชาของ ST-US8-06 เหมือนเดิม CS111 ไม่ถูกนับว่าซ้ำข้ามภาค

### [ST-US8-13] ชั้นปีที่ 3 แผนหัวข้อพิเศษพร้อมวิชาโท วิชาโทที่ชนถูกข้าม

**Related CoS:** Test Case 1, Test Case 3

**เส้นทาง:** Confirm → พบแผน → ส่ง `minorId` → วิชาโทถูกต้อง → รวมวิชา PLAN + MINOR → วิชาแผนหลักมาก่อน → บันทึก → 200

**Preconditions:**
- ล้างตารางของ `6609000001` แล้ว

**Test Steps:**
1. เลือกชั้นปีที่ 3 ภาคเรียนที่ 1 แผน "ทำหัวข้อพิเศษ" วิชาโท "วิทยาการข้อมูล" กด "ดูสรุป"
2. กด "ยืนยันจัดตาราง"
3. ตรวจหน้าเว็บ, API response และ DB

**Expected Result:**
- หน้าเว็บ: หน้าสรุปแสดงจะเพิ่ม CS180, ST216, TU109 และ JP171 (มีป้าย "วิชาโท") และข้าม LAS101 (ป้าย "วิชาโท") พร้อมข้อความว่าเวลาชนกับ TU109 หลังยืนยันตารางมี 4 วิชา หน่วยกิต 12 / 22 ในตารางไม่มีป้าย "วิชาโท"
- API: request มี `minorId` ของ MN-A ตอบ `200 OK` ได้ `minorId` ตรงกับที่ส่ง, `added` CS180 820001, ST216 040001, TU109 780001 (`source: "PLAN"`) และ JP171 920001 (`source: "MINOR"`), `skipped` 1 รายการ: LAS101 `source: "MINOR"`, `reason: "TIME_CONFLICT"`, `conflictWith: ["TU109"]`
- DB: `timetable_entry` 4 แถว ไม่มีคอลัมน์บอกว่ามาจากวิชาโท (เป็น entry ปกติ ลบได้ผ่าน US2)

**หมายเหตุ:** TU109 (แผนหลัก) กับ LAS101 (วิชาโท) เวลาเดียวกัน ระบบต้องเก็บวิชาของแผนหลักเสมอตามเกณฑ์ข้อ 2 ของ Spec

### [ST-US8-14] ชั้นปีที่ 3 แผนสหกิจศึกษา นักศึกษาอีกคน ตารางแยกกัน

**Related CoS:** Test Case 1

**เส้นทาง:** Confirm → พบแผน → ไม่ส่ง `minorId` → ยังไม่มีตารางของนักศึกษาคนนี้ → สร้างตารางใหม่ → 200

**Preconditions:**
- ผ่าน ST-US8-06 ด้วย `6609000001` (มี 4 วิชาใน 2568/1) · ล้างตารางของ `6609000004` แล้ว · logout แล้ว login ด้วย `6609000004`

**Test Steps:**
1. เลือกชั้นปีที่ 3 ภาคเรียนที่ 1 แผน "สหกิจศึกษา" ไม่เลือกวิชาโท กด "ดูสรุป" แล้วกด "ยืนยันจัดตาราง"
2. ตรวจหน้าเว็บ, API response และ DB ของนักศึกษาทั้งสองคน

**Expected Result:**
- หน้าเว็บ: ตารางของ `6609000004` มี CS111 Sec 030001 และ TU106 Sec 540001 หน่วยกิต 6 / 22 ไม่มีวิชาของ `6609000001` ปน และ CS111 ไม่ถูกข้ามว่าซ้ำ (คนละนักศึกษา)
- API: `200 OK` ได้ `minorId: null`, `added` 2 รายการ `source: "PLAN"`, `skipped: []` ไม่มี CS180, ST216, TU109 ของแผนหัวข้อพิเศษ
- DB: `6609000004` มีตาราง 2568/1 ใหม่และ `timetable_entry` 2 แถว ตารางของ `6609000001` ยังมี 4 แถวเท่าเดิม

### [ST-US8-15] ส่ง request จัดตารางไม่ครบหรือแผนไม่มีอยู่

**Related CoS:** -

**เส้นทาง:** Preview / Confirm → ไม่ส่ง `planId` หรือ `academicYear` → 400 (ไม่ถึง service) · ไม่พบ `planId` → 404

**Preconditions:**
- ผ่าน ST-US8-06 · มี token ของ `6609000001` · จดจำนวนแถว `timetable_entry` และ `updated_at` ไว้

**Test Steps:**
1. ส่ง `POST /api/timetable/apply-plan` ผ่าน Postman ทีละ body: `{ "academicYear": 2568, "dryRun": false }` (ไม่มี `planId`), `{ "planId": <A-Y2S1>, "dryRun": false }` (ไม่มี `academicYear`), `{ "planId": 999999, "academicYear": 2568, "dryRun": false }`
2. ตรวจ API response และ DB หลังทุกครั้ง

**Expected Result:**
- API: สองครั้งแรกได้ `400 Bad Request` เป็น ProblemDetail ที่ระบุ field ที่ขาด ครั้งที่ 3 ได้ `404 Not Found` เป็น ProblemDetail
- DB: จำนวนแถว `timetable_entry` และ `updated_at` เท่าเดิมทุกครั้ง
- หน้าเว็บ (ถ้าจำลองได้ เช่นลบแผนออกจาก DB ระหว่างดูหน้าสรุป): แจ้งว่าไม่พบแผนการเรียน และปุ่มกลับมากดได้

### [ST-US8-16] วิชาโทใช้ไม่ได้กับแผนที่เลือก

**Related CoS:** -

**เส้นทาง:** Preview / Confirm → พบแผน → ส่ง `minorId` กับแผนปี 1–2 → 400 `MINOR_NOT_ALLOWED` · ไม่พบ `minorId` → 404 · วิชาโทคนละหลักสูตร → 400 `MINOR_PLAN_MISMATCH`

**Preconditions:**
- ล้างตารางของ `6609000001` แล้ว · มี token ของ `6609000001`

**Test Steps:**
1. ส่ง `POST /api/timetable/apply-plan` ผ่าน Postman ทีละ body (ทุกครั้ง `"academicYear": 2568, "dryRun": false`):
   - `planId` = A-Y2S1, `minorId` = MN-A (แผนชั้นปีที่ 2)
   - `planId` = A-Y3S1-SP, `minorId` = 999999
   - `planId` = A-Y3S1-SP, `minorId` = MN-C (หลักสูตร ST-B)
2. ตรวจ API response และ DB หลังทุกครั้ง

**Expected Result:**
- API: ครั้งที่ 1 ได้ `400` ProblemDetail ที่มี `code: "MINOR_NOT_ALLOWED"` · ครั้งที่ 2 ได้ `404` · ครั้งที่ 3 ได้ `400` ProblemDetail ที่มี `code: "MINOR_PLAN_MISMATCH"`
- DB: ไม่มีแถว `timetable` ของ `6609000001` ภาค 1/2568 ทุกครั้ง (error เกิดก่อนบันทึก ไม่มีวิชาไหนถูกเพิ่มค้าง)

## สรุปความครอบคลุม

| Test Case | เรื่องที่ทดสอบ | CoS |
| --- | --- | --- |
| ST-US8-01 | ดูแผนชั้นปีที่ 2 มี 2 หลักสูตร | 1 |
| ST-US8-02 | ไม่มีแผน → `plans: []` | - |
| ST-US8-03 | ชั้นปีที่ 3 ปุ่มแผนการศึกษาและวิชาโท | 1 |
| ST-US8-04 | param ของการดูแผนผิด → 400 | - |
| ST-US8-05 | ดูสรุปไม่บันทึก | 1 |
| ST-US8-06 | ยืนยัน สร้างตารางและเพิ่มวิชาที่จำเป็น | 1 |
| ST-US8-07 | ยืนยันซ้ำ ไม่เพิ่มวิชาซ้ำ ไม่เขียน DB | 2 |
| ST-US8-08 | วิชาเวลาชนกับตารางเดิมถูกข้ามและแจ้งว่าชนกับวิชาไหน | 3 |
| ST-US8-09 | ยืนยันคำนวณใหม่เมื่อตารางถูกแก้หลังดูสรุป | 3 |
| ST-US8-10 | หน่วยกิตเกิน 22 เก็บวิชาเอกก่อน | 1 |
| ST-US8-11 | วิชาไม่เปิดสอนในภาค | 1 |
| ST-US8-12 | ภาคเรียนที่ 2 ตารางแยกจากภาค 1 | 1 |
| ST-US8-13 | ชั้นปีที่ 3 หัวข้อพิเศษ + วิชาโท วิชาโทที่ชนถูกข้าม | 1, 3 |
| ST-US8-14 | ชั้นปีที่ 3 สหกิจศึกษา นักศึกษาอีกคน ตารางแยกกัน | 1 |
| ST-US8-15 | request จัดตารางไม่ครบ / ไม่พบแผน → 400 / 404 | - |
| ST-US8-16 | วิชาโทใช้ไม่ได้ → `MINOR_NOT_ALLOWED` / 404 / `MINOR_PLAN_MISMATCH` | - |

**ข้อจำกัด:**
- seed 1/2568 มีวิชาที่เวลาชนกันแค่คู่ TU109/LAS101 และทุกวิชามี section เดียว ยกเว้น CS111 จึงไม่ได้ทดสอบกรณีที่ต้องเลือก section อื่นเพราะ section แรกชน และกรณีที่ greedy พลาด สองกรณีนี้ทดสอบด้วยข้อมูลที่สร้างเองใน US8-T14 (เช่น IT-API-DAO-US8-13 กรณีที่ greedy พลาด) และ unit test ของ `PlanScheduler` (US8-T08)
- ถ้า US8-T09 seed แผนการเรียนจริงของ `ภาควิชาวิทยาการคอมพิวเตอร์` แล้ว `plans` และ `minors` ใน ST-US8-01, 02, 03 จะมีแผนจริงปนด้วย ให้ตรวจเฉพาะแผนที่ชื่อหลักสูตรขึ้นต้นด้วย "หลักสูตรทดสอบ ST-" และในข้อ 02 ให้เลือกชั้นปี/ภาคที่ seed จริงไม่มีแผน

## แบบบันทึกผล (ใช้ใน US8-T19)

| Test Case | ผู้ทดสอบ | วันที่ | ผล (Pass/Fail) | หมายเหตุ / Bug ที่พบ |
| --- | --- | --- | --- | --- |
| ST-US8-01 | | | | |
| ST-US8-02 | | | | |
| ST-US8-03 | | | | |
| ST-US8-04 | | | | |
| ST-US8-05 | | | | |
| ST-US8-06 | | | | |
| ST-US8-07 | | | | |
| ST-US8-08 | | | | |
| ST-US8-09 | | | | |
| ST-US8-10 | | | | |
| ST-US8-11 | | | | |
| ST-US8-12 | | | | |
| ST-US8-13 | | | | |
| ST-US8-14 | | | | |
| ST-US8-15 | | | | |
| ST-US8-16 | | | | |

## เอกสารที่เกี่ยวข้อง
- [US8-T06 Sequence Diagram ดูแผนการเรียน](../T06/US8-T06-Sequence-Diagram-StudyPlans.md)
- [US8-T06 Sequence Diagram ดูสรุป (Preview)](../T06/US8-T06-Sequence-Diagram-Preview.md)
- [US8-T06 Sequence Diagram ยืนยันจัดตาราง (Confirm)](../T06/US8-T06-Sequence-Diagram-Confirm.md)
- [US8-T06 ER Diagram](../T06/US8-T06-ER-Diagram.md)
- [US8-T05 DTO & API Spec](../T05/US8-DTO-API-Spec.md)
- [US8-T14 Integration Test ระหว่าง API กับ DAO](../T14/US8-T14-design-it-api-dao.md)
- [US8-T16 User Acceptance Test](../T16/US8-T16-uat-test-cases.md)
- [US1-T15 Design System Test](../../US1/T15/US1-T15-System-Test.md)
