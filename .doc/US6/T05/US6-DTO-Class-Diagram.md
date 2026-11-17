# US6 — DTO Class Diagram

US6 เพิ่ม DTO ใหม่ 4 record (รวม `ElectiveSearchCriteria`) กับ enum `TimeSlot` ใน `elective/dto/` และ enum `InterestGroup`, `ElectiveTag` ใน `elective/` (สร้างใน US6-T09 คู่กับ entity `ElectiveInfo`) (`<<US6>>`) และ reuse `ScheduleSlotResponse` ของ US1 (`<<US1>>`) สำหรับคาบเรียนใน Sec ปุ่ม "เพิ่มลงตาราง" ใช้ `AddTimetableEntryRequest` / `TimetableResponse` ของ US1 ตามเดิม จึงไม่วาดซ้ำ

```mermaid
classDiagram
    direction LR

    class ElectiveSearchCriteria {
        <<US6 record · query params>>
        -q: String
        -semester: Integer
        -day: DayOfWeek
        -timeSlot: TimeSlot
        -group: InterestGroup
        -excludeConflicts: Boolean
        +none() ElectiveSearchCriteria$
    }
    class ElectiveSummaryResponse {
        <<US6 record>>
        -courseCode: String
        -courseName: String
        -courseNameTh: String
        -credits: int
        -group: InterestGroup
        -requiresQuota: boolean
        -offeredSemesters: List~Integer~
        -tags: List~ElectiveTag~
        +from(info: ElectiveInfo, offeredSemesters: List~Integer~) ElectiveSummaryResponse$
    }
    class ElectiveDetailResponse {
        <<US6 record>>
        -courseCode: String
        -courseName: String
        -courseNameTh: String
        -credits: int
        -group: InterestGroup
        -requiresQuota: boolean
        -offeredSemesters: List~Integer~
        -tags: List~ElectiveTag~
        -description: List~String~
        -sections: List~ElectiveSectionResponse~
        +of(summary: ElectiveSummaryResponse, description: List~String~, sections: List~ElectiveSectionResponse~) ElectiveDetailResponse$
    }
    class ElectiveSectionResponse {
        <<US6 record>>
        -sectionId: Long
        -sectionNo: String
        -semester: int
        -instructor: String
        -schedules: List~ScheduleSlotResponse~
        -selectable: boolean
        -inTimetable: boolean
        -conflictWith: List~String~
        +from(section: Section, currentSemester: int, inTimetable: boolean, conflictWith: List~String~) ElectiveSectionResponse$
    }
    class ScheduleSlotResponse {
        <<US1 record>>
        -dayOfWeek: DayOfWeek
        -startTime: LocalTime
        -endTime: LocalTime
        -room: String
        +fromAll(slots: Collection~ScheduleSlot~) List~ScheduleSlotResponse~$
    }
    class InterestGroup {
        <<US6 enumeration>>
        LANGUAGE
        PSYCHOLOGY
        SOCIETY
        SCIENCE
        MEDIA
    }
    class TimeSlot {
        <<US6 enumeration>>
        MORNING
        AFTERNOON
        EVENING
        -from: LocalTime
        -to: LocalTime
        +contains(startTime: LocalTime) boolean
    }
    class ElectiveTag {
        <<US6 enumeration>>
        NO_ATTENDANCE
        NO_EXAM
        NO_GROUP_WORK
        KIND_INSTRUCTOR
        NO_PREREQUISITE
        EASY_GRADE
    }

    ElectiveDetailResponse "1" *-- "1..*" ElectiveSectionResponse
    ElectiveSectionResponse "1" *-- "0..*" ScheduleSlotResponse
    ElectiveSummaryResponse ..> InterestGroup
    ElectiveSummaryResponse ..> ElectiveTag
    ElectiveDetailResponse ..> InterestGroup
    ElectiveDetailResponse ..> ElectiveTag
    ElectiveSearchCriteria ..> TimeSlot
    ElectiveSearchCriteria ..> InterestGroup
    ElectiveDetailResponse ..> ElectiveSummaryResponse : of() คัด field มา
```

