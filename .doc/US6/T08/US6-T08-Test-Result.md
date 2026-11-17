# US6-T08 ผลการทดสอบ Unit Test และ API (Postman)

Nov 16, 2026 · @Non

## สรุปผล

| ชุดทดสอบ | ผล |
| --- | --- |
| Unit test backend (`./mvnw clean test`) | **ผ่าน 382/382** (46 test class) เป็นของ US6-T08 ใหม่ 62 test ใน 4 class |
| Postman (newman) 54 request | **ผ่าน 62/62 assertion** ไม่มี request ล้ม (รัน 53 request เพราะ 03 ถูกข้ามเมื่อตารางว่างอยู่แล้ว) รันซ้ำทันทีได้ผลเดิม |
| Integration test case ของ US6-T13 ที่ทดสอบผ่าน API | IT-US6-01–05, 07–13, 15–25, 27, 30, 32, 34, 35 ผ่าน · ส่วนที่เหลือเป็นพฤติกรรมฝั่ง UI หรือทดสอบโดย US1 (ดู "การจับคู่กับ US6-T13") |

**User story:** US6 ระบบแนะนำวิชาเสรี · branch `feature/US6-T08-develop-api-dto` (merge `feature/US6-T09-develop-dao-entity` เข้ามาเพื่อใช้ entity, repository, migration และ seed ของ T09)

## สภาพแวดล้อม

| หัวข้อ | ค่า |
| --- | --- |
| วันที่รัน | 2026-11-16 |
| Java / Spring Boot | 21.0.10 / 4.1.1 |
| Unit test DB | DAO test ใช้ Testcontainers `mcr.microsoft.com/mssql/server:2025-latest` · `BackendApplicationTests` ใช้ SQL Server จาก `docker compose` · test ของ US6-T08 ไม่ใช้ DB |
| Postman | newman 6.2.1 (`npx -y newman@6.2.1`) · Node 24.21.0 |
| Backend ตอนรัน Postman | `./mvnw spring-boot:run -Dspring-boot.run.profiles=stub-tu -Dspring-boot.run.arguments=--server.port=8081` กับ DB ของ `docker compose` (port 8081 เพราะ container `backend` เดิมของ compose ใช้ 8080 อยู่) |
| ข้อมูล | seed จริง `V20261116_1734__seed_electives.sql` (US6-T09 วิชาเสรีแนะนำ 18 วิชา) และ `V20261014_2010__seed_courses_2568_1.sql` (TU100, CS213 ที่ใช้เป็นวิชาในตาราง) |
| บัญชี | `6609000001` / `Passw0rd!` (stub, ภาควิชาวิทยาการคอมพิวเตอร์) |

## สิ่งที่พัฒนา

| ไฟล์ | หน้าที่ |
| --- | --- |
| `elective/ElectiveController` | `GET /api/electives` (รับ `academicYear`, `currentSemester` และ `@ModelAttribute ElectiveSearchCriteria`) และ `GET /api/electives/{courseCode}` ส่ง `studentId` จาก `CurrentStudentProvider` |
| `elective/ElectiveService` | `@Transactional(readOnly = true)` ทำตามลำดับใน US6-T05/T06: ตรวจภาค (400) → โหลดตารางเมื่อเปิด `excludeConflicts` → `searchRecommended` → `findByCourseCodesAndYear` → กรองระดับ Sec → เรียงตาม `InterestGroup` แล้ว `courseCode` · รายละเอียด: 404 ก่อนโหลดตาราง แล้วคำนวณ `selectable`, `inTimetable`, `conflictWith` |
| `elective/dto/TimeSlot` | MORNING / AFTERNOON / EVENING พร้อม `contains(startTime)` แบบ [from, to) |
| `elective/dto/ElectiveSearchCriteria` | query param ที่ไม่บังคับ 6 ตัว |
| `elective/dto/ElectiveSummaryResponse`, `ElectiveDetailResponse`, `ElectiveSectionResponse` | JSON ตาม API Spec · tags เรียงตามลำดับ enum · reuse `ScheduleSlotResponse` ของ US1 |

