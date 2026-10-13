# US1 — DTO & API Spec: เพิ่มวิชาลงตารางเรียนจำลอง

Oct 13, 2026 · @Non

## ภาพรวม

US1 ใช้ 3 endpoint และ DTO หลักตัวเดียวคือ `TimetableResponse` ซึ่งพอวาด grid ตัวนับหน่วยกิต 21 / 22 และแถบเตือนเวลาชนได้ในรอบเดียว ออกแบบตาม Figma หน้า [ตารางที่มีวิชาชน (frame 1:1057)](https://www.figma.com/design/U0Ot2xwePE9ooeQV2CZC5V/CS261?node-id=1-1057) และ [ตารางว่าง (frame 1:2)](https://www.figma.com/design/U0Ot2xwePE9ooeQV2CZC5V/CS261?node-id=1-2) กับ test case ใน [การ์ด US1](https://trello.com/c/HHEIoRQv)

- **เวลาชนไม่ block:** Figma ใส่ TU109 กับ LAS101 ลงตารางพร้อมกันแล้วขึ้นแถบเตือน "ต้องแก้ไข" จึงให้เพิ่มได้ แล้วส่ง `conflicts` กลับไปให้ UI เตือน (TC4, TC5)
- **หน่วยกิตเกิน 22 และเพิ่มวิชาเดิมคนละกลุ่ม block ด้วย 409** (TC7, TC8)
- **POST คืนตารางทั้งก้อน** ไม่ต้อง GET ซ้ำหลังกด "+ เพิ่มวิชา" และ US2 (ลบ), US5 (PNG) ใช้ DTO เดียวกันต่อได้
- **นอกขอบเขต:** ชื่อและรหัสนักศึกษามุมขวาบน (US3), checkbox กับปุ่มลบ (US2 · frame 1:256, 1:1810), ปุ่ม PNG (US5 · frame 1:2544) และแท็บเมนูอื่น (frame 1:3283, 1:4026)

## Endpoints

| Method | Path | ใช้กับส่วนไหนของหน้า | Test case |
| --- | --- | --- | --- |
| GET | `/api/courses?academicYear=2568&semester=1&q=&category=` | รายการวิชาใต้ "ค้นหารายวิชา" ช่องค้นหา และตัวกรองหมวดวิชา | TC1 |
| GET | `/api/timetable?academicYear=2568&semester=1` | grid ตาราง, หน่วยกิตที่เลือก, แถบเตือนเวลาชน, แถบสรุปใต้ตาราง | TC3, TC4, TC6 |
| POST | `/api/timetable/entries` | ปุ่ม "+ เพิ่มวิชา" บนการ์ดวิชา | TC2, TC5, TC7, TC8 |

ทุก endpoint ทำงานกับตารางของนักศึกษาที่ login อยู่ ระหว่างที่ US3 ยังไม่เสร็จ backend ใช้รหัสนักศึกษา demo จาก config และ path ไม่เปลี่ยนหลังมี login US2 จะเพิ่ม `DELETE /api/timetable/entries/{entryId}` ใน path เดียวกัน ส่วน US5 สร้าง PNG ฝั่ง client จาก `GET /api/timetable` ได้เลย

## API Spec

### 1. GET /api/courses — รายการวิชาให้เลือก

| Param | ชนิด | บังคับ | ตัวอย่าง | มาจาก UI |
| --- | --- | --- | --- | --- |
| `academicYear` | int (พ.ศ.) | ใช่ | 2568 | dropdown "ปีการศึกษา" |
| `semester` | int | ใช่ | 1 | dropdown "ภาคเรียน" |
| `q` | string | ไม่ | CS1 | ช่องค้นหา ตรงกับรหัสวิชาที่ขึ้นต้นด้วย q หรือชื่อวิชาที่มี q (ไม่สนตัวพิมพ์) |
| `category` | enum | ไม่ | MAJOR | ตัวกรอง "ทุกหมวดวิชา": `MAJOR` วิชาเฉพาะ, `GENERAL_EDUCATION` ศึกษาทั่วไป, `FREE_ELECTIVE` เลือกเสรี |

ตอบ `200` เป็น `List<CourseResponse>` เรียงตาม `courseCode` จำนวน "พบ 9 รายวิชา" คือความยาว array ไม่ส่ง `academicYear` หรือ `semester` หรือ `category` ผิดค่า ตอบ `400`

```json
[
  {
    "courseCode": "CS111",
    "courseName": "OBJECT-ORIENTED CONCEPTS",
    "category": "MAJOR",
    "credits": 3,
    "sections": [
      {
        "sectionId": 101,
        "sectionNo": "030001",
        "instructor": "ผศ.ดร.ทรงศักดิ์ รองวิริยะพานิช",
        "schedules": [
          { "dayOfWeek": "TUESDAY", "startTime": "11:00", "endTime": "12:30", "room": "LC3-121" },
          { "dayOfWeek": "THURSDAY", "startTime": "11:00", "endTime": "12:30", "room": "LC3-121" }
        ]
      }
    ]
  }
]
```

### 2. GET /api/timetable — ตารางเรียนจำลองของฉัน

รับ `academicYear` และ `semester` เหมือนข้อ 1 ตอบ `200` เป็น `TimetableResponse` ตารางว่าง (frame 1:2) ได้ `entries: []`, `conflicts: []`, `totalCredits: 0`, `updatedAt: null`

ตัวอย่างคือสถานะใน frame 1:1057 (ตัด `entries` เหลือ 2 จาก 7 วิชา):

```json
{
  "academicYear": 2568,
  "semester": 1,
  "totalCredits": 21,
  "maxCredits": 22,
  "updatedAt": "2026-10-13T11:20:05+07:00",
  "entries": [
    {
      "entryId": 7,
      "courseCode": "TU109",
      "courseName": "INNOVATION AND ENTREPRENEURIAL MINDSET",
      "category": "GENERAL_EDUCATION",
      "credits": 3,
      "sectionId": 305,
      "sectionNo": "780001",
      "schedules": [
        { "dayOfWeek": "WEDNESDAY", "startTime": "09:30", "endTime": "12:30", "room": "SC3-413" }
      ],
      "conflictWith": ["LAS101"]
    },
    {
      "entryId": 8,
      "courseCode": "LAS101",
      "courseName": "CRITICAL THINKING, READING, AND WRITING",
      "category": "GENERAL_EDUCATION",
      "credits": 3,
      "sectionId": 306,
      "sectionNo": "780004",
      "schedules": [
        { "dayOfWeek": "WEDNESDAY", "startTime": "09:30", "endTime": "12:30", "room": "SC-1026" }
      ],
      "conflictWith": ["TU109"]
    }
  ],
  "conflicts": [
    {
      "dayOfWeek": "WEDNESDAY",
      "overlapStart": "09:30",
      "overlapEnd": "12:30",
      "courseCodes": ["TU109", "LAS101"]
    }
  ]
}
```

สองคาบชนกันเมื่ออยู่วันเดียวกันและ `a.startTime < b.endTime && b.startTime < a.endTime` คาบต่อกันพอดีไม่นับเป็นชน เหมือน MA211 09:30–11:00 ต่อด้วย CS111 11:00–12:30 ใน Figma `conflicts` มี 1 รายการต่อ 1 คู่ต่อ 1 วัน ถ้าคู่เดียวกันชนทั้งวันอังคารและพฤหัสจะได้ 2 รายการ ตัวเลข "เวลาชน: N คู่" จึงนับจาก `courseCodes` ที่ไม่ซ้ำกัน ไม่ใช่ `conflicts.length`

`updatedAt` เป็น `OffsetDateTime` ส่งพร้อม offset เช่น `2026-10-13T11:20:05+07:00` frontend จึงคำนวณ "เมื่อสักครู่" ได้ถูก แม้ server ใน Docker จะใช้เวลา UTC

### 3. POST /api/timetable/entries — เพิ่มวิชาลงตาราง

```json
{ "sectionId": 305 }
```

สำเร็จตอบ `201 Created` เป็น `TimetableResponse` ทั้งก้อน รูปเดียวกับข้อ 2 ถ้ากลุ่มที่เพิ่มชนกับวิชาอื่น ยังตอบ `201` แต่ `conflicts` ไม่ว่าง UI จึงแสดงแถบเตือนสีแดง ภาคเรียนของตารางอ่านจาก section จึงไม่ต้องส่งมาใน body

## Error และลำดับการตรวจ

`POST /api/timetable/entries` ปฏิเสธได้ 4 แบบ ตอบเป็น ProblemDetail ตาม README และเพิ่ม property `code` ให้ UI เลือกข้อความได้ เวลาชนไม่ใช่ error ตามที่ Figma ออกแบบไว้

| code | HTTP | เกิดเมื่อ | property ที่เพิ่ม | Test case |
| --- | --- | --- | --- | --- |
| — | 400 | ไม่ส่ง `sectionId` (มีอยู่แล้วใน GlobalExceptionHandler) | `errors` | — |
| — | 404 | ไม่พบ section (ใช้ ResourceNotFoundException เดิม) | — | — |
| `COURSE_ALREADY_IN_TIMETABLE` | 409 | มีวิชานี้ในตารางแล้ว ไม่ว่ากลุ่มไหน | `courseCode`, `existingSectionNo` | TC8 |
| `CREDIT_LIMIT_EXCEEDED` | 409 | หน่วยกิตรวมหลังเพิ่มเกิน `maxCredits` (22) | `currentCredits`, `courseCredits`, `maxCredits` | TC7 |

การแสดงผลใน UI: `CREDIT_LIMIT_EXCEEDED` ขึ้นแถบเตือนสีแดงแบบเดียวกับเวลาชน ใช้ `detail` เป็นข้อความ และวิชาไม่ถูกเพิ่ม ส่วนกลุ่มอื่นของวิชาที่อยู่ในตารางแล้ว UI ไม่แสดงปุ่ม "+ เพิ่มวิชา" ตั้งแต่แรก backend ยังคืน 409 `COURSE_ALREADY_IN_TIMETABLE` ไว้กันการยิง API ตรง และใช้ทดสอบ TC8 ผ่าน Postman

ลำดับใน `TimetableService.addEntry`:

1. ตรวจ body → 400
2. หา section → 404
3. ตรวจวิชาซ้ำ → 409 `COURSE_ALREADY_IN_TIMETABLE`
4. ตรวจหน่วยกิต → 409 `CREDIT_LIMIT_EXCEEDED`
5. บันทึก แล้วคำนวณ `conflicts` ใหม่ → 201

ตรวจวิชาซ้ำก่อนหน่วยกิต เพราะคนที่กดเพิ่มกลุ่มที่ 2 ของวิชาเดิมควรเห็นสาเหตุจริง ลำดับนี้ต่างจากที่เขียนไว้ในการ์ด [US1-T06](https://trello.com/c/27jIf9EG) (เวลาชน → หน่วยกิต → กลุ่มซ้ำ → บันทึก) คนทำ sequence diagram ควรใช้ลำดับนี้

```json
{
  "type": "about:blank",
  "title": "Conflict",
  "status": 409,
  "detail": "CS111 อยู่ในตารางแล้ว (Sec 030001) 1 วิชาเพิ่มได้ 1 กลุ่มเรียน",
  "instance": "/api/timetable/entries",
  "code": "COURSE_ALREADY_IN_TIMETABLE",
  "courseCode": "CS111",
  "existingSectionNo": "030001"
}
```

```json
{
  "type": "about:blank",
  "title": "Conflict",
  "status": 409,
  "detail": "เพิ่ม ST216 (3 หน่วยกิต) แล้วจะเป็น 24 หน่วยกิต เกินกำหนด 22 หน่วยกิต",
  "instance": "/api/timetable/entries",
  "code": "CREDIT_LIMIT_EXCEEDED",
  "currentCredits": 21,
  "courseCredits": 3,
  "maxCredits": 22
}
```

ฝั่ง backend เพิ่ม `BusinessRuleException(status, code, properties)` ใน `common/exception` พร้อม handler ใน `GlobalExceptionHandler` ฝั่ง frontend ให้ `ApiError` ใน `lib/api.ts` เก็บ `code` ไว้ ทั้งสองไฟล์เป็นไฟล์ร่วม ต้องบอกกลุ่มและแยก PR เล็กตาม CONTRIBUTING

## DTO class diagram

DTO class diagram พร้อมสัญลักษณ์ + / - / # อยู่ในแท็บ DTO Class Diagram

`ScheduleSlotResponse` ใช้ร่วมทั้งรายการวิชาและตาราง ส่วน `AddTimetableEntryRequest` ส่งแค่ `sectionId` ทุก DTO เป็น Java record ใน `dto/` ตามแบบ `item/` แต่ละส่วนของหน้าใช้ field ตามนี้:

| ส่วนในหน้า (frame 1:1057) | Field |
| --- | --- |
| "หน่วยกิตที่เลือก: 21 / 22" มุมขวาบน | `totalCredits` / `maxCredits` |
| chip สีเหนือ grid | `entries[].courseCode` |
| บล็อกวิชาใน grid: รหัส, Sec, เวลา, ห้อง | `courseCode`, `sectionNo`, `schedules[].startTime`–`endTime`, `room` |
| บล็อกแดง "เวลาชนกัน 09:30 - 12:30 น. · 2 วิชา" | `conflicts[].overlapStart`–`overlapEnd`, `courseCodes` |
| แถบเตือน "ตรวจพบเวลาเรียนซ้อนทับกัน" | `conflicts[]` |
| "วิชาในตารางเรียน: 7 วิชา (21 หน่วยกิต)" | `entries.length`, `totalCredits` |
| "เวลาชน: 1 คู่" / "ไม่มีเวลาเรียนซ้อนทับกัน" | จำนวนคู่ `courseCodes` ที่ไม่ซ้ำกันใน `conflicts` (ใช้ `countConflictPairs`) |
| "บันทึกตารางร่างล่าสุดเมื่อสักครู่" | `updatedAt` |
| การ์ดวิชา: รหัส, หมวด, หน่วยกิต, ชื่อ | `CourseResponse.courseCode`, `category`, `credits`, `courseName` |
| การ์ดวิชา: วัน-เวลา, Sec, อาจารย์, ห้อง | `sections[].schedules`, `sectionNo`, `instructor`, `room` |
| ปุ่ม "+ เพิ่มวิชา" | ส่ง `sectionId` ไป `POST /api/timetable/entries` |

## API class diagram

API class diagram พร้อม field และสัญลักษณ์ + / - / # อยู่ในแท็บ API Class Diagram

Controller ขอ `studentId` จาก `CurrentStudentProvider` เพื่อให้ path เดิมใช้ต่อได้หลัง US3 ทำ login Repository, Entity และ DAO ไม่อยู่ในรูปนี้ เพราะเป็น Extended API class diagram ของ US1-T06

## TypeScript types (frontend)

แยกไฟล์คู่กับ package ฝั่ง backend ตาม README เวลาใน JSON เป็น `"HH:mm"` (`@JsonFormat(pattern = "HH:mm")` บน `LocalTime`) และวันเป็นชื่อ enum ของ `java.time.DayOfWeek`

```ts
// frontend/features/courses/types.ts — ต้องตรงกับ course.dto ฝั่ง backend
export type DayOfWeek =
  | "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY"
  | "FRIDAY" | "SATURDAY" | "SUNDAY";

export type CourseCategory = "MAJOR" | "GENERAL_EDUCATION" | "FREE_ELECTIVE";

export type ScheduleSlot = {
  dayOfWeek: DayOfWeek;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  room: string;
};

export type Section = {
  sectionId: number;
  sectionNo: string;
  instructor: string;
  schedules: ScheduleSlot[];
};

export type Course = {
  courseCode: string;
  courseName: string;
  category: CourseCategory;
  credits: number;
  sections: Section[];
};
```

```ts
// frontend/features/timetable/types.ts — ต้องตรงกับ timetable.dto ฝั่ง backend
import type { CourseCategory, DayOfWeek, ScheduleSlot } from "@/features/courses/types";

export type TimetableEntry = {
  entryId: number;
  courseCode: string;
  courseName: string;
  category: CourseCategory;
  credits: number;
  sectionId: number;
  sectionNo: string;
  schedules: ScheduleSlot[];
  conflictWith: string[]; // รหัสวิชาที่ชนด้วย ว่าง = ไม่ชน
};

export type TimeConflict = {
  dayOfWeek: DayOfWeek;
  overlapStart: string;
  overlapEnd: string;
  courseCodes: string[]; // 2 วิชาต่อ 1 คู่
};

export type Timetable = {
  academicYear: number;
  semester: number;
  entries: TimetableEntry[];
  totalCredits: number;
  maxCredits: number;
  conflicts: TimeConflict[];
  updatedAt: string | null; // ISO 8601 พร้อม offset เช่น "2026-10-13T11:20:05+07:00"
};

export type AddTimetableEntryRequest = { sectionId: number };

export type TimetableErrorCode = "COURSE_ALREADY_IN_TIMETABLE" | "CREDIT_LIMIT_EXCEEDED";

// "เวลาชน: N คู่" — คู่เดียวกันที่ชนหลายวันนับเป็น 1 คู่
export const countConflictPairs = (conflicts: TimeConflict[]) =>
  new Set(conflicts.map((c) => [...c.courseCodes].sort().join("|"))).size;
```

ป้ายบนการ์ดวิชาคำนวณฝั่ง frontend จาก `Timetable`: ไม่มีใน `entries` = "+ เพิ่มวิชา", มีและ `conflictWith` ว่าง = "เพิ่มแล้ว", มีและ `conflictWith` ไม่ว่าง = "เวลาชน" กับ "ชนกับ LAS101"

## ขอบเขต grid (frontend)

grid คำนวณช่วงวันและเวลาจาก `entries` ฝั่ง frontend ไม่ต้องเพิ่ม field ใน API เริ่มจาก จ.–ศ. 08:00–17:00 แล้วขยายตาม min/max ของวิชาในตาราง

- **วัน:** จาก `min(จ., วันแรกที่มีเรียน)` ถึง `max(ศ., วันสุดท้ายที่มีเรียน)` แสดงทุกวันในช่วงแม้ว่าง
- **เวลา:** เริ่มที่เวลาเริ่มเร็วสุดปัดลง จบที่เวลาเลิกช้าสุดปัดขึ้นเป็นชั่วโมงเต็ม คอลัมน์ละ 1 ชม.

| วิชาในตาราง | วันที่แสดง | หัวคอลัมน์เวลา |
| --- | --- | --- |
| ไม่มี (frame 1:2) | จ.–ศ. | 08:00 … 16:00 |
| 7 วิชาใน frame 1:1057 (จ.–พฤ., 09:30–16:30) | จ.–ศ. | 08:00 … 16:00 |
| จ. 09:30–11:00 และ ส. 13:00–16:00 | จ.–ส. | 08:00 … 16:00 |
| อ. 17:00–20:00 | จ.–ศ. | 08:00 … 19:00 |

หมายเหตุ: หัวคอลัมน์คือเวลาเริ่มของช่องละ 1 ชม. เหมือนใน Figma เช่น "19:00" คือช่อง 19:00–20:00 จึงรับวิชาที่เลิก 20:00 ได้พอดี grid เริ่มที่ 08:00 เสมอ เว้นแต่มีวิชาเริ่มก่อน 08:00

```typescript
// frontend/features/timetable/gridRange.ts
import type { DayOfWeek } from "@/features/courses/types";
import type { TimetableEntry } from "./types";

const DAYS: DayOfWeek[] = [
  "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY",
];
const DEFAULT_FIRST_DAY = 0; // MONDAY
const DEFAULT_LAST_DAY = 4;  // FRIDAY
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 17;

const toMinutes = (hhmm: string) =>
  Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

export function getGridRange(entries: TimetableEntry[]) {
  const slots = entries.flatMap((e) => e.schedules);
  const dayIdx = slots.map((s) => DAYS.indexOf(s.dayOfWeek));
  const firstDay = Math.min(DEFAULT_FIRST_DAY, ...dayIdx);
  const lastDay = Math.max(DEFAULT_LAST_DAY, ...dayIdx);
  const startHour = Math.min(
    DEFAULT_START_HOUR,
    ...slots.map((s) => Math.floor(toMinutes(s.startTime) / 60)),
  );
  const endHour = Math.max(
    DEFAULT_END_HOUR,
    ...slots.map((s) => Math.ceil(toMinutes(s.endTime) / 60)),
  );
  return {
    days: DAYS.slice(firstDay, lastDay + 1),
    // หัวคอลัมน์ 1 ชม. เช่น 8 = "08:00" (ครอบคลุม 08:00–09:00)
    hours: Array.from({ length: endHour - startHour }, (_, i) => startHour + i),
  };
}
```
