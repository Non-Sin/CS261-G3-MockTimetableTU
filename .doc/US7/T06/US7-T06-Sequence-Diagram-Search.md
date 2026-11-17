# US7-T06 — Sequence Diagram: ค้นหาช่องทางขอโควตา

ลำดับการทำงานระหว่างหน้าเว็บ (UI), Controller, Service, Repository (DAO) และ Database สำหรับ `GET /api/quota/courses?academicYear=&semester=&q=&mine=` ตาม [DTO & API Spec](../T05/US7-DTO-API-Spec.md) และ [Extended API Class Diagram](./US7-T06-Extended-API-Class-Diagram.md)

```mermaid
sequenceDiagram
    actor User as นักศึกษา
    participant UI as หน้าเว็บ (QuotaSearchPage)
    participant C as QuotaController
    participant P as CurrentStudentProvider
    participant S as QuotaService
    participant TR as TimetableRepository
    participant TER as TimetableEntryRepository
    participant CR as CourseRepository
    participant SR as SectionRepository
    participant QR as QuotaInfoRepository
    participant RR as QuotaRoundRepository
    participant DB as Database

    User->>UI: พิมพ์คำค้น (เช่น EL395) หรือติ๊ก "เฉพาะวิชาในแผนของฉัน"
    UI->>C: GET /api/quota/courses?academicYear=2568&semester=1&q=EL395&mine=false

    alt parameter ไม่ครบ, ชนิดผิด, semester นอก 1-2 หรือ q ยาวเกิน 50
        C-->>UI: 400 ProblemDetail (Spring validation ก่อนเข้า method)
        UI-->>User: แสดงข้อความผิดพลาด
    else parameter ถูกต้อง
        C->>P: currentStudentId()
        P-->>C: studentId
        C->>S: searchCourses(studentId, academicYear, semester, q, mine)
        Note over S,DB: เริ่ม transaction (readOnly)

        S->>S: normalizedQ = strip(q) (ว่างถือเป็น null)
        alt normalizedQ == null && !mine
            S-->>C: throw BusinessRuleException(400, "QUOTA_SEARCH_QUERY_REQUIRED")
            C-->>UI: 400 ProblemDetail
        else มีเงื่อนไขค้นหาอย่างน้อย 1 อย่าง
            S->>TR: findByStudentIdAndAcademicYearAndSemester(studentId, academicYear, semester)
            TR->>DB: SELECT timetable
            DB-->>TR: Optional<Timetable>
            alt มีตารางเรียน
                S->>TER: findByTimetableId(timetableId)
                TER->>DB: SELECT timetable_entry JOIN section, course
                DB-->>TER: List<TimetableEntry>
                S->>S: สร้าง myCourseCodes (Set<String>)
            else ยังไม่มีตาราง
                S->>S: myCourseCodes = Set.of()
            end

            alt mine == true && myCourseCodes.isEmpty()
                S-->>C: QuotaSearchResponse(total=0, courses=[])
                C-->>UI: 200 OK (courses=[])
            else ค้นหารายวิชา
                S->>CR: searchAllCourses(normalizedQ, mine ? myCourseCodes : null)
                CR->>DB: SELECT course WHERE (code/name/name_th LIKE ...) ORDER BY course_code
                DB-->>CR: matchedCourses
                CR-->>S: List<Course>

                S->>S: total = matchedCourses.size()<br/>limited = ตัดไม่เกิน maxResults (50)

                alt limited.isEmpty()
                    S-->>C: QuotaSearchResponse(total=0, courses=[])
                    C-->>UI: 200 OK (courses=[])
                else พบรายวิชา (>= 1)
                    S->>SR: findOfferedSemestersByCourseCodesAndYear(codes, academicYear)
                    SR->>DB: SELECT DISTINCT course_code, semester FROM section
                    DB-->>SR: offeredSemestersMap

                    S->>QR: findWithDetailsByCourseCodes(codes)
                    QR->>DB: SELECT course_quota_info LEFT JOIN FETCH conditions, channels, contacts
                    DB-->>QR: quotaInfoMap

                    S->>RR: findByCourseCodesAndTerm(codes, academicYear, semester)
                    RR->>DB: SELECT quota_round WHERE term = ... ORDER BY round_no
                    DB-->>RR: roundsMap

                    S->>S: วนประกอบ QuotaCourseResponse ด้วย resolveStatus()<br/>(NOT_OFFERED -> NO_DATA -> NOT_REQUIRED -> REQUIRED)
                    S-->>C: QuotaSearchResponse(academicYear, semester, normalizedQ, mine, total, courses)
                    C-->>UI: 200 OK QuotaSearchResponse
                end
            end

            alt courses ว่าง
                UI-->>User: แสดง "ไม่พบข้อมูลช่องทางขอโควตาสำหรับวิชานี้"
            else มีรายการวิชา
                UI-->>User: แสดงจำนวน "พบทั้งหมด {total} วิชา" และการ์ดตาม quotaStatus
            end
        end
    end
```

## เอกสารที่เกี่ยวข้อง

- [ER Diagram](./US7-T06-ER-Diagram.md)
- [DAO Class Diagram](./US7-T06-DAO-Class-Diagram.md)
- [Extended API Class Diagram](./US7-T06-Extended-API-Class-Diagram.md)
- [Sequence Diagram — Detail](./US7-T06-Sequence-Diagram-Detail.md)
