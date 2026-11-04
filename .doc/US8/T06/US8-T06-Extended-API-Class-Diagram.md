# US8-T06 — Extended API Class Diagram

ขยายจาก [API Class Diagram](../T05/US8-API-Class-Diagram.md) ของ US8-T05 โดยต่อ service เข้ากับ repository และ entity ใน [DAO Class Diagram](./US8-T06-DAO-Class-Diagram.md) พร้อมระบุ transaction และ method ของ repository ที่แต่ละ method ของ service เรียก ส่วน controller, `CurrentStudentProvider`, `GlobalExceptionHandler`, DTO และโมดูลฝั่ง frontend ไม่เปลี่ยนจาก T05 จึงไม่วาดซ้ำ

```mermaid
classDiagram
    direction LR

    class StudyPlanService {
        <<US8 Service · readOnly>>
        -studyPlanRepository StudyPlanRepository
        -userRepository UserRepository
        +getPlans(studentId, studyYear, semester) StudyPlanListResponse
    }
    class ApplyPlanService {
        <<US8 Service · Transactional>>
        -maxCredits int
        -studyPlanRepository StudyPlanRepository
        -sectionRepository SectionRepository
        -timetableRepository TimetableRepository
        -timetableEntryRepository TimetableEntryRepository
        -timetableService TimetableService
        -planScheduler PlanScheduler
        +applyPlan(studentId, request) ApplyPlanResponse
        -loadCandidates(plan, academicYear) List~PlanCourseCandidate~
        -saveAdded(studentId, plan, academicYear, sections) void
    }
    class PlanScheduler {
        <<US8 Component · ไม่ใช้ DB>>
        -maxNodes int
        +schedule(candidates, existing, maxCredits) ScheduleResult
    }
    class TimetableService {
        <<US1 Service>>
        -timetableRepository TimetableRepository
        -timetableEntryRepository TimetableEntryRepository
        +getTimetable(studentId, academicYear, semester) TimetableResponse
    }

    class StudyPlanRepository {
        <<US8 interface>>
    }
    class UserRepository {
        <<US3 interface>>
    }
    class SectionRepository {
        <<US1 interface>>
    }
    class TimetableRepository {
        <<US1 interface>>
    }
    class TimetableEntryRepository {
        <<US1 interface>>
    }

    class StudyPlan {
        <<US8 Entity>>
    }
    class StudyPlanCourse {
        <<US8 Entity>>
    }
    class Timetable {
        <<US1 Entity>>
        +touch() void
    }
    class TimetableEntry {
        <<US1 Entity>>
    }
    class ResourceNotFoundException {
        <<มีอยู่แล้ว · 404>>
    }

    StudyPlanService --> StudyPlanRepository : findByDepartmentAndStudyYearAndSemester
    StudyPlanService --> UserRepository : findById
    ApplyPlanService --> StudyPlanRepository : findWithCoursesById
    ApplyPlanService --> SectionRepository : findByCourseCodesAndTerm
    ApplyPlanService --> TimetableRepository : findBy...AndSemester, save
    ApplyPlanService --> TimetableEntryRepository : findByTimetableId, saveAll
    ApplyPlanService --> PlanScheduler : schedule
    ApplyPlanService --> TimetableService : getTimetable (Confirm)
    TimetableService --> TimetableRepository
    TimetableService --> TimetableEntryRepository

    StudyPlanRepository ..> StudyPlan : คืน
    StudyPlan "1" *-- "1..*" StudyPlanCourse
    ApplyPlanService ..> Timetable : สร้าง/touch() (Confirm)
    ApplyPlanService ..> TimetableEntry : สร้าง (Confirm)
    StudyPlanService ..> ResourceNotFoundException : throws ไม่พบ user
    ApplyPlanService ..> ResourceNotFoundException : throws ไม่พบ planId
```