`InterestGroup` และ `ElectiveTag` ใช้ของ US6-T09 ใน package `elective` ไม่สร้างซ้ำใน `elective/dto`

### ต่างจากเอกสาร US6-T05

| จุด | T05 | ที่ implement | เหตุผล |
| --- | --- | --- | --- |
| `ElectiveSearchCriteria.excludeConflicts` | `boolean` | `Boolean` ที่ compact constructor แปลง `null` เป็น `false` (accessor ไม่คืน `null`) | constructor binding ของ `@ModelAttribute` กับ record ใส่ primitive ที่ไม่ได้ส่งมาไม่ได้ ตอบ 400 ทุก request ที่ไม่ส่ง toggle (พบจาก `ElectiveControllerTest`) |
| `ElectiveSummaryResponse.from` | `from(course, info, offeredSemesters)` | `from(info, offeredSemesters)` | `ElectiveInfo` ของ T09 ถือ `Course` อยู่แล้ว ตามหมายเหตุ "ชื่อ entity ยังเป็นชื่อชั่วคราว" ใน DTO Class Diagram |
| dependency ของ `ElectiveService` | `ElectiveRepository`, `TimetableService` | เพิ่ม `SectionRepository` | ตามที่ US6-T06 Extended API Class Diagram ขอให้ T08 ปรับ |
| helper ตรวจเวลาชน `ScheduleOverlap` | `common.schedule` ใช้ร่วมกับ US1 | **ยังไม่สร้าง** ตรวจชนด้วย method private `conflictWith` / `overlaps` ใน `ElectiveService` (สูตรเดียวกับ `TimetableService.findConflicts`) | ทีมเลือกทางเลือก B: `feature/US8-T08-develop-api-dto` ที่ยังไม่ merge สร้าง `timetable/ScheduleOverlap` และแก้ `TimetableService` บรรทัดเดียวกันไว้แล้ว ถ้าทำซ้ำจะ merge ชนกัน · **งานค้าง:** ย้ายไปใช้ helper กลางหลัง US8-T08 merge |

## Unit Test

คำสั่ง `cd backend && ./mvnw clean test` ต้องเปิด Docker และ `docker compose up -d sqlserver db-init` ก่อน test ของ US6-T08 ไม่ใช้ DB (mock repository และ `TimetableService`)

| Test class | ชั้น | Tests | ผ่าน | เวลา (s) |
| --- | --- | --- | --- | --- |
| `elective.ElectiveControllerTest` | Controller | 12 | 12 | 0.768 |
| `elective.ElectiveServiceTest` | Service | 34 | 34 | 0.330 |
| `elective.dto.ElectiveResponseTest` | DTO / JSON | 5 | 5 | 0.148 |
| `elective.dto.TimeSlotTest` | DTO (enum) | 11 | 11 | 0.077 |
| **รวม US6-T08** | | **62** | **62** | |
| test class อื่นทั้งหมด (รวม DAO ของ US6-T09) | | 320 | 320 | |
| **รวมทั้งโปรเจกต์** | | **382** | **382** | |

**ข้อมูลทดสอบ:** `ElectiveServiceTest` ใช้ `ElectiveTestData` ซึ่งจำลอง Test Fixture F0 ของ `support/ElectiveDaoFixture` (US6-T09 / US6-T12) เป็น object ในหน่วยความจำ ใช้รหัสวิชา (`T6FR205`, `T6PY250`, `T6EL001` ฯลฯ) ภาค Sec วันเวลา ผู้สอน ห้อง และรีวิวชุดเดียวกัน โดยอ้างค่าคงที่จาก `ElectiveDaoFixture` โดยตรง จึงไล่กลับไปหา T12 ได้ เฉพาะวิชาที่ผ่าน eligibility (repository ถูก mock จึงไม่ต้องมีวิชาที่ query ตัดทิ้ง)

**สิ่งที่ unit test ครอบคลุม**

