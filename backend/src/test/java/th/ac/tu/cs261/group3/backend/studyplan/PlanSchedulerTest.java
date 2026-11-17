package th.ac.tu.cs261.group3.backend.studyplan;

import org.junit.jupiter.api.Test;
import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.course.Section;
import th.ac.tu.cs261.group3.backend.studyplan.dto.PlanCourseSource;
import th.ac.tu.cs261.group3.backend.studyplan.dto.PlanSkipReason;
import th.ac.tu.cs261.group3.backend.studyplan.dto.SkippedPlanCourseResponse;

import java.util.List;

import static java.time.DayOfWeek.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static th.ac.tu.cs261.group3.backend.course.CourseCategory.*;
import static th.ac.tu.cs261.group3.backend.studyplan.PlanTestData.*;

/**
 * อัลกอริทึมเลือก section ของ US8 ไม่ใช้ DB ตาม US8-T05 Spec หัวข้อ "วิธีเลือก section" และ "สิ่งที่ US8 ควรออกแบบเทสต์"
 */
class PlanSchedulerTest {

    private static final int MAX = 22;

    private final PlanScheduler scheduler = new PlanScheduler(50_000);

    private static List<String> addedCodes(ScheduleResult r) {
        return r.added().stream().map(a -> a.section().getCourse().getCourseCode()).toList();
    }

    private static List<String> addedSectionNos(ScheduleResult r) {
        return r.added().stream().map(a -> a.section().getSectionNo()).toList();
    }

    private static SkippedPlanCourseResponse skipped(ScheduleResult r, String code) {
        return r.skipped().stream().filter(s -> s.courseCode().equals(code)).findFirst().orElseThrow();
    }

    // ---------- ผลพื้นฐาน ----------

    @Test
    void emptyTimetable_noConflicts_addsAllCourses() {
        Course a = course("CS211", MAJOR, 3);
        Course b = course("CS213", MAJOR, 3);
        Course g = course("EL295", GENERAL_EDUCATION, 3);

        ScheduleResult r = scheduler.schedule(List.of(
                plan(a, 0, section(a, "010001", slot(MONDAY, "09:30", "12:30"))),
                plan(b, 1, section(b, "010001", slot(TUESDAY, "09:30", "12:30"))),
                plan(g, 2, section(g, "780001", slot(WEDNESDAY, "09:30", "12:30")))), List.of(), MAX);

        assertThat(addedCodes(r)).containsExactly("CS211", "CS213", "EL295");
        assertThat(r.added()).allMatch(x -> x.source() == PlanCourseSource.PLAN);
        assertThat(r.skipped()).isEmpty();
    }

    @Test
    void output_followsPlanOrder_majorBeforeGeneralEducation_regardlessOfInputOrder() {
        Course g = course("EL295", GENERAL_EDUCATION, 3);
        Course m = course("CS213", MAJOR, 3);

        ScheduleResult r = scheduler.schedule(List.of(
                plan(g, 0, section(g, "780001", slot(MONDAY, "09:30", "12:30"))),
                plan(m, 1, section(m, "010001", slot(TUESDAY, "09:30", "12:30")))), List.of(), MAX);

        assertThat(addedCodes(r)).containsExactly("CS213", "EL295");
    }

    @Test
    void backToBackSlots_areNotConflicts() {
        Course a = course("CS211", MAJOR, 3);
        Course b = course("CS213", MAJOR, 3);

        ScheduleResult r = scheduler.schedule(List.of(
                plan(a, 0, section(a, "010001", slot(MONDAY, "09:30", "11:00"))),
                plan(b, 1, section(b, "010001", slot(MONDAY, "11:00", "12:30")))), List.of(), MAX);

        assertThat(addedCodes(r)).containsExactly("CS211", "CS213");
    }

    @Test
    void sectionWithoutSlots_isAddedAndNeverConflicts() {
        Course coop = course("CS395", MAJOR, 6);
        Course a = course("CS211", MAJOR, 3);

        ScheduleResult r = scheduler.schedule(List.of(
                plan(coop, 0, section(coop, "010001")),
                plan(a, 1, section(a, "010001", slot(MONDAY, "09:30", "12:30")))), List.of(), MAX);

        assertThat(addedCodes(r)).containsExactly("CS395", "CS211");
    }

