# US8-T06 — Sequence Diagram: ยืนยันจัดตารางตามแผนการเรียน (Confirm)

ลำดับการทำงานระหว่าง UI, API, repository (DAO) และ DB ของ `POST /api/timetable/apply-plan` แบบ `dryRun: false` ต่อจาก [Sequence Diagram ขั้น Preview](./US8-T06-Sequence-Diagram-Preview.md)

ข้อกำหนดที่ใช้ตาม [DTO & API Spec](../T05/US8-DTO-API-Spec.md) และ [API Class Diagram](../T05/US8-API-Class-Diagram.md):

- ใช้ endpoint, `ApplyPlanController` และ `ApplyPlanService.applyPlan` ตัวเดียวกับ Preview ต่างกันแค่ `dryRun: false` UI ส่ง `planId` และ `minorId` ชุดเดียวกับตอน preview
- **คำนวณใหม่ทั้งหมด** ไม่ใช้ผล preview ครั้งก่อน เพราะระหว่างนั้นตารางอาจถูกแก้ในแท็บอื่น ขั้นหา preset → `loadMinor` → `loadCandidates` → `planScheduler.schedule()` จึงเหมือน Preview ทุกขั้น รวมถึง error ของวิชาโท
- `ApplyPlanService.saveAdded` บันทึกเองผ่าน `TimetableRepository` และ `TimetableEntryRepository` **ไม่เรียก** `POST /api/timetable/entries` หรือ `TimetableService.addEntry` ของ US1 เพราะต้องบันทึก `added` ทั้งหมดใน transaction เดียว และ `PlanScheduler` ตรวจวิชาซ้ำ หน่วยกิต และเวลาชนครบแล้ว
- response คืน `timetable` เป็น `TimetableResponse` ที่สร้างด้วย `TimetableService.getTimetable` ของ US1 ใน transaction เดียวกัน frontend วาด grid ต่อได้เลยโดยไม่ต้อง GET ซ้ำ
- ชื่อ "DAO" ในการ์ดคือ repository เหมือน US1-T06 และ US2-T06