| Service method | เรียก repository / class | ใช้ใน |
| --- | --- | --- |
| `StudyPlanService.getPlans` | `userRepository.findById` → `studyPlanRepository.findByDepartmentAndStudyYearAndSemester` → `StudyPlanResponse.of` | `GET /api/study-plans` |
| `ApplyPlanService.applyPlan` | `studyPlanRepository.findWithCoursesById` → `loadCandidates` → `planScheduler.schedule` → (`dryRun: false`) `saveAdded` → `timetableService.getTimetable` | Preview / Confirm |
| `ApplyPlanService.loadCandidates` | `timetableRepository.findByStudentIdAndAcademicYearAndSemester` → `timetableEntryRepository.findByTimetableId` (ถ้ามีตาราง) → `sectionRepository.findByCourseCodesAndTerm` | Preview / Confirm |
| `ApplyPlanService.saveAdded` | `new Timetable` (ถ้ายังไม่มี) → `timetable.touch()` → `timetableRepository.save` → `timetableEntryRepository.saveAll` | Confirm เมื่อ `added` ไม่ว่าง |

- **ไม่เพิ่ม field ใหม่จาก T05** field ของทั้งสอง service ออกแบบไว้ครบแล้วใน T05 เอกสารนี้ต่อเส้นไปถึง entity และระบุ method ของ repository ที่เรียก ส่วน signature ของ method ใน repository อยู่ใน [DAO Class Diagram](./US8-T06-DAO-Class-Diagram.md)
- **`StudyPlanService` เป็น `@Transactional(readOnly = true)`** ไม่มีการเขียน และ `StudyPlanResponse.of` อ่าน `plan.getCourses()` กับ `course` ที่ fetch มาแล้วใน query เดียว
- **`ApplyPlanService` เป็น `@Transactional`** ที่ระดับ class ทั้ง Preview และ Confirm อยู่ใน transaction เดียวกับ `getTimetable` Preview ไม่เรียก `saveAdded` จึงไม่มีการเขียน ส่วน Confirm บันทึกแบบ all-or-nothing และ Hibernate flush ก่อน query ใน `getTimetable`
- **`saveAdded` เขียนผ่าน repository โดยตรง** ไม่เรียก `TimetableService.addEntry` ของ US1 เพราะ `addEntry` ทำงานทีละ section, query ซ้ำ และไม่ตรวจเวลาชน (ดูหมายเหตุใน [Sequence Diagram — Confirm](./US8-T06-Sequence-Diagram-Confirm.md))
- **`PlanScheduler` ไม่มี repository เป็น field** รับข้อมูลที่ `loadCandidates` เตรียมไว้ จึง unit test ได้โดยไม่มี DB · `maxNodes` อ่านจาก `app.study-plan.max-search-nodes` (default `50000`)
- **`maxCredits`** ของ `ApplyPlanService` อ่านจาก `app.timetable.max-credits` (22) ค่าเดียวกับ `TimetableService` ส่วน `ApplyPlanService` และ `PlanScheduler` เขียน constructor เองเพราะมีค่าจาก `@Value` แบบ `TimetableService` service อื่นใช้ `@RequiredArgsConstructor`
- **`TimetableService`** วาดเฉพาะส่วนที่ US8 ใช้ ส่วน `sectionRepository`, `maxCredits`, `addEntry` และ private method ดูได้ใน [Extended API Class Diagram ของ US1-T06](../../US1/T06/US1-T06-Extended-API-Class-Diagram.md) การย้ายสูตรเวลาชนไป `ScheduleOverlap` เป็น PR refactor แยกตาม T05
- **ไม่มี exception ใหม่** 404 ใช้ `ResourceNotFoundException` เดิม 400 มาจาก validation ของ Spring ทั้งหมดแปลงเป็น ProblemDetail โดย `GlobalExceptionHandler` เดิม

## เอกสารที่เกี่ยวข้อง

- [DAO Class Diagram](./US8-T06-DAO-Class-Diagram.md)
- [ER Diagram (DB)](./US8-T06-ER-Diagram.md)
- [Sequence Diagram — ดูแผนการเรียน](./US8-T06-Sequence-Diagram-StudyPlans.md)
- [Sequence Diagram — Preview](./US8-T06-Sequence-Diagram-Preview.md)
- [Sequence Diagram — Confirm](./US8-T06-Sequence-Diagram-Confirm.md)
- [API Class Diagram](../T05/US8-API-Class-Diagram.md) (US8-T05)