| กฎ / พฤติกรรม | Test |
| --- | --- |
| เรียงตาม `InterestGroup` แล้ว `courseCode` · tags เรียงตาม enum · `offeredSemesters` จาก Sec ทั้งปี | `search_noFilters_returnsAllSortedByGroupThenCode`, `search_noFilters_mapsCardFieldsWithOfferedSemestersAndTagsInEnumOrder` |
| ไม่เปิด toggle ไม่โหลดตาราง · ไม่พบวิชาไม่ query Sec | `search_withoutExcludeConflicts_doesNotLoadTimetable`, `search_noCandidates_returnsEmptyAndSkipsSectionQuery` |
| `currentSemester` / `semester` ไม่ใช่ 1–2 → 400 ก่อน query | `search_currentSemester3_throws400BeforeQuery`, `search_semester3_throws400BeforeQuery`, `getDetail_currentSemester3_throws400BeforeQuery` |
| `offeredSemesters` ไม่หดตามตัวกรอง | `search_semester2_keepsCoursesWithSemester2SectionAndOfferedSemestersNotFiltered` |
| วัน + ช่วงเวลาต้องตรงในคาบเดียวกันของ Sec เดียวกัน (Sec A จันทร์เช้า + Sec B อังคารเย็น และ Sec เดียวที่มีทั้งสองคาบ ค้นจันทร์+เย็นไม่ผ่าน) | `search_dayAndTimeSlotFromDifferentSections_doesNotMatch`, `search_semesterAndDayFromDifferentSections_doesNotMatch`, `search_excludeConflictsWithDay_sameSectionMustPassBoth` |
| ขอบช่วงเวลา [from, to) | `search_timeSlotOnly_startTimeDecidesRange`, `TimeSlotTest` (11 ค่า) |
| Sec e-learning ไม่ผ่าน day/timeSlot แต่ผ่าน excludeConflicts | `search_dayOnly_excludesELearningSection`, `search_excludeConflicts_eLearningSectionPasses` |
| `day=SUNDAY` ได้ `[]` · `excludeConflicts` + ภาคอื่นได้ `[]` | `search_daySunday_returnsEmptyNotError`, `search_excludeConflictsWithOtherSemester_returnsEmpty` |
| excludeConflicts ตัดวิชาที่ชนและวิชาที่อยู่ในตารางแล้ว · คาบต่อกันพอดีไม่ชน · มี Sec อื่นที่ว่างวิชายังอยู่ | `search_excludeConflicts_removesConflictingCourseAndCourseAlreadyInTimetable`, `search_excludeConflicts_backToBackSlotIsNotConflict`, `search_excludeConflicts_keepsCourseWhenAnotherSectionIsFree` |
| รายละเอียด: Sec ทั้งปีเรียงภาคแล้ว sectionNo · รีวิวตามลำดับ · ผู้สอน/ห้อง `null` | `getDetail_returnsSummaryDescriptionAndAllSectionsSortedBySemesterThenSectionNo`, `getDetail_mapsSectionWithSortedSlotsAndNullableInstructorAndRoom` |
| Sec อีกภาค `selectable: false` และ `conflictWith: []` เสมอ · ใช้ `currentSemester` ตัดสิน | `getDetail_otherSemesterSectionNotSelectableAndNoConflictWith`, `getDetail_usesCurrentSemesterForTimetable` |
| `inTimetable` เฉพาะ Sec ที่อยู่ในตาราง · `conflictWith` ไม่ซ้ำ ตามลำดับ entries ข้ามวิชาเดียวกัน | `getDetail_sectionInTimetable_marksOnlyThatSection`, `getDetail_conflictWith_distinctInEntryOrderAndSkipsSameCourse`, `getDetail_selfCourseOverlap_isNotReportedAsConflict` |
| ไม่ใช่วิชาเสรีแนะนำ → 404 โดยไม่โหลดตาราง | `getDetail_notRecommended_throws404WithoutLoadingTimetable` |
| binding param: ไม่ส่งตัวกรอง = criteria ว่าง, ส่งครบ 6 ตัว, param หาย / ชนิดผิด / enum ผิด → 400 ไม่เรียก service | `ElectiveControllerTest` |
| ProblemDetail ของ 400 (`ResponseStatusException`) และ 404 พร้อม `detail` / `instance` · JSON `HH:mm` และ `null` | `ElectiveControllerTest`, `ElectiveResponseTest` |

## API Test (Postman)

