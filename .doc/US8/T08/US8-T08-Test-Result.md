# US8-T08 ผลการทดสอบ Unit Test และ API (Postman)

Nov 16, 2026 · @Non

## สรุปผล

| ชุดทดสอบ | ผล |
| --- | --- |
| Unit test backend (`./mvnw clean test`) | **ผ่าน 300/300** (44 test class) เป็นของ US8-T08 ใหม่ 48 test ใน 5 class |
| Unit test frontend (`npx vitest run`) | **ผ่าน 159/159** (16 ไฟล์) · `npx tsc --noEmit` ผ่าน · `npm run lint` 0 error (1 warning เดิมของ US8-T07) |
| Postman (newman) 24 request | **ผ่าน 35/35 assertion** ไม่มี request ล้ม รันซ้ำทันทีได้ผลเดิม |
| Integration test case ของ US8-T13 ที่ทดสอบผ่าน API | IT-US8-01–04, 06–11, 16, 17, 19–23, 25, 26, 28 ผ่าน · ส่วนที่เหลือเป็นพฤติกรรมฝั่ง UI (ดู "การจับคู่กับ US8-T13") |

**User story:** US8 จัดตารางเรียนอัตโนมัติตามแผนการเรียน · branch `feature/US8-T08-develop-api-dto` (merge `feature/US8-T07-develop-ui` เข้ามาเพื่อใช้ UI ของ T07 เชื่อมกับ API)

## สภาพแวดล้อม

| หัวข้อ | ค่า |
| --- | --- |
| วันที่รัน | 2026-11-16 |
| Java / Spring Boot | 21.0.10 / 4.1.1 |
| Unit test DB | DAO test ใช้ Testcontainers `mcr.microsoft.com/mssql/server:2025-latest` · `BackendApplicationTests` ใช้ SQL Server จาก `docker compose` · test ของ US8-T08 ไม่ใช้ DB |
| Postman | newman 6.2.3 (`npx -y newman`) · Node 24.21.0 |
| Backend ตอนรัน Postman | `./mvnw spring-boot:run -Dspring-boot.run.profiles=stub-tu -Dspring-boot.run.arguments=--server.port=8081` กับ DB ของ `docker compose` (port 8081 เพราะ container `backend` เดิมของ compose ใช้ 8080 อยู่) |
| ข้อมูล | seed จริง `V20261014_2010__seed_courses_2568_1.sql` และ `V20261114_2100__seed_study_plans.sql` (US8-T09) |
| บัญชี | `6609000001` / `Passw0rd!` (stub, ภาควิชาวิทยาการคอมพิวเตอร์) |
| ค่า config | `app.timetable.max-credits = 22` · `app.study-plan.max-search-nodes = 50000` (เพิ่มใน `application.yaml`) |

## สิ่งที่พัฒนา

