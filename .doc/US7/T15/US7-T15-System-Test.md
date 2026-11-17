# US7-T15 Design System Test ตาม Sequence Diagram

## User story
US7: ค้นหาช่องทางการขอโควตาในแต่ละรายวิชา

## Objective
ออกแบบ System Test ของหน้า "ค้นหาช่องทางขอโควตา" ตั้งแต่หน้าเว็บ → API → ฐานข้อมูล ให้ครอบคลุมทุกเส้นทางใน Sequence Diagram ทั้ง 2 ไฟล์ของ US7-T06 (PR #98 ฉบับ `d51c265`) ได้แก่ ค้นหาช่องทางขอโควตา และดึงช่องทางขอโควตาของวิชาที่เลือก และใช้ใน US7-T19 (รัน System Test)

ฉบับร่าง เขียนจาก US7-T06 ที่ยังรอรีวิว ถ้าแผนภาพเปลี่ยนต้องแก้เคสตาม ส่วน Spec ใช้ [US7-T05 DTO & API Spec](../T05/US7-DTO-API-Spec.md) ที่ merge แล้ว

## Scope
ทดสอบ `GET /api/quota/courses`, `GET /api/quota/courses/{courseCode}` และ `GET /api/timetable` ของ US1 (ใช้แสดงวิชาในแผนข้าง checkbox) ทั้งระบบที่รันจริงใน Docker
ครอบคลุมทุกเส้นทางใน Sequence Diagram:

| Sequence Diagram | เส้นทาง | ผล | Test case |
| --- | --- | --- | --- |
| ค้นหา | param ไม่ครบ / ชนิดผิด / `semester` นอก 1–2 / `q` ยาวเกิน 50 | 400 ก่อนเข้า method | ST-US7-15 |
| ค้นหา | `q` ว่างและ `mine` ไม่ใช่ `true` | 400 `QUOTA_SEARCH_QUERY_REQUIRED` | ST-US7-15 |
| ค้นหา | `mine=true` แต่ตารางว่าง | 200 `courses: []` ไม่ query วิชา | ST-US7-02 |
| ค้นหา | ไม่พบวิชา | 200 `total: 0` | ST-US7-14 |
| ค้นหา | พบวิชา ตัดสินสถานะ NOT_OFFERED → NO_DATA → NOT_REQUIRED → REQUIRED | 200 การ์ดตามสถานะ | ST-US7-03, 05 ถึง 13 |
| ค้นหา | มีตาราง (`mine` และ `inMyTimetable`) | 200 ป้าย "ในแผนการเรียน" | ST-US7-01, 09 |
| วิชาเดียว | ไม่พบใน `course` | 404 | ST-US7-14 |
| วิชาเดียว | พบวิชา ทั้ง 4 สถานะ (รวม NO_DATA ที่ตอบ 200) | 200 | ST-US7-04, 12 |
| ทั้งสอง | ไม่มี token | 401 | ST-US7-16 |

## Test Approach
- System Test ใช้ระบบจริงทั้งชุด ไม่ mock: หน้าเว็บ (Next.js) + backend (Spring Boot) + SQL Server รันด้วย `docker compose up -d --build` ตาม README ตั้ง `SPRING_PROFILES_ACTIVE=stub-tu` ใน `.env`
- **ข้อมูลทั้งหมดเป็นข้อมูลจริงจาก [sheet ข้อมูลของทีม](https://docs.google.com/spreadsheets/d/1OGlBEta-Qrl1A0p4MWngh4PlCRBNDEyHinQqgSsRZ6k/edit?usp=sharing)** ข้อมูลโควตาจากชีต "โควตา 22569" ส่วนภาคที่เปิดสอนและ Sec จากชีต "วิชาสำหรับค้นหาวิชาเรียน ปี69" มีข้อยกเว้นเดียวคือ CS232 สถานะ `NOT_REQUIRED` ที่มาจากข้อเสนอ seed ใน US7-T05 เพราะชีตไม่มีวิชาที่ระบุว่าไม่ต้องขอโควตา
- ทดสอบที่**ภาคเรียนที่ 2** เป็นหลัก เพราะรอบยื่นคำร้องในชีตโควตาเป็นของภาค 2 และ EL395, AN347, PC280, CS232 เปิดเฉพาะเทอม 2 ส่วนภาคเรียนที่ 1 ใช้ทดสอบสถานะ "ไม่เปิดสอนในภาคนี้" และ "ยังไม่ประกาศรอบ"
- ผลค้นหาที่คาดหวังคำนวณจากรายวิชาในชีตด้วยสคริปต์ตามกติกาจับคู่ `q` ใน Spec (รหัสขึ้นต้น / คำในชื่ออังกฤษขึ้นต้น / ชื่อไทยมีคำนั้น)
- ผู้ใช้คือบัญชี stub `6609000001` (มีวิชาในตาราง) และ `6609000004` (ตารางว่าง) รหัสผ่าน `Passw0rd!`
- ตรวจผล 3 ชั้นในทุก test case: หน้าเว็บ, API response (DevTools แท็บ Network หรือ Postman) และข้อมูลใน DB
- US7 อ่านอย่างเดียว ทุกเคสต้องตรวจว่าจำนวนแถวในตารางโควตาและตาราง `timetable_entry` ไม่เปลี่ยนหลังเรียก API
- กรณีที่ทำผ่านหน้าเว็บไม่ได้ (ST-US7-15, 16) ให้ยิง API ตรงด้วย Postman หรือ `curl` หรือใช้ DevTools จำลอง
- ยังไม่ได้ดำเนินการทดสอบจริง เพราะ US7-T07 ถึง T10 ยังไม่ได้พัฒนา ข้อความบนหน้าเว็บอาจปรับตาม Implementation จริง

## สภาพแวดล้อมและการเตรียมข้อมูล

| รายการ | ค่า |
| --- | --- |
| เปิดระบบ | `cp .env.example .env` ตั้ง `SPRING_PROFILES_ACTIVE=stub-tu` แล้ว `docker compose up -d --build` |
| หน้าเว็บ / API | http://localhost:3000 / http://localhost:8080 |
| ปีการศึกษา / ภาคเรียน | 2568 ภาคเรียน 2 (ST-US7-10, 11 ใช้ภาคเรียน 1) |
| นักศึกษา | `6609000001` และ `6609000004` รหัสผ่าน `Passw0rd!` |

**ขอ token สำหรับยิง API ตรง:**

```bash
curl -s -X POST http://localhost:8080/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"6609000001","password":"Passw0rd!"}'
```

**คำสั่ง sqlcmd** (เขียน SQL ลงไฟล์แล้ว copy เข้า container):

```bash
docker cp st-us7.sql sqlserver:/tmp/st-us7.sql
docker exec sqlserver bash -c '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -d appdb -i /tmp/st-us7.sql'
```

### 1. ตรวจ seed ก่อนเริ่ม (รันครั้งเดียว)

ต้องมีวิชาครบตามหัวข้อ 2 ถ้าไม่ครบให้แจ้งเจ้าของ US7-T09 ก่อน ไม่เริ่มทดสอบ

```sql
SELECT c.course_code, q.quota_required,
       (SELECT COUNT(*) FROM quota_round r WHERE r.course_code = c.course_code AND r.academic_year = 2568 AND r.semester = 2) AS rounds_2568_2,
       (SELECT COUNT(*) FROM quota_channel h WHERE h.course_code = c.course_code) AS channels,
       (SELECT STRING_AGG(CAST(s.semester AS VARCHAR), ',') FROM (SELECT DISTINCT semester FROM section WHERE course_code = c.course_code AND academic_year = 2568) s) AS terms
FROM course c LEFT JOIN course_quota_info q ON q.course_code = c.course_code
WHERE c.course_code IN ('EL395','EL295','EL105','MA211','LAS101','AN347','PC280','CS232','FR205','TU101')
ORDER BY c.course_code;

SELECT COUNT(*) AS dm201 FROM course WHERE course_code = 'DM201';  -- ต้องได้ 0
```

### 2. ข้อมูลทดสอบ

**ข้อมูลโควตา** (ชีต "โควตา 22569" ภาคเรียนที่เปิดจากชีตรายวิชา วันที่แสดงตามที่หน้าเว็บต้องแปลงเป็น พ.ศ.)

| รหัสวิชา | ภาคที่เปิด | สถานะใน 2568/2 | เงื่อนไข | รอบยื่นคำร้อง | ช่องทางขอโควตา | ช่องทางติดต่อ |
| --- | --- | --- | --- | --- | --- | --- |
| EL395 | 2 | `REQUIRED` | สอบได้ EL295 (`relatedCourseCode: "EL295"`) | รอบที่ 1: 5–9 ตุลาคม 2569 · รอบที่ 2: 1–4 ธันวาคม 2569 | `QUOTA_SYSTEM` https://quota-litu.web.app/ | สถาบันภาษา · https://www.facebook.com/litu.thammasat |
| EL295 | 1, 2 | `REQUIRED` | ไม่มี | เหมือน EL395 | `QUOTA_SYSTEM` https://quota-litu.web.app/ | สถาบันภาษา |
| EL105 | 1, 2 | `REQUIRED` | ไม่มี | เหมือน EL395 | `QUOTA_SYSTEM` https://quota-litu.web.app/ | สถาบันภาษา |
| MA211 | 1, 2 | `REQUIRED` | ไม่มี | กำหนดการ: ภายใน 20 ตุลาคม 2569 เวลา 15:00 น. | `ONLINE_FORM` https://forms.gle/NWTyPnsVWtyDak3W8 | สาขาวิชาคณิตศาสตร์และสถิติ · https://www.facebook.com/mathstat.thammasat |
| LAS101 | 1, 2 | `REQUIRED` | ไม่มี | รอบที่ 1: 5–8 ตุลาคม 2569 · รอบที่ 2: 22–23 ตุลาคม 2569 | `QUOTA_SYSTEM` https://quota.arts.tu.ac.th/ | คณะศิลปศาสตร์ · https://www.facebook.com/Academic.LartsTU |
| AN347 | 2 | `REQUIRED` | ไม่มี | 4 รอบตามรหัสนักศึกษา: รหัส 65-66 6 ต.ค. · รหัส 67 7 ต.ค. · รหัส 68 8 ต.ค. · รหัส 69 9 ต.ค. 2569 ทุกรอบเวลา 09:00–16:00 | `QUOTA_SYSTEM` https://quota.socanth.tu.ac.th/ | คณะสังคมวิทยาและมานุษยวิทยา · https://www.facebook.com/socantoff |
| PC280 | 2 | `REQUIRED` | ไม่มี | กำหนดการ: 9 ตุลาคม 2569 | `ONLINE_FORM` https://forms.office.com/r/H9wBTqppu2 | สาขาวิชาฟิสิกส์ · MS Teams wchumpon@tu.ac.th (ไม่มีลิงก์ `url: null`) |
| CS232 | 2 | `NOT_REQUIRED` (ข้อเสนอ seed ใน T05) | | | | |
| FR205 | 1 | `NOT_OFFERED` | | | | |
| TU101 | 1, 2 | `NO_DATA` (มีใน `course` ไม่มีในชีตโควตา) | | | | |
| DM201 | ไม่มีในระบบ | ค้นหาไม่พบ / 404 | | | | |

**ตารางเรียน 2568/2 ของ `6609000001`** (เพิ่มผ่าน "+ เพิ่มวิชา" ของ US1 ก่อนเริ่ม ไม่มีเวลาชน): MA211 Sec 020001 (อังคาร, พฤหัสบดี 09:30–11:00) และ LAS101 Sec 780001 (พุธ 09:30–12:30)

**`6609000004`** ไม่มีตารางในภาค 2568/2

### 3. คำสั่งตรวจ DB ว่า US7 ไม่เขียนข้อมูล

รันก่อนและหลังแต่ละเคส ต้องได้ค่าเท่าเดิมทุกตัว

```sql
SELECT (SELECT COUNT(*) FROM course_quota_info) AS info, (SELECT COUNT(*) FROM quota_condition) AS cond,
       (SELECT COUNT(*) FROM quota_round) AS rounds, (SELECT COUNT(*) FROM quota_channel) AS channels,
       (SELECT COUNT(*) FROM quota_contact) AS contacts, (SELECT COUNT(*) FROM timetable_entry) AS entries;
```

## Test Cases

### [ST-US7-01] เปิดหน้าเมื่อมีวิชาในตาราง

**Related CoS:** -

**เส้นทาง:** หน้าเว็บโหลดวิชาในตารางจาก `GET /api/timetable` (ยังไม่เรียก API โควตา)

**Preconditions:**
- login ด้วย `6609000001` · ตารางที่เปิดอยู่เป็นภาคเรียน 2/2568 มี MA211 และ LAS101

**Test Steps:**
1. กดเมนู "ค้นหาช่องทางขอโควตา"
2. ตรวจหน้าเว็บและ request ใน DevTools

**Expected Result:**
- ส่ง `GET /api/timetable?academicYear=2568&semester=2` ตอบ `200` มี MA211 และ LAS101 · **ไม่มี** request ไป `/api/quota/courses`
- หน้าเว็บ: ป้าย "ภาคเรียนที่ 2/2568", การ์ด "4 ขั้นตอนการขอโควตาสำหรับนักศึกษา มธ." และ checkbox "เฉพาะวิชาในแผนของฉัน" มีรหัส MA211 และ LAS101 ในวงเล็บ กดได้

### [ST-US7-02] เปิดหน้าเมื่อตารางว่าง

**Related CoS:** -

**เส้นทาง:** หน้าเว็บโหลดตารางว่าง · ค้นหา → `mine=true` แต่ตารางว่าง → 200 `courses: []` ไม่ query วิชา

**Preconditions:**
- login ด้วย `6609000004` · ตารางภาคเรียน 2/2568 ว่าง

**Test Steps:**
1. กดเมนู "ค้นหาช่องทางขอโควตา"
2. ยิง `GET /api/quota/courses?academicYear=2568&semester=2&mine=true` ผ่าน Postman ด้วย token ของ `6609000004`

**Expected Result:**
- ข้อ 1: `GET /api/timetable` ได้ `entries: []` · checkbox "เฉพาะวิชาในแผนของฉัน" ไม่มีวงเล็บและกดไม่ได้
- ข้อ 2: `200` ได้ `mine: true`, `total: 0`, `courses: []`

### [ST-US7-03] ค้นหาวิชาที่ต้องขอโควตา และเปิดลิงก์ฟอร์ม

**Related CoS:** -

**เส้นทาง:** ค้นหา → พบวิชา → เปิดสอนในภาค → มีข้อมูล → `REQUIRED` → 200

**Preconditions:**
- login ด้วย `6609000001` ภาคเรียน 2/2568

**Test Steps:**
1. พิมพ์ `EL395` กด "ค้นหาข้อมูล"
2. ตรวจการ์ด แล้วกดปุ่มช่องทางขอโควตาและปุ่มช่องทางติดต่อ

**Expected Result:**
- API: `GET /api/quota/courses?academicYear=2568&semester=2&q=EL395&mine=false` ตอบ `200` `total: 1` · EL395 `quotaStatus: "REQUIRED"`, `offeredSemesters: [2]`, `inMyTimetable: false`, `conditions` 1 ข้อ `relatedCourseCode: "EL295"`, `rounds` 2 รอบ, `channels` 1 ตัว `channelType: "QUOTA_SYSTEM"`, `contacts` 1 ตัว
- หน้าเว็บ: "พบทั้งหมด 1 วิชา" · กล่องเงื่อนไขมีชิป EL295 สีแดง · ช่วงเวลา "รอบที่ 1 5 - 9 ตุลาคม 2569" และ "รอบที่ 2 1 - 4 ธันวาคม 2569" ป้าย "เปิดรับทั้งหมด 2 รอบ" · ปุ่ม "ไปยัง quota-litu.web.app" · แถวติดต่อสถาบันภาษา
- ข้อ 2: ทั้งสองปุ่มเปิดแท็บใหม่ (`target="_blank"`, `rel="noopener noreferrer"`) ไปที่ https://quota-litu.web.app/ และ https://www.facebook.com/litu.thammasat หน้าค้นหาเดิมยังอยู่
- DB: จำนวนแถวตามหัวข้อ 3 ไม่เปลี่ยน

### [ST-US7-04] กดชิปรหัสวิชาในเงื่อนไข

**Related CoS:** -

**เส้นทาง:** วิชาเดียว → พบวิชา → `REQUIRED` → 200

**Preconditions:**
- ผ่าน ST-US7-03 (เห็นการ์ด EL395)

**Test Steps:**
1. กดชิป EL295 ในกล่องเงื่อนไข

**Expected Result:**
- API: `GET /api/quota/courses/EL295?academicYear=2568&semester=2` ตอบ `200` `quotaStatus: "REQUIRED"`, `conditions: []`, `offeredSemesters: [1, 2]`
- หน้าเว็บ: ผลค้นหาถูกแทนด้วยการ์ด EL295 ใบเดียว ช่องค้นหาเปลี่ยนเป็น "EL295" · กล่องเงื่อนไขแสดง "ไม่มีเงื่อนไข สามารถยื่นขอโควตาได้ตามกำหนดเวลา"

### [ST-US7-05] ค้นหาด้วยรหัสขึ้นต้น คำในชื่อ และตัดช่องว่าง

**Related CoS:** -

**เส้นทาง:** ค้นหา → จับคู่ `q` → เรียงตาม `courseCode` → 200

**Preconditions:**
- login ด้วย `6609000001` ภาคเรียน 2/2568

**Test Steps:**
1. ค้นหา `el3`
2. ค้นหา `EL`
3. ค้นหา `calc`
4. พิมพ์ `"  MA211  "` แล้วกด Enter
5. ค้นหา `แคลคูลัส` แล้วค้นหา `ภาษาอังกฤษเชิงวิชาการ`

**Expected Result:**
- ข้อ 1: ได้ EL395 (ไม่สนตัวพิมพ์)
- ข้อ 2: ได้ 3 วิชาเรียง EL105, EL295, EL395 ทั้งหมด `REQUIRED` "พบทั้งหมด 3 วิชา"
- ข้อ 3: ได้ MA211 (คำ "CALCULUS" ขึ้นต้นด้วย calc)
- ข้อ 4: request ส่ง `q=MA211` (ตัดช่องว่างแล้ว) ได้การ์ด MA211 เหมือนกดปุ่มค้นหา และ response มี `query: "MA211"`
- ข้อ 5: ข้อความไทยส่งแบบ URL-encoded · `แคลคูลัส` ได้ MA211 (`courseNameTh: "แคลคูลัส 1"`) · `ภาษาอังกฤษเชิงวิชาการ` ได้ EL295 และ EL395 (ชื่อไทยมีคำนี้ ตามชื่อในชีตโควตา) · ไม่มี EL105 เพราะชื่อไทย "ทักษะการสื่อสารทางภาษาอังกฤษ" ไม่มีคำนี้

### [ST-US7-06] การ์ดที่ยื่นภายในวันเดียวผ่าน Google Form

**Related CoS:** -

**เส้นทาง:** ค้นหา → `REQUIRED` → รอบที่ `startDate` เป็น `null`

**Preconditions:**
- login ด้วย `6609000001` ภาคเรียน 2/2568

**Test Steps:**
1. ค้นหา `MA211`
2. กดปุ่มช่องทางขอโควตา

**Expected Result:**
- API: `rounds` 1 รอบ `startDate: null`, `endDate: "2026-10-20"`, `endTime: "15:00"` · `channels` 1 ตัว `channelType: "ONLINE_FORM"` · `inMyTimetable: true`
- หน้าเว็บ: ป้าย "กำหนดการ" แทน "รอบที่ 1" ข้อความ "ยื่นคำร้องภายใน 20 ตุลาคม 2569 เวลา 15:00 น." · ป้าย "ในแผนการเรียน" · ปุ่ม "ไปยัง forms.gle" เปิดแท็บใหม่ไปที่ https://forms.gle/NWTyPnsVWtyDak3W8

### [ST-US7-07] วิชาที่แบ่งรอบตามรหัสนักศึกษาและมีเวลาเริ่ม–สิ้นสุด

**Related CoS:** -

**เส้นทาง:** ค้นหา → `REQUIRED` → `rounds` หลายรอบพร้อม `label`, `startTime`, `endTime`

**Preconditions:**
- login ด้วย `6609000001` ภาคเรียน 2/2568

**Test Steps:**
1. ค้นหา `AN347`

**Expected Result:**
- API: `rounds` 4 รอบเรียงตาม `roundNo` `label` เป็น "รหัส 65-66", "รหัส 67", "รหัส 68", "รหัส 69" ตรงกับวันที่ 6, 7, 8, 9 ตุลาคม 2569 และทุกรอบมีเวลา 09:00–16:00 · `channels` เป็น https://quota.socanth.tu.ac.th/
- หน้าเว็บ: ป้าย "เปิดรับทั้งหมด 4 รอบ" แต่ละรอบแสดง label วันที่ และช่วงเวลา 09:00–16:00 น.

**หมายเหตุ:** เวลาเริ่ม 09:00 ใช้ `quota_round.start_time` ที่ US7-T06 เพิ่มตามรีวิว DTO ใน T05 ยังไม่มี field เวลาเริ่ม ต้องยืนยันชื่อ field ใน response (ดูหัวข้อ "เรื่องที่ต้องยืนยัน")

### [ST-US7-08] ช่องทางติดต่อที่ไม่มีลิงก์

**Related CoS:** -

**เส้นทาง:** ค้นหา → `REQUIRED` → `contacts` ที่ `url: null`

**Preconditions:**
- login ด้วย `6609000001` ภาคเรียน 2/2568

**Test Steps:**
1. ค้นหา `PC280`

**Expected Result:**
- API: `rounds` 1 รอบเป็นกำหนดการวันเดียว 9 ตุลาคม 2569 · `channels` เป็น `ONLINE_FORM` https://forms.office.com/r/H9wBTqppu2 · `contacts` 1 ตัว `organizationName` สาขาวิชาฟิสิกส์ `label` "MS Teams wchumpon@tu.ac.th" `url: null`
- หน้าเว็บ: แถวติดต่อแสดงข้อความ "MS Teams wchumpon@tu.ac.th" **ไม่มีปุ่มลิงก์** · ปุ่มช่องทางขอโควตา "ไปยัง forms.office.com" ยังกดได้

### [ST-US7-09] เฉพาะวิชาในแผนของฉัน

**Related CoS:** -

**เส้นทาง:** ค้นหา → มีตาราง → `mine=true` กรองด้วยวิชาในตาราง · `mine=false` ใส่ `inMyTimetable`

**Preconditions:**
- login ด้วย `6609000001` ภาคเรียน 2/2568 (ตารางมี MA211, LAS101)

**Test Steps:**
1. ช่องค้นหาว่าง ติ๊ก "เฉพาะวิชาในแผนของฉัน"
2. ยังติ๊กอยู่ พิมพ์ `MA` แล้วกดค้นหา
3. เลิกติ๊ก แล้วกดค้นหา `MA` อีกครั้ง

**Expected Result:**
- ข้อ 1: `GET /api/quota/courses?academicYear=2568&semester=2&mine=true` (ไม่มี `q`) ตอบ `total: 2`, `query: null` ได้ LAS101 แล้ว MA211 ทั้งคู่ `inMyTimetable: true` · หน้าเว็บมีป้าย "ในแผนการเรียน" ทั้งสองการ์ด
- ข้อ 2: `q=MA&mine=true` ได้ MA211 ใบเดียว
- ข้อ 3: `q=MA&mine=false` ได้ 5 วิชาเรียง CS342, CS345, CS372, MA211, TU108 (รหัสหรือคำในชื่อขึ้นต้นด้วย MA) · มีป้าย "ในแผนการเรียน" เฉพาะ MA211 · CS345 เป็น `NOT_OFFERED` (เปิดเฉพาะเทอม 1)

### [ST-US7-10] วิชาที่ไม่เปิดสอนในภาคนี้

**Related CoS:** -

**เส้นทาง:** ค้นหา → ไม่มี section ในภาคที่ขอ → `NOT_OFFERED` (มาก่อนสถานะอื่น)

**Preconditions:**
- login ด้วย `6609000001`

**Test Steps:**
1. ภาคเรียน 2/2568 ค้นหา `FR205`
2. เปลี่ยนเป็นภาคเรียน 1/2568 ค้นหา `EL395`

**Expected Result:**
- ข้อ 1: `quotaStatus: "NOT_OFFERED"`, `offeredSemesters: [1]` ทุก list เป็น `[]` · หน้าเว็บกล่องเหลือง "วิชานี้เปิดสอนเฉพาะภาคเรียนที่ 1"
- ข้อ 2: `quotaStatus: "NOT_OFFERED"`, `offeredSemesters: [2]` แม้ EL395 จะต้องขอโควตา · หน้าเว็บกล่องเหลือง "วิชานี้เปิดสอนเฉพาะภาคเรียนที่ 2" ไม่แสดงเงื่อนไขหรือช่องทาง

### [ST-US7-11] วิชาที่ต้องขอโควตาแต่ยังไม่ประกาศรอบของภาคนี้

**Related CoS:** -

**เส้นทาง:** ค้นหา → `REQUIRED` → ไม่มี `quota_round` ของภาคที่ขอ → `rounds: []`

**Preconditions:**
- login ด้วย `6609000001` ภาคเรียน 1/2568 (ชีตมีรอบเฉพาะภาค 2)

**Test Steps:**
1. ค้นหา `MA211`

**Expected Result:**
- API: `quotaStatus: "REQUIRED"`, `rounds: []` ส่วน `channels` และ `contacts` ยังมีค่าเหมือนภาค 2
- หน้าเว็บ: ส่วนช่วงเวลาแสดง "ยังไม่ประกาศช่วงเวลายื่นคำร้องของภาคนี้" ช่องทางและช่องทางติดต่อยังแสดงตามปกติ

### [ST-US7-12] วิชาที่ยังไม่มีข้อมูลโควตา

**Related CoS:** -

**เส้นทาง:** ค้นหา / วิชาเดียว → ไม่มีแถวใน `course_quota_info` → `NO_DATA` → 200 (ไม่ใช่ 404)

**Preconditions:**
- login ด้วย `6609000001` ภาคเรียน 2/2568

**Test Steps:**
1. ค้นหา `TU101`
2. ยิง `GET /api/quota/courses/TU101?academicYear=2568&semester=2`

**Expected Result:**
- ข้อ 1: `quotaStatus: "NO_DATA"` ทุก list เป็น `[]` · หน้าเว็บกล่องเทา "ยังไม่มีข้อมูลช่องทางขอโควตาของรายวิชานี้ กรุณาติดต่อคณะ/ภาควิชาเจ้าของวิชา"
- ข้อ 2: `200` `quotaStatus: "NO_DATA"`

### [ST-US7-13] วิชาที่ไม่ต้องขอโควตา

**Related CoS:** -

**เส้นทาง:** ค้นหา → มีข้อมูลและ `quota_required = 0` → `NOT_REQUIRED`

**Preconditions:**
- login ด้วย `6609000001` ภาคเรียน 2/2568 · seed CS232 เป็น `NOT_REQUIRED` ตามข้อเสนอใน US7-T05

**Test Steps:**
1. ค้นหา `CS232`

**Expected Result:**
- API: `quotaStatus: "NOT_REQUIRED"`, `offeredSemesters: [2]` ทุก list เป็น `[]`
- หน้าเว็บ: กล่องเขียว "รายวิชานี้ไม่ต้องขอโควตา" ไม่มีส่วนเงื่อนไข รอบ ช่องทาง และติดต่อ

### [ST-US7-14] วิชาที่ไม่มีในระบบ

**Related CoS:** -

**เส้นทาง:** ค้นหา → ไม่พบวิชา → 200 `[]` · วิชาเดียว → ไม่พบใน `course` → 404

**Preconditions:**
- login ด้วย `6609000001` ภาคเรียน 2/2568

**Test Steps:**
1. ค้นหา `DM201`
2. ยิง `GET /api/quota/courses/DM201?academicYear=2568&semester=2` และ `GET /api/quota/courses/el295?academicYear=2568&semester=2`

**Expected Result:**
- ข้อ 1: `200` `total: 0`, `courses: []` (ไม่ใช่ 404) · หน้าเว็บ "ไม่พบข้อมูลช่องทางขอโควตาสำหรับวิชานี้" และ "ยังไม่มีข้อมูลช่องทางการขอโควตา สำหรับรายวิชา DM201 ในระบบ"
- ข้อ 2: DM201 ได้ `404` ProblemDetail `detail: "ไม่พบรายวิชา DM201"` · `el295` (ตัวพิมพ์เล็ก) ได้ `200` การ์ดของ EL295 เหมือน ST-US7-04

### [ST-US7-15] ค่าที่ส่งไม่ถูกต้อง

**Related CoS:** -

**เส้นทาง:** ค้นหา / วิชาเดียว → 400 ก่อนเข้า method หรือ `QUOTA_SEARCH_QUERY_REQUIRED`

**Preconditions:**
- มี token ของ `6609000001` · อยู่หน้าค้นหาช่องทางขอโควตา

**Test Steps:**
1. ยิง `GET /api/quota/courses` ทีละค่า: ไม่ส่ง `academicYear`, ไม่ส่ง `semester`, `semester=3`, `q` ยาว 51 ตัวอักษร, `semester=2` โดยไม่ส่ง `q` และไม่ส่ง `mine`
2. ยิง `GET /api/quota/courses/EL295` โดยไม่ส่ง `academicYear` และ `semester`
3. ค้นหา `%` และ `_` บนหน้าเว็บ
4. บนหน้าเว็บ ล้างช่องค้นหาด้วยปุ่ม × แล้วกด "ค้นหาข้อมูล" ขณะไม่ได้ติ๊ก checkbox

**Expected Result:**
- ข้อ 1: 4 ค่าแรกได้ `400` ProblemDetail (ไม่ใช่ 500) · ค่าสุดท้ายได้ `400` ที่มี `code: "QUOTA_SEARCH_QUERY_REQUIRED"`
- ข้อ 2: `400`
- ข้อ 3: `200` `courses: []` ไม่คืนทุกวิชา (escape อักขระพิเศษของ LIKE)
- ข้อ 4: **ไม่มี request** ไป `/api/quota/courses` หน้าเว็บกลับไปหน้าแรกที่มี "4 ขั้นตอนการขอโควตา"

### [ST-US7-16] ไม่มี token และโหลดข้อมูลไม่สำเร็จ

**Related CoS:** -

**เส้นทาง:** ทุก endpoint → 401 จาก security ของ US3 · เครือข่ายล่ม

**Preconditions:**
- login ด้วย `6609000001` อยู่หน้าค้นหาช่องทางขอโควตา

**Test Steps:**
1. ยิงทั้งสอง endpoint ผ่าน Postman โดยไม่ส่ง header `Authorization`
2. บนหน้าเว็บ ลบ token `mocktimetable.auth.token` ใน sessionStorage แล้วค้นหา `EL395`
3. login ใหม่ เปิด DevTools Offline แล้วค้นหา `EL395` จากนั้นกลับมา Online และกดปุ่ม "ลองใหม่"

**Expected Result:**
- ข้อ 1: ทั้งสองได้ `401` ProblemDetail
- ข้อ 2: หน้าเว็บกลับหน้า Login ตาม US4
- ข้อ 3: ขณะ Offline แสดง skeleton แล้วเปลี่ยนเป็น "ไม่สามารถโหลดข้อมูลโควตาได้ กรุณาลองใหม่อีกครั้ง" พร้อมปุ่มลองใหม่ หน้าไม่ค้าง · หลังกดลองใหม่แสดงการ์ด EL395 ได้ตามปกติ

## สรุปความครอบคลุม

| Test Case | เรื่องที่ทดสอบ |
| --- | --- |
| ST-US7-01 | เปิดหน้า แสดงวิชาในแผนข้าง checkbox ไม่เรียก API โควตา |
| ST-US7-02 | ตารางว่าง checkbox กดไม่ได้ และ `mine=true` ได้ `[]` |
| ST-US7-03 | ต้องขอโควตา ครบ 4 ส่วน และเปิดลิงก์ฟอร์มในแท็บใหม่ |
| ST-US7-04 | กดชิปรหัสวิชาในเงื่อนไข (endpoint วิชาเดียว) |
| ST-US7-05 | ค้นหารหัสขึ้นต้น คำในชื่อ ไม่สนตัวพิมพ์ ตัดช่องว่าง |
| ST-US7-06 | ยื่นภายในวันเดียวพร้อมเวลา ผ่าน Google Form |
| ST-US7-07 | แบ่งรอบตามรหัสนักศึกษา มีเวลาเริ่มและสิ้นสุด |
| ST-US7-08 | ช่องทางติดต่อไม่มีลิงก์ |
| ST-US7-09 | เฉพาะวิชาในแผนของฉัน และป้าย "ในแผนการเรียน" |
| ST-US7-10 | ไม่เปิดสอนในภาคนี้ (รวมวิชาที่ต้องขอโควตา) |
| ST-US7-11 | ต้องขอโควตาแต่ยังไม่ประกาศรอบของภาคนี้ |
| ST-US7-12 | ยังไม่มีข้อมูลโควตา ตอบ 200 ไม่ใช่ 404 |
| ST-US7-13 | ไม่ต้องขอโควตา |
| ST-US7-14 | วิชาที่ไม่มีในระบบ ค้นหาได้ `[]` วิชาเดียวได้ 404 |
| ST-US7-15 | ค่าที่ส่งไม่ถูกต้อง 400 และไม่เรียก API เมื่อช่องว่าง |
| ST-US7-16 | ไม่มี token 401 และโหลดไม่สำเร็จ |

**ข้อจำกัด:**
- ชีตโควตาไม่มีวิชาที่มีหลายช่องทางขอโควตา จึงไม่มีเคสหลายช่องทางและช่องทางที่ `url: null` ในระบบจริง กรณีนี้ทดสอบใน IT ด้วยข้อมูลจำลอง (US7-T13, US7-T14)
- ชีตรายวิชามี 74 วิชา ไม่มีคำค้นที่ตรงเกิน 50 วิชา จึงไม่มีเคส "แสดง 50 วิชาแรก" ใน System Test

## เรื่องที่ต้องยืนยันก่อนรัน (US7-T19)

| เรื่อง | สิ่งที่เอกสารนี้สมมติไว้ | กระทบเคส |
| --- | --- | --- |
| seed ข้อมูลโควตา | US7-T09 seed ตามชีต "โควตา 22569" ครบทั้งเงื่อนไข รอบ ช่องทาง และช่องทางติดต่อ (ตรวจด้วย SQL ในหัวข้อ 1) | ทั้งหมด |
| ปีการศึกษาของรอบยื่นคำร้อง | ชีตเป็นรอบของภาค 2/2569 เอกสารนี้ใช้ปีการศึกษา 2568 ตาม Spec และข้อตกลงทีม (แบบเดียวกับ US6-T15) จึงต้อง seed รอบไว้ที่ปี 2568 ภาค 2 ถ้า seed ใช้ปีอื่นให้เปลี่ยน `academicYear` ทุกเคส | 03 ถึง 11 |
| รายวิชาใน `course` | seed รายวิชาต้องมีวิชาจริงตามชีตรายวิชา (เช่น EL395, AN347, PC280, CS342, CS345, CS372, TU108) และภาคที่เปิดตามชีต seed ของ US1 ตอนนี้ยังไม่ตรง | ทั้งหมด |
| CS232 | seed เป็น `NOT_REQUIRED` ตามข้อเสนอใน US7-T05 เพราะชีตไม่มีวิชาที่ไม่ต้องขอโควตา | 13 |
| วันที่ในชีต | FD216 ขึ้นเป็นปี 1969 และ PC280 เป็น 2569-10-09 ใน Excel ใช้เป็น 9 ตุลาคม 2569 (ค.ศ. 2026) | 08 |
| ชื่อไทย | US7-T06 ฉบับ `d51c265` เก็บที่ `course.course_name_th` ทุกวิชา seed ต้องใส่ชื่อไทยตามชีตโควตา (เช่น MA211 "แคลคูลัส 1", EL395 "ภาษาอังกฤษเชิงวิชาการและทักษะศึกษา 2") | 05 |
| เวลาเริ่มรอบ | US7-T06 เพิ่ม `quota_round.start_time` แต่ DTO ใน T05 ยังไม่มี field เวลาเริ่ม ต้องยืนยันชื่อ field ใน response | 07 |

## แบบบันทึกผล (ใช้ใน US7-T19)

| Test Case | ผู้ทดสอบ | วันที่ | ผล (Pass/Fail) | หมายเหตุ / Bug ที่พบ |
| --- | --- | --- | --- | --- |
| ST-US7-01 | | | | |
| ST-US7-02 | | | | |
| ST-US7-03 | | | | |
| ST-US7-04 | | | | |
| ST-US7-05 | | | | |
| ST-US7-06 | | | | |
| ST-US7-07 | | | | |
| ST-US7-08 | | | | |
| ST-US7-09 | | | | |
| ST-US7-10 | | | | |
| ST-US7-11 | | | | |
| ST-US7-12 | | | | |
| ST-US7-13 | | | | |
| ST-US7-14 | | | | |
| ST-US7-15 | | | | |
| ST-US7-16 | | | | |

## เอกสารที่เกี่ยวข้อง
- Sequence Diagram ค้นหา, วิชาเดียว, ER Diagram, DAO Class Diagram (US7-T06 · PR #98 ฉบับ `d51c265`)
- [US7-T05 DTO & API Spec](../T05/US7-DTO-API-Spec.md)
- [US6-T15 Design System Test](../../US6/T15/US6-T15-System-Test.md)
- [US1-T15 Design System Test](../../US1/T15/US1-T15-System-Test.md)