ไฟล์: [`US6-T08.postman_collection.json`](./US6-T08.postman_collection.json) · ผลจาก CLI: [`US6-T08-newman-cli.txt`](./US6-T08-newman-cli.txt)

```bash
cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=stub-tu -Dspring-boot.run.arguments=--server.port=8081
npx -y newman@6.2.1 run .doc/US6/T08/US6-T08.postman_collection.json
```

collection ล้างตาราง 2568/1 ของบัญชีทดสอบก่อนเริ่ม (02–03) ระหว่างชุด precondition (41–42, 45–46) และหลังจบ (51–52) จึงรันซ้ำได้ `sectionId` ของ TU100, CS213, PY250, FR205 อ่านจาก response ไม่ hard-code

**ผลที่คาดหวังคำนวณจาก seed 18 วิชา** US6-T13 เขียนผลไว้สำหรับข้อมูล 3 วิชา (FR205, TH291, PY250) และระบุว่าต้องตรวจกับ seed จริง collection จึงตรวจรายการทั้งหมดตามลำดับจริง เช่น IT-03 `q=py2` ได้ `[PY200, PY250, PY252]` ไม่ใช่ `[PY250]` · ผลทุกข้อยืนยันด้วยการยิงจริงก่อนเขียน assertion

| # | Request | ผลที่ได้ | ผ่าน |
| --- | --- | --- | --- |
| 00 | ไม่มี token | 401 ProblemDetail | ✅ |
| 05 | ไม่มีตัวกรอง | 18 วิชา EG214 … RE468 นับต่อหมวด 3/4/5/4/2 · ไม่มี EL105, CS100, JP171 · การ์ด FR205/TH291/PY250 ตาม Spec | ✅ |
| 06 | `q=py2` | `[PY200, PY250, PY252]` | ✅ |
| 07 | `q=ฝรั่งเศส` | `[FR205]` | ✅ |
| 08 | `q=everyday` | `[FR205, FD216]` | ✅ |
| 09 | `q=DAY` | `[]` | ✅ |
| 10 | `q=SA240` | `200 []` | ✅ |
| 11 | `group=PSYCHOLOGY` | 4 วิชา | ✅ |
| 12 | `semester=2` | 13 วิชา ไม่มี FR205 · TH291 `offeredSemesters` ยังเป็น `[1, 2]` | ✅ |
| 13–14 | อังคารเย็น / พฤหัสบ่าย | `[FR205]` / `[EG214, TH291, PB317]` | ✅ |
| 15–16 | อังคารเช้า / + `semester=1` | มี PY250 / PY250 หาย | ✅ |
| 17 | จันทร์เช้า | `[PY200, FD216, RE468]` ไม่มี PY250 | ✅ |
| 18–19 | `excludeConflicts=true` ตารางว่าง / + `semester=2` | 15 วิชา / `[]` | ✅ |
| 20 | `day=SUNDAY` | `200 []` | ✅ |
| 21–28 | param หาย, `currentSemester=3`, `semester=3`, `day=FUNDAY`, `timeSlot=NIGHT`, `group=SPORT`, `excludeConflicts=maybe` | 400 ProblemDetail ทุกตัว · ภาค 3 มี `detail` ภาษาไทย | ✅ |
| 29 | รายละเอียด PY250 | 820001 เลือกได้ · 230001 เลือกไม่ได้ ห้อง `null` · รีวิว 4 ข้อ | ✅ |
| 30 | รายละเอียด FR205 | 2 Sec ภาค 1 เลือกได้ · `requiresQuota: true` | ✅ |
| 31 | PY250 `currentSemester=2` | 230001 เลือกได้ 820001 เลือกไม่ได้ | ✅ |
| 32–34 | SA240 / EL105 / CS100 | 404 `ไม่พบวิชาเสรีแนะนำ: …` | ✅ |
| 35 | รายละเอียด `currentSemester=3` | 400 | ✅ |
| 36–40 | T-TU100: toggle / รายละเอียด PY250 / POST PY250 / รายละเอียดอีกครั้ง | ไม่มี PY250 · `conflictWith: ["TU100"]` · 201 พร้อม `conflicts` จันทร์ 13:30–16:30 · `inTimetable: true` | ✅ |
| 43–44 | T-CS213: toggle | FR205 อยู่ (ต่อกันพอดี) · ตัด TH291, PB317, JC217, PY320 · EG214 อยู่เพราะมี Sec อื่นที่ไม่ชน | ✅ |
| 47–50 | T-FR205: POST / รายละเอียด / toggle / POST Sec อื่น | 201 · 260001 `inTimetable` `conflictWith: []` · ไม่มี FR205 · 409 `COURSE_ALREADY_IN_TIMETABLE` | ✅ |
| 53 | จบ: toggle อีกครั้ง | 15 วิชา (ตารางว่างแล้ว) | ✅ |