| ไฟล์ | การเปลี่ยนแปลง |
| --- | --- |
| `studyplan/StudyPlanController.java` | `GET /api/study-plans` รับ `@RequestParam @Min(1) @Max(4) studyYear`, `@Min(1) @Max(2) semester` **ไม่ใส่ `@Validated`** ค่าผิด → 400 |
| `studyplan/ApplyPlanController.java` | `POST /api/timetable/apply-plan` `@Valid @RequestBody` ตอบ 200 ทั้งสองโหมด แยกจาก `TimetableController` ของ US1 |
| `studyplan/StudyPlanService.java` | `@Transactional(readOnly = true)` หา `User` (ไม่พบ → 404) → preset ของ `department` + ชั้นปี + ภาค เรียง `curriculumName` แล้ว `planType` (null → `SPECIAL_PROJECT` → `CO_OP`) → วิชาโทแยกเป็นรายการต่อแผนเฉพาะแผนที่มีวิชาในภาคนั้น |
| `studyplan/ApplyPlanService.java` | `@Transactional` หา preset (404) → `loadMinor` (`MINOR_NOT_ALLOWED` ก่อน query วิชาโท / 404 / `MINOR_PLAN_MISMATCH`) → ตารางเดิม → `loadCandidates` (ดึง section ทุกวิชาใน query เดียว) → `PlanScheduler` → ยืนยันแล้ว `saveAdded` + `TimetableService.getTimetable` · `added` ว่างไม่เขียน DB |
| `studyplan/PlanScheduler.java` | อัลกอริทึม 3 ขั้นตาม Spec ไม่ใช้ DB: กรอง (มีแล้ว / ไม่มี section / ชนตารางเดิม) และรวมกลุ่มเวลา → greedy เป็นคำตอบเริ่มต้นแล้ว backtracking + branch and bound จนถึงเพดาน node → สรุป `CREDIT_LIMIT_EXCEEDED` / `TIME_CONFLICT` เทียบตารางสุดท้าย |
| `studyplan/PlanCourseCandidate.java`, `ScheduleResult.java` | record ภายใน ไม่ส่งออกผ่าน API |
| `studyplan/dto/*` | DTO 8 record + enum `PlanCourseSource`, `PlanSkipReason` ตาม [DTO Class Diagram](../T05/US8-DTO-Class-Diagram.md) · `SkippedPlanCourseResponse` ใส่ `NON_NULL` และมี factory 1 ตัวต่อ 1 reason |
| `timetable/ScheduleOverlap.java` | static utility สูตรเวลาชน (`overlaps`, `conflicts`) ใช้ร่วม US1/US8 · `TimetableService.findConflicts` เปลี่ยนมาเรียกตัวนี้ test ของ US1 ผ่านเหมือนเดิม |
| `application.yaml` | เพิ่ม `app.study-plan.max-search-nodes: 50000` |
| frontend `curriculum-plan/types.ts` | เพิ่ม `planType` ใน `StudyMinor` ให้ตรงกับ Spec |
| frontend `curriculum-plan/hooks/useCurriculumPlan.ts` | กรองวิชาโทตาม `planType` ของแผนที่เลือก (ยังไม่เลือกแผน → ไม่ซ้ำตาม `minorId`) เปลี่ยนแผนแล้วแผนใหม่ไม่มีวิชาโทนั้น → กลับเป็น "ไม่เรียนวิชาโท" |
| frontend `CurriculumPlanModal.tsx` | เพิ่มป้ายหมวด `MINOR: "วิชาโท"` (`CourseCategory` ของ develop มี `MINOR` แล้วแต่ branch T07 ยังไม่มี `tsc` จึง error หลัง merge) |

## Unit Test

คำสั่ง `cd backend && ./mvnw clean test` ต้องเปิด Docker และ `docker compose up -d sqlserver db-init` และมี `JWT_SECRET` ใน `.env` ก่อน

| Test class | ชั้น | Tests | ผ่าน | เวลา (s) |
| --- | --- | --- | --- | --- |
| `studyplan.PlanSchedulerTest` | Algorithm ไม่ใช้ DB (**US8-T08**) | 18 | 18 | 0.027 |
| `studyplan.ApplyPlanServiceTest` | Service mock repository + `PlanScheduler` จริง (**US8-T08**) | 10 | 10 | 0.585 |
| `studyplan.StudyPlanServiceTest` | Service mock repository (**US8-T08**) | 6 | 6 | 0.017 |
| `studyplan.StudyPlanControllerTest` | Controller `@WebMvcTest` (**US8-T08**) | 9 | 9 | 0.602 |
| `studyplan.ApplyPlanControllerTest` | Controller `@WebMvcTest` (**US8-T08**) | 5 | 5 | 0.670 |
| `studyplan.StudyPlanRepositoryTest` | DAO (US8-T09) | 8 | 8 | 1.287 |
| `studyplan.StudyMinorRepositoryTest` | DAO (US8-T09) | 9 | 9 | 1.550 |
| `studyplan.PlanSectionLookupTest` | DAO (US8-T09) | 3 | 3 | 0.760 |
| `studyplan.ApplyPlanSaveRepositoryTest` | DAO (US8-T09) | 2 | 2 | 0.618 |
| `studyplan.ApplyPlanSaveRollbackTest` | DAO (US8-T09) | 2 | 2 | 0.250 |
| `studyplan.StudyPlanSchemaConstraintTest` | DAO (US8-T09) | 29 | 29 | 4.276 |
| `timetable.TimetableServiceTest` | Service (US1 · ผ่านหลัง refactor `ScheduleOverlap`) | 12 | 12 | 0.052 |
| test class อื่นของ US1–US4 (32 class) | | 187 | 187 | |
| **รวม** | | **300** | **300** | |

