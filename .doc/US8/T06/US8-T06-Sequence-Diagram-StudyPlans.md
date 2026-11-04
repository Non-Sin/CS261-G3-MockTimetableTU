# US8-T06 — Sequence Diagram: ดูแผนการเรียนที่เลือกได้

ลำดับการทำงานระหว่าง UI, API, repository (DAO) และ DB ของ `GET /api/study-plans?studyYear=&semester=` ต่อจาก US8-T05 เป็นขั้นก่อน [Preview](./US8-T06-Sequence-Diagram-Preview.md) ให้นักศึกษาได้ `planId` ไปใช้

ข้อกำหนดที่ใช้ตาม [DTO & API Spec](../T05/US8-DTO-API-Spec.md) และ [API Class Diagram](../T05/US8-API-Class-Diagram.md):

- `studyYear` (1–4) และ `semester` (1–2) เป็น `@RequestParam` พร้อม `@Min` / `@Max` ค่าผิดหรือไม่ส่ง → 400 ก่อนเข้า method controller **ห้ามใส่ `@Validated`** (ไม่เช่นนั้นจะได้ 500)
- backend ไม่คำนวณชั้นปี ใช้ `studyYear` ที่ส่งมาตรง ๆ และกรองด้วย `users.department` ของนักศึกษา
- ไม่พบแผน → `200` กับ `plans: []` ไม่ใช่ error
- `StudyPlanService` เป็น `@Transactional(readOnly = true)` ไม่มีการเขียน
- ชื่อ "DAO" ในการ์ดคือ repository เหมือน US1-T06 และ US2-T06

```mermaid
sequenceDiagram
    actor User as นักศึกษา
    participant UI as หน้าเว็บ
    participant C as StudyPlanController
    participant P as CurrentStudentProvider
    participant S as StudyPlanService
    participant UR as UserRepository
    participant PR as StudyPlanRepository
    participant DB as Database

    User->>UI: เลือกปุ่ม "ชั้นปี" และ "ภาคเรียน"
    UI->>C: GET /api/study-plans?studyYear=2&semester=1

    alt ไม่ส่ง param, ไม่ใช่ตัวเลข หรืออยู่นอกช่วง
        C-->>UI: 400 ProblemDetail (Spring ตรวจก่อนเข้า method)
        UI->>UI: แสดงข้อความผิดพลาด
    else param ถูกต้อง
        C->>P: currentStudentId()
        P-->>C: studentId
        C->>S: getPlans(studentId, studyYear, semester)
        Note over S,DB: เริ่ม transaction (readOnly)

        S->>UR: findById(studentId)
        UR->>DB: SELECT users
        DB-->>UR: user (ไม่พบได้)
        UR-->>S: Optional<User>

        alt ไม่พบนักศึกษา
            S-->>C: throw ResourceNotFoundException
            C-->>UI: 404 ProblemDetail
        else พบนักศึกษา
            S->>PR: findByDepartmentAndStudyYearAndSemester(user.department, studyYear, semester)
            PR->>DB: SELECT study_plan JOIN study_plan_course, course<br/>ORDER BY sort_order
            DB-->>PR: preset ที่ตรงเงื่อนไข (ว่างได้)
            PR-->>S: List<StudyPlan>
            S->>S: แต่ละแผน → StudyPlanResponse.of(plan, courses)<br/>(คำนวณ totalCredits)
            S-->>C: StudyPlanListResponse(department, studyYear, semester, plans)
            C-->>UI: 200 StudyPlanListResponse

            alt plans ว่าง
                UI-->>User: "ยังไม่มีแผนการเรียนสำหรับชั้นปีนี้"
            else มีแผน
                UI-->>User: "แผนการเรียนชั้นปีที่ 2" และรายการหลักสูตร<br/>พร้อมวิชาในแผนให้เลือก
            end
        end
    end
```

หมายเหตุ

- **ต้องโหลดวิชาในแผนมาใน query เดียวกัน** เพราะ `open-in-view: false` และ `StudyPlanResponse.of` อ่านวิชาของทุกแผน วิธีโหลด (`@EntityGraph` หรือ `JOIN FETCH`) ระบุใน DAO Class Diagram ของ T06
- **400 มี 3 แบบ** `MissingServletRequestParameterException`, `MethodArgumentTypeMismatchException` และ `HandlerMethodValidationException` ทั้งหมดจัดการโดย `ResponseEntityExceptionHandler` ที่ `GlobalExceptionHandler` สืบทอดมา ดูตาราง "Validation ของ query param" ใน API Class Diagram
- **404 เกิดได้น้อย** นักศึกษาที่ login แล้วมีแถวใน `users` เสมอ (US3) แต่ service ยังต้องกันกรณีนี้ไว้
- **`courses` ยังไม่บอกว่าภาคนี้เปิดสอนหรือไม่** ผลจริงดูจาก `apply-plan` แบบ `dryRun` ในขั้น Preview

## เอกสารที่เกี่ยวข้อง

- [Extended API Class Diagram](./US8-T06-Extended-API-Class-Diagram.md)
- [DAO Class Diagram](./US8-T06-DAO-Class-Diagram.md)
- [ER Diagram (DB)](./US8-T06-ER-Diagram.md)
- [Sequence Diagram — Preview](./US8-T06-Sequence-Diagram-Preview.md)
- [Sequence Diagram — Confirm](./US8-T06-Sequence-Diagram-Confirm.md)
- [DTO & API Spec](../T05/US8-DTO-API-Spec.md) (US8-T05)
- [API Class Diagram](../T05/US8-API-Class-Diagram.md) (US8-T05)