| Type | ใช้กับ | หน้าที่ |
| --- | --- | --- |
| `ElectiveSearchCriteria` | `GET /api/electives` | รวม query param ที่ไม่บังคับ 6 ตัวเป็นก้อนเดียว (bind ด้วย `@ModelAttribute`) ให้ service รับ parameter สั้นลง ไม่ส่งออกเป็น JSON · `semester` เป็น `Integer` เพราะ `null` = ทุกภาคเรียน · `excludeConflicts` เป็น `Boolean` เพราะ constructor binding ของ record ใส่ primitive ที่ไม่ได้ส่งมาไม่ได้ (ตอบ 400) compact constructor จึงแปลง `null` เป็น `false` ไม่ส่ง = `false` และ accessor ไม่คืน `null` · `none()` = ไม่มีตัวกรอง · `academicYear` และ `currentSemester` บังคับจึงรับแยกที่ controller |
| `ElectiveSummaryResponse` | `GET /api/electives` | การ์ดวิชา 1 ใบ |
| `ElectiveDetailResponse` | `GET /api/electives/{courseCode}` | modal รายละเอียด · field 8 ตัวแรกเหมือน `ElectiveSummaryResponse` ทุกตัว (JSON แบน ตาม API Spec) record สืบทอดกันไม่ได้จึงเขียนซ้ำ และสร้างผ่าน `of(summary, …)` แทนการแปลง entity ซ้ำสองที่ |
| `ElectiveSectionResponse` | ใน `ElectiveDetailResponse.sections` | การ์ด Sec ใน modal · `selectable` คำนวณใน `from()` จาก `section.semester == currentSemester` ส่วน `inTimetable` กับ `conflictWith` service คำนวณจากตารางปัจจุบันแล้วส่งเข้ามา |
| `ScheduleSlotResponse` | US1 (`course.dto`) | คาบเรียน · `fromAll` เรียงตามวันแล้วเวลาเริ่มให้อยู่แล้ว · `room` เป็น `null` ได้ |
| `InterestGroup` | param `group` และ field `group` | 5 หมวดหมู่ความสนใจ ลำดับ enum = ลำดับหัวข้อหมวดในหน้า (ใช้เรียงผลลัพธ์) |
| `TimeSlot` | param `timeSlot` | ช่วงเวลา 3 ช่วง เก็บ `from` / `to` ใน enum · `contains(start)` = `!start.isBefore(from) && start.isBefore(to)` ตามกติกา [from, to) ใน API Spec |
| `ElectiveTag` | field `tags` | ป้ายลักษณะวิชา ข้อความและสีอยู่ฝั่ง frontend (`ELECTIVE_TAG_LABELS`) |

| Static method | หน้าที่ |
| --- | --- |
| `ElectiveSummaryResponse.from(info, offeredSemesters)` | แปลงวิชาพร้อมข้อมูลแนะนำ อ่าน `Course` จาก `info.getCourse()` · tags เรียงตามลำดับ enum · `offeredSemesters` service ส่งมาจาก Sec ทั้งปี (ไม่ผ่านตัวกรอง) |
| `ElectiveDetailResponse.of(summary, description, sections)` | ประกอบ modal จาก summary + รีวิว + Sec |
| `ElectiveSectionResponse.from(section, currentSemester, inTimetable, conflictWith)` | แปลง Sec 1 Sec ใช้ `ScheduleSlotResponse.fromAll(section.getSlots())` |

**entity:** `Course`, `Section`, `ScheduleSlot` เป็นของ US1 ส่วน `ElectiveInfo` (ชื่อไทย หมวด โควตา tags รีวิว) US6-T06 ยืนยันเป็นตาราง `elective_info` แยก 0..1 ต่อ `course` ที่ถือ `Course` ไว้ US6-T08 จึงปรับ `from(course, info, …)` เป็น `from(info, …)`

ฝั่ง frontend type `ElectiveSummary`, `ElectiveDetail`, `ElectiveSection`, `ElectiveSearchParams`, `InterestGroup`, `TimeSlot`, `ElectiveTag` อยู่ใน `frontend/features/electives/types.ts` ตรงกับ record ด้านบนทีละ field (ดู [DTO & API Spec](./US6-DTO%20&%20API%20Spec.md#typescript-types-frontend)) `ElectiveSearchParams` มี `academicYear` และ `currentSemester` รวมอยู่ด้วยเพราะฝั่ง browser ส่งเป็น query string ชุดเดียว

สัญลักษณ์: field ของ record เป็น `private final` (-) ส่วน accessor และ constructor แบบ public ที่ record สร้างให้อัตโนมัติไม่ได้วาด static method มี `$` (ขีดเส้นใต้ใน UML) ไม่มี `#` เพราะ record และ enum สืบทอดไม่ได้ · `*--` = composition (ส่วนประกอบใน JSON), `..>` = ใช้งาน

## เอกสารที่เกี่ยวข้อง

- [DTO & API Spec](./US6-DTO%20&%20API%20Spec.md)
- [API Class Diagram](./US6-API-Class-Diagram.md)
- [US1 — DTO Class Diagram](../../US1/T05/US1-DTO-Class-Diagram.md)