**สิ่งที่ unit test ของ US8-T08 ครอบคลุม** (ตามหัวข้อ "สิ่งที่ US8 ควรออกแบบเทสต์" ใน [DTO & API Spec](../T05/US8-DTO-API-Spec.md))

| กฎ / พฤติกรรม | Test |
| --- | --- |
| ตารางว่างและไม่ชน → ทุกวิชาอยู่ใน `added`, `skipped: []` | `PlanSchedulerTest.emptyTimetable_noConflicts_addsAllCourses` |
| ผลเรียงตามลำดับในแผน (MAJOR ก่อนหมวดอื่น) ไม่ขึ้นกับลำดับที่ส่งเข้า | `output_followsPlanOrder_majorBeforeGeneralEducation_regardlessOfInputOrder` |
| คาบต่อกันพอดีไม่นับเป็นชน | `backToBackSlots_areNotConflicts` |
| section ที่ไม่มีคาบเรียน (สหกิจ) ถูกเพิ่มและไม่ชน | `sectionWithoutSlots_isAddedAndNeverConflicts` |
| วิชาที่มีในตารางแล้ว → `COURSE_ALREADY_IN_TIMETABLE` + `existingSectionNo` | `courseAlreadyInTimetable_isSkippedWithExistingSectionNo`, `ApplyPlanServiceTest.dryRun_withExistingEntry_courseAlreadyInTimetable` |
| ภาคนี้ไม่เปิดสอน → `NO_SECTION_AVAILABLE` | `noSectionThisTerm_isNoSectionAvailable` |
| ทุก section ชนตารางเดิม → `TIME_CONFLICT` + `conflictWith` | `everySectionConflictsWithExisting_isTimeConflictWithExistingCodes` |
| section ที่เวลาเหมือนกันรวมเป็นกลุ่มเดียว คืน `sectionNo` น้อยสุด | `sectionsWithSameTimes_areOneGroup_representativeIsSmallestSectionNo` |
| section แรกชน แต่ section ที่ 2 ไม่ชน → เลือก section ที่ 2 | `firstSectionConflicts_secondDoesNot_picksSecond` |
| **กรณี greedy พลาด** → backtracking ได้ครบทั้งสองวิชา | `greedyWouldMiss_backtrackingPlacesBoth` |
| เพดาน node = 1 → ได้ผลเท่ากับ greedy ไม่ error | `nodeLimitOne_returnsGreedyResultWithoutError` |
| MAJOR กับ GE ชนทุก section → MAJOR ได้ / MAJOR 1 วิชาชนะ GE 2 วิชา | `majorAndGeneralEducationConflictEverySection_majorWins`, `oneMajor_beatsTwoGeneralEducationCourses` |
| 2 ชุดดีเท่ากัน → `sectionNo` น้อยกว่าตามลำดับในแผน รันกี่ครั้งก็เหมือนเดิม | `twoEquallyGoodSolutions_picksSmallerSectionNoInPlanOrder_deterministic` |
| หน่วยกิตเกิน 22 → `CREDIT_LIMIT_EXCEEDED` + `currentCredits` ของตารางสุดท้าย | `planOverMaxCredits_addsMostCourses_restAreCreditLimitExceeded` |
| วิชาโทชนกับวิชาแผนหลัก → แผนหลักได้ แม้วิชาโทหน่วยกิตมากกว่า | `minorConflictsWithPlanCourse_planCourseWins_evenIfMinorHasMoreCredits` |
| แผนหลัก + วิชาโทเกินหน่วยกิต → วิชาโทถูกข้ามก่อน | `planPlusMinorOverMaxCredits_minorIsSkippedBeforePlanCourse` |
| วิชาโทอยู่ใน `added` เป็น `source: MINOR` หลังวิชาแผนหลัก | `minorCourse_isAddedWithMinorSourceAfterPlanCourses` |
| วิชาโทใช้วิชาของ `planType` + ชั้นปี + ภาคของ preset · วิชาที่ซ้ำกับแผนเป็น `PLAN` ตัวเดียว · ดึง section ใน query เดียว | `ApplyPlanServiceTest.minor_usesCoursesOfPlanTypeYearAndSemester_dropsDuplicateOfPlan_sourceMinor` |
| `planId` ไม่มี → 404 · `minorId` ไม่มี → 404 · ไม่เขียน DB | `planNotFound_throws404_andWritesNothing`, `minorNotFound_throws404` |
| `minorId` กับ preset ปี 1–2 → 400 `MINOR_NOT_ALLOWED` ก่อน query วิชาโท ไม่เขียน DB | `minorWithYear2Plan_throwsMinorNotAllowed_beforeLookingUpMinor` |
| วิชาโทคนละหลักสูตร → 400 `MINOR_PLAN_MISMATCH` | `minorOfOtherCurriculum_throwsMinorPlanMismatch` |
| `dryRun: true` ไม่เขียน DB `timetable: null` `minorId: null` | `dryRun_returnsAddedWithoutWriting_timetableNull_minorIdNull` |
| ยืนยัน: สร้าง `Timetable` ของภาคจาก preset, `touch()`, `saveAll` แล้วคืนตารางของ US1 | `confirm_noTimetable_createsTimetableOfPlanSemester_savesEntries_returnsUs1Timetable`, `confirm_existingTimetable_touchesUpdatedAt` |
| ยืนยันแต่ `added` ว่าง → ไม่เขียน DB | `confirm_nothingAdded_doesNotWrite_stillReturnsTimetable` |
| GET กรองด้วย `department` ของนักศึกษา, ปี 2 `planType: null` `minors: []`, ไม่พบแผน → `plans: []`, ไม่พบผู้ใช้ → 404 | `StudyPlanServiceTest` (4 test) |
| ปี 3 ได้ 2 แผน `SPECIAL_PROJECT` → `CO_OP` · วิชาโทแยกตามแผน (CS440 อยู่เฉพาะ `CO_OP`) · ปี 4/1 มีเฉพาะ `SPECIAL_PROJECT` | `year3_returnsBothPlans_…`, `year3_minorSplitPerPlanType_…`, `year4_planWithoutMinorCoursesThisTerm_isOmitted` |
| `studyYear` 0/5, `semester` 0/3, `abc`, ไม่ส่ง → 400 (กันคนเติม `@Validated`) | `StudyPlanControllerTest.outOfRangeOrInvalidParam_returns400` (5 กรณี), `missingStudyYear_returns400` |
| JSON: ส่ง `"planType": null`, `"timetable": null`, `"minorId": null` · `skipped` ไม่ส่ง field เสริมที่เป็น null | `StudyPlanControllerTest.year2_…`, `ApplyPlanControllerTest.dryRun_…`, `noMinorAndNoDryRun_…` |
| ไม่ส่ง `dryRun` = `false` · ไม่ส่ง `planId`/`academicYear` → 400 `errors` | `noMinorAndNoDryRun_defaultsDryRunFalse_minorIdNullInJson`, `missingPlanIdAndAcademicYear_returns400WithErrors` |