    // ---------- ขั้นที่ 1: กรองก่อนค้นหา ----------

    @Test
    void courseAlreadyInTimetable_isSkippedWithExistingSectionNo() {
        Course tu = course("TU100", GENERAL_EDUCATION, 3);
        Section existing = section(tu, "780002", slot(FRIDAY, "13:30", "16:30"));

        ScheduleResult r = scheduler.schedule(List.of(
                plan(tu, 0, section(tu, "780001", slot(MONDAY, "09:30", "12:30")), existing)), List.of(existing), MAX);

        assertThat(r.added()).isEmpty();
        SkippedPlanCourseResponse s = skipped(r, "TU100");
        assertThat(s.reason()).isEqualTo(PlanSkipReason.COURSE_ALREADY_IN_TIMETABLE);
        assertThat(s.existingSectionNo()).isEqualTo("780002");
        assertThat(s.message()).isEqualTo("TU100 อยู่ในตารางแล้ว (Sec 780002)");
        assertThat(s.conflictWith()).isNull();
    }

    @Test
    void noSectionThisTerm_isNoSectionAvailable() {
        Course cs = course("CS223", MAJOR, 3);

        ScheduleResult r = scheduler.schedule(List.of(plan(cs, 0)), List.of(), MAX);

        SkippedPlanCourseResponse s = skipped(r, "CS223");
        assertThat(s.reason()).isEqualTo(PlanSkipReason.NO_SECTION_AVAILABLE);
        assertThat(s.message()).isEqualTo("CS223 ไม่เปิดสอนในภาคเรียนนี้");
    }

    @Test
    void everySectionConflictsWithExisting_isTimeConflictWithExistingCodes() {
        Course old = course("TU109", GENERAL_EDUCATION, 3);
        Section existing = section(old, "780001", slot(WEDNESDAY, "09:30", "12:30"));
        Course las = course("LAS101", GENERAL_EDUCATION, 3);

        ScheduleResult r = scheduler.schedule(List.of(
                plan(las, 0, section(las, "780004", slot(WEDNESDAY, "10:00", "11:00")))), List.of(existing), MAX);

        SkippedPlanCourseResponse s = skipped(r, "LAS101");
        assertThat(s.reason()).isEqualTo(PlanSkipReason.TIME_CONFLICT);
        assertThat(s.conflictWith()).containsExactly("TU109");
        assertThat(s.message()).isEqualTo("LAS101 ทุกกลุ่มเรียนเวลาชนกับ TU109");
    }

    @Test
    void sectionsWithSameTimes_areOneGroup_representativeIsSmallestSectionNo() {
        Course g = course("TU100", GENERAL_EDUCATION, 3);

        ScheduleResult r = scheduler.schedule(List.of(plan(g, 0,
                section(g, "780003", slot(MONDAY, "09:30", "12:30")),
                section(g, "780001", slot(MONDAY, "09:30", "12:30")),
                section(g, "780002", slot(MONDAY, "09:30", "12:30")))), List.of(), MAX);

        assertThat(addedSectionNos(r)).containsExactly("780001");
        assertThat(PlanScheduler.groupByTimePattern(List.of(
                section(g, "780002", slot(MONDAY, "09:30", "12:30"), slot(THURSDAY, "09:30", "12:30")),
                section(g, "780001", slot(THURSDAY, "09:30", "12:30"), slot(MONDAY, "09:30", "12:30")),
                section(g, "780004", slot(TUESDAY, "09:30", "12:30")))))
                .extracting(Section::getSectionNo)
                .containsExactly("780001", "780004");
    }

    // ---------- ขั้นที่ 2: ค้นหา ----------

    @Test
    void firstSectionConflicts_secondDoesNot_picksSecond() {
        Course a = course("CS211", MAJOR, 3);
        Course b = course("CS213", MAJOR, 3);

        ScheduleResult r = scheduler.schedule(List.of(
                plan(a, 0, section(a, "010001", slot(MONDAY, "09:30", "12:30"))),
                plan(b, 1, section(b, "010001", slot(MONDAY, "09:30", "12:30")),
                        section(b, "010002", slot(TUESDAY, "09:30", "12:30")))), List.of(), MAX);

        assertThat(addedCodes(r)).containsExactly("CS211", "CS213");
        assertThat(addedSectionNos(r)).containsExactly("010001", "010002");
    }

