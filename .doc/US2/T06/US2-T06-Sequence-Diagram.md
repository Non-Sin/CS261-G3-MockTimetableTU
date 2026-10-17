# US2-T06 — Sequence Diagram: ลบวิชาจากตารางเรียนจำลอง

ลำดับการทำงานระหว่าง UI, API, repository (DAO) และ DB ของ `DELETE /api/timetable/entries?entryIds=` และ `DELETE /api/timetable/entries/{entryId}` ต่อจาก US2-T05

ข้อกำหนดที่ใช้ตาม [DTO & API Spec](../T05/US2-DTO-API-Spec.md):

- ลำดับตรวจใน `removeEntries`: `entryIds` ว่าง (400) → ตัด id ซ้ำ → หา entry ของนักศึกษาคนนี้ (404) → อยู่ตารางเดียวกัน (400) → ลบ, `touch()` ตาราง แล้วคืนตาราง (200)
- `removeEntry(studentId, entryId)` เรียก `removeEntries(studentId, List.of(entryId))` ทั้งสอง endpoint จึงใช้ flow เดียวกันในแผนภาพนี้
- ไม่ต้องส่งปี/ภาค backend อ่านจาก `entry.timetable` ตาม [ER Diagram ของ US1-T06](../../US1/T06/US1-T06-ER-Diagram.md)
- response สร้างด้วย `TimetableService.getTimetable` ของ US1 ใน transaction เดียวกัน ไม่เขียนการประกอบ `TimetableResponse` ซ้ำ
- ชื่อ "DAO" ในการ์ดคือ repository เหมือน US1-T06

```mermaid
sequenceDiagram
    actor User as นักศึกษา
    participant UI as หน้าเว็บ
    participant C as TimetableDeleteController
    participant P as CurrentStudentProvider
    participant S as TimetableDeleteService
    participant ER as TimetableEntryRepository
    participant TS as TimetableService (US1)
    participant TR as TimetableRepository
    participant DB as Database

    User->>UI: ติ๊กวิชาแล้วกดลบ หรือกดลบวิชาเดียว
    UI->>UI: status = deleting ปุ่มลบกดไม่ได้
    UI->>C: DELETE /api/timetable/entries?entryIds=7,8<br/>(วิชาเดียว: DELETE /api/timetable/entries/{entryId})

    alt id ไม่ใช่ตัวเลข หรือไม่ส่ง entryIds
        C-->>UI: 400 ProblemDetail (Spring ตอบก่อนเข้า method)
    else รูปแบบถูกต้อง
        C->>P: currentStudentId()
        P-->>C: studentId
        C->>S: removeEntries(studentId, entryIds)
        Note over S,ER: เริ่ม transaction (@Transactional ที่ระดับ class)

        alt entryIds ว่าง
            S-->>C: throw ResponseStatusException 400
            C-->>UI: 400 ProblemDetail
        else มี id
            S->>S: ตัด id ซ้ำ
            S->>ER: findAllById(ids)
            ER->>DB: SELECT timetable_entry WHERE entry_id IN (ids)
            DB-->>ER: แถวที่พบ
            ER-->>S: entries
            Note over S,DB: entry.getTimetable() โหลด timetable แบบ LAZY<br/>(SELECT timetable ครั้งเดียวถ้าทุก entry อยู่ตารางเดียวกัน)
            S->>S: เก็บเฉพาะ entry ที่ timetable.studentId = studentId

            alt ได้ไม่ครบทุก id (ไม่พบ หรือเป็นของคนอื่น)
                S-->>C: throw ResourceNotFoundException
                C-->>UI: 404 ProblemDetail
                UI->>UI: แจ้งว่าตารางเปลี่ยน แล้ว GET /api/timetable ใหม่ และล้าง checkbox
            else ครบทุก id
                S->>S: นับ timetable_id ที่ไม่ซ้ำ

                alt อยู่มากกว่า 1 ตาราง (คนละปีหรือคนละภาค)
                    S-->>C: throw ResponseStatusException 400
                    C-->>UI: 400 ProblemDetail
                else ตารางเดียว
                    S->>ER: deleteAll(entries)
                    S->>S: timetable.touch() ตั้ง updatedAt เป็นเวลาปัจจุบัน
                    S->>TS: getTimetable(studentId, academicYear, semester)
                    TS->>TR: findByStudentIdAndAcademicYearAndSemester(...)
                    Note over TR,DB: Hibernate flush ก่อนรัน query<br/>DELETE FROM timetable_entry<br/>UPDATE timetable SET updated_at
                    TR->>DB: SELECT timetable
                    DB-->>TR: timetable (updatedAt ใหม่)
                    TR-->>TS: Timetable
                    TS->>ER: findByTimetableId(timetableId)
                    ER->>DB: SELECT timetable_entry, section, course, schedule_slot
                    DB-->>ER: วิชาที่เหลือ (ว่างได้)
                    ER-->>TS: entries
                    TS->>TS: findConflicts(entries) แล้ว TimetableResponse.of(...)
                    TS-->>S: TimetableResponse
                    S-->>C: TimetableResponse (commit transaction)
                    C-->>UI: 200 TimetableResponse
                    UI->>UI: แทน Timetable เดิม ล้าง checkbox และ status = idle
                    UI-->>User: grid, หน่วยกิต และแถบเวลาชนอัปเดต
                end
            end
        end
    end
```

หมายเหตุ

- **ตรวจความเป็นเจ้าของก่อนตรวจคนละตาราง** ถ้าสลับกัน คนที่ส่ง id ของคนอื่นปนมาจะได้ `400` แทน `404` ซึ่งบอกเป็นนัยว่า id นั้นมีอยู่จริง entry ของคนอื่นจึงตอบ `404` ไม่ใช่ `403` ซึ่ง RFC 9110 อนุญาตไว้
- **all-or-nothing** ทุกการ throw เกิดก่อน `deleteAll` และอยู่ใน transaction เดียว ถ้า error จึงไม่มีแถวไหนถูกลบ
- **SQL ของการลบส่งตอน flush** `deleteAll` กับ `touch()` แค่เปลี่ยนสถานะใน persistence context Hibernate ส่ง `DELETE` และ `UPDATE` ก่อน query ถัดไปใน `getTimetable` วิชาที่ลบจึงไม่ติดมาใน response และ `updatedAt` เป็นเวลาใหม่
- **แถว `timetable` ไม่ถูกลบ** แม้ลบจนไม่เหลือวิชา response จึงได้ `entries: []` กับ `updatedAt` เป็นเวลาที่ลบ ต่างจากตารางที่ไม่เคยใช้ซึ่งได้ `updatedAt: null` ตาม US1
- **`ResponseStatusException` และ `ResourceNotFoundException`** ถูกแปลงเป็น ProblemDetail โดย `GlobalExceptionHandler` เดิม ไม่ต้องเพิ่ม handler
- **ไม่มีขั้นตอนตรวจตารางว่างฝั่ง backend** US2 TC4 (ตารางว่างกดลบไม่ได้) จัดการที่ UI จาก `entries.length === 0`

## เอกสารที่เกี่ยวข้อง

- [Sequence Diagram](./US2-T06-Sequence-Diagram.md)
- [DAO Class Diagram](./US2-T06-DAO-Class-Diagram.md)
- [Extended API Class Diagram](./US2-T06-Extended-API-Class-Diagram.md)
- [ER Diagram (DB)](./US2-T06-ER-Diagram.md)
- [DTO & API Spec](../T05/US2-DTO-API-Spec.md) (US2-T05)
- [US1-T06 — Sequence Diagram](../../US1/T06/US1-T06-Sequence-Diagram.md)