```mermaid
sequenceDiagram
    actor User as นักศึกษา
    participant UI as หน้าเว็บ
    participant C as ApplyPlanController
    participant P as CurrentStudentProvider
    participant S as ApplyPlanService
    participant PR as StudyPlanRepository
    participant MR as StudyMinorRepository
    participant TR as TimetableRepository
    participant ER as TimetableEntryRepository
    participant SR as SectionRepository
    participant PS as PlanScheduler
    participant TS as TimetableService (US1)
    participant DB as Database

    User->>UI: กด "ยืนยันจัดตาราง" ที่หน้าสรุป
    UI->>UI: status = applying ปุ่มกดไม่ได้
    UI->>C: POST /api/timetable/apply-plan<br/>{ planId, minorId, academicYear, dryRun: false }

    alt ไม่ส่ง planId หรือ academicYear
        C-->>UI: 400 ProblemDetail (@Valid ตรวจก่อนเข้า method)
        UI->>UI: แสดงข้อความผิดพลาด status = idle
    else body ถูกต้อง
        C->>P: currentStudentId()
        P-->>C: studentId
        C->>S: applyPlan(studentId, request)
        Note over S,DB: เริ่ม transaction (@Transactional)

        S->>PR: findWithCoursesById(planId)
        PR->>DB: SELECT study_plan JOIN study_plan_course, course
        DB-->>PR: preset (ไม่พบได้)
        PR-->>S: Optional<StudyPlan>

        alt ไม่พบ planId
            S-->>C: throw ResourceNotFoundException
            C-->>UI: 404 ProblemDetail
            UI->>UI: แจ้งว่าไม่พบแผนการเรียน status = idle
        else ส่ง minorId แต่ plan.studyYear เป็น 1–2
            S-->>C: throw BusinessRuleException(400, MINOR_NOT_ALLOWED)
            C-->>UI: 400 ProblemDetail (code: MINOR_NOT_ALLOWED) ไม่เขียน DB
            UI->>UI: แสดงข้อความผิดพลาด status = idle
        else พบแผน
            opt ส่ง minorId (loadMinor)
                S->>MR: findWithCoursesById(minorId)
                MR->>DB: SELECT study_minor JOIN study_minor_course, course
                DB-->>MR: วิชาโทพร้อมวิชาทุกภาค (ไม่พบได้)
                MR-->>S: Optional<StudyMinor>
            end

            alt ไม่พบ minorId
                S-->>C: throw ResourceNotFoundException
                C-->>UI: 404 ProblemDetail ไม่เขียน DB
                UI->>UI: แจ้งว่าไม่พบวิชาโท status = idle
            else department หรือ curriculumName ของวิชาโทไม่ตรงกับ preset
                S-->>C: throw BusinessRuleException(400, MINOR_PLAN_MISMATCH)
                C-->>UI: 400 ProblemDetail (code: MINOR_PLAN_MISMATCH) ไม่เขียน DB
                UI->>UI: แสดงข้อความผิดพลาด status = idle
            else ไม่ส่ง minorId หรือวิชาโทถูกต้อง
                Note over S,PS: คำนวณใหม่ทั้งหมดเหมือนขั้น Preview<br/>(ไม่ใช้ผล preview ครั้งก่อน)
                S->>S: วิชาของแผน (PLAN) + minor.coursesOf(plan.studyYear, plan.semester) (MINOR)
                S->>TR: findByStudentIdAndAcademicYearAndSemester(studentId, academicYear, plan.semester)
                TR->>DB: SELECT timetable
                DB-->>TR: timetable (ไม่พบได้)
                TR-->>S: Optional<Timetable>
                opt มีตารางของภาคนั้นแล้ว
                    S->>ER: findByTimetableId(timetableId)
                    ER->>DB: SELECT timetable_entry, section, course, schedule_slot
                    DB-->>ER: วิชาในตารางเดิม
                    ER-->>S: entries → existing sections
                end
                S->>SR: findByCourseCodesAndTerm(courseCodes ของแผน + วิชาโท, academicYear, plan.semester)
                SR->>DB: SELECT section, course, schedule_slot
                DB-->>SR: section ของภาคนี้
                SR-->>S: List<Section>
                S->>S: จัดกลุ่ม section ตามวิชา → List<PlanCourseCandidate> (พร้อม source)
                S->>PS: schedule(candidates, existing, maxCredits)
                Note over PS: กรอง → backtracking → สรุปผล (ไม่ใช้ DB)<br/>วิชา PLAN มาก่อน MINOR
                PS-->>S: ScheduleResult(added, skipped)

                alt added ว่าง
                    S->>S: ไม่เรียก saveAdded (ไม่เขียน DB, updatedAt ไม่เปลี่ยน)
                else มีวิชาที่จะเพิ่ม
                    Note over S,ER: saveAdded(studentId, plan, academicYear, sections)
                    alt ยังไม่มีตารางของภาคนั้น
                        S->>S: new Timetable(studentId, academicYear, plan.semester)
                    end
                    S->>S: timetable.touch() ตั้ง updatedAt เป็นเวลาปัจจุบัน
                    S->>TR: save(timetable)
                    S->>S: สร้าง TimetableEntry 1 แถวต่อ 1 section ใน added<br/>(PLAN และ MINOR เหมือนกัน ไม่เก็บ source)
                    S->>ER: saveAll(entries ใหม่)
                end

                S->>TS: getTimetable(studentId, academicYear, plan.semester)
                TS->>TR: findByStudentIdAndAcademicYearAndSemester(...)
                Note over TR,DB: Hibernate flush ก่อนรัน query<br/>INSERT timetable (ถ้าสร้างใหม่) / UPDATE timetable SET updated_at<br/>INSERT timetable_entry
                TR->>DB: SELECT timetable
                DB-->>TR: timetable (ไม่พบได้ ถ้า added ว่างและไม่เคยมีตาราง)
                TR-->>TS: Optional<Timetable>
                opt พบตาราง
                    TS->>ER: findByTimetableId(timetableId)
                    ER->>DB: SELECT timetable_entry, section, course, schedule_slot
                    DB-->>ER: วิชาเดิม + วิชาที่เพิ่ม
                    ER-->>TS: entries
                    TS->>TS: findConflicts(entries) แล้ว TimetableResponse.of(...)
                end
                TS-->>S: TimetableResponse
                S->>S: added → AddedPlanCourseResponse.from(section, source)
                S-->>C: ApplyPlanResponse(planId, minorId, dryRun: false,<br/>added, skipped, timetable) (commit transaction)
                C-->>UI: 200 ApplyPlanResponse
                UI->>UI: แทน Timetable เดิมด้วย response.timetable status = idle
                UI-->>User: grid, หน่วยกิต และแถบเวลาชนอัปเดต<br/>พร้อมสรุปวิชาที่เพิ่มและที่ข้ามจาก response นี้
            end
        end
    end
```

