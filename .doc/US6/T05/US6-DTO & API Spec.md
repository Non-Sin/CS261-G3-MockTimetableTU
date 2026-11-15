# US6 — DTO & API Spec: ระบบแนะนำวิชาเสรี

Nov 10, 2026 · @Non

## ภาพรวม

US6 เพิ่มเมนู "ดูวิชาเสรีแนะนำ" ให้นักศึกษาค้นหาวิชาเสรีพร้อมรีวิวจากรุ่นพี่ แล้วกด "เพิ่มลงตาราง" ได้ทันที ใช้ **2 endpoint ใหม่** ใน package `elective/` และ **reuse `POST /api/timetable/entries` ของ US1** สำหรับปุ่มเพิ่มลงตาราง ออกแบบตาม UI Prototype ใน [`ui-prototype/`](./ui-prototype) และ test case ใน [การ์ด US6](https://trello.com/c/wZz1wdtW)

| หน้าจอ | ไฟล์ | ใช้ endpoint |
| --- | --- | --- |
| รายการวิชาเสรีแบ่งตามหมวด (18 วิชา) | [US6-electives-list.png](./ui-prototype/US6-electives-list.png) | 1 |
| Modal รายละเอียด FR205 (2 Sec ภาคเรียนเดียวกัน + ปุ่มขอโควตา) | [US6-detail-FR205.png](./ui-prototype/US6-detail-FR205.png) | 2, 3 |
| Modal รายละเอียด PY250 (Sec ภาค 2 กดเลือกไม่ได้) | [US6-detail-PY250.png](./ui-prototype/US6-detail-PY250.png) | 2, 3 |
| ค้นหา SA240 ไม่พบ | [US6-empty-SA240.png](./ui-prototype/US6-empty-SA240.png) | 1 |

- **กรองฝั่ง backend:** ตัวกรองวัน / ช่วงเวลา / ภาคเรียน / "ไม่ชนกับตารางปัจจุบัน" ต้องดูคาบเรียนของทุก Sec แต่การ์ดในหน้ารายการไม่แสดง Sec จึงให้ backend กรองแล้วส่งแค่ข้อมูลการ์ดกลับมา ไม่ต้องส่ง Sec ทั้งหมดไปกรองที่ browser
- **รายการเบา รายละเอียดครบ:** endpoint 1 คืนข้อมูลการ์ด ส่วน Sec, ผู้สอน, ห้อง และรีวิวอยู่ใน endpoint 2 ที่เรียกตอนเปิด modal
- **ดูได้ทั้งปีการศึกษา แต่เพิ่มได้เฉพาะภาคของตารางปัจจุบัน:** ตัวกรอง "ทุกภาคเรียน" แสดงวิชาภาค 1 และ 2 แต่ตารางเรียนจำลองผูกกับ 1 ภาค ([US1](../../US1/T05/US1-DTO%20&%20API%20Spec.md)) Sec ของอีกภาคจึงเลือกไม่ได้ ตามที่ PY250 Sec 230001 แสดง "(ตารางเรียนปัจจุบันคือภาคเรียนที่ 1)"
- **เพิ่มลงตารางใช้กติกาเดิมของ US1:** หน่วยกิตไม่เกิน 22 และ 1 วิชา 1 กลุ่ม (409 `CREDIT_LIMIT_EXCEEDED`, `COURSE_ALREADY_IN_TIMETABLE`) ไม่มี endpoint เพิ่มวิชาใหม่
- **ตัดออกจาก prototype:** การ์ด T05 เสนอตัวกรองรูปแบบการเรียน (onsite/online) และวิธีวัดผล แต่ UI Prototype ไม่มี dropdown ทั้งสอง วิธีวัดผลแสดงเป็นป้าย (`tags`) บนการ์ดแทน API จึงไม่มี param นี้ ถ้าภายหลังเพิ่ม dropdown ให้เพิ่ม query param `tags` โดยไม่กระทบ field เดิม
- **นอกขอบเขต:** หน้า "ค้นหาช่องทางขอโควตา" (ปุ่มใน modal แค่ลิงก์ไปเมนูนั้น), การเขียนรีวิว และการให้คะแนนวิชา รีวิวเป็นข้อมูล seed ที่ทีมเตรียมไว้

## Endpoints

| Method | Path | ใช้กับส่วนไหนของหน้า | Test case |
| --- | --- | --- | --- |
| GET | `/api/electives?academicYear=2568&currentSemester=1&q=&semester=&day=&timeSlot=&group=&excludeConflicts=` | ช่องค้นหา, ตัวกรอง 4 dropdown, toggle "แสดงเฉพาะวิชาที่ไม่ชนกับตารางปัจจุบัน", การ์ดวิชาแบ่งตามหมวด, "แสดงทั้งหมด N วิชาแนะนำ" | TC1, TC2 |
| GET | `/api/electives/{courseCode}?academicYear=2568&currentSemester=1` | Modal "รายละเอียดวิชาเสรี" เมื่อกด "อ่านรีวิว" หรือการ์ด | TC3 |
| POST | `/api/timetable/entries` (ของ US1 ไม่เปลี่ยน) | ปุ่ม "+ เพิ่มลงตาราง" ใน modal ส่ง `sectionId` ของ Sec ที่เลือก | — |

### ตรวจกับ Conditions of Satisfaction ของ US6

| Test case | ครอบคลุมโดย |
| --- | --- |
| TC1: นักศึกษาสามารถดูเมนู แนะนำวิชาเสรี ได้ | เมนู "ดูวิชาเสรีแนะนำ" (`id: "electives"`) มีอยู่แล้วใน `AppNavigation.tsx` ของ US3 ตอนนี้เปิดหน้ารอพัฒนา US6-T07 เปลี่ยนเป็นหน้านี้ เปิดเมนูแล้วเรียก endpoint 1 ด้วยตัวกรองว่างทันที (ได้ 18 วิชาในหน้า [US6-electives-list](./ui-prototype/US6-electives-list.png)) ไม่ต้องมี API ของเมนูเอง ถ้า token หมดอายุได้ `401` → กลับหน้า Login |
| TC2: ระบบแสดงรายการวิชาเสรีที่สามารถลงทะเบียนได้ | endpoint 1 คืนเฉพาะวิชาเสรีที่มี Sec เปิดในปีการศึกษานั้น (กติกาการกรองข้อ 1) พร้อมป้าย "เปิดเฉพาะเทอม N" และ "รายวิชาที่ต้องขอโควตา" ให้รู้เงื่อนไขการลงทะเบียน ส่วน Sec ที่เพิ่มลงตารางปัจจุบันได้จริงดูจาก `selectable` ใน endpoint 2 |
| TC3: ระบบแสดงข้อมูลของวิชา เช่น ชื่อวิชา รายละเอียด และหน่วยกิต | ชื่อวิชา = `courseName` + `courseNameTh`, หน่วยกิต = `credits` (ทั้งการ์ดในข้อ 1 และ modal ในข้อ 2), รายละเอียด = `description` (บังคับอย่างน้อย 1 ข้อ) พร้อม Sec วัน เวลา ห้อง ผู้สอน ใน `sections` |

ทุก endpoint ต้อง login (ส่ง `Authorization: Bearer <token>` ตาม US3) และทำงานกับตารางของนักศึกษาที่ login อยู่ผ่าน `CurrentStudentProvider` เหมือน US1 ไม่มี token ตอบ `401` จาก `SecurityConfig` ของ US3

### `currentSemester` มาจากไหน

คือภาคเรียนของตารางเรียนจำลองที่นักศึกษาเปิดอยู่ (state `academicYear` / `semester` ของ `useTimetable` ใน US1 ค่าเริ่มต้น 2568/1) ไม่ใช่ dropdown "ภาคเรียน" ของหน้านี้ ซึ่งเป็นแค่ตัวกรองการแสดงผล backend ใช้ค่านี้ 2 อย่าง: ตัดสินว่า Sec ไหนกด "เพิ่มลงตาราง" ได้ และดึงตารางมาตรวจเวลาชน

## API Spec

### 1. GET /api/electives — รายการวิชาเสรีแนะนำ

| Param | ชนิด | บังคับ | ตัวอย่าง | มาจาก UI |
| --- | --- | --- | --- | --- |
| `academicYear` | int (พ.ศ.) | ใช่ | 2568 | ปีของตารางปัจจุบัน |
| `currentSemester` | int (1, 2) | ใช่ | 1 | ภาคของตารางปัจจุบัน (ดูหัวข้อด้านบน) |
| `q` | string | ไม่ | PY2 | ช่อง "ค้นหาด้วยรหัสวิชา หรือชื่อวิชา" ไม่สนตัวพิมพ์ ตรงเมื่อ (1) รหัสวิชาขึ้นต้นด้วย q หรือ (2) ชื่ออังกฤษมีคำที่ขึ้นต้นด้วย q (กติกาเดียวกับ US1) หรือ (3) ชื่อไทยมี q อยู่ส่วนใดก็ได้ เพราะภาษาไทยไม่เว้นวรรคระหว่างคำ |
| `semester` | int (1, 2) | ไม่ | 2 | dropdown "ภาคเรียน" ไม่ส่ง = "ทุกภาคเรียน (ทั้งหมด)" |
| `day` | enum `DayOfWeek` | ไม่ | MONDAY | dropdown "กรองตามวันเรียน" `MONDAY`–`SATURDAY` ไม่ส่ง = "ทุกวันเรียน" |
| `timeSlot` | enum | ไม่ | EVENING | dropdown "กรองตามช่วงเวลาเรียน" ดูตาราง `TimeSlot` ด้านล่าง ไม่ส่ง = "ทุกช่วงเวลา" |
| `group` | enum | ไม่ | PSYCHOLOGY | dropdown "หมวดหมู่วิชา" ดูตาราง `InterestGroup` ด้านล่าง ไม่ส่ง = "ทั้งหมด (ทุกหมวดหมู่)" |
| `excludeConflicts` | boolean | ไม่ (ค่าเริ่มต้น `false`) | true | toggle "แสดงเฉพาะวิชาที่ไม่ชนกับตารางปัจจุบัน" |

`TimeSlot` — ช่วงเวลาตาม dropdown ใน prototype คาบหนึ่ง**อยู่ในช่วง**เมื่อ `startTime` อยู่ใน [from, to) จึงไม่มีคาบไหนตกสองช่วง เช่น FR205 16:30–18:00 เป็น `EVENING` ส่วน PY250 13:30–16:30 เป็น `AFTERNOON`

| ค่า | ป้ายใน UI | from | to |
| --- | --- | --- | --- |
| `MORNING` | เช้า (08:00 - 12:30) | 08:00 | 12:30 |
| `AFTERNOON` | บ่าย (13:30 - 16:30) | 12:30 | 16:30 |
| `EVENING` | เย็น (16:30 - 19:30) | 16:30 | 21:00 |

ขอบ `to` ของ `AFTERNOON` และ `EVENING` กว้างกว่าป้าย เพื่อให้คาบที่เริ่ม 12:30–13:29 หรือหลัง 19:30 ยังมีช่วงให้ตก (grid ของ US1 ไปถึง 21:00)

`InterestGroup` — หมวดหมู่ความสนใจ แยกจาก `CourseCategory` ของ US1 (ทุกวิชาในหน้านี้เป็น `FREE_ELECTIVE`)

| ค่า | ป้ายใน UI |
| --- | --- |
| `LANGUAGE` | หมวดภาษาและการสื่อสาร |
| `PSYCHOLOGY` | หมวดจิตวิทยาและพฤติกรรมศาสตร์ |
| `SOCIETY` | หมวดสังคม วัฒนธรรม และสุขภาพ |
| `SCIENCE` | หมวดวิทยาศาสตร์และเทคโนโลยี |
| `MEDIA` | หมวดสื่อ สารสนเทศ และภาพยนตร์ |

#### กติกาการกรอง

1. เลือกเฉพาะวิชา `category = FREE_ELECTIVE` ที่มีข้อมูลแนะนำ (มี `interestGroup` และ `description` อย่างน้อย 1 ข้อ) และมี Sec เปิดใน `academicYear` อย่างน้อย 1 Sec — "ลงทะเบียนได้" ใน TC2 หมายถึงข้อนี้ วิชาที่ไม่มี Sec เปิดในปีนั้นจะไม่แสดง
2. `q` และ `group` กรองที่ระดับวิชา
3. `semester`, `day`, `timeSlot`, `excludeConflicts` กรองที่ระดับ Sec — วิชาผ่านเมื่อมี **Sec เดียวกันอย่างน้อย 1 Sec ที่ผ่านทุกเงื่อนไขพร้อมกัน** (ไม่ใช่ Sec หนึ่งผ่านวัน อีก Sec ผ่านช่วงเวลา)
   - `day` + `timeSlot`: Sec ผ่านเมื่อมีคาบที่ตรงทั้งวันและช่วงเวลาในคาบเดียวกัน
   - `excludeConflicts=true`: Sec ต้องอยู่ใน `currentSemester` และทุกคาบไม่ชนกับคาบใดใน `GET /api/timetable?academicYear&semester=currentSemester` ใช้กติกาชนเดียวกับ US1 (`วันเดียวกัน && a.startTime < b.endTime && b.startTime < a.endTime` คาบต่อกันพอดีไม่ชน) และ**ตัดวิชาที่อยู่ในตารางแล้วออก** เพราะเพิ่มซ้ำไม่ได้ (409 `COURSE_ALREADY_IN_TIMETABLE`) ถ้าตารางว่าง ทุก Sec ใน `currentSemester` ผ่าน
   - Sec ที่ไม่มีคาบ (e-learning) ไม่ผ่าน `day` / `timeSlot` แต่ผ่าน `excludeConflicts` เพราะชนกับอะไรไม่ได้
4. `excludeConflicts=true` คู่กับ `semester` ที่ไม่ใช่ `currentSemester` จะได้ `[]` เสมอ (ไม่ใช่ error)

ตอบ `200` เป็น `List<ElectiveSummaryResponse>` เรียงตามลำดับ `InterestGroup` ในตารางด้านบน แล้วตาม `courseCode` UI แบ่งหัวข้อหมวดและนับ "3 วิชา" ต่อหมวดจาก `group` เอง "แสดงทั้งหมด 18 วิชาแนะนำ" คือความยาว array

ตัวอย่าง (ตัดเหลือ 3 จาก 18 วิชาในหน้ารายการ):

```json
[
  {
    "courseCode": "FR205",
    "courseName": "FRENCH FOR EVERYDAY LIFE",
    "courseNameTh": "ภาษาฝรั่งเศสในชีวิตประจำวัน",
    "credits": 3,
    "group": "LANGUAGE",
    "requiresQuota": true,
    "offeredSemesters": [1],
    "tags": ["KIND_INSTRUCTOR", "NO_PREREQUISITE"]
  },
  {
    "courseCode": "TH291",
    "courseName": "WRITING PROFICIENCY DEVELOPMENT",
    "courseNameTh": "การพัฒนาสมรรถภาพการเขียน",
    "credits": 3,
    "group": "LANGUAGE",
    "requiresQuota": true,
    "offeredSemesters": [1, 2],
    "tags": ["NO_EXAM"]
  },
  {
    "courseCode": "PY250",
    "courseName": "PSYCHOLOGY OF PERSONALITY AND ADJUSTMENT",
    "courseNameTh": "จิตวิทยาบุคลิกภาพและการปรับตน",
    "credits": 3,
    "group": "PSYCHOLOGY",
    "requiresQuota": false,
    "offeredSemesters": [1, 2],
    "tags": ["NO_ATTENDANCE", "NO_GROUP_WORK"]
  }
]
```

**ไม่พบวิชา** (เช่น `q=SA240` ในหน้า [US6-empty-SA240](./ui-prototype/US6-empty-SA240.png)) ตอบ `200` และ `[]` ไม่ใช่ `404` UI แสดง "ไม่พบรีวิววิชานี้" พร้อมรหัสที่ค้น และปุ่ม "ดูวิชาเสรีแนะนำทั้งหมด" ล้างคำค้นและตัวกรองทุกตัวแล้วเรียกใหม่ SA240 อาจมีอยู่ในตาราง `course` แต่ไม่ใช่วิชาเสรีหรือยังไม่มีข้อมูลแนะนำก็ได้ผลเดียวกัน

#### `offeredSemesters` และ `tags`

- `offeredSemesters` = ภาคที่มี Sec เปิดใน `academicYear` เรียงจากน้อยไปมาก **ไม่ขึ้นกับตัวกรอง** UI แสดงป้าย "เปิดเฉพาะเทอม N" เมื่อมีภาคเดียว
- `requiresQuota` = ป้ายเขียว "รายวิชาที่ต้องขอโควตา" และปุ่ม "ค้นหาช่องทางขอโควตา" ใน modal
- `tags` = ป้ายลักษณะวิชาจากรีวิว ส่งเป็น enum ให้ UI เลือกข้อความและสีเอง เรียงตามลำดับในตารางนี้

| ค่า | ป้ายใน UI | สีใน prototype |
| --- | --- | --- |
| `NO_ATTENDANCE` | ไม่เช็คชื่อ | แดง |
| `NO_EXAM` | ไม่มีสอบ | แดง |
| `NO_GROUP_WORK` | ไม่มีงานกลุ่ม | ส้ม |
| `KIND_INSTRUCTOR` | อาจารย์ใจดี | น้ำเงิน |
| `NO_PREREQUISITE` | ไม่มีพื้นฐานเรียนได้ | ม่วง |
| `EASY_GRADE` | เก็บ A ง่าย | เขียว |

### 2. GET /api/electives/{courseCode} — รายละเอียดวิชาเสรี

| Param | อยู่ที่ | ชนิด | บังคับ | ตัวอย่าง | มาจาก UI |
| --- | --- | --- | --- | --- | --- |
| `courseCode` | path | string | ใช่ | PY250 | `courseCode` ของการ์ดที่กด |
| `academicYear` | query | int | ใช่ | 2568 | เหมือนข้อ 1 |
| `currentSemester` | query | int (1, 2) | ใช่ | 1 | เหมือนข้อ 1 |

ตอบ `200` เป็น `ElectiveDetailResponse` = field ทั้งหมดของ `ElectiveSummaryResponse` + `description` และ `sections` **ทุก Sec ของทั้งปีการศึกษา ไม่ผ่านตัวกรองของหน้ารายการ** เรียงตาม `semester` แล้ว `sectionNo`

ตัวอย่าง PY250 ([US6-detail-PY250](./ui-prototype/US6-detail-PY250.png)) ตาราง 2568/1 ยังว่าง:

```json
{
  "courseCode": "PY250",
  "courseName": "PSYCHOLOGY OF PERSONALITY AND ADJUSTMENT",
  "courseNameTh": "จิตวิทยาบุคลิกภาพและการปรับตน",
  "credits": 3,
  "group": "PSYCHOLOGY",
  "requiresQuota": false,
  "offeredSemesters": [1, 2],
  "tags": ["NO_ATTENDANCE", "NO_GROUP_WORK"],
  "description": [
    "เรียนจิตวิทยาเกี่ยวกับบุคลิกภาพการรู้จักเข้าใจตัวเองและผู้อื่น เพื่อสร้างความสัมพันธ์และการใช้ชีวิตประจำอย่างมีความสุข",
    "เรียนบรรยายในห้อง อาจารย์สอนสนุก สไลด์เป็นภาษาอังกฤษ",
    "ไม่มีงานกลุ่ม",
    "มีสอบกลางภาค และ ปลายภาค"
  ],
  "sections": [
    {
      "sectionId": 612,
      "sectionNo": "820001",
      "semester": 1,
      "instructor": "อ.วรรณปรัชญ์ พิทักษ์ไพบูลย์กิจ",
      "schedules": [
        { "dayOfWeek": "MONDAY", "startTime": "13:30", "endTime": "16:30", "room": "LC1-201" }
      ],
      "selectable": true,
      "inTimetable": false,
      "conflictWith": []
    },
    {
      "sectionId": 640,
      "sectionNo": "230001",
      "semester": 2,
      "instructor": null,
      "schedules": [
        { "dayOfWeek": "TUESDAY", "startTime": "09:30", "endTime": "12:30", "room": null }
      ],
      "selectable": false,
      "inTimetable": false,
      "conflictWith": []
    }
  ]
}
```

| Field ของ Sec | ความหมาย |
| --- | --- |
| `selectable` | `semester == currentSemester` ถ้า `false` UI แสดง Sec เป็นสีจาง กดเลือกไม่ได้ และต่อท้าย "(ตารางเรียนปัจจุบันคือภาคเรียนที่ N)" |
| `inTimetable` | Sec นี้อยู่ในตารางปัจจุบันแล้ว UI แสดงป้าย "เพิ่มแล้ว" และไม่ให้กดเพิ่ม |
| `conflictWith` | รหัสวิชาในตารางปัจจุบันที่ชนกับ Sec นี้ ว่าง = ไม่ชน คำนวณเฉพาะ Sec ที่ `selectable` (อีกภาคเป็น `[]` เสมอ) ใช้กติกาเดียวกับ `TimetableEntryResponse.conflictWith` ของ US1 |
| `instructor`, `schedules[].room` | เป็น `null` ได้ UI แสดง "ไม่ระบุ" |

เวลาชน**ไม่ block** การเพิ่ม เหมือน US1 (POST ตอบ 201 พร้อม `conflicts`) UI จึงแค่เตือนใต้ Sec ที่ `conflictWith` ไม่ว่าง เช่น "ชนกับ TU109"

`description` คือ bullet ใต้ "รายละเอียดวิชา & รีวิวจากรุ่นพี่" เรียงตามที่ seed ไว้ **ต้องมีอย่างน้อย 1 ข้อ** เพราะ TC3 กำหนดให้แสดงรายละเอียดวิชา วิชาที่ยังไม่มีรีวิวจึงไม่ถือเป็นวิชาเสรีแนะนำ (ไม่อยู่ในข้อ 1 และข้อ 2 ตอบ 404) T06 ต้องกันไว้ตอน seed ถ้าได้ `[]` จากข้อมูลผิดพลาด UI แสดง "ยังไม่มีรายละเอียดวิชา" แทนการซ่อนกล่อง

### 3. POST /api/timetable/entries — เพิ่มลงตาราง (ของ US1)

ปุ่ม "+ เพิ่มลงตาราง" ส่ง `{ "sectionId": 612 }` ของ Sec ที่เลือกใน modal ตาม [US1 ข้อ 3](../../US1/T05/US1-DTO%20&%20API%20Spec.md) ไม่มีการเปลี่ยนแปลงฝั่ง backend

| สถานะของ modal | ปุ่ม "+ เพิ่มลงตาราง" |
| --- | --- |
| ยังไม่เลือก Sec | disabled (ถ้ามี Sec `selectable` และไม่ `inTimetable` เพียงตัวเดียว ให้เลือกไว้ให้เลย ตาม prototype ที่ Sec แรกถูกเลือกอยู่) |
| เลือก Sec ที่ `selectable: false` | เลือกไม่ได้ตั้งแต่แรก |
| วิชานี้มี Sec ใดใน `inTimetable` แล้ว | disabled และแสดง "อยู่ในตารางแล้ว" |
| กำลังส่ง | disabled กันกดซ้ำ |

ผลลัพธ์:

| ตอบ | UI ทำ |
| --- | --- |
| `201` | ปิด modal แสดงข้อความ "เพิ่ม {courseCode} Sec {sectionNo} ลงตารางแล้ว" ถ้าเปิด `excludeConflicts` อยู่ให้เรียก endpoint 1 ใหม่ เพราะวิชาที่เพิ่ม (และวิชาที่ตอนนี้ชน) ต้องหายจากรายการ |
| `409` `CREDIT_LIMIT_EXCEEDED` | แสดง `detail` ใน modal เช่น "เพิ่ม PY250 (3 หน่วยกิต) แล้วจะเป็น 24 หน่วยกิต เกินกำหนด 22 หน่วยกิต" (ต่างจากหน้า US1 ที่ไม่แสดง เพราะการ์ด US6-T07 กำหนดให้แสดง) |
| `409` `COURSE_ALREADY_IN_TIMETABLE` | แสดง `detail` เช่น "PY250 อยู่ในตารางแล้ว (Sec 820001) 1 วิชาเพิ่มได้ 1 กลุ่มเรียน" (เกิดเมื่อข้อมูลบนจอเก่า เช่น เพิ่มจากอีกแท็บ) |
| `401` | กลับหน้า Login ตาม US4 |

ห้ามส่ง Sec ที่ `selectable: false` เพราะ US1 อ่านภาคจาก section จะไปสร้างตารางของอีกภาคเงียบ ๆ แทนที่จะ error กันไว้ที่ UI ด้วย `selectable`

## Error และลำดับการตรวจ

ตอบเป็น ProblemDetail ตาม README และ**ไม่มี `code` ใหม่** เพราะทั้งสอง endpoint เป็น GET ที่ UI ไม่ส่งค่าผิดตามปกติ

| HTTP | เกิดเมื่อ | ใครตอบ | Endpoint |
| --- | --- | --- | --- |
| 401 | ไม่มี token, token ผิด หรือหมดอายุ | `AuthenticationEntryPoint` ของ US3 (มีอยู่แล้ว) | 1, 2 |
| 400 | ไม่ส่ง `academicYear` / `currentSemester`, ไม่ใช่ตัวเลข หรือ `day` / `timeSlot` / `group` / `excludeConflicts` ผิดค่า | `ResponseEntityExceptionHandler` (มีอยู่แล้ว) | 1, 2 |
| 400 | `currentSemester` หรือ `semester` ไม่ใช่ 1 หรือ 2 | service โยน `ResponseStatusException` | 1, 2 |
| 404 | ไม่พบ `courseCode`, ไม่ใช่วิชาเสรีที่มีข้อมูลแนะนำ หรือไม่มี Sec เปิดใน `academicYear` | service โยน `ResourceNotFoundException` เดิม | 2 |

`day = SUNDAY` ไม่ใช่ error (ได้ `[]` เพราะไม่มีคาบวันอาทิตย์) ภาคฤดูร้อน (`3`) ตอบ 400 ตามที่ทีมตกลงว่าไม่พัฒนาส่วนภาคฤดูร้อน (ดู US5)

ลำดับใน `ElectiveService.search`:

1. ตรวจ `currentSemester`, `semester` → 400
2. ถ้า `excludeConflicts` → โหลดตาราง (`academicYear`, `currentSemester`) ของนักศึกษา ไม่มีตาราง = ถือว่าว่าง
3. query วิชาตาม `q`, `group` พร้อม Sec และคาบของทั้งปี (2 query เหมือน `CourseService.search` ของ US1)
4. กรอง Sec ตามกติกาข้อ 3 แล้วตัดวิชาที่ไม่เหลือ Sec → 200

ลำดับใน `ElectiveService.getDetail`:

1. ตรวจ `currentSemester` → 400
2. หาวิชา → 404
3. โหลดตารางปัจจุบัน คำนวณ `selectable`, `inTimetable`, `conflictWith` ของแต่ละ Sec → 200

ตรวจเวลาชนด้วยฟังก์ชันเดียวกับ `TimetableService` ของ US1 (แยกเป็น helper ที่ใช้ร่วม) ไม่เขียนกติกาชนซ้ำ รายละเอียด class อยู่ใน US6-T06

```json
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "ไม่พบวิชาเสรีแนะนำ: SA240",
  "instance": "/api/electives/SA240"
}
```

```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "currentSemester ต้องเป็น 1 หรือ 2",
  "instance": "/api/electives"
}
```

## ข้อมูลที่ต้องเพิ่มใน DB (ส่งต่อ US6-T06)

ตาราง `course` / `section` / `schedule_slot` ของ US1 ยังไม่มี field ต่อไปนี้ T06 เลือกได้ว่าจะเพิ่มคอลัมน์หรือแยกตาราง (เช่น `elective_info` 1:1 กับ `course`, `elective_tag`, `elective_review_point`) ด้วย Flyway migration ไฟล์ใหม่

| Field ใน DTO | ข้อมูลที่ต้องเก็บ |
| --- | --- |
| `courseNameTh` | ชื่อวิชาภาษาไทย (`NVARCHAR`) |
| `group` | หมวดหมู่ความสนใจ 5 ค่า (CHECK constraint) วิชาที่ไม่มีค่านี้ไม่แสดงในหน้า US6 |
| `requiresQuota` | ต้องขอโควตาหรือไม่ |
| `tags` | ป้ายลักษณะวิชา 0..* ค่าต่อวิชา |
| `description` | bullet รีวิว 1..* ข้อต่อวิชา พร้อมลำดับ (วิชาที่ไม่มีไม่แสดงในหน้า US6 ตาม TC3) |

`offeredSemesters`, `selectable`, `inTimetable`, `conflictWith` คำนวณจาก `section` และ `timetable` เดิม ไม่ต้องเก็บ

## DTO

DTO ใหม่ทั้งหมดเป็น Java record ใน `elective/dto/` และ reuse `ScheduleSlotResponse` ของ `course/dto/` ได้เลยโดยไม่ต้องแก้ (`room` เป็น `String` ที่เป็น `null` ได้ ตรงกับคอลัมน์ `schedule_slot.room` ที่เป็น `NULL` ได้อยู่แล้ว) แผนภาพอยู่ใน [DTO Class Diagram](./US6-DTO-Class-Diagram.md) และ [API Class Diagram](./US6-API-Class-Diagram.md)

| ส่วนในหน้า | Field |
| --- | --- |
| หัวข้อหมวด + "3 วิชา" | `group` (นับในแต่ละหมวด) |
| "แสดงทั้งหมด 18 วิชาแนะนำ" / "แสดงผลลัพธ์ 0 วิชา" | `length` ของ array |
| การ์ด: รหัส, "3.0 หน่วยกิต", ชื่ออังกฤษ, ชื่อไทย | `courseCode`, `credits`, `courseName`, `courseNameTh` |
| การ์ด: ป้าย "เลือกเสรี" | คงที่ (ทุกวิชาเป็น `FREE_ELECTIVE`) |
| การ์ด: ป้าย "เปิดเฉพาะเทอม 1" | `offeredSemesters` (มีค่าเดียว) |
| การ์ด: ป้าย "รายวิชาที่ต้องขอโควตา" | `requiresQuota` |
| การ์ด: ป้ายลักษณะวิชา | `tags` |
| Modal: ปุ่ม "ค้นหาช่องทางขอโควตา" | `requiresQuota` (ลิงก์ไปเมนูขอโควตา) |
| Modal: การ์ด Sec — "Sec 820001", "ภาคเรียนที่ 1" | `sections[].sectionNo`, `semester` |
| Modal: "วัน จันทร์ 13:30 - 16:30 น.", "ห้องเรียน: LC1-201" | `sections[].schedules[]` |
| Modal: "ผู้สอน: …" | `sections[].instructor` |
| Modal: Sec สีจาง "(ตารางเรียนปัจจุบันคือภาคเรียนที่ 1)" | `sections[].selectable` + `currentSemester` |
| Modal: "รายละเอียดวิชา & รีวิวจากรุ่นพี่" | `description[]` |
| Modal: ปุ่ม "+ เพิ่มลงตาราง" | `sections[].sectionId` → POST ของ US1 |

## TypeScript types (frontend)

แยกไฟล์คู่กับ package `elective/` ฝั่ง backend ตาม README เวลาใน JSON เป็น `"HH:mm"` เหมือน US1

```ts
// frontend/features/electives/types.ts — ต้องตรงกับ elective.dto ฝั่ง backend
import type { DayOfWeek, ScheduleSlot } from "@/features/courses/types";

export type InterestGroup = "LANGUAGE" | "PSYCHOLOGY" | "SOCIETY" | "SCIENCE" | "MEDIA";

export type TimeSlot = "MORNING" | "AFTERNOON" | "EVENING";

export type ElectiveTag =
  | "NO_ATTENDANCE"
  | "NO_EXAM"
  | "NO_GROUP_WORK"
  | "KIND_INSTRUCTOR"
  | "NO_PREREQUISITE"
  | "EASY_GRADE";

export type ElectiveSearchParams = {
  academicYear: number;
  currentSemester: number;    // ภาคของตารางปัจจุบัน
  q?: string;
  semester?: 1 | 2;           // undefined = ทุกภาคเรียน
  day?: DayOfWeek;
  timeSlot?: TimeSlot;
  group?: InterestGroup;
  excludeConflicts?: boolean;
};

export type ElectiveSummary = {
  courseCode: string;
  courseName: string;         // อังกฤษ
  courseNameTh: string;
  credits: number;
  group: InterestGroup;
  requiresQuota: boolean;
  offeredSemesters: number[]; // [1] = "เปิดเฉพาะเทอม 1"
  tags: ElectiveTag[];
};

export type ElectiveSection = {
  sectionId: number;
  sectionNo: string;
  semester: number;
  instructor: string | null;  // null = "ไม่ระบุ"
  schedules: ScheduleSlot[];  // room เป็น null ได้
  selectable: boolean;        // อยู่ในภาคของตารางปัจจุบัน
  inTimetable: boolean;
  conflictWith: string[];     // ว่าง = ไม่ชน
};

export type ElectiveDetail = ElectiveSummary & {
  description: string[];
  sections: ElectiveSection[];
};

export const INTEREST_GROUP_LABELS: Record<InterestGroup, string> = {
  LANGUAGE: "หมวดภาษาและการสื่อสาร",
  PSYCHOLOGY: "หมวดจิตวิทยาและพฤติกรรมศาสตร์",
  SOCIETY: "หมวดสังคม วัฒนธรรม และสุขภาพ",
  SCIENCE: "หมวดวิทยาศาสตร์และเทคโนโลยี",
  MEDIA: "หมวดสื่อ สารสนเทศ และภาพยนตร์",
};

export const ELECTIVE_TAG_LABELS: Record<ElectiveTag, string> = {
  NO_ATTENDANCE: "ไม่เช็คชื่อ",
  NO_EXAM: "ไม่มีสอบ",
  NO_GROUP_WORK: "ไม่มีงานกลุ่ม",
  KIND_INSTRUCTOR: "อาจารย์ใจดี",
  NO_PREREQUISITE: "ไม่มีพื้นฐานเรียนได้",
  EASY_GRADE: "เก็บ A ง่าย",
};
```

`ScheduleSlot.room` ใน `features/courses/types.ts` ของ US1 เป็น `string` ต้องแก้เป็น `string | null` ให้ตรงกับ DB เป็นไฟล์ของ US1 ต้องบอกเจ้าของก่อนแก้ตาม CONTRIBUTING

## สิ่งที่ต้องอัปเดตเมื่อ implement (US6-T08)

- เพิ่ม 2 แถวในตาราง API ของ README:
  - `GET /api/electives?academicYear=2568&currentSemester=1&q=&semester=&day=&timeSlot=&group=&excludeConflicts=` — วิชาเสรีแนะนำพร้อมตัวกรอง (US6)
  - `GET /api/electives/{courseCode}?academicYear=2568&currentSemester=1` — รายละเอียดวิชาเสรี Sec และรีวิว (US6)

## เอกสารที่เกี่ยวข้อง

- UI Prototype: [`ui-prototype/`](./ui-prototype)
- [US1 — DTO & API Spec](../../US1/T05/US1-DTO%20&%20API%20Spec.md) (`ScheduleSlotResponse`, กติกาเวลาชน, `POST /api/timetable/entries`)
- [US3 — DTO & API Spec](../../US3/T05/US3-DTO-API-Spec.md) (JWT และ 401)
- การ์ด [US6](https://trello.com/c/wZz1wdtW), [US6-T05](https://trello.com/c/VyuYYnJR), [US6-T06](https://trello.com/c/Br0vcBaA), [US6-T08](https://trello.com/c/8jpVcF9c)
