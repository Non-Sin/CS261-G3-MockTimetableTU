# US8 — DTO & API Spec: จัดตารางเรียนอัตโนมัติตามแผนการเรียน

Nov 3, 2026 · @Non

## ภาพรวม

นักศึกษาเลือก **แผนการเรียน (Preset)** ของชั้นปีและภาคเรียนของตัวเอง แล้วระบบเลือกกลุ่มเรียน (section) ของทุกวิชาในแผนลงตารางเรียนจำลองให้ในครั้งเดียว วิชาที่ลงไม่ได้จะถูก**ข้ามและแจ้งเหตุผลเป็นรายวิชา** ส่วนวิชาอื่นยังเพิ่มได้ตามปกติ (ไม่ fail ทั้งชุด)

- **Preset ผูกกับหลักสูตร + ชั้นปี + ภาคเรียน ไม่ผูกกับปีการศึกษา (พ.ศ.)** preset เดียวใช้ได้ทุกปี ตอน apply ค่อยแปลงรหัสวิชาเป็น section ของ `academicYear` ที่ขอมา
- **นักศึกษาเลือกชั้นปีเอง** ระบบไม่คำนวณชั้นปีให้ เพราะนักศึกษาอาจต้องการจัดตามแผนของชั้นปีอื่น (เรียนซ้ำ/เรียนล่วงหน้า)
- **ระบบไม่รู้หลักสูตรของนักศึกษา** (TU API ให้แค่ `department`) จึงกรอง preset ด้วย `department` + `studyYear` ที่เลือก + `semester` ถ้าได้มากกว่า 1 หลักสูตร ให้นักศึกษาเลือกเอง
- **เวลาชนใน US8 = ข้ามวิชา** ต่างจาก US1 ที่เพิ่มได้แล้วเตือน เพราะวิชาจาก preset ผู้ใช้ไม่ได้เลือกเอง ระบบจึงไม่ควรสร้างตารางที่ชนให้ ส่วน `POST /api/timetable/entries` ของ US1 ไม่เปลี่ยน
- **เลือก section ด้วย backtracking** หาชุด section ที่ลงได้มากวิชาที่สุดของทั้งแผน (ให้วิชาเอกมาก่อน) พร้อมตัดกิ่งและมีเพดานการค้นหา ผลไม่มีทางแย่กว่าการเลือกทีละวิชา (greedy)
- **ดูผลก่อนบันทึก (`dryRun`)** UI แสดงเป็น**รายการวิชา** ว่าจะเพิ่มวิชาไหน (Sec อะไร) และข้ามวิชาไหนเพราะอะไร ไม่ได้วาดตาราง ผู้ใช้กดยืนยันแล้วจึงบันทึกจริง
- **ยืนยันแล้วคืน `TimetableResponse` ของ US1** frontend วาด grid ต่อได้เลยโดยไม่ต้อง GET ซ้ำ
- **UI:** ตาม UI Prototype ใน [Google Stitch](https://stitch.withgoogle.com/projects/17068207687263442838)
- **นอกขอบเขต:** ภาคฤดูร้อน, การล้างตารางเดิมก่อน apply (เพิ่มต่อจากของเดิมเสมอ), การสร้าง/แก้ preset ผ่านหน้าเว็บ (seed ผ่าน migration)

## Endpoints

| Method | Path | ใช้กับส่วนไหนของหน้า |
| --- | --- | --- |
| GET | `/api/study-plans?studyYear=2&semester=1` | ปุ่มเลือก "ชั้นปี" และ "ภาคการศึกษา" ให้เลือก |
| POST | `/api/timetable/apply-plan` | รายการวิชาที่จะลงตาราง (`dryRun: true`) และปุ่ม "ยืนยันจัดตาราง" (`dryRun: false`) |

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
  "department": "วิทยาการคอมพิวเตอร์",
  "studyYear": 2,
  "semester": 1,
  "plans": [
    {
      "planId": 12,
      "curriculumName": "หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ (ฉบับปรับปรุง พ.ศ. 2566)",
      "studyYear": 2,
      "semester": 1,
      "totalCredits": 21,
      "courses": [
        { "courseCode": "CS211", "courseName": "DATA STRUCTURES AND ALGORITHMS", "category": "MAJOR", "credits": 3 },
        { "courseCode": "CS261", "courseName": "SOFTWARE ENGINEERING", "category": "MAJOR", "credits": 3 }
      ]
    }
  ]
}
```

- ไม่พบแผน → `200` กับ `plans: []` ไม่ใช่ error UI แสดง "ยังไม่มีแผนการเรียนสำหรับชั้นปีนี้"
- backend ไม่คำนวณชั้นปี ใช้ค่า `studyYear` ที่ส่งมาตรง ๆ และตอบกลับใน response ให้ UI แสดง "แผนการเรียนชั้นปีที่ 2" ส่วนปุ่ม "ชั้นปี" ไม่มีค่าเริ่มต้น นักศึกษาต้องเลือกก่อนจึงจะเรียก endpoint นี้
- `courses` เป็นข้อมูลของ preset เท่านั้น ยังไม่บอกว่าภาคนี้เปิดสอนหรือไม่ ผลจริงดูจาก `apply-plan` แบบ `dryRun`

### 2. POST /api/timetable/apply-plan — จัดตารางตามแผน

```json
{ "planId": 12, "academicYear": 2568, "dryRun": true }
```

| Field | ชนิด | บังคับ | หมายเหตุ |
| --- | --- | --- | --- |
| `planId` | long | ใช่ | จากข้อ 1 |
| `academicYear` | int (พ.ศ.) | ใช่ | ปีการศึกษาของตารางที่จะลง |
| `dryRun` | boolean | ไม่ (default `false`) | `true` = คำนวณผลแต่ไม่บันทึก |

ภาคเรียนอ่านจาก `semester` ของ preset จึงไม่ต้องส่งมา (แนวเดียวกับ US1 ที่อ่านภาคจาก section) ตอบ `200` เป็น `ApplyPlanResponse` ทั้งสองโหมด แม้ `added` จะว่างก็ไม่ใช่ error

```json
{
  "planId": 12,
  "dryRun": true,
  "added": [
    {
      "courseCode": "CS211",
      "courseName": "DATA STRUCTURES AND ALGORITHMS",
      "category": "MAJOR",
      "credits": 3,
      "sectionId": 401,
      "sectionNo": "010001"
    }
  ],
  "skipped": [
    {
      "courseCode": "CS284",
      "courseName": "INTRODUCTION TO SOFTWARE ENGINEERING",
      "category": "MAJOR",
      "credits": 3,
      "reason": "TIME_CONFLICT",
      "conflictWith": ["CS211"],
      "message": "CS284 ทุกกลุ่มเรียนเวลาชนกับ CS211"
    },
    {
      "courseCode": "TU100",
      "courseName": "CIVIC EDUCATION",
      "category": "GENERAL_EDUCATION",
      "credits": 3,
      "reason": "COURSE_ALREADY_IN_TIMETABLE",
      "existingSectionNo": "780002",
      "message": "TU100 อยู่ในตารางแล้ว (Sec 780002)"
    }
  ],
  "timetable": null
}
```

- `dryRun: true` → ไม่เขียน DB และ `timetable: null` UI แสดงรายการวิชาจาก `added` (ชื่อวิชา, Sec, หน่วยกิต) กับ `skipped` (เหตุผลจาก `message`/`reason`) ไม่ได้วาด grid
- `dryRun: false` → บันทึก `added` ทั้งหมดใน transaction เดียว แล้วคืน `timetable` เป็น `TimetableResponse` ของ US1 (ตารางหลังเพิ่มแล้ว) ถ้ายังไม่มีตารางของภาคนั้นจะสร้างให้ ถ้า `added` ว่างจะไม่เขียน DB และ `updatedAt` ไม่เปลี่ยน
- ตอนยืนยัน backend **คำนวณใหม่ทั้งหมด** ไม่ใช้ผลของ dryRun ครั้งก่อน (ระหว่างนั้นตารางอาจถูกแก้ในแท็บอื่น) UI ต้องแสดงผลจาก response ของการยืนยัน ไม่ใช่ผลของ preview
- `timetable.conflicts` ยังมีได้ ถ้าตารางเดิมมีวิชาชนกันอยู่แล้วก่อน apply (US8 ไม่ลบวิชาเดิม) แต่วิชาที่ US8 เพิ่มจะไม่ชนกับวิชาใดเลย

## วิธีเลือก section (backtracking)

ระบบหา**ชุด section ที่ดีที่สุด**ของทั้งแผนพร้อมกัน ไม่ได้เลือกทีละวิชาแล้วปล่อยไว้ (greedy) เพราะ greedy อาจข้ามวิชาที่จริง ๆ ลงได้ ถ้าเลือก section ของวิชาก่อนหน้าต่างไป แต่ระบบไม่ได้ลองทุกชุด (จำนวนชุด = จำนวน section ของทุกวิชาคูณกัน) เพราะใช้การตัดกิ่งทิ้งตามขั้นตอนด้านล่าง

### ขั้นที่ 1 — กรองก่อนค้นหา

1. โหลด preset (ไม่พบ → 404) และ entry ที่มีอยู่ของ `(studentId, academicYear, plan.semester)`
2. วิชาที่ตัดออกก่อนค้นหา ใส่ `skipped` ทันที:

| `reason` | เกิดเมื่อ | field เพิ่ม |
| --- | --- | --- |
| `COURSE_ALREADY_IN_TIMETABLE` | มีวิชานี้ในตารางแล้ว ไม่ว่ากลุ่มไหน (code เดียวกับ US1) | `existingSectionNo` |
| `NO_SECTION_AVAILABLE` | ภาคนี้ไม่มี section ของวิชานี้ | — |

3. ตัด section ที่ชนกับวิชาในตารางเดิมทิ้ง วิชาที่ไม่เหลือ section เลยได้ `TIME_CONFLICT` ทันที
4. **รวม section ที่เวลาเหมือนกัน** (ทุกคาบตรงกันทั้งวัน เวลาเริ่ม และเวลาจบ) เป็นกลุ่มเวลาเดียว ใช้ section ที่ `sectionNo` น้อยที่สุดเป็นตัวแทน เช่นวิชาศึกษาทั่วไปที่เปิด 30 กลุ่ม มักเหลือ 4–6 กลุ่มเวลา ห้องและผู้สอนไม่มีผลกับการชน จึงไม่ต้องลองทุก section

### ขั้นที่ 2 — ค้นหา

- **ลำดับการวาง:** วิชาที่มีกลุ่มเวลาน้อยที่สุดวางก่อน เท่ากันให้เรียงตามลำดับในแผน (`MAJOR` → `GENERAL_EDUCATION` → `FREE_ELECTIVE` แล้วตาม `sortOrder`) วิชาที่มีทางเลือกน้อยจะตัดกิ่งได้เร็ว ลำดับนี้มีผลแค่กับความเร็ว ไม่มีผลกับคำตอบ
- **แต่ละวิชามีทางเลือก** = ทุกกลุ่มเวลาที่ไม่ชนกับวิชาที่วางไปแล้ว และไม่ทำให้หน่วยกิตรวมเกิน `maxCredits` + "ข้ามวิชานี้" (ลองเป็นทางเลือกสุดท้าย)
- **ตัดกิ่งเมื่อชน:** กลุ่มเวลาที่ชนกับวิชาที่วางแล้วไม่ถูกลอง วิชาที่เหลือในกิ่งนั้นจึงไม่ถูกลองต่อ
- **Branch and bound:** ก่อนลงกิ่งใด ถ้าคะแนนสูงสุดที่เป็นไปได้ (วิชาที่วางแล้ว + วิชาที่ยังเหลือทั้งหมด) ไม่ชนะคำตอบที่ดีที่สุดตอนนี้ ให้ตัดกิ่งนั้นทิ้ง
- **หยุดเร็ว:** เจอชุดที่ลงครบทุกวิชาที่เหลือจากขั้นที่ 1 → หยุดทันที (กรณีส่วนใหญ่)
- **เพดาน:** ค้นหาได้ไม่เกิน `50,000` node (ตั้งใน config) ถ้าถึงเพดาน คืนคำตอบที่ดีที่สุดที่เจอ คำตอบเริ่มต้นคือผลของ greedy (วางตามลำดับในแผน เลือกกลุ่มเวลาแรกที่ลงได้) ผลจึง**ไม่มีทางแย่กว่า greedy** ใช้จำนวน node แทนเวลา เพื่อให้ผลเหมือนกันทุกครั้งที่รัน และเขียน test ได้

### เกณฑ์ "ดีที่สุด"

เทียบตามลำดับ ข้อแรกที่ต่างกันเป็นตัวตัดสิน:

1. จำนวนวิชา `MAJOR` ที่ได้มากกว่า
2. จำนวนวิชารวมที่ได้มากกว่า
3. หน่วยกิตรวมมากกว่า
4. เทียบ `sectionNo` ที่เลือกของแต่ละวิชาตามลำดับในแผน ชุดที่น้อยกว่าชนะ (ทำให้ผลคาดเดาได้)

ข้อจำกัดที่ห้ามละเมิดระหว่างค้นหา: ห้ามชนกับวิชาใดเลย และหน่วยกิตรวม (เดิม + ที่เพิ่ม) ห้ามเกิน `maxCredits`

### ขั้นที่ 3 — สรุปผล

วิชาที่อยู่ในคำตอบใส่ `added` พร้อม section ตัวแทนของกลุ่มเวลาที่เลือก วิชาที่ไม่ได้อยู่ในคำตอบใส่ `skipped` โดยดูเทียบกับ**ตารางสุดท้าย** (เดิม + `added`):

| `reason` | เกิดเมื่อ | field เพิ่ม |
| --- | --- | --- |
| `CREDIT_LIMIT_EXCEEDED` | มีกลุ่มเวลาที่ไม่ชนกับตารางสุดท้าย แต่เพิ่มแล้วหน่วยกิตเกิน `maxCredits` (code เดียวกับ US1) | `currentCredits`, `maxCredits` |
| `TIME_CONFLICT` | ทุกกลุ่มเวลาชนกับวิชาในตารางสุดท้าย | `conflictWith` |

`conflictWith` คือรหัสวิชาในตารางสุดท้ายที่ชนกับ section ใด ๆ ของวิชานี้ (ไม่ซ้ำ เรียงตามลำดับที่อยู่ในตาราง) UI ใช้แสดง "ชนกับ CS211, MA211"

เงื่อนไขเวลาชนใช้สูตรเดียวกับ US1: วันเดียวกันและ `a.startTime < b.endTime && b.startTime < a.endTime` คาบต่อกันพอดีไม่นับ ควรแยก method ตรวจคาบชนใน `TimetableService` ออกมาให้ US1 และ US8 ใช้ร่วมกัน ฝั่ง backend แยกอัลกอริทึมเป็น class `PlanScheduler` ที่ไม่ยุ่งกับ DB (รับวิชา/section/ตารางเดิม คืน `added`/`skipped`) เพื่อให้ unit test ได้โดยไม่ต้องมี DB

ขนาดข้อมูลจริงของโปรเจกต์ (6–9 วิชาต่อแผน) หลังรวมกลุ่มเวลาแล้วคาดว่าค้นหาไม่เกินไม่กี่พัน node ใช้เวลาไม่ถึงมิลลิวินาที เพดาน 50,000 node มีไว้กันกรณีข้อมูลผิดปกติเท่านั้น

## Error

ตอบเป็น ProblemDetail ตาม US1 สาเหตุรายวิชาข้างบน**ไม่ใช่ HTTP error** แต่อยู่ใน `skipped`

| code | HTTP | เกิดเมื่อ |
| --- | --- | --- |
| — | 400 | ไม่ส่ง `studyYear`/`semester` หรือค่าอยู่นอกช่วง (`studyYear` 1–4, `semester` 1–2) (ข้อ 1) / ไม่ส่ง `planId`/`academicYear` (ข้อ 2) |
| — | 404 | ไม่พบ `planId` (ใช้ `ResourceNotFoundException` เดิม) |

ไม่ห้าม apply preset ของสาขาอื่น เพราะเป็นตารางจำลอง และ backend ไม่ได้ตรวจสาขาใน `POST /api/timetable/entries` อยู่แล้ว

## ข้อมูล preset (ข้อเสนอสำหรับ US8-T06 ER Diagram)

```sql
CREATE TABLE study_plan (
    plan_id         BIGINT IDENTITY(1,1) NOT NULL,
    department      NVARCHAR(100) NOT NULL,   -- ตรงกับ users.department
    curriculum_name NVARCHAR(200) NOT NULL,
    study_year      INT           NOT NULL,   -- ชั้นปีที่ 1–4
    semester        INT           NOT NULL,
    CONSTRAINT pk_study_plan PRIMARY KEY (plan_id),
    CONSTRAINT uq_study_plan UNIQUE (department, curriculum_name, study_year, semester),
    CONSTRAINT ck_study_plan_semester CHECK (semester IN (1, 2))
);