**Frontend:** test ของ US8-T07 (`CurriculumPlan.test.tsx`, `api.test.ts`) ผ่านทั้งหมดหลังแก้ fixture ให้วิชาโทมี `planType` (1 รายการต่อแผนเหมือน API จริง) และเพิ่ม 1 test `[US8-T08] วิชาโทกรองตาม planType ของแผนที่เลือก ไม่แสดงซ้ำ และล้างเมื่อแผนใหม่ไม่มีวิชาโทนั้น`

## Postman

ไฟล์ในโฟลเดอร์นี้:

- [`US8-T08.postman_collection.json`](./US8-T08.postman_collection.json) collection v2.1 import เข้า Postman ได้ ตัวแปร `baseUrl` ค่าเริ่มต้น `http://localhost:8080` ต้องรันทั้ง collection ตามลำดับ `planId` / `minorId` อ่านจาก response ของ request 04–05 ไม่ hard-code
- [`US8-T08-newman-cli.txt`](./US8-T08-newman-cli.txt) ผลรันจาก newman

คำสั่งที่ใช้รัน

```bash
# terminal 1: backend ใช้ TU API stub
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=stub-tu -Dspring-boot.run.arguments=--server.port=8081

# terminal 2
cd .doc/US8/T08
npx -y newman run US8-T08.postman_collection.json --env-var baseUrl=http://localhost:8081
```

