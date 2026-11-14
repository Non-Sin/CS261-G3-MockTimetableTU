# US6-T06 — Sequence Diagram: เปิดรายละเอียดและรีวิว

`GET /api/electives/{courseCode}?academicYear=2568&currentSemester=1` ตาม [US6-T05 รุ่น 8213f9a](https://github.com/Non-Sin/CS261-G3-MockTimetableTU/blob/8213f9acded350f8837eefc6a1b96564c82a297d/.doc/US6/T05/US6-DTO%20%26%20API%20Spec.md) คืนรายละเอียด **ทุก Sec ในปีนั้น** แม้บาง Sec ไม่ผ่านตัวกรองหน้ารายการหรืออยู่อีกภาค ดูกรณี FR205 และ PY250 ใน Prototype ของ T05

```mermaid
sequenceDiagram
    actor Student as นักศึกษา
    participant UI as Elective detail modal
    participant C as ElectiveController
    participant P as CurrentStudentProvider
    participant S as ElectiveService
    participant ER as ElectiveRepository
    participant SR as SectionRepository
    participant ORM as Hibernate collection loader
    participant TS as TimetableService (US1)
    participant TD as US1 timetable repositories
    participant O as ScheduleOverlap
    participant DB as Database

    Student->>UI: กดการ์ดหรืออ่านรีวิว
    UI->>C: GET /api/electives/courseCode<br/>academicYear, currentSemester + Bearer
    Note over UI,C: token ไม่มี/ผิด/หมดอายุ = 401<br/>ก่อนถึง Controller<br/>query หาย/ชนิดผิด = 400<br/>ก่อนเข้า method
    C->>P: currentStudentId()
    P-->>C: studentId
    C->>S: getDetail(studentId, courseCode, academicYear, currentSemester)
    Note over S,DB: read-only transaction
    S->>S: validateSemester("currentSemester", currentSemester)
    alt ไม่ใช่ภาค 1 หรือ 2
        S-->>C: ResponseStatusException (400)
        C-->>UI: 400 ProblemDetail
    else ภาคถูกต้อง
        S->>ER: findRecommendedByCode(courseCode, academicYear)
        ER->>DB: SELECT info + course + tags<br/>FREE_ELECTIVE, มี review และ Sec ในปีนี้
        DB-->>ER: Optional ElectiveInfo
        ER-->>S: Optional ElectiveInfo
        alt ไม่พบวิชาแนะนำที่ครบเงื่อนไข
            S-->>C: ResourceNotFoundException
            C-->>UI: 404 ProblemDetail ผ่าน handler เดิม
        else พบวิชา
            S->>TS: getTimetable(studentId, academicYear, currentSemester)
            TS->>TD: findByStudentIdAndAcademicYearAndSemester(...)
            TD->>DB: SELECT timetable
            DB-->>TD: Optional timetable
            TD-->>TS: Optional timetable
            opt พบ timetable
                TS->>TD: findByTimetableId(timetableId)
                TD->>DB: SELECT entries พร้อม section, course, slots
                DB-->>TD: entries
                TD-->>TS: entries
            end
            TS-->>S: TimetableResponse (ไม่พบได้ตารางว่าง)
            S->>SR: findByCourseCodesAndYear([courseCode], academicYear)
            SR->>DB: SELECT sections ทั้งปี + LEFT JOIN slots
            DB-->>SR: sections
            SR-->>S: sections พร้อมคาบ
            S->>ORM: initialize info.description ใน transaction
            ORM->>DB: SELECT elective_review_point ของวิชา ตาม sort_order
            DB-->>ORM: ordered review points
            ORM-->>S: List String description
            loop แต่ละ Sec เรียง semester แล้ว sectionNo
                S->>S: toSectionResponse(section, currentSemester, timetable)
                S->>S: selectable = semester เท่ากับ currentSemester<br/>inTimetable = มี sectionId นี้ใน entries
                alt selectable
                    S->>O: conflictWith(section, timetable)
                    O-->>S: รหัสวิชาอื่นที่ชน ไม่รวม courseCode ตัวเอง
                else อีกภาค
                    S->>S: conflictWith = []
                end
                S->>S: ElectiveSectionResponse.from(section, currentSemester, inTimetable, conflictWith)
            end
            S->>S: offeredSemesters จาก Sec ทั้งปี<br/>ประกอบ summary + description + sections
            S-->>C: ElectiveDetailResponse
            C-->>UI: 200 รายละเอียด
            UI-->>Student: ชื่อ หน่วยกิต bullet รีวิว Sec และป้าย/คำเตือน
        end
    end
```

`US1 timetable repositories` รวม lifeline ของ repository สองตัวตาม [DAO Class Diagram](./US6-T06-DAO-Class-Diagram.md) ส่วน `Hibernate collection loader` แสดง SQL ที่ ORM โหลด collection ให้ entity ไม่ใช่ service เปิด JDBC อ่าน DB เอง

## สถานะใน modal

| เงื่อนไข | DTO / การแสดงผล |
|---|---|
| Sec อยู่ในภาคปัจจุบัน | `selectable: true` แม้มีเวลาชนหรือมีวิชาเดิมอยู่แล้ว; การ disable เพิ่มพิจารณาอีกขั้นตาม T05 |
| Sec อยู่อีกภาค | `selectable: false`, `conflictWith: []`; UI แสดงสีจางและภาคปัจจุบัน เช่น PY250 Sec 230001 ของภาค 2 เมื่อเปิดตารางภาค 1 |
| sectionId อยู่ในตาราง | `inTimetable: true`; แสดงเพิ่มแล้ว; หาก **Sec ใดของวิชานี้** อยู่ในตาราง ปุ่มเพิ่มทั้งวิชา disabled แม้กำลังมองอีก Sec |
| candidate เวลาชน | `conflictWith` เป็นรหัสวิชาในตารางที่ชน ไม่ซ้ำ เรียงตาม entries; แค่เตือน ไม่ทำให้ `selectable` เป็น false |
| candidate วิชาเดียวกับ entry | helper ข้ามทั้ง courseCode เช่น FR205 อีก Sec ชน FR205 เดิม ไม่รายงานว่าชนตัวเอง; กฎวิชาซ้ำยังถูกตรวจแยก |
| คาบ/instructor/room | คาบว่างได้, instructor/room NULL แสดงไม่ระบุ ไม่ตัด Sec ทิ้งเพราะ left join |
| `requiresQuota: true` | แสดงป้ายและลิงก์ไปเมนูขอโควตา ไม่เรียก quota API ใหม่หรือบล็อกเพิ่มโดยอัตโนมัติ |

ไม่ส่ง `q`, `semester`, `day`, `timeSlot`, `group`, `excludeConflicts` ของหน้ารายการมายังกรายละเอียด การ์ดผ่านเพียง 1 Sec ก็ได้ แต่เปิด modal ต้องเห็นทุก Sec ทั้งปีเพื่อให้รู้ตัวเลือกอื่น

ชื่อไทย / หมวด / quota มาจาก `elective_info`; tags จาก `elective_tag` เรียง enum; bullet รีวิวจาก `elective_review_point` เรียง sort_order ทั้งหมดประกอบใน service ก่อนจบ transaction ไม่พึ่ง lazy loading หลังส่งออก DTO

## ปุ่มเพิ่มและ error

- ถ้ามี Sec ที่ `selectable && !inTimetable` เพียงตัวเดียว ให้ UI เลือกอัตโนมัติ; หากมีหลายตัวต้องตรวจว่ามี Sec ที่เลือกอยู่และยังเลือกได้ก่อนกดเพิ่ม
- UI ปิด modal/retry ได้เมื่อ GET ล้มเหลว; รายละเอียดไม่มีสิทธิ์เข้ารายการได้ 404 ไม่โหลดตารางผู้ใช้ต่อ
- วิชาที่ไม่มี review ไม่เข้ารายการและ detail ได้ 404 ตาม eligibility; fallback “ยังไม่มีรายละเอียดวิชา” ของ UI เป็นการรับมือข้อมูลผิดพลาด ไม่ใช่ผลสำเร็จปกติที่ seed ควรให้
- GET ไม่เขียน `timetable` หรือ metadata แม้นักศึกษายังไม่มีตาราง
- flow POST, 409 และการ refresh รายการหลังเพิ่มอยู่ใน [Sequence เพิ่มลงตาราง](./US6-T06-Sequence-Diagram-AddEntry.md)

## เอกสารที่เกี่ยวข้อง

- [Sequence ค้นหา](./US6-T06-Sequence-Diagram-Search.md)
- [DAO Class Diagram](./US6-T06-DAO-Class-Diagram.md)
- [ER Diagram](./US6-T06-ER-Diagram.md)
- [Extended API Class Diagram](./US6-T06-Extended-API-Class-Diagram.md)
