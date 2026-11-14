# US7-T06 — DAO Class Diagram

Entity และ Repository (DAO) ที่ `QuotaService` ใช้ ดูลำดับการทำงานใน Sequence Diagram ทั้ง 2 ไฟล์ และโครงสร้างตารางใน [ER Diagram](./US7-T06-ER-Diagram.md)

US7 เพิ่ม entity `CourseQuotaInfo`, `QuotaCondition`, `QuotaRound`, `QuotaChannel`, `QuotaContact`, enum `QuotaChannelType` และ repository `QuotaInfoRepository`, `QuotaRoundRepository` ใน package `quota` (`<<US7>>`) ส่วน `Course` (US1) เพิ่ม field `courseNameTh` และ `CourseRepository`, `SectionRepository` เพิ่มเมธอด query ของ US7 โดยไม่กระทบการทำงานเดิมของ US1

```mermaid
classDiagram
    direction LR

    class QuotaInfoRepository {
        <<US7 interface>>
        +findWithDetailsByCourseCodes(Collection~String~ courseCodes) List~CourseQuotaInfo~
    }
    class QuotaRoundRepository {
        <<US7 interface>>
        +findByCourseCodesAndTerm(Collection~String~ courseCodes, int academicYear, int semester) List~QuotaRound~
    }
    class CourseRepository {
        <<US1 interface + US7 query>>
        +findById(String courseCode) Optional~Course~
        +searchAllCourses(String q, Collection~String~ courseCodes) List~Course~
    }
    class SectionRepository {
        <<US1 interface + US7 query>>
        +findOfferedSemestersByCourseCodesAndYear(Collection~String~ courseCodes, int academicYear) List~Object[]~
    }
    class TimetableRepository {
        <<US1 interface · มีอยู่แล้ว>>
        +findByStudentIdAndAcademicYearAndSemester(String studentId, int academicYear, int semester) Optional~Timetable~
    }
    class TimetableEntryRepository {
        <<US1 interface · มีอยู่แล้ว>>
        +findByTimetableId(Long timetableId) List~TimetableEntry~
    }

    class CourseQuotaInfo {
        <<US7 Entity>>
        -String courseCode
        -Course course
        -boolean quotaRequired
        -Set~QuotaCondition~ conditions
        -Set~QuotaChannel~ channels
        -Set~QuotaContact~ contacts
    }
    class QuotaCondition {
        <<US7 Entity>>
        -Long conditionId
        -CourseQuotaInfo quotaInfo
        -int sortOrder
        -String conditionText
        -String relatedCourseCode
    }
    class QuotaRound {
        <<US7 Entity>>
        -Long roundId
        -CourseQuotaInfo quotaInfo
        -int academicYear
        -int semester
        -int roundNo
        -String label
        -LocalDate startDate
        -LocalDate endDate
        -LocalTime endTime
    }
    class QuotaChannel {
        <<US7 Entity>>
        -Long channelId
        -CourseQuotaInfo quotaInfo
        -int sortOrder
        -QuotaChannelType channelType
        -String label
        -String url
        -String note
    }
    class QuotaContact {
        <<US7 Entity>>
        -Long contactId
        -CourseQuotaInfo quotaInfo
        -int sortOrder
        -String organizationName
        -String label
        -String url
    }
    class QuotaChannelType {
        <<US7 enumeration>>
        ONLINE_FORM
        QUOTA_SYSTEM
        FACULTY_OFFICE
        INSTRUCTOR
        OTHER
    }
    class Course {
        <<US1 Entity + US7 field>>
        -String courseCode
        -String courseName
        -String courseNameTh
        -CourseCategory category
        -int credits
    }
    class Section {
        <<US1 Entity>>
        -Long sectionId
        -Course course
        -String sectionNo
        -int academicYear
        -int semester
    }
    class Timetable {
        <<US1 Entity>>
        -Long timetableId
        -String studentId
        -int academicYear
        -int semester
    }
    class TimetableEntry {
        <<US1 Entity>>
        -Long entryId
        -Timetable timetable
        -Section section
    }

    QuotaInfoRepository ..> CourseQuotaInfo : คืน (fetch conditions, channels, contacts)
    QuotaRoundRepository ..> QuotaRound : คืน
    CourseRepository ..> Course : คืน
    SectionRepository ..> Section : คิวรีภาคที่เปิดสอน
    TimetableRepository ..> Timetable : คืน
    TimetableEntryRepository ..> TimetableEntry : คืน

    CourseQuotaInfo "0..1" --> "1" Course : "@MapsId courseCode"
    CourseQuotaInfo "1" *-- "0..*" QuotaCondition : "@OrderBy(sortOrder)"
    CourseQuotaInfo "1" *-- "0..*" QuotaRound
    CourseQuotaInfo "1" *-- "0..*" QuotaChannel : "@OrderBy(sortOrder)"
    CourseQuotaInfo "1" *-- "0..*" QuotaContact : "@OrderBy(sortOrder)"
    QuotaChannel --> QuotaChannelType
    Section --> Course
    TimetableEntry --> Timetable
    TimetableEntry --> Section
```