| # | Request | Test case | ผลที่คาดหวัง | ผล |
| --- | --- | --- | --- | --- |
| 00 | GET `/api/study-plans` ไม่มี token | — | 401 `application/problem+json` | PASS |
| 01 | POST login `6609000001` | (เตรียม token) | 200 ได้ JWT | PASS |
| 02–03 | [setup] GET ตาราง 2568/1 แล้ว DELETE วิชาที่ค้าง | — | ตารางว่าง (03 ถูกข้ามเมื่อไม่มีวิชาค้าง จึงรัน 24 request) | PASS |
| 04 | GET ชั้นปี 2 ภาค 1 | IT-US8-01 | 200 `department` ของนักศึกษา, 1 แผน, `"planType":null`, `minors: []`, `totalCredits` = ผลรวม | PASS |
| 05 | GET ชั้นปี 3 ภาค 1 | IT-US8-02 | 200 แผน `SPECIAL_PROJECT` → `CO_OP` · วิชาโทวิทยาการข้อมูล 2 รายการ `minorId` เดียวกัน · CS440 อยู่เฉพาะ `CO_OP` | PASS |
| 06 | GET ชั้นปี 4 ภาค 1 | IT-US8-04 | 200 วิชาโทมีเฉพาะ `SPECIAL_PROJECT` | PASS |
| 07 | GET ชั้นปี 4 ภาค 2 | IT-US8-03 | 200 `plans: []`, `minors: []` | PASS |
| 08 | GET `studyYear=5` | IT-US8-28 | 400 ProblemDetail ไม่ใช่ 500 | PASS |
| 09 | GET ไม่ส่ง `studyYear` | — | 400 | PASS |
| 10 | POST dryRun แผนปี 2/1 ตารางว่าง | IT-US8-06 | 200 ทุกวิชาใน `added` (`PLAN`) `skipped: []` · `"timetable":null` `"minorId":null` | PASS |
| 11 | GET ตารางหลัง dryRun | IT-US8-22 | entries ว่าง `updatedAt` เท่าหลัง setup (ไม่เขียน DB) | PASS |
| 12 | POST dryRun แผนสหกิจ 3/1 + วิชาโทวิทยาการข้อมูล | IT-US8-07 | CS440 `source: MINOR` วิชาโทอยู่หลังวิชาแผนหลัก | PASS |
| 13 | POST dryRun แผนหัวข้อพิเศษ 3/1 + วิชาโทเดียวกัน | — | ไม่มี CS440 แต่มีวิชาโทอื่น | PASS |
| 14 | POST dryRun แผนสหกิจ 3/1 + วิชาโทปัญญาประดิษฐ์ | IT-US8-11 | CS371 `NO_SECTION_AVAILABLE` `source: MINOR` ไม่มี field เสริม · วิชาอื่นยังเพิ่มได้ | PASS |
| 15 | POST `minorId` กับแผนปี 2 (ยืนยัน) | IT-US8-23 | 400 `code: MINOR_NOT_ALLOWED` | PASS |
| 16 | GET ตารางหลัง 400 | IT-US8-23 | ไม่เขียน DB | PASS |
| 17 | POST ไม่ส่ง `planId`, `academicYear` | IT-US8-25 | 400 `errors.planId`, `errors.academicYear` | PASS |
| 18 | POST `planId: 999999` | IT-US8-26 | 404 | PASS |
| 19 | POST `minorId: 999999` | IT-US8-26 | 404 | PASS |
| 20 | POST ยืนยันแผนปี 2/1 ไม่ส่ง `dryRun` | IT-US8-16, IT-US8-20 | 200 `dryRun: false` · `timetable` ของ US1 มีทุก section ที่ `added` · `totalCredits` = หน่วยกิตของแผน (18) · `conflicts: []` | PASS |
| 21 | POST ยืนยันซ้ำ | IT-US8-21, IT-US8-19, IT-US8-08 | 200 `added: []` ทุกวิชา `COURSE_ALREADY_IN_TIMETABLE` + `existingSectionNo` · entries เท่าเดิม `updatedAt` ไม่เปลี่ยน | PASS |
| 22 | POST dryRun แผนหัวข้อพิเศษ 3/1 + วิชาโท ทับตารางปี 2 (18 หน่วยกิต) | IT-US8-09, IT-US8-10, IT-US8-17 | มี `TIME_CONFLICT` พร้อม `conflictWith` / `message` และ `CREDIT_LIMIT_EXCEEDED` `currentCredits` = 18 + ที่เพิ่ม, `maxCredits: 22` · หน่วยกิตรวมไม่เกิน 22 | PASS |
| 23–24 | [cleanup] GET ตารางแล้ว DELETE วิชาที่ทดสอบ | — | ตารางว่าง | PASS |