## การจับคู่กับ US6-T13

| IT | ผลใน T08 |
| --- | --- |
| 01, 02, 03, 04, 05, 07, 08, 09, 10, 11, 12, 13 | ผ่านด้วย request 05–19 (ผลคาดหวังปรับเป็นข้อมูล 18 วิชา) |
| 15, 16, 17, 21, 22, 23, 24, 25, 27 | ผ่านด้วย request 36–50 (25 ตรวจฝั่ง API ว่ารายการหลังเพิ่มไม่มี FR205 ส่วนการเรียกใหม่อัตโนมัติเป็นของ UI) |
| 18, 19, 20 | ผ่านฝั่ง API (request 29–31) ส่วนการเลือก Sec ให้อัตโนมัติและสีจางเป็นของ UI |
| 30, 32, 34, 35 | ผ่าน (request 00, 21–28, 32–35) |
| 06, 14, 28, 29, 31, 33, 36, 37 | พฤติกรรม UI (ล้างตัวกรอง, request ล่าสุดชนะ, กันกดซ้ำ, sessionStorage, offline, 500) ทดสอบใน US6-T17 |
| 26 | `409 CREDIT_LIMIT_EXCEEDED` เป็นกฎของ `POST` US1 ที่ US6 ไม่แก้ ทดสอบแล้วใน US1-T08 และ `TimetableServiceTest` |

## ข้อสังเกต

- **คำค้นที่ encode ไม่ใช่ UTF-8 ได้ 500:** ระหว่างเตรียม collection ยิง `q=ฝรั่งเศส` จาก Git Bash บน Windows แล้ว curl ส่ง byte ที่ไม่ใช่ UTF-8 Tomcat โยน `InvalidParameterException` และ `GlobalExceptionHandler.handleUnexpected` ตอบ 500 ส่วน browser และ newman ส่ง UTF-8 ถูกต้องจึงได้ `[FR205]` ตามปกติ (request 07) เป็นพฤติกรรมเดิมของ handler กลางที่ใช้กับทุก endpoint ไม่ได้แก้ใน T08 ถ้าต้องการให้ตอบ 400 ควรเพิ่ม handler ใน PR แยก
- **งานค้างจากทางเลือก B:** ย้าย `conflictWith` / `overlaps` ใน `ElectiveService` ไปใช้ `ScheduleOverlap` กลางเมื่อ US8-T08 merge
- งาน frontend (`features/electives/types.ts`, `api.ts`, `ScheduleSlot.room` เป็น `string | null`) ทีมให้ทำใน US6-T07 ไม่อยู่ใน T08

## เอกสารที่เกี่ยวข้อง

- [US6-T05 DTO & API Spec](../T05/US6-DTO%20&%20API%20Spec.md), [API Class Diagram](../T05/US6-API-Class-Diagram.md), [DTO Class Diagram](../T05/US6-DTO-Class-Diagram.md)
- [US6-T06 Extended API Class Diagram](../T06/US6-T06-Extended-API-Class-Diagram.md), [Sequence ค้นหา](../T06/US6-T06-Sequence-Diagram-Search.md), [Sequence รายละเอียด](../T06/US6-T06-Sequence-Diagram-Detail.md)
- [US6-T09 DAO Unit Test Result](../T09/US6-T09-DAO-Unit-Test-Result.md)
- [US6-T13 Integration Test Cases UI–API](../T13/US6-T13-integration-test-cases-ui-api.md)