หมายเหตุ

- **all-or-nothing** การบันทึกทั้งหมดอยู่ใน transaction เดียวของ `applyPlan` ถ้า error ระหว่างทาง จะไม่มีวิชาไหนถูกเพิ่มค้างในตาราง error ของวิชาโท (`MINOR_NOT_ALLOWED`, 404, `MINOR_PLAN_MISMATCH`) เกิดก่อน `saveAdded` จึงไม่เขียน DB เลย
- **SQL ของการบันทึกส่งตอน flush** `save` / `saveAll` / `touch()` เปลี่ยนสถานะใน persistence context ก่อน Hibernate ส่ง `INSERT` / `UPDATE` ก่อน query ถัดไปใน `getTimetable` วิชาที่เพิ่มจึงอยู่ใน response และ `updatedAt` เป็นเวลาใหม่ (แบบเดียวกับ US2-T06)
- **ไม่เก็บว่าวิชามาจากวิชาโท** `source` มีเฉพาะใน `added` / `skipped` ของ response นี้ หลังบันทึกแล้ววิชาโทเป็น entry ปกติ ลบได้ผ่าน US2 และ `timetable` ใน response ไม่มีป้าย "วิชาโท"
- **`added` ว่างไม่เขียน DB** ไม่สร้างตารางใหม่และ `updatedAt` ไม่เปลี่ยน ยังตอบ `200` ถ้าไม่เคยมีตารางของภาคนั้น `getTimetable` คืนตารางว่างที่มี `updatedAt: null` ตาม US1
- **ผลอาจต่างจาก preview** ถ้าตารางถูกแก้ในแท็บอื่นระหว่าง preview กับยืนยัน UI ต้องแสดง `added` / `skipped` / `timetable` จาก response นี้ ไม่ใช่ผลของ preview
- **`timetable.conflicts` ยังมีได้** ถ้าตารางเดิมมีวิชาชนกันอยู่แล้วก่อน apply (US8 ไม่ลบวิชาเดิม) แต่วิชาที่ US8 เพิ่ม (ทั้ง `PLAN` และ `MINOR`) จะไม่ชนกับวิชาใดเลย
- **ไม่ใช้ API เพิ่มวิชาของ US1** `addEntry` ทำงานทีละ section, query ซ้ำ และสร้าง response ทุกรอบ อีกทั้งไม่ตรวจเวลาชน ส่วน `BusinessRuleException` ที่โยนจากในนั้นจะทำให้ transaction ของ `applyPlan` rollback ทั้งก้อน
- **400 จาก `@Valid`**, **400 จาก `BusinessRuleException`** และ **404 จาก `ResourceNotFoundException`** ถูกแปลงเป็น ProblemDetail โดย `GlobalExceptionHandler` เดิม

## เอกสารที่เกี่ยวข้อง

- [Extended API Class Diagram](./US8-T06-Extended-API-Class-Diagram.md)
- [DAO Class Diagram](./US8-T06-DAO-Class-Diagram.md)
- [ER Diagram (DB)](./US8-T06-ER-Diagram.md)
- [Sequence Diagram — ดูแผนการเรียน](./US8-T06-Sequence-Diagram-StudyPlans.md)
- [Sequence Diagram — Preview](./US8-T06-Sequence-Diagram-Preview.md)
- [DTO & API Spec](../T05/US8-DTO-API-Spec.md) (US8-T05)
- [DTO Class Diagram](../T05/US8-DTO-Class-Diagram.md) (US8-T05)
- [API Class Diagram](../T05/US8-API-Class-Diagram.md) (US8-T05)
- [US1-T06 — Sequence Diagram](../../US1/T06/US1-T06-Sequence-Diagram.md)
- [US2-T06 — Sequence Diagram](../../US2/T06/US2-T06-Sequence-Diagram.md)
