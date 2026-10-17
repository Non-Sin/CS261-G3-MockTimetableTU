# US1-T06 — Sequence Diagram: เพิ่มวิชาลงตารางเรียนจำลอง

ลำดับการทำงานระหว่าง UI, API, repository (DAO) และ DB ของ `POST /api/timetable/entries` ต่อจาก US1-T05

ข้อกำหนดที่ใช้ตาม [DTO & API Spec](../T05/US1-DTO%20&%20API%20Spec.md):

- ลำดับตรวจใน `addEntry`: ตรวจ body (400) → หา section (404) → วิชาซ้ำ (409) → หน่วยกิต (409) → บันทึก แล้วคำนวณ `conflicts` ใหม่ (201) ซึ่ง Spec ระบุให้ใช้ลำดับนี้แทนลำดับในการ์ด US1-T06
- เวลาชนไม่ใช่ error ตอบ `201` พร้อม `conflicts` ที่ไม่ว่าง
- `findConflicts(entries)` เป็น private method ใน `TimetableService` คำนวณจากคาบเรียนในหน่วยความจำ ไม่ใช่ query ใน DB
- ชื่อ "DAO" ในการ์ดคือ repository ตามที่ API Class Diagram เขียนไว้ว่า "repository เป็นงาน US1-T06"

```mermaid
sequenceDiagram
    actor User as นักศึกษา
    participant UI as หน้าเว็บ
    participant C as TimetableController
    participant P as CurrentStudentProvider
    participant S as TimetableService
    participant SR as SectionRepository
    participant TR as TimetableRepository
    participant ER as TimetableEntryRepository
    participant DB as Database

    User->>UI: กด "+ เพิ่มวิชา" บนการ์ดวิชา
    UI->>C: POST /api/timetable/entries (sectionId)

    alt ไม่ส่ง sectionId (@NotNull)
        C-->>UI: 400 ProblemDetail พร้อม errors
    else ส่งมาครบ
        C->>P: currentStudentId()
        P-->>C: studentId
        C->>S: addEntry(studentId, request)

        S->>SR: findById(sectionId)
        SR->>DB: SELECT section, course, schedule_slot
        DB-->>SR: ผลลัพธ์
        SR-->>S: Section หรือไม่พบ

        alt ไม่พบ section
            S-->>C: throw ResourceNotFoundException
            C-->>UI: 404 ProblemDetail
        else พบ section
            S->>TR: findByStudentIdAndAcademicYearAndSemester(studentId, ปี/ภาคของ section)
            TR->>DB: SELECT timetable
            DB-->>TR: ผลลัพธ์
            TR-->>S: Timetable หรือยังไม่มี

            S->>ER: findByTimetableId(timetableId)
            ER->>DB: SELECT timetable_entry, section, course, schedule_slot
            DB-->>ER: วิชาที่อยู่ในตาราง
            ER-->>S: entries (ว่างได้)

            S->>S: checkNotAlreadyAdded(entries, section)

            alt มีวิชานี้ในตารางแล้ว (ไม่ว่ากลุ่มไหน)
                S-->>C: throw BusinessRuleException COURSE_ALREADY_IN_TIMETABLE
                C-->>UI: 409 ProblemDetail (courseCode, existingSectionNo)
            else ยังไม่มี
                S->>S: checkCreditLimit(entries, section)

                alt หน่วยกิตรวมหลังเพิ่มเกิน maxCredits
                    S-->>C: throw BusinessRuleException CREDIT_LIMIT_EXCEEDED
                    C-->>UI: 409 ProblemDetail (currentCredits, courseCredits, maxCredits)
                else ไม่เกิน
                    S->>TR: save(timetable) สร้างใหม่ถ้ายังไม่มี และตั้ง updatedAt
                    TR->>DB: INSERT หรือ UPDATE timetable
                    S->>ER: save(entry)
                    ER->>DB: INSERT INTO timetable_entry
                    DB-->>ER: สำเร็จ
                    S->>S: findConflicts(entries รวมวิชาที่เพิ่ม)
                    S->>S: TimetableResponse.of(...)
                    S-->>C: TimetableResponse
                    C-->>UI: 201 Created (ตารางทั้งก้อน + conflicts)
                    UI-->>User: อัปเดต grid และแจ้งเตือนถ้ามีเวลาชน
                end
            end
        end
    end
```

หมายเหตุ

- `BusinessRuleException` ถูกจับโดย `GlobalExceptionHandler.handleBusinessRule` แปลงเป็น ProblemDetail พร้อม `code` ตาม API Spec
- ถ้าตารางของภาคเรียนนั้นยังไม่เคยมี `Timetable` จะสร้างตอนบันทึกวิชาแรก ตารางว่างจึง `updatedAt: null` ตาม Spec


## เอกสารที่เกี่ยวข้อง
- [Sequence Diagram](./US1-T06-Sequence-Diagram.md)
- [DAO Class Diagram](./US1-T06-DAO-Class-Diagram.md)
- [Extended API Class Diagram](./US1-T06-Extended-API-Class-Diagram.md)
- [ER Diagram (DB)](./US1-T06-ER-Diagram.md)
- [DTO & API Spec](../T05/US1-DTO%20&%20API%20Spec.md) (US1-T05)