    @Test
    void greedyWouldMiss_backtrackingPlacesBoth() {
        Course a = course("CS211", MAJOR, 3);
        Course b = course("CS213", MAJOR, 3);
        List<PlanCourseCandidate> candidates = List.of(
                plan(a, 0, section(a, "010001", slot(MONDAY, "09:30", "12:30")),
                        section(a, "010002", slot(TUESDAY, "09:30", "12:30"))),
                plan(b, 1, section(b, "010001", slot(MONDAY, "09:30", "12:30"))));

        ScheduleResult r = scheduler.schedule(candidates, List.of(), MAX);

        assertThat(r.added()).extracting(x -> x.section().getCourse().getCourseCode(), x -> x.section().getSectionNo())
                .containsExactly(tuple("CS211", "010002"), tuple("CS213", "010001"));
        assertThat(r.skipped()).isEmpty();
    }

    @Test
    void nodeLimitOne_returnsGreedyResultWithoutError() {
        Course a = course("CS211", MAJOR, 3);
        Course b = course("CS213", MAJOR, 3);
        List<PlanCourseCandidate> candidates = List.of(
                plan(a, 0, section(a, "010001", slot(MONDAY, "09:30", "12:30")),
                        section(a, "010002", slot(TUESDAY, "09:30", "12:30"))),
                plan(b, 1, section(b, "010001", slot(MONDAY, "09:30", "12:30"))));

        ScheduleResult r = new PlanScheduler(1).schedule(candidates, List.of(), MAX);

        assertThat(addedSectionNos(r)).containsExactly("010001");
        SkippedPlanCourseResponse s = skipped(r, "CS213");
        assertThat(s.reason()).isEqualTo(PlanSkipReason.TIME_CONFLICT);
        assertThat(s.conflictWith()).containsExactly("CS211");
    }

    @Test
    void majorAndGeneralEducationConflictEverySection_majorWins() {
        Course g = course("EL295", GENERAL_EDUCATION, 3);
        Course m = course("CS213", MAJOR, 3);

        ScheduleResult r = scheduler.schedule(List.of(
                plan(g, 0, section(g, "780001", slot(MONDAY, "09:30", "12:30"))),
                plan(m, 1, section(m, "010001", slot(MONDAY, "10:00", "11:00")))), List.of(), MAX);

        assertThat(addedCodes(r)).containsExactly("CS213");
        SkippedPlanCourseResponse s = skipped(r, "EL295");
        assertThat(s.reason()).isEqualTo(PlanSkipReason.TIME_CONFLICT);
        assertThat(s.conflictWith()).containsExactly("CS213");
    }

    @Test
    void oneMajor_beatsTwoGeneralEducationCourses() {
        Course m = course("CS213", MAJOR, 3);
        Course g1 = course("EL295", GENERAL_EDUCATION, 3);
        Course g2 = course("TU100", GENERAL_EDUCATION, 3);

        ScheduleResult r = scheduler.schedule(List.of(
                plan(m, 0, section(m, "010001", slot(MONDAY, "08:00", "12:00"))),
                plan(g1, 1, section(g1, "780001", slot(MONDAY, "08:00", "09:30"))),
                plan(g2, 2, section(g2, "780001", slot(MONDAY, "10:00", "11:30")))), List.of(), MAX);

        assertThat(addedCodes(r)).containsExactly("CS213");
        assertThat(r.skipped()).extracting(SkippedPlanCourseResponse::courseCode).containsExactly("EL295", "TU100");
    }

    @Test
    void twoEquallyGoodSolutions_picksSmallerSectionNoInPlanOrder_deterministic() {
        Course a = course("CS211", MAJOR, 3);
        Course b = course("CS213", MAJOR, 3);
        List<PlanCourseCandidate> candidates = List.of(
                plan(a, 0, section(a, "010001", slot(MONDAY, "09:30", "12:30")),
                        section(a, "010002", slot(TUESDAY, "09:30", "12:30"))),
                plan(b, 1, section(b, "010001", slot(MONDAY, "09:30", "12:30")),
                        section(b, "010002", slot(TUESDAY, "09:30", "12:30"))));

        for (int run = 0; run < 3; run++) {
            ScheduleResult r = scheduler.schedule(candidates, List.of(), MAX);
            assertThat(addedSectionNos(r)).containsExactly("010001", "010002");
        }
    }

