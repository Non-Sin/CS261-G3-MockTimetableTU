# US8-T06 — Sequence Diagram: ดูสรุปก่อนยืนยันจัดตาราง (Preview)

ลำดับการทำงานระหว่าง UI, API, repository (DAO) และ DB ของ `POST /api/timetable/apply-plan` แบบ `dryRun: true` ต่อจาก US8-T05 ขั้นกดยืนยัน (`dryRun: false`) อยู่ใน Sequence Diagram อีกไฟล์

ข้อกำหนดที่ใช้ตาม [DTO & API Spec](../T05/US8-DTO-API-Spec.md) และ [API Class Diagram](../T05/US8-API-Class-Diagram.md):

- endpoint อยู่ที่ `ApplyPlanController` ซึ่งแยกจาก `TimetableController` ของ US1 (ไม่แก้ controller เดิม) แล้วส่งต่อให้ `ApplyPlanService`
- `studentId` มาจาก JWT ผ่าน `CurrentStudentProvider` เหมือน US1 ไม่รับจาก body
- ภาคเรียนอ่านจาก `plan.semester` ของ preset ไม่ต้องส่งมาใน request แผน (หัวข้อพิเศษ/สหกิจ) บอกด้วย `planId` อยู่แล้ว
- `minorId` ไม่บังคับ ไม่ส่ง/`null` = ไม่เรียนวิชาโท วิชาโทใช้วิชาของ `plan.studyYear` + `plan.semester`
- **preview ไม่เขียน DB** service อ่านข้อมูลจาก DB เพื่อส่งให้ `PlanScheduler` ผล `added` / `skipped` มาจากการคำนวณในหน่วยความจำ และคืน `timetable: null` โดยไม่เรียก `TimetableService.getTimetable()`
- ลำดับใน `applyPlan`: หา preset (404) → `loadMinor` ถ้ามี `minorId` (400 `MINOR_NOT_ALLOWED` / 404 / 400 `MINOR_PLAN_MISMATCH`) → `loadCandidates` (รวมวิชา `PLAN` + `MINOR`, entry เดิม + section ของทุกวิชา) → `planScheduler.schedule()` → `dryRun` จึงคืนผลทันที
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
    participant DB as Database

    User->>UI: เลือกแผนการเรียน (และวิชาโท) แล้วกด "ดูสรุป"
    UI->>UI: status = previewing ปุ่มกดไม่ได้
    UI->>C: POST /api/timetable/apply-plan<br/>{ planId, minorId, academicYear, dryRun: true }

    alt ไม่ส่ง planId หรือ academicYear
        C-->>UI: 400 ProblemDetail (@Valid ตรวจก่อนเข้า method)
        UI->>UI: แสดงข้อความผิดพลาด status = idle
    else body ถูกต้อง
        C->>P: currentStudentId()
        P-->>C: studentId
        C->>S: applyPlan(studentId, request)
        Note over S,DB: เริ่ม transaction (@Transactional) แต่ไม่มีการเขียน

        S->>PR: findWithCoursesById(planId)
        PR->>DB: SELECT study_plan JOIN study_plan_course, course<br/>(JOIN FETCH โหลดวิชาใน preset มาพร้อมกัน)
        DB-->>PR: preset (ไม่พบได้)
        PR-->>S: Optional<StudyPlan>

        alt ไม่พบ planId
            S-->>C: throw ResourceNotFoundException
            C-->>UI: 404 ProblemDetail
            UI->>UI: แจ้งว่าไม่พบแผนการเรียน status = idle
        else ส่ง minorId แต่ plan.studyYear เป็น 1–2
            S-->>C: throw BusinessRuleException(400, MINOR_NOT_ALLOWED)
            C-->>UI: 400 ProblemDetail (code: MINOR_NOT_ALLOWED)
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
                C-->>UI: 404 ProblemDetail
                UI->>UI: แจ้งว่าไม่พบวิชาโท status = idle
            else department หรือ curriculumName ของวิชาโทไม่ตรงกับ preset
                S-->>C: throw BusinessRuleException(400, MINOR_PLAN_MISMATCH)
                C-->>UI: 400 ProblemDetail (code: MINOR_PLAN_MISMATCH)
                UI->>UI: แสดงข้อความผิดพลาด status = idle
            else ไม่ส่ง minorId หรือวิชาโทถูกต้อง
                Note over S,SR: loadCandidates(plan, minor, academicYear)
                S->>S: วิชาของแผน (PLAN) + minor.coursesOf(plan.studyYear, plan.semester) (MINOR)<br/>ตัดวิชาโทที่ซ้ำกับแผน
                S->>TR: findByStudentIdAndAcademicYearAndSemester(studentId, academicYear, plan.semester)
                TR->>DB: SELECT timetable
                DB-->>TR: timetable (ไม่พบได้)
                TR-->>S: Optional<Timetable>

                alt มีตารางของภาคนั้นแล้ว
                    S->>ER: findByTimetableId(timetableId)
                    ER->>DB: SELECT timetable_entry, section, course, schedule_slot
                    DB-->>ER: วิชาในตารางเดิม (ว่างได้)
                    ER-->>S: entries → existing sections
                else ยังไม่มีตาราง
                    S->>S: existing = [] (ไม่สร้างตารางตอน preview)
                end

                S->>SR: findByCourseCodesAndTerm(courseCodes ของแผน + วิชาโท, academicYear, plan.semester)
                SR->>DB: SELECT section, course, schedule_slot<br/>(query เดียวสำหรับทุกวิชา)
                DB-->>SR: section ของภาคนี้ (ว่างได้)
                SR-->>S: List<Section>
                S->>S: จัดกลุ่ม section ตามวิชา<br/>→ List<PlanCourseCandidate> (พร้อม source)

                S->>PS: schedule(candidates, existing, maxCredits)
                Note over PS: ขั้นที่ 1 กรอง: COURSE_ALREADY_IN_TIMETABLE,<br/>NO_SECTION_AVAILABLE, ตัด section ที่ชนตารางเดิม,<br/>รวม section ที่เวลาเหมือนกัน
                Note over PS: ขั้นที่ 2 ค้นหา: greedy เป็นคำตอบเริ่มต้น<br/>แล้ว backtracking + branch and bound (เพดาน maxNodes)<br/>เกณฑ์: MAJOR ของ PLAN → วิชา PLAN → วิชา MINOR → หน่วยกิต → sectionNo
                Note over PS: ขั้นที่ 3 สรุป: เทียบกับตารางสุดท้าย<br/>CREDIT_LIMIT_EXCEEDED / TIME_CONFLICT
                PS-->>S: ScheduleResult(added, skipped)

                S->>S: added → AddedPlanCourseResponse.from(section, source)
                Note over S: dryRun = true → ข้าม saveAdded<br/>ไม่เรียก TimetableService.getTimetable()
                S-->>C: ApplyPlanResponse(planId, minorId, dryRun: true,<br/>added, skipped, timetable: null)
                C-->>UI: 200 ApplyPlanResponse
                UI->>UI: เก็บผล preview status = idle
                UI-->>User: รายการวิชาที่จะเพิ่ม (ชื่อวิชา, Sec, หน่วยกิต, ป้าย "วิชาโท")<br/>และวิชาที่ข้ามพร้อมเหตุผล (message)<br/>พร้อมปุ่ม "ยืนยันจัดตาราง"
            end
        end
    end