เวลาตอบเฉลี่ย 26 ms (สูงสุด 59 ms) รวม 2.6 วินาที · รันซ้ำทันทีได้ 35/35 อีกครั้ง เพราะ request 02–03 และ 23–24 ล้างตาราง 2568/1 ของ `6609000001` ก่อนและหลัง (เหลือแถว `timetable` ว่างของบัญชีนี้ เพราะ US2 ลบแค่ entry)

ผลจริงของ request 22 จาก seed: `added` = CS301 810001 · `skipped` = CS223 ชนกับ CS221, CS241 ชนกับ CS213, CS331 ชนกับ CS240/EL295, CS346 ชนกับ CS240/EL295 (`TIME_CONFLICT`) และ TU108, CS345 (`CREDIT_LIMIT_EXCEEDED`, `currentCredits: 21`)

## การจับคู่กับ US8-T13

| Test case | ทดสอบใน T08 | หมายเหตุ |
| --- | --- | --- |
| IT-US8-01–04 | request 04–07 · `StudyPlanServiceTest` | การแสดง/ซ่อนกลุ่มปุ่มเป็นงาน UI (`CurriculumPlan.test.tsx`) |
| IT-US8-05, 14, 15, 34 | — | state ของ modal, request body ที่ UI ส่ง, loading, หลายหลักสูตร เป็นงาน frontend (test ของ US8-T07) |
| IT-US8-06–11 | request 10–14, 22 · `PlanSchedulerTest` | |
| IT-US8-12, 19 | request 21 · `confirm_nothingAdded_doesNotWrite_stillReturnsTimetable` | |
| IT-US8-13 (greedy พลาด) | `greedyWouldMiss_backtrackingPlacesBoth` | seed จริงไม่มีชุดวิชาที่ greedy พลาด จึงทดสอบที่ unit test |
| IT-US8-16, 17, 20, 21 | request 20–22 | |
| IT-US8-18 (หลายเหตุผลพร้อมกัน) | request 22 (`TIME_CONFLICT` + `CREDIT_LIMIT_EXCEEDED`) · request 21 (`COURSE_ALREADY_IN_TIMETABLE`) · request 14 (`NO_SECTION_AVAILABLE`) | ครบ 4 เหตุผล แต่คนละ request |
| IT-US8-22 (ยืนยันคำนวณใหม่) | request 11 · service เรียก `PlanScheduler` ใหม่ทุกครั้ง | การแก้ตารางในแท็บอื่นระหว่าง preview เป็นงาน UI |
| IT-US8-23, 25, 26, 28 | request 08, 15–19 | |
| IT-US8-24 `MINOR_PLAN_MISMATCH` | `ApplyPlanServiceTest.minorOfOtherCurriculum_throwsMinorPlanMismatch` | seed มีหลักสูตรเดียว ยิงผ่าน Postman ไม่ได้ |
| IT-US8-27 (ไม่พบผู้ใช้) | `StudyPlanServiceTest.userNotFound_…`, `StudyPlanControllerTest.userNotFound_returns404` | login แล้วมีแถว `users` เสมอ |
| IT-US8-29–33 (401 / 500 / network) | request 00 (401) | การดัก response และ retry เป็นงาน UI |

## การเปลี่ยนแปลงจากเอกสารออกแบบ