    @Test
    void planOverMaxCredits_addsMostCourses_restAreCreditLimitExceeded() {
        Course m1 = course("CS211", MAJOR, 3);
        Course m2 = course("CS213", MAJOR, 3);
        Course g = course("LAS101", GENERAL_EDUCATION, 3);
        Course old = course("FREE1", FREE_ELECTIVE, 15);
        Section existing = section(old, "000001");

        ScheduleResult r = scheduler.schedule(List.of(
                plan(m1, 0, section(m1, "010001", slot(MONDAY, "09:30", "12:30"))),
                plan(m2, 1, section(m2, "010001", slot(TUESDAY, "09:30", "12:30"))),
                plan(g, 2, section(g, "780001", slot(WEDNESDAY, "09:30", "12:30")))), List.of(existing), MAX);

        assertThat(addedCodes(r)).containsExactly("CS211", "CS213");
        SkippedPlanCourseResponse s = skipped(r, "LAS101");
        assertThat(s.reason()).isEqualTo(PlanSkipReason.CREDIT_LIMIT_EXCEEDED);
        assertThat(s.currentCredits()).isEqualTo(21);
        assertThat(s.maxCredits()).isEqualTo(22);
        assertThat(s.conflictWith()).isNull();
    }

    // ---------- วิชาโท ----------

    @Test
    void minorConflictsWithPlanCourse_planCourseWins_evenIfMinorHasMoreCredits() {
        Course m = course("CS372", MAJOR, 3);
        Course n = course("CS246", MINOR, 4);

        ScheduleResult r = scheduler.schedule(List.of(
                minor(n, 0, section(n, "090001", slot(MONDAY, "09:30", "12:30"))),
                plan(m, 0, section(m, "040001", slot(MONDAY, "08:00", "11:00")))), List.of(), MAX);

        assertThat(addedCodes(r)).containsExactly("CS372");
        SkippedPlanCourseResponse s = skipped(r, "CS246");
        assertThat(s.source()).isEqualTo(PlanCourseSource.MINOR);
        assertThat(s.reason()).isEqualTo(PlanSkipReason.TIME_CONFLICT);
        assertThat(s.conflictWith()).containsExactly("CS372");
    }

    @Test
    void planPlusMinorOverMaxCredits_minorIsSkippedBeforePlanCourse() {
        Course m = course("CS372", MAJOR, 3);
        Course n = course("CS345", MINOR, 3);
        Course old = course("FREE1", FREE_ELECTIVE, 18);

        ScheduleResult r = scheduler.schedule(List.of(
                minor(n, 0, section(n, "090001", slot(TUESDAY, "09:30", "12:30"))),
                plan(m, 0, section(m, "040001", slot(MONDAY, "09:30", "12:30")))),
                List.of(section(old, "000001")), MAX);

        assertThat(r.added()).extracting(x -> x.section().getCourse().getCourseCode(), ScheduleResult.Added::source)
                .containsExactly(tuple("CS372", PlanCourseSource.PLAN));
        SkippedPlanCourseResponse s = skipped(r, "CS345");
        assertThat(s.reason()).isEqualTo(PlanSkipReason.CREDIT_LIMIT_EXCEEDED);
        assertThat(s.source()).isEqualTo(PlanCourseSource.MINOR);
        assertThat(s.currentCredits()).isEqualTo(21);
    }

    @Test
    void minorCourse_isAddedWithMinorSourceAfterPlanCourses() {
        Course m = course("CS372", MAJOR, 3);
        Course n = course("CS345", MINOR, 3);

        ScheduleResult r = scheduler.schedule(List.of(
                minor(n, 0, section(n, "090001", slot(TUESDAY, "09:30", "12:30"))),
                plan(m, 0, section(m, "040001", slot(MONDAY, "09:30", "12:30")))), List.of(), MAX);

        assertThat(r.added()).extracting(x -> x.section().getCourse().getCourseCode(), ScheduleResult.Added::source)
                .containsExactly(tuple("CS372", PlanCourseSource.PLAN), tuple("CS345", PlanCourseSource.MINOR));
    }
}