---

## รายละเอียด Query และเหตุผลการออกแบบ DAO

| Repository / Entity | รายละเอียดการทำงาน |
| --- | --- |
| `CourseRepository.searchAllCourses` | ค้นจาก**ทุกวิชาในตาราง `course`** (ไม่กรอง `EXISTS Section` แบบ `CourseRepository.search` ของ US1 เพื่อให้เจอวิชา `NOT_OFFERED` ด้วย) จับคู่ `upper(courseCode) like :prefix%`, คำใน `upper(courseName)` ขึ้นต้นด้วย `:prefix` (คั่นด้วยช่องว่างหรือ `-`), หรือ `courseNameTh like %:q%` (escape `!`, `%`, `_`, `[` เหมือน US1) · เมื่อ `mine=true` ส่ง `courseCodes` ของนักศึกษาเข้าไปกรอง `c.courseCode in :courseCodes` (ถ้า `courseCodes` ว่างคืน `List.of()` ทันทีใน default method) เรียง `ORDER BY c.courseCode` |
| `SectionRepository.findOfferedSemestersByCourseCodesAndYear` | คิวรี `SELECT DISTINCT s.course.courseCode, s.semester FROM Section s WHERE s.course.courseCode IN :courseCodes AND s.academicYear = :academicYear ORDER BY s.course.courseCode, s.semester` คืนรายการ `(courseCode, semester)` เพื่อสร้าง `offeredSemesters` และตัดสิน `NOT_OFFERED` ใน query เดียว (ไม่เกิด N+1) |
| `QuotaInfoRepository.findWithDetailsByCourseCodes` | คิวรี `SELECT DISTINCT q FROM CourseQuotaInfo q LEFT JOIN FETCH q.conditions LEFT JOIN FETCH q.channels LEFT JOIN FETCH q.contacts WHERE q.courseCode IN :courseCodes` ใช้ `Set` (หรือ `LinkedHashSet` + `@OrderBy("sortOrder ASC")`) บน entity เพื่อหลีกเลี่ยง `MultipleBagFetchException` ของ Hibernate เมื่อ fetch 3 collection พร้อมกัน และรองรับ `open-in-view: false` |
| `QuotaRoundRepository.findByCourseCodesAndTerm` | คิวรี `SELECT r FROM QuotaRound r WHERE r.quotaInfo.courseCode IN :courseCodes AND r.academicYear = :academicYear AND r.semester = :semester ORDER BY r.quotaInfo.courseCode, r.roundNo` โหลดรอบของภาคที่ขอมาใน query เดียว |

## เอกสารที่เกี่ยวข้อง

- [ER Diagram](./US7-T06-ER-Diagram.md)
- [Extended API Class Diagram](./US7-T06-Extended-API-Class-Diagram.md)
- [Sequence Diagram — Search](./US7-T06-Sequence-Diagram-Search.md)
- [Sequence Diagram — Detail](./US7-T06-Sequence-Diagram-Detail.md)