CREATE TABLE study_plan_course (
    plan_id     BIGINT       NOT NULL,
    course_code NVARCHAR(10) NOT NULL,
    sort_order  INT          NOT NULL,
    CONSTRAINT pk_study_plan_course PRIMARY KEY (plan_id, course_code),
    CONSTRAINT fk_study_plan_course_plan FOREIGN KEY (plan_id) REFERENCES study_plan (plan_id) ON DELETE CASCADE,
    CONSTRAINT fk_study_plan_course_course FOREIGN KEY (course_code) REFERENCES course (course_code)
);
```

preset อ้างอิง `course_code` ไม่ใช่ `section_id` เพราะ section เปลี่ยนทุกภาค ส่วนวิชาเลือกเสรี/วิชาเลือกที่แผนไม่ได้ระบุรหัส ไม่ใส่ใน preset (นักศึกษาเพิ่มเองผ่าน US1)

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

export type StudyPlan = {
  planId: number;
  curriculumName: string;
  studyYear: number;
  semester: number;
  totalCredits: number;
  courses: StudyPlanCourse[];
};

export type StudyPlanList = {
  department: string;
  studyYear: number;
  semester: number;
  plans: StudyPlan[];
};

export type StudyPlanQuery = { studyYear: 1 | 2 | 3 | 4; semester: 1 | 2 }; // นักศึกษาเลือกเองจากปุ่มชั้นปี/ภาคเรียน

export type ApplyPlanRequest = { planId: number; academicYear: number; dryRun?: boolean };

export type PlanSkipReason =
  | "COURSE_ALREADY_IN_TIMETABLE"
  | "NO_SECTION_AVAILABLE"
  | "CREDIT_LIMIT_EXCEEDED"
  | "TIME_CONFLICT";

export type AddedPlanCourse = StudyPlanCourse & { sectionId: number; sectionNo: string };

export type SkippedPlanCourse = StudyPlanCourse & {
  reason: PlanSkipReason;
  message: string;
  conflictWith?: string[];    // TIME_CONFLICT
  existingSectionNo?: string; // COURSE_ALREADY_IN_TIMETABLE
  currentCredits?: number;    // CREDIT_LIMIT_EXCEEDED
  maxCredits?: number;        // CREDIT_LIMIT_EXCEEDED
};

export type ApplyPlanResponse = {
  planId: number;
  dryRun: boolean;
  added: AddedPlanCourse[];
  skipped: SkippedPlanCourse[];
  timetable: Timetable | null; // dryRun: true = null
};
```

## สิ่งที่ US8 ควรออกแบบเทสต์ (ข้อเสนอ)

- `GET /api/study-plans` กรองตาม `department` ของนักศึกษา + `studyYear` + `semester` ที่ส่งมา, ไม่มีแผนได้ `plans: []`, ไม่ส่ง `studyYear` หรือส่ง 0/5 → 400
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
