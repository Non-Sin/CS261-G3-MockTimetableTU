# US7-T06 — Sequence Diagram: ดึงช่องทางขอโควตาของวิชาที่เลือก

ลำดับการทำงานระหว่างหน้าเว็บ (UI), Controller, Service, Repository (DAO) และ Database สำหรับ `GET /api/quota/courses/{courseCode}?academicYear=&semester=` รวมกรณีที่วิชาไม่มีข้อมูลโควตา (`NO_DATA`) และกรณีไม่พบรายวิชาในระบบ (`404`)

```mermaid
sequenceDiagram
    actor User as นักศึกษา
    participant UI as หน้าเว็บ (QuotaSearchPage)
    participant C as QuotaController
    participant P as CurrentStudentProvider
    participant S as QuotaService
    participant CR as CourseRepository
    participant TR as TimetableRepository
    participant TER as TimetableEntryRepository
    participant SR as SectionRepository
    participant QR as QuotaInfoRepository
    participant RR as QuotaRoundRepository
    participant DB as Database

    User->>UI: คลิกชิปรหัสวิชาในเงื่อนไข (เช่น EL295)
    UI->>C: GET /api/quota/courses/EL295?academicYear=2568&semester=1

    alt academicYear/semester ไม่ถูกต้อง
        C-->>UI: 400 ProblemDetail
    else parameter ถูกต้อง
        C->>P: currentStudentId()
        P-->>C: studentId
        C->>S: getCourseQuota(studentId, courseCode, academicYear, semester)
        Note over S,DB: เริ่ม transaction (readOnly)

        S->>S: normalizedCode = courseCode.strip().toUpperCase()
        S->>CR: findById(normalizedCode)
        CR->>DB: SELECT * FROM course WHERE course_code = :normalizedCode
        DB-->>CR: Optional<Course>
        CR-->>S: Optional<Course>

        alt ไม่พบวิชาในตาราง course (เช่น DM201)
            S-->>C: throw ResourceNotFoundException("ไม่พบรายวิชา " + normalizedCode)
            C-->>UI: 404 ProblemDetail
            UI-->>User: แสดง "ไม่พบข้อมูลช่องทางขอโควตาสำหรับวิชานี้"
        else พบรายวิชาในตาราง course
            S->>TR: findByStudentIdAndAcademicYearAndSemester(studentId, academicYear, semester)
            TR->>DB: SELECT timetable
            DB-->>TR: Optional<Timetable>
            opt มีตารางเรียน
                S->>TER: findByTimetableId(timetableId)
                TER->>DB: SELECT timetable_entry
                DB-->>TER: List<TimetableEntry>
            end
            S->>S: ตรวจ inMyTimetable จาก myCourseCodes

            S->>SR: findOfferedSemestersByCourseCodesAndYear([normalizedCode], academicYear)
            SR->>DB: SELECT DISTINCT semester FROM section
            DB-->>SR: offeredSemesters

            S->>QR: findWithDetailsByCourseCodes([normalizedCode])
            QR->>DB: SELECT course_quota_info LEFT JOIN FETCH conditions, channels, contacts
            DB-->>QR: Optional<CourseQuotaInfo> (ว่างได้)

            S->>RR: findByCourseCodesAndTerm([normalizedCode], academicYear, semester)
            RR->>DB: SELECT quota_round WHERE term = ... ORDER BY round_no
            DB-->>RR: List<QuotaRound>

            alt ไม่เปิดสอนในภาคที่ขอ (!offeredSemesters.contains(semester))
                S->>S: QuotaCourseResponse.notOffered(...)
            else ไม่มีแถวใน course_quota_info (วิชาไม่มีข้อมูลโควตา)
                S->>S: QuotaCourseResponse.noData(...)
            else quotaRequired == false
                S->>S: QuotaCourseResponse.notRequired(...)
            else quotaRequired == true
                S->>S: QuotaCourseResponse.required(...)
            end

            S-->>C: QuotaCourseResponse
            C-->>UI: 200 OK QuotaCourseResponse
            UI-->>User: ใส่รหัสวิชาลงช่องค้นหา และแสดงการ์ดตาม quotaStatus (รวมกรณี NO_DATA)
        end
    end
```

## หมายเหตุสำคัญ

- **วิชาที่ไม่มีข้อมูลโควตา (`NO_DATA`) ตอบ `200` ไม่ใช่ `404`:** กรณีวิชามีอยู่ในตาราง `course` (เช่น `TU101`) แต่ยังไม่มีแถวใน `course_quota_info` backend จะสร้าง `QuotaCourseResponse.noData(...)` ที่มี `quotaStatus = "NO_DATA"` และ list ว่างทั้งหมดกลับไป
- **ตอบ `404` เฉพาะเมื่อไม่มี `courseCode` ในตาราง `course`:** เช่น `DM201` โดย `QuotaService` โยน `ResourceNotFoundException` ให้ `GlobalExceptionHandler` แปลงเป็น `404 ProblemDetail`

## เอกสารที่เกี่ยวข้อง

- [ER Diagram](./US7-T06-ER-Diagram.md)
- [DAO Class Diagram](./US7-T06-DAO-Class-Diagram.md)
- [Extended API Class Diagram](./US7-T06-Extended-API-Class-Diagram.md)
- [Sequence Diagram — Search](./US7-T06-Sequence-Diagram-Search.md)