| เรื่อง | ออกแบบไว้ | ทำจริง | เหตุผล |
| --- | --- | --- | --- |
| `ApplyPlanRequest.dryRun` | `boolean` (primitive ได้ `false` เมื่อไม่ส่ง) | `Boolean` ที่ compact constructor แปลง `null` เป็น `false` | Jackson 3 ของ Spring Boot 4 ตอบ 400 (`HttpMessageNotReadableException`) เมื่อ record ที่มี field primitive ไม่ได้ส่งค่านั้นมา พฤติกรรมของ API ยังตรง Spec (ยืนยันด้วย request 20 และ `noMinorAndNoDryRun_…`) |
| `ScheduleResult.added` | `List<Section>` | `List<Added(section, source)>` | ต้องใช้ `source` สร้าง `AddedPlanCourseResponse.from(section, source)` |
| `ApplyPlanService.saveAdded` | `(studentId, plan, academicYear, sections)` | เพิ่มพารามิเตอร์ `Timetable` ที่โหลดไว้แล้ว (null = ยังไม่มี) | ไม่ต้อง query ตารางซ้ำ |
| "หยุดเร็ว" เมื่อเจอชุดที่ลงครบ | หยุดทันที | ค้นต่อจนพิสูจน์ด้วย bound ว่าไม่มีชุดที่ `sectionNo` น้อยกว่า | ถ้าหยุดทันที ผลขึ้นกับลำดับการค้นหา (กลุ่มเวลาน้อยก่อน) ซึ่งขัดกับเกณฑ์ข้อ 5 และ "ลำดับนี้มีผลแค่กับความเร็ว ไม่มีผลกับคำตอบ" ยังมีเพดาน 50,000 node เหมือนเดิม |
| หลังค้นหา | — | เติมวิชาที่ยังลงได้ตามลำดับในแผน (กรณีถึงเพดาน) | ไม่ให้มีวิชาที่ลงได้จริงแต่ถูกรายงานว่าข้าม |
| `ScheduleOverlap` | PR refactor แยกก่อนเริ่ม US8 | อยู่ใน branch นี้ | ยังไม่มี PR refactor ใน develop · test ของ US1 ผ่านเหมือนเดิม |
| `StudyMinor` ฝั่ง frontend (T07) | Spec มี `planType` | T07 ไม่มี `planType` เพิ่มใน T08 | ไม่อย่างนั้นปี 3–4 แสดงปุ่มวิชาโทซ้ำ 2 ปุ่ม และไม่กรองตามแผน |

## ข้อจำกัด

- Postman รันกับ backend ของ branch นี้ที่ port 8081 container `backend` / `frontend` ของ compose ยังเป็นโค้ดก่อน US8-T08 ต้อง `docker compose up -d --build backend frontend` ก่อนทดสอบผ่านหน้าเว็บ
- ยังไม่ได้ทดสอบผ่านหน้าเว็บจริง (เป็นงาน US8-T17 Integration UI–API)
- `MINOR_PLAN_MISMATCH` และกรณี greedy พลาด ทดสอบเฉพาะ unit test เพราะ seed จริงไม่มีข้อมูลที่ทำให้เกิด
- ข้อความ `message` ของ `CREDIT_LIMIT_EXCEEDED` (`เพิ่ม TU108 (3 หน่วยกิต) แล้วจะเป็น 24 หน่วยกิต เกินเพดาน 22 หน่วยกิต`) และ `NO_SECTION_AVAILABLE` (`… ไม่เปิดสอนในภาคเรียนนี้`) กำหนดใน T08 เพราะ Spec มีตัวอย่างเฉพาะ `TIME_CONFLICT` และ `COURSE_ALREADY_IN_TIMETABLE`

**เอกสารที่เกี่ยวข้อง:** [DTO & API Spec](../T05/US8-DTO-API-Spec.md) · [API Class Diagram](../T05/US8-API-Class-Diagram.md) · [DTO Class Diagram](../T05/US8-DTO-Class-Diagram.md) · [Extended API Class Diagram](../T06/US8-T06-Extended-API-Class-Diagram.md) · [Sequence Diagram — Preview](../T06/US8-T06-Sequence-Diagram-Preview.md) · [Sequence Diagram — Confirm](../T06/US8-T06-Sequence-Diagram-Confirm.md) · [US8-T13 Integration Test](../T13/US8-T13-Integration-Test-Cases.md) · [US8-T09 DAO Test Result](../T09/US8-T09-DAO-Unit-Test-Result.md)