```

หมายเหตุ

- **ไม่มีการเขียน DB ทุกกรณี** ไม่สร้าง `Timetable` แม้ยังไม่มีตารางของภาคนั้น ไม่ `touch()` และไม่บันทึก entry หลัง preview แล้ว `GET /api/timetable` จึงได้ผลเดิม (ตรงกับเทสต์ที่เสนอไว้ใน Spec)
- **`MINOR_NOT_ALLOWED` ตรวจก่อนหาวิชาโท** ใช้แค่ `plan.studyYear` จึงไม่ query `study_minor` ส่วน `MINOR_PLAN_MISMATCH` เทียบ `department` และ `curriculumName` ของวิชาโทกับ preset ทั้งสองแบบใช้ `BusinessRuleException` เดิม `handleBusinessRule` ใส่ `code` ลง ProblemDetail
- **วิชาโทที่ไม่มีวิชาในภาคของ preset ไม่ใช่ error** `coursesOf` คืนรายการว่าง ผลจึงเหมือนไม่เลือกวิชาโท แต่ `minorId` ยังส่งกลับตาม request
- **วิชาแผนหลักมาก่อนเสมอ** เกณฑ์ข้อ 1–2 นับเฉพาะ `PLAN` วิชาโทจึงไม่ทำให้วิชาของแผนหลักหลุด ถ้าชนหรือหน่วยกิตเกิน วิชาโทเป็นฝ่ายถูกข้าม (`skipped` พร้อม `source: "MINOR"`)
- **`added` ว่างไม่ใช่ error** ยังตอบ `200` และวิชาที่ลงไม่ได้อยู่ใน `skipped` เหตุผลรายวิชาไม่ใช่ HTTP error
- **`PlanScheduler` ไม่ยุ่งกับ DB** ทุก query เกิดใน `ApplyPlanService` ก่อนเรียก `schedule()` ส่วนการตรวจเวลาชนใช้ `ScheduleOverlap` ร่วมกับ US1 (ไม่ได้วาดเพื่อไม่ให้แผนภาพรก)
- **query ไม่ขึ้นกับจำนวนวิชา** ดึง section ของทุกวิชาในแผนและวิชาโทด้วย `findByCourseCodesAndTerm` ครั้งเดียว และ entry เดิมด้วย `findByTimetableId` ครั้งเดียว `open-in-view: false` จึงต้องโหลดข้อมูลที่ใช้มาครบใน query
- **ผล preview ใช้แสดงเท่านั้น** ตอนกดยืนยัน backend คำนวณใหม่ทั้งหมด (ระหว่างนั้นตารางอาจถูกแก้ในแท็บอื่น) ดู Sequence Diagram ขั้นยืนยัน
- **400 จาก `@Valid`**, **400 จาก `BusinessRuleException`** และ **404 จาก `ResourceNotFoundException`** ถูกแปลงเป็น ProblemDetail โดย `GlobalExceptionHandler` เดิม

## เอกสารที่เกี่ยวข้อง

- [Extended API Class Diagram](./US8-T06-Extended-API-Class-Diagram.md)
- [DAO Class Diagram](./US8-T06-DAO-Class-Diagram.md)
- [ER Diagram (DB)](./US8-T06-ER-Diagram.md)
- [Sequence Diagram — ดูแผนการเรียน](./US8-T06-Sequence-Diagram-StudyPlans.md)
- [Sequence Diagram — Confirm](./US8-T06-Sequence-Diagram-Confirm.md)
- [DTO & API Spec](../T05/US8-DTO-API-Spec.md) (US8-T05)
- [DTO Class Diagram](../T05/US8-DTO-Class-Diagram.md) (US8-T05)
- [API Class Diagram](../T05/US8-API-Class-Diagram.md) (US8-T05)
- [US1-T06 — Sequence Diagram](../../US1/T06/US1-T06-Sequence-Diagram.md)
- [US2-T06 — Sequence Diagram](../../US2/T06/US2-T06-Sequence-Diagram.md)
