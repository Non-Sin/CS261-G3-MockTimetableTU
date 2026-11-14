# US8 — DTO & API Spec: จัดตารางเรียนอัตโนมัติตามแผนการเรียน

Nov 3, 2026 · @Non

## ภาพรวม

นักศึกษาเลือก **แผนการเรียน (Preset)** ของชั้นปีและภาคเรียนของตัวเอง แล้วระบบเลือกกลุ่มเรียน (section) ของทุกวิชาในแผนลงตารางเรียนจำลองให้ในครั้งเดียว วิชาที่ลงไม่ได้จะถูก**ข้ามและแจ้งเหตุผลเป็นรายวิชา** ส่วนวิชาอื่นยังเพิ่มได้ตามปกติ (ไม่ fail ทั้งชุด)

- **Preset ผูกกับหลักสูตร + ชั้นปี + ภาคเรียน ไม่ผูกกับปีการศึกษา (พ.ศ.)** preset เดียวใช้ได้ทุกปี ตอน apply ค่อยแปลงรหัสวิชาเป็น section ของ `academicYear` ที่ขอมา
- **นักศึกษาเลือกชั้นปีเอง** ระบบไม่คำนวณชั้นปีให้ เพราะนักศึกษาอาจต้องการจัดตามแผนของชั้นปีอื่น (เรียนซ้ำ/เรียนล่วงหน้า)
- **ชั้นปีที่ 3–4 ต้องเลือกแผน "ทำหัวข้อพิเศษ" หรือ "สหกิจศึกษา"** เพราะวิชาที่แนะนำต่างกัน แต่ละแผนเป็น preset แยกกันที่มี `planType` (`SPECIAL_PROJECT` / `CO_OP`) ชั้นปีที่ 1–2 มีแผนเดียว `planType` เป็น `null` ระบบไม่รู้ว่านักศึกษาเลือกแผนไหน (TU API ไม่บอก) จึงให้เลือกเองบนหน้าเว็บ และไม่ได้บันทึกค่าที่เลือกไว้ ใช้ชื่อ `planType` ไม่ใช้ `track` เพราะ `users.track` ของ US3 หมายถึงภาคปกติ/ภาคพิเศษ
- **ชั้นปีที่ 3–4 เลือกวิชาโทได้ 1 วิชาโท (หรือ "ไม่เรียนวิชาโท")** ชั้นปีที่ 1–2 เลือกวิชาโทไม่ได้ วิชาโทเป็นชุดวิชาเสริมแยกจาก preset (`StudyMinor`) มีรายวิชาแยกตามชั้นปี/ภาคเรียน ตอน apply ระบบรวมวิชาของแผนหลักกับวิชาโทแล้วจัดพร้อมกัน แต่**วิชาของแผนหลักมาก่อนเสมอ** วิชาโทจะไม่ทำให้วิชาของแผนหลักหลุด ค่าเริ่มต้นคือ "ไม่เรียนวิชาโท" และไม่ได้บันทึกค่าที่เลือกไว้ เช่นเดียวกับ `planType`
- **ระบบไม่รู้หลักสูตรของนักศึกษา** (TU API ให้แค่ `department`) จึงกรอง preset ด้วย `department` + `studyYear` ที่เลือก + `semester` ถ้าได้มากกว่า 1 หลักสูตร ให้นักศึกษาเลือกเอง
- **เวลาชนใน US8 = ข้ามวิชา** ต่างจาก US1 ที่เพิ่มได้แล้วเตือน เพราะวิชาจาก preset ผู้ใช้ไม่ได้เลือกเอง ระบบจึงไม่ควรสร้างตารางที่ชนให้ ส่วน `POST /api/timetable/entries` ของ US1 ไม่เปลี่ยน
- **เลือก section ด้วย backtracking** หาชุด section ที่ลงได้มากวิชาที่สุดของทั้งแผน (ให้วิชาเอกมาก่อน) พร้อมตัดกิ่งและมีเพดานการค้นหา ผลไม่มีทางแย่กว่าการเลือกทีละวิชา (greedy)
- **ดูผลก่อนบันทึก (`dryRun`)** UI แสดงเป็น**รายการวิชา** ว่าจะเพิ่มวิชาไหน (Sec อะไร) และข้ามวิชาไหนเพราะอะไร ไม่ได้วาดตาราง ผู้ใช้กดยืนยันแล้วจึงบันทึกจริง
- **ยืนยันแล้วคืน `TimetableResponse` ของ US1** frontend วาด grid ต่อได้เลยโดยไม่ต้อง GET ซ้ำ
- **UI:** ตาม UI Prototype ใน [Google Stitch](https://stitch.withgoogle.com/projects/17068207687263442838)
- **นอกขอบเขต:** ภาคฤดูร้อน, การเลือกวิชาโทมากกว่า 1 วิชาโท, การเลือกวิชาโทเป็นรายวิชาเอง (ใช้ชุดวิชาตามที่ seed ไว้), การล้างตารางเดิมก่อน apply (เพิ่มต่อจากของเดิมเสมอ), การสร้าง/แก้ preset ผ่านหน้าเว็บ (seed ผ่าน migration)

## Endpoints

| Method | Path | ใช้กับส่วนไหนของหน้า |
| --- | --- | --- |
| GET | `/api/study-plans?studyYear=2&semester=1` | ปุ่มเลือก "ชั้นปี", "แผนการศึกษา" และ "วิชาโท" (ชั้นปีที่ 3–4) และ "ภาคการศึกษา" ให้เลือก |
| POST | `/api/timetable/apply-plan` | รายการวิชาที่จะลงตาราง (`dryRun: true`) และปุ่ม "ยืนยันจัดตาราง" (`dryRun: false`) ส่งแผนและวิชาโทที่เลือก |

ทุก endpoint ทำงานกับนักศึกษาที่ login อยู่ `studentId` มาจาก JWT ผ่าน `CurrentStudentProvider` เหมือน US1

## API Spec

### 1. GET /api/study-plans — แผนการเรียนที่เลือกได้

| Param | ชนิด | บังคับ | ตัวอย่าง | หมายเหตุ |
| --- | --- | --- | --- | --- |
| `studyYear` | int | ใช่ | 2 | ปุ่ม "ชั้นปี" ที่นักศึกษาเลือกเอง (1–4) |
| `semester` | int | ใช่ | 1 | ปุ่ม 1 หรือ 2 ตาม "ภาคเรียน" |

ไม่ต้องส่ง `academicYear` เพราะ preset ไม่ผูกกับปีการศึกษา กรองด้วย `users.department` ของนักศึกษา + `studyYear` + `semester` ตอบ `200` เป็น `StudyPlanListResponse`:

```json
{
  "department": "ภาควิชาวิทยาการคอมพิวเตอร์",
  "studyYear": 2,
  "semester": 1,
  "plans": [
    {
      "planId": 3,
      "curriculumName": "หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ (ฉบับปรับปรุง พ.ศ. 2566)",
      "studyYear": 2,
      "semester": 1,
      "planType": null,
      "totalCredits": 18,
      "courses": [
        { "courseCode": "CS221", "courseName": "Introduction to Computer System and Organization", "category": "MAJOR", "credits": 3 },
        { "courseCode": "CS213", "courseName": "Data Structures", "category": "MAJOR", "credits": 3 },
        { "courseCode": "EL295", "courseName": "Academic English and Study Skills 1", "category": "GENERAL_EDUCATION", "credits": 3 }
      ]
    }
  ],
  "minors": []
}
```

- `department` คือ `users.department` ตามที่ TU API ส่งมา (`ภาควิชาวิทยาการคอมพิวเตอร์`) ค่าใน seed ต้องสะกดตรงกัน
- ไม่พบแผน → `200` กับ `plans: []` ไม่ใช่ error UI แสดง "ยังไม่มีแผนการเรียนสำหรับชั้นปีนี้" เช่น ชั้นปีที่ 4 ภาค 2 ที่มีแต่วิชาเลือกเสรี
- backend ไม่คำนวณชั้นปี ใช้ค่า `studyYear` ที่ส่งมาตรง ๆ และตอบกลับใน response ให้ UI แสดง "แผนการเรียนชั้นปีที่ 2" ส่วนปุ่ม "ชั้นปี" ไม่มีค่าเริ่มต้น นักศึกษาต้องเลือกก่อนจึงจะเรียก endpoint นี้
- `courses` เป็นข้อมูลของ preset เท่านั้น ยังไม่บอกว่าภาคนี้เปิดสอนหรือไม่ ผลจริงดูจาก `apply-plan` แบบ `dryRun`

**ชั้นปีที่ 3–4 (เลือกแผน):** endpoint และ query param เหมือนเดิม ไม่มี param `planType` แต่ `plans` จะมี preset ของทั้ง 2 แผน (ต่อหลักสูตร) เช่น `GET /api/study-plans?studyYear=3&semester=1`

```json
{
  "department": "ภาควิชาวิทยาการคอมพิวเตอร์",
  "studyYear": 3,
  "semester": 1,
  "plans": [
    { "planId": 6, "curriculumName": "หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ (ฉบับปรับปรุง พ.ศ. 2566)", "studyYear": 3, "semester": 1, "planType": "SPECIAL_PROJECT", "totalCredits": 15, "courses": [ ... ] },
    { "planId": 5, "curriculumName": "หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ (ฉบับปรับปรุง พ.ศ. 2566)", "studyYear": 3, "semester": 1, "planType": "CO_OP", "totalCredits": 12, "courses": [ ... ] }
  ],
  "minors": [
    {
      "minorId": 1,
      "planType": "SPECIAL_PROJECT",
      "curriculumName": "หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ (ฉบับปรับปรุง พ.ศ. 2566)",
      "minorName": "วิทยาการข้อมูล",
      "totalCredits": 6,
      "courses": [
        { "courseCode": "CS345", "courseName": "Practical Machine Learning", "category": "MINOR", "credits": 3 },
        { "courseCode": "CS346", "courseName": "Big Data Applications and Analytics", "category": "MINOR", "credits": 3 }
      ]
    },
    {
      "minorId": 1,
      "planType": "CO_OP",
      "curriculumName": "หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ (ฉบับปรับปรุง พ.ศ. 2566)",
      "minorName": "วิทยาการข้อมูล",
      "totalCredits": 9,
      "courses": [
        { "courseCode": "CS440", "courseName": "Selected Topics in Data Science", "category": "MINOR", "credits": 3 },
        { "courseCode": "CS345", "courseName": "Practical Machine Learning", "category": "MINOR", "credits": 3 },
        { "courseCode": "CS346", "courseName": "Big Data Applications and Analytics", "category": "MINOR", "credits": 3 }
      ]
    }
  ]
}
```

- `plans` เรียงตาม `curriculumName` แล้วตาม `planType` (`SPECIAL_PROJECT` → `CO_OP`) ให้ลำดับคงที่
- UI แสดงกลุ่มปุ่ม "เลือกแผนการศึกษา" (เลือกได้ 1 แผน) เมื่อ `plans` มี `planType` ที่ไม่ใช่ `null` แล้วกรอง `plans` ฝั่ง frontend ตามแผนที่เลือก ได้ preset 1 ตัว จึงส่ง `planId` นั้นไป `apply-plan` ตามปกติ ปุ่มแผนไม่มีค่าเริ่มต้น นักศึกษาต้องเลือกก่อนจึงแสดงรายการวิชา
- เปลี่ยนภาคเรียนแล้วแผนที่เลือกยังคงอยู่ (UI จำ `planType` ไม่ใช่ `planId`) เปลี่ยนชั้นปีไปปี 1–2 ล้างค่าแผนที่เลือก
- ภาคที่ทั้ง 2 แผนเรียนวิชาเหมือนกัน ยัง seed เป็น 2 preset แยกกัน (วิชาซ้ำ) เพื่อให้ UI ใช้ logic เดียวทุกภาคของปี 3–4
- ไม่ต้องแก้ `apply-plan` เพราะ `planId` บอกแผนอยู่แล้ว
- วิชาสหกิจศึกษาที่ section ไม่มีคาบเรียน (ไม่มี `schedules`) ไม่ชนกับวิชาใด จึงถูกเพิ่มได้ตามปกติ ถ้าภาคนั้นไม่มี section เลยได้ `NO_SECTION_AVAILABLE` เหมือนวิชาอื่น

**วิชาโท (`minors`):** อยู่ระดับบนของ response ไม่ได้อยู่ใน preset เพราะเลือกได้อิสระจากแผน (หัวข้อพิเศษ/สหกิจ) แต่**วิชาของวิชาโทขึ้นกับแผน** เล่มหลักสูตรวางวิชาโทบางวิชาของแผนสหกิจไว้คนละภาคกับแผนหัวข้อพิเศษ (เช่น CS440 แผนหัวข้อพิเศษเรียนปี 4/1 แต่แผนสหกิจเรียนปี 3/1 เพราะปี 4/1 ออกสหกิจ)

- **1 รายการ = 1 วิชาโท × 1 แผน** แต่ละรายการมี `planType` (`SPECIAL_PROJECT` / `CO_OP`) และ `courses` ของแผนนั้น วิชาโทเดียวกันจึงมีได้ 2 รายการที่ `minorId` เดียวกัน UI กรอง `minors` ตาม `planType` ของแผนที่เลือก แบบเดียวกับ `plans` (เพิ่มใน US8-T09 ตาม `study_minor_course.plan_type`)
- วิชาโทที่ไม่มีวิชาในภาคนี้ของแผนใด ไม่มีรายการของแผนนั้น เช่น ชั้นปีที่ 4 ภาค 1 แผนสหกิจไม่มีวิชาโท จึงมีแต่รายการ `SPECIAL_PROJECT`
- **เฉพาะชั้นปีที่ 3–4:** `studyYear` 1–2 ได้ `minors: []` เสมอ (DB บังคับให้วิชาของวิชาโทอยู่ปี 3–4 เท่านั้น) UI แสดงกลุ่มปุ่ม "เลือกวิชาโท" เฉพาะเมื่อเลือกชั้นปีที่ 3–4 และเปลี่ยนไปปี 1–2 ให้ล้างวิชาโทที่เลือกกลับเป็น "ไม่เรียนวิชาโท"
- `minors` มีเฉพาะวิชาโทของ `department` นักศึกษาที่**มีวิชาใน `studyYear` + `semester` นี้ของแผนนั้น** เรียงตาม `sortOrder` ของวิชาโท แล้วตาม `planType` (`SPECIAL_PROJECT` → `CO_OP`) ไม่มีรายการของแผนที่เลือก → UI ซ่อนกลุ่มปุ่ม "เลือกวิชาโท"
- `courses` / `totalCredits` ของวิชาโท คือเฉพาะวิชาของภาคที่ขอของแผนนั้น ไม่ใช่ทั้งวิชาโท
- ถ้ามีหลายหลักสูตร UI แสดงเฉพาะวิชาโทที่ `curriculumName` ตรงกับ preset ที่เลือก
- UI มีปุ่ม "ไม่เรียนวิชาโท" เป็นตัวเลือกแรกและเป็นค่าเริ่มต้น (ไม่ได้มาจาก API) เลือกได้ 1 อย่าง
- เปลี่ยนภาคเรียนหรือแผนแล้ววิชาโทที่เลือกยังอยู่ (UI จำ `minorId`) ถ้าภาคหรือแผนใหม่ไม่มีรายการของวิชาโทนั้นใน `minors` ให้กลับเป็น "ไม่เรียนวิชาโท"
- หัวรายการวิชาแสดงเช่น "วิชาแนะนำสำหรับ: ชั้นปีที่ 3 ภาคเรียนที่ 1 (แผนทำหัวข้อพิเศษ · วิชาโทวิทยาการข้อมูล)"

### 2. POST /api/timetable/apply-plan — จัดตารางตามแผน

```json
{ "planId": 8, "minorId": 1, "academicYear": 2568, "dryRun": true }
```

| Field | ชนิด | บังคับ | หมายเหตุ |
| --- | --- | --- | --- |
| `planId` | long | ใช่ | จากข้อ 1 |
| `minorId` | long | ไม่ | จาก `minors` ของข้อ 1 ไม่ส่ง/`null` = ไม่เรียนวิชาโท |
| `academicYear` | int (พ.ศ.) | ใช่ | ปีการศึกษาของตารางที่จะลง |
| `dryRun` | boolean | ไม่ (default `false`) | `true` = คำนวณผลแต่ไม่บันทึก |

ภาคเรียนอ่านจาก `semester` ของ preset จึงไม่ต้องส่งมา (แนวเดียวกับ US1 ที่อ่านภาคจาก section) วิชาโทใช้วิชาของ `planType` + `studyYear` + `semester` ของ preset (ไม่ต้องส่ง `planType` เพราะ `planId` บอกอยู่แล้ว) ตอบ `200` เป็น `ApplyPlanResponse` ทั้งสองโหมด แม้ `added` จะว่างก็ไม่ใช่ error

```json
{
  "planId": 8,
  "minorId": 1,
  "dryRun": true,
  "added": [
    {
      "courseCode": "CS372",
      "courseName": "Machine Learning",
      "category": "MAJOR",
      "credits": 3,
      "source": "PLAN",
      "sectionId": 401,
      "sectionNo": "040001"
    }
  ],
  "skipped": [
    {
      "courseCode": "CS246",
      "courseName": "Data Visualization",
      "category": "MINOR",
      "credits": 3,
      "source": "MINOR",
      "reason": "TIME_CONFLICT",
      "conflictWith": ["CS332", "CS314"],
      "message": "CS246 ทุกกลุ่มเรียนเวลาชนกับ CS332, CS314"
    },
    {
      "courseCode": "CS305",
      "courseName": "Social and Professional Ethics",
      "category": "MAJOR",
      "credits": 3,
      "source": "PLAN",
      "reason": "COURSE_ALREADY_IN_TIMETABLE",
      "existingSectionNo": "090001",
      "message": "CS305 อยู่ในตารางแล้ว (Sec 090001)"
    }
  ],
  "timetable": null
}
```

ตัวอย่างข้างบนคือแผนหัวข้อพิเศษ ชั้นปีที่ 3 ภาค 2 + วิชาโทวิทยาการข้อมูล ตาม seed (CS246 พ./ศ. 09:30–11:00 ชนกับ CS332 พ. 08:00–11:00 และ CS314 ศ. 08:00–11:00) ตัด `added` / `skipped` ให้สั้น

- `source` บอกว่าวิชามาจากแผนหลัก (`PLAN`) หรือวิชาโท (`MINOR`) UI ใช้แสดงป้าย "วิชาโท" · `minorId` ใน response เป็น `null` เมื่อไม่เลือกวิชาโท
- วิชาที่อยู่ทั้งในแผนหลักและวิชาโท นับเป็นวิชาเดียว `source: "PLAN"`
- `dryRun: true` → ไม่เขียน DB และ `timetable: null` UI แสดงรายการวิชาจาก `added` (ชื่อวิชา, Sec, หน่วยกิต) กับ `skipped` (เหตุผลจาก `message`/`reason`) ไม่ได้วาด grid
- `dryRun: false` → บันทึก `added` ทั้งหมดใน transaction เดียว แล้วคืน `timetable` เป็น `TimetableResponse` ของ US1 (ตารางหลังเพิ่มแล้ว) ถ้ายังไม่มีตารางของภาคนั้นจะสร้างให้ ถ้า `added` ว่างจะไม่เขียน DB และ `updatedAt` ไม่เปลี่ยน
- ตอนยืนยัน backend **คำนวณใหม่ทั้งหมด** ไม่ใช้ผลของ dryRun ครั้งก่อน (ระหว่างนั้นตารางอาจถูกแก้ในแท็บอื่น) UI ต้องแสดงผลจาก response ของการยืนยัน ไม่ใช่ผลของ preview
- `timetable.conflicts` ยังมีได้ ถ้าตารางเดิมมีวิชาชนกันอยู่แล้วก่อน apply (US8 ไม่ลบวิชาเดิม) แต่วิชาที่ US8 เพิ่มจะไม่ชนกับวิชาใดเลย

## วิธีเลือก section (backtracking)

ระบบหา**ชุด section ที่ดีที่สุด**ของทั้งแผนพร้อมกัน ไม่ได้เลือกทีละวิชาแล้วปล่อยไว้ (greedy) เพราะ greedy อาจข้ามวิชาที่จริง ๆ ลงได้ ถ้าเลือก section ของวิชาก่อนหน้าต่างไป แต่ระบบไม่ได้ลองทุกชุด (จำนวนชุด = จำนวน section ของทุกวิชาคูณกัน) เพราะใช้การตัดกิ่งทิ้งตามขั้นตอนด้านล่าง

### ขั้นที่ 1 — กรองก่อนค้นหา

1. โหลด preset (ไม่พบ → 404) วิชาโทถ้าส่ง `minorId` (preset เป็นชั้นปีที่ 1–2 → 400 `MINOR_NOT_ALLOWED`, ไม่พบ → 404, คนละ `department`/`curriculumName` กับ preset → 400 `MINOR_PLAN_MISMATCH`) และ entry ที่มีอยู่ของ `(studentId, academicYear, plan.semester)` รวมวิชาของแผน (`PLAN`) กับวิชาโทของ `plan.planType` + `plan.studyYear` + `plan.semester` (`MINOR`) ตัดวิชาโทที่ซ้ำกับแผนออก
2. วิชาที่ตัดออกก่อนค้นหา ใส่ `skipped` ทันที:

| `reason` | เกิดเมื่อ | field เพิ่ม |
| --- | --- | --- |
| `COURSE_ALREADY_IN_TIMETABLE` | มีวิชานี้ในตารางแล้ว ไม่ว่ากลุ่มไหน (code เดียวกับ US1) | `existingSectionNo` |
| `NO_SECTION_AVAILABLE` | ภาคนี้ไม่มี section ของวิชานี้ | — |

3. ตัด section ที่ชนกับวิชาในตารางเดิมทิ้ง วิชาที่ไม่เหลือ section เลยได้ `TIME_CONFLICT` ทันที
4. **รวม section ที่เวลาเหมือนกัน** (ทุกคาบตรงกันทั้งวัน เวลาเริ่ม และเวลาจบ) เป็นกลุ่มเวลาเดียว ใช้ section ที่ `sectionNo` น้อยที่สุดเป็นตัวแทน เช่นวิชาศึกษาทั่วไปที่เปิด 30 กลุ่ม มักเหลือ 4–6 กลุ่มเวลา ห้องและผู้สอนไม่มีผลกับการชน จึงไม่ต้องลองทุก section

### ขั้นที่ 2 — ค้นหา

- **ลำดับการวาง:** วิชาที่มีกลุ่มเวลาน้อยที่สุดวางก่อน เท่ากันให้เรียงตามลำดับในแผน (`PLAN` → `MINOR` แล้วตามหมวดวิชา `MAJOR` → `MINOR` → `GENERAL_EDUCATION` → `FREE_ELECTIVE` แล้วตาม `sortOrder` · หมวด `MINOR` ของ `course.category` คนละอย่างกับ `source: MINOR`) วิชาที่มีทางเลือกน้อยจะตัดกิ่งได้เร็ว ลำดับนี้มีผลแค่กับความเร็ว ไม่มีผลกับคำตอบ
- **แต่ละวิชามีทางเลือก** = ทุกกลุ่มเวลาที่ไม่ชนกับวิชาที่วางไปแล้ว และไม่ทำให้หน่วยกิตรวมเกิน `maxCredits` + "ข้ามวิชานี้" (ลองเป็นทางเลือกสุดท้าย)
- **ตัดกิ่งเมื่อชน:** กลุ่มเวลาที่ชนกับวิชาที่วางแล้วไม่ถูกลอง วิชาที่เหลือในกิ่งนั้นจึงไม่ถูกลองต่อ
- **Branch and bound:** ก่อนลงกิ่งใด ถ้าคะแนนสูงสุดที่เป็นไปได้ (วิชาที่วางแล้ว + วิชาที่ยังเหลือทั้งหมด) ไม่ชนะคำตอบที่ดีที่สุดตอนนี้ ให้ตัดกิ่งนั้นทิ้ง
- **หยุดเร็ว:** เจอชุดที่ลงครบทุกวิชาที่เหลือจากขั้นที่ 1 → หยุดทันที (กรณีส่วนใหญ่)
- **เพดาน:** ค้นหาได้ไม่เกิน `50,000` node (ตั้งใน config) ถ้าถึงเพดาน คืนคำตอบที่ดีที่สุดที่เจอ คำตอบเริ่มต้นคือผลของ greedy (วางตามลำดับในแผน เลือกกลุ่มเวลาแรกที่ลงได้) ผลจึง**ไม่มีทางแย่กว่า greedy** ใช้จำนวน node แทนเวลา เพื่อให้ผลเหมือนกันทุกครั้งที่รัน และเขียน test ได้

### เกณฑ์ "ดีที่สุด"

เทียบตามลำดับ ข้อแรกที่ต่างกันเป็นตัวตัดสิน:

1. จำนวนวิชา `MAJOR` ของแผนหลัก (`PLAN`) ที่ได้มากกว่า
2. จำนวนวิชาของแผนหลักที่ได้มากกว่า
3. จำนวนวิชาโท (`MINOR`) ที่ได้มากกว่า
4. หน่วยกิตรวมมากกว่า
5. เทียบ `sectionNo` ที่เลือกของแต่ละวิชาตามลำดับในแผน ชุดที่น้อยกว่าชนะ (ทำให้ผลคาดเดาได้)

ข้อ 1–2 นับเฉพาะ `PLAN` จึงไม่มีชุดไหนที่ได้วิชาโทเพิ่มโดยเสียวิชาของแผนหลัก ถ้าไม่เลือกวิชาโท ข้อ 3 เท่ากันทุกชุด ผลจึงเหมือนก่อนเพิ่มวิชาโท

ข้อจำกัดที่ห้ามละเมิดระหว่างค้นหา: ห้ามชนกับวิชาใดเลย และหน่วยกิตรวม (เดิม + ที่เพิ่ม) ห้ามเกิน `maxCredits`

### ขั้นที่ 3 — สรุปผล

วิชาที่อยู่ในคำตอบใส่ `added` พร้อม section ตัวแทนของกลุ่มเวลาที่เลือก วิชาที่ไม่ได้อยู่ในคำตอบใส่ `skipped` โดยดูเทียบกับ**ตารางสุดท้าย** (เดิม + `added`):

| `reason` | เกิดเมื่อ | field เพิ่ม |
| --- | --- | --- |
| `CREDIT_LIMIT_EXCEEDED` | มีกลุ่มเวลาที่ไม่ชนกับตารางสุดท้าย แต่เพิ่มแล้วหน่วยกิตเกิน `maxCredits` (code เดียวกับ US1) | `currentCredits`, `maxCredits` |
| `TIME_CONFLICT` | ทุกกลุ่มเวลาชนกับวิชาในตารางสุดท้าย | `conflictWith` |

`conflictWith` คือรหัสวิชาในตารางสุดท้ายที่ชนกับ section ใด ๆ ของวิชานี้ (ไม่ซ้ำ เรียงตามลำดับที่อยู่ในตาราง) UI ใช้แสดง "ชนกับ CS332, CS314"

เงื่อนไขเวลาชนใช้สูตรเดียวกับ US1: วันเดียวกันและ `a.startTime < b.endTime && b.startTime < a.endTime` คาบต่อกันพอดีไม่นับ ควรแยก method ตรวจคาบชนใน `TimetableService` ออกมาให้ US1 และ US8 ใช้ร่วมกัน ฝั่ง backend แยกอัลกอริทึมเป็น class `PlanScheduler` ที่ไม่ยุ่งกับ DB (รับวิชา/section/ตารางเดิม คืน `added`/`skipped`) เพื่อให้ unit test ได้โดยไม่ต้องมี DB

ขนาดข้อมูลจริงของโปรเจกต์ (6–9 วิชาต่อแผน) หลังรวมกลุ่มเวลาแล้วคาดว่าค้นหาไม่เกินไม่กี่พัน node ใช้เวลาไม่ถึงมิลลิวินาที เพดาน 50,000 node มีไว้กันกรณีข้อมูลผิดปกติเท่านั้น

## Error

ตอบเป็น ProblemDetail ตาม US1 สาเหตุรายวิชาข้างบน**ไม่ใช่ HTTP error** แต่อยู่ใน `skipped`

| code | HTTP | เกิดเมื่อ |
| --- | --- | --- |
| — | 400 | ไม่ส่ง `studyYear`/`semester` หรือค่าอยู่นอกช่วง (`studyYear` 1–4, `semester` 1–2) (ข้อ 1) / ไม่ส่ง `planId`/`academicYear` (ข้อ 2) |
| `MINOR_NOT_ALLOWED` | 400 | ส่ง `minorId` มากับ preset ชั้นปีที่ 1–2 (ตรวจก่อนหาวิชาโท ใช้ `BusinessRuleException` เดิม) |
| `MINOR_PLAN_MISMATCH` | 400 | วิชาโทคนละ `department` หรือ `curriculumName` กับ preset (ใช้ `BusinessRuleException` เดิม ไม่ต้องแก้ handler) |
| — | 404 | ไม่พบ `planId` หรือ `minorId` (ใช้ `ResourceNotFoundException` เดิม) |

ไม่ห้าม apply preset ของสาขาอื่น เพราะเป็นตารางจำลอง และ backend ไม่ได้ตรวจสาขาใน `POST /api/timetable/entries` อยู่แล้ว

## ข้อมูล preset

โครงสร้างตารางฉบับที่ใช้จริงอยู่ใน [US8-T06 ER Diagram](../T06/US8-T06-ER-Diagram.md) และ migration `V20261114_1707__create_study_plan_tables.sql` (ข้อเสนอเดิมในหัวข้อนี้ถูกแทนที่แล้ว) สรุปส่วนที่ API ต้องรู้

| ตาราง | สาระสำคัญ |
| --- | --- |
| `study_plan` | 1 แถวต่อหลักสูตร + ชั้นปี + ภาค (+ `plan_type` ของปี 3–4) · `ck_study_plan_plan_type` บังคับให้ปี 1–2 เป็น `NULL` และปี 3–4 ต้องเป็น `SPECIAL_PROJECT` หรือ `CO_OP` (มี `plan_type IS NOT NULL` เพราะ CHECK ของ SQL Server ถือว่า UNKNOWN ผ่าน) |
| `study_plan_course` | วิชาในแผน + `sort_order` |
| `study_minor` | 1 แถวต่อ 1 วิชาโท ไม่ผูกกับแผน |
| `study_minor_course` | วิชาในวิชาโท + `plan_type` + `study_year` / `semester` / `sort_order` · PK (`minor_id`, `course_code`, `plan_type`) วิชาเดียวกันอยู่คนละภาคได้ตามแผน (เพิ่มใน US8-T09) |

`GET /api/study-plans` ดึงวิชาโทที่มีวิชาตรง `studyYear` + `semester` ของแผนใดแผนหนึ่ง แล้วแยกเป็นรายการตาม `planType` ส่วน `apply-plan` ใช้วิชาโทของ `planType` ของ preset

entity เก็บ `planType` เป็น `@Enumerated(EnumType.STRING)` · `uq_study_plan` ของ SQL Server นับ `NULL` เป็นค่าเดียวกัน ปี 1–2 จึงมีได้ 1 preset ต่อหลักสูตร/ภาค

preset อ้างอิง `course_code` ไม่ใช่ `section_id` เพราะ section เปลี่ยนทุกภาค ส่วนวิชาเลือกเสรี/วิชาเลือกที่แผนไม่ได้ระบุรหัส ไม่ใส่ใน preset (นักศึกษาเพิ่มเองผ่าน US1) ข้อมูลจริง seed ใน `db/seed/V20261114_2100__seed_study_plans.sql` (US8-T09) จากตารางเรียนตามแผน (Excel) และเล่มหลักสูตร 2566 วิชาที่เป็นวิชาโทอย่างเดียวมีหมวด `MINOR` (เพิ่มใน `CourseCategory` ของ US1)

## TypeScript types (frontend)

```ts
// frontend/features/study-plan/types.ts — ต้องตรงกับ studyplan.dto ฝั่ง backend
import type { CourseCategory } from "@/features/courses/types";
import type { Timetable } from "@/features/timetable/types";

export type StudyPlanCourse = {
  courseCode: string;
  courseName: string;
  category: CourseCategory;
  credits: number;
};

export type PlanType = "SPECIAL_PROJECT" | "CO_OP"; // UI แสดง "ทำหัวข้อพิเศษ" / "สหกิจศึกษา"

export type StudyPlan = {
  planId: number;
  curriculumName: string;
  studyYear: number;
  semester: number;
  planType: PlanType | null; // null = ชั้นปีที่ 1–2
  totalCredits: number;
  courses: StudyPlanCourse[];
};

export type StudyMinor = {
  minorId: number;
  planType: PlanType;          // 1 รายการต่อ 1 วิชาโท × 1 แผน UI กรองตามแผนที่เลือก
  curriculumName: string;
  minorName: string;
  totalCredits: number;        // เฉพาะวิชาของภาคที่ขอของแผนนั้น
  courses: StudyPlanCourse[];
};

export type StudyPlanList = {
  department: string;
  studyYear: number;
  semester: number;
  plans: StudyPlan[];
  minors: StudyMinor[];        // [] = ซ่อนกลุ่มปุ่ม "เลือกวิชาโท" · ชั้นปีที่ 1–2 ได้ [] เสมอ
};

export type StudyPlanQuery = { studyYear: 1 | 2 | 3 | 4; semester: 1 | 2 }; // นักศึกษาเลือกเองจากปุ่มชั้นปี/ภาคเรียน

export type ApplyPlanRequest = {
  planId: number;
  minorId?: number | null;     // ไม่ส่ง/null = ไม่เรียนวิชาโท
  academicYear: number;
  dryRun?: boolean;
};

export type PlanCourseSource = "PLAN" | "MINOR";

export type PlanSkipReason =
  | "COURSE_ALREADY_IN_TIMETABLE"
  | "NO_SECTION_AVAILABLE"
  | "CREDIT_LIMIT_EXCEEDED"
  | "TIME_CONFLICT";

export type AddedPlanCourse = StudyPlanCourse & { source: PlanCourseSource; sectionId: number; sectionNo: string };

export type SkippedPlanCourse = StudyPlanCourse & {
  source: PlanCourseSource;
  reason: PlanSkipReason;
  message: string;
  conflictWith?: string[];    // TIME_CONFLICT
  existingSectionNo?: string; // COURSE_ALREADY_IN_TIMETABLE
  currentCredits?: number;    // CREDIT_LIMIT_EXCEEDED
  maxCredits?: number;        // CREDIT_LIMIT_EXCEEDED
};

export type ApplyPlanResponse = {
  planId: number;
  minorId: number | null;
  dryRun: boolean;
  added: AddedPlanCourse[];
  skipped: SkippedPlanCourse[];
  timetable: Timetable | null; // dryRun: true = null
};
```

## สิ่งที่ US8 ควรออกแบบเทสต์ (ข้อเสนอ)

- `GET /api/study-plans` กรองตาม `department` ของนักศึกษา + `studyYear` + `semester` ที่ส่งมา, ไม่มีแผนได้ `plans: []`, ไม่ส่ง `studyYear` หรือส่ง 0/5 → 400
- `studyYear=3` ได้ 2 preset `planType` เป็น `SPECIAL_PROJECT` แล้ว `CO_OP` ตามลำดับ, `studyYear=2` ได้ `planType: null`
- apply preset `CO_OP` ได้วิชาของแผนสหกิจ ไม่มีวิชาของแผนหัวข้อพิเศษปน, วิชาที่ section ไม่มีคาบเรียนอยู่ใน `added` ไม่ถูกนับว่าชน
- `GET` ได้ `minors` เฉพาะวิชาโทที่มีวิชาในชั้นปี/ภาคที่ขอ, ไม่มี → `minors: []`, `studyYear=1` และ `2` ได้ `minors: []` เสมอ
- `GET studyYear=3&semester=1` ได้วิชาโทเดียวกัน 2 รายการ (`SPECIAL_PROJECT` / `CO_OP`) ที่ `courses` ต่างกัน (เช่น CS440 อยู่เฉพาะรายการ `CO_OP`), `studyYear=4&semester=1` มีเฉพาะรายการ `SPECIAL_PROJECT`
- apply preset `CO_OP` ปี 3/1 + วิชาโทวิทยาการข้อมูล → ได้ CS440 ด้วย, apply preset `SPECIAL_PROJECT` ปี 3/1 + วิชาโทเดียวกัน → ไม่มี CS440
- ไม่ส่ง `minorId` → ผลเหมือนก่อนมีวิชาโท และ `minorId: null`
- ส่ง `minorId` → วิชาโทอยู่ใน `added` พร้อม `source: "MINOR"`
- วิชาโทชนกับวิชาแผนหลักทุก section → วิชาแผนหลักถูกเพิ่ม วิชาโทเป็น `TIME_CONFLICT` (แม้วิชาโทจะมีหน่วยกิตมากกว่า)
- แผนหลัก + วิชาโทเกิน `maxCredits` → วิชาโทเป็น `CREDIT_LIMIT_EXCEEDED` ก่อนวิชาแผนหลัก
- วิชาที่อยู่ทั้งในแผนและวิชาโท → ถูกเพิ่มครั้งเดียว `source: "PLAN"`
- `minorId` ไม่มีอยู่ → 404, วิชาโทคนละหลักสูตรกับ preset → 400 `MINOR_PLAN_MISMATCH`, ส่ง `minorId` กับ preset ชั้นปีที่ 2 → 400 `MINOR_NOT_ALLOWED` และไม่เขียน DB
- ตารางว่าง + ทุกวิชาไม่ชน → ทุกวิชาอยู่ใน `added`, `skipped: []`
- MAJOR กับ GENERAL_EDUCATION ชนกันทุก section → MAJOR ถูกเพิ่ม อีกวิชาเป็น `TIME_CONFLICT` และ `conflictWith` ถูกต้อง
- section แรกชน แต่ section ที่ 2 ไม่ชน → เลือก section ที่ 2
- **กรณีที่ greedy พลาด:** A มี Sec 1 (จ. 09:30) และ Sec 2 (อ. 09:30), B มีแค่ Sec 1 (จ. 09:30) → greedy เลือก A Sec 1 แล้วข้าม B แต่ backtracking ได้ A Sec 2 + B Sec 1 ครบทั้งสองวิชา
- section หลายกลุ่มที่เวลาเหมือนกันทุกคาบ → ลองแค่กลุ่มเดียว และคืน `sectionNo` น้อยที่สุด
- ลงได้ 2 ชุดที่ดีเท่ากัน → ได้ชุดที่ `sectionNo` น้อยกว่าตามลำดับในแผน (รันกี่ครั้งก็ได้ผลเดิม)
- ตั้งเพดาน node ต่ำ (เช่น 1) ใน test → ได้ผลเท่ากับ greedy ไม่ error
- unit test `PlanScheduler` โดยไม่ใช้ DB
- วิชาที่มีในตารางแล้ว → `COURSE_ALREADY_IN_TIMETABLE` และไม่ถูกเพิ่มซ้ำ
- ภาคนี้ไม่เปิดสอน → `NO_SECTION_AVAILABLE`
- หน่วยกิตรวมของแผนเกิน 22 → ได้วิชามากที่สุดที่หน่วยกิตไม่เกิน วิชาที่ไม่ได้และไม่ชนเวลาเป็น `CREDIT_LIMIT_EXCEEDED`
- คาบต่อกันพอดีไม่นับเป็นชน
- `dryRun: true` ไม่เขียน DB (`GET /api/timetable` ได้ผลเดิม) และได้ `timetable: null`, `dryRun: false` บันทึกตรงกับ preview เมื่อตารางไม่เปลี่ยน
- `planId` ไม่มีอยู่ → 404, ไม่ส่ง `academicYear` → 400

## เอกสารที่เกี่ยวข้อง

- [DTO Class Diagram](./US8-DTO-Class-Diagram.md)
- [API Class Diagram](./US8-API-Class-Diagram.md)
- [US1 — DTO & API Spec](../../US1/T05/US1-DTO%20&%20API%20Spec.md)
- [US3 — DTO & API Spec](../../US3/T05/US3-DTO-API-Spec.md) (`department` และข้อมูลนักศึกษา)
