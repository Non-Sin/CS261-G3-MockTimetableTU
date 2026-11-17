package th.ac.tu.cs261.group3.backend.elective;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import th.ac.tu.cs261.group3.backend.common.exception.ResourceNotFoundException;
import th.ac.tu.cs261.group3.backend.course.SectionRepository;
import th.ac.tu.cs261.group3.backend.course.dto.ScheduleSlotResponse;
import th.ac.tu.cs261.group3.backend.elective.dto.ElectiveDetailResponse;
import th.ac.tu.cs261.group3.backend.elective.dto.ElectiveSearchCriteria;
import th.ac.tu.cs261.group3.backend.elective.dto.ElectiveSectionResponse;
import th.ac.tu.cs261.group3.backend.elective.dto.ElectiveSummaryResponse;
import th.ac.tu.cs261.group3.backend.elective.dto.TimeSlot;
import th.ac.tu.cs261.group3.backend.timetable.TimetableService;
import th.ac.tu.cs261.group3.backend.timetable.dto.TimetableResponse;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import static java.time.DayOfWeek.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static th.ac.tu.cs261.group3.backend.elective.ElectiveTestData.*;
import static th.ac.tu.cs261.group3.backend.support.ElectiveDaoFixture.*;

/**
 * กฎของ US6 ใน ElectiveService (mock repository และ TimetableService) ตาม US6-T05 API Spec
 * และ US6-T06 Sequence Diagram ค้นหา / รายละเอียด ข้อมูลจาก {@link ElectiveTestData} (Fixture F0 ของ US6-T09)
 */
@ExtendWith(MockitoExtension.class)
class ElectiveServiceTest {

    private static final String STUDENT = "6609000000";
    /** วิชาทั้งหมดใน F0 ตามลำดับที่ repository คืน (ไม่เรียง) */
    private static final String[] ALL = {X, M, P, F, S, E, N};

    @Mock
    private ElectiveRepository electiveRepository;

    @Mock
    private SectionRepository sectionRepository;

    @Mock
    private TimetableService timetableService;

    private ElectiveService service;
    private ElectiveTestData d;

    @BeforeEach
    void setUp() {
        service = new ElectiveService(electiveRepository, sectionRepository, timetableService);
        d = ElectiveTestData.f0();
    }

    // ---------- helpers ----------

    /** repository คืนวิชาที่ส่ง และ SectionRepository คืน Sec ทั้งปีของรหัสวิชาที่ถูกขอ */
    private void givenCandidates(String... codes) {
        when(electiveRepository.searchRecommended(eq(YEAR), any(), any())).thenReturn(d.infos(codes));
        givenSections();
    }

    private void givenSections() {
        when(sectionRepository.findByCourseCodesAndYear(anyCollection(), eq(YEAR))).thenAnswer(inv -> {
            Collection<String> codes = inv.getArgument(0);
            return d.sectionsOf(codes.toArray(String[]::new));
        });
    }

    private void givenTimetable(TimetableResponse timetable) {
        when(timetableService.getTimetable(STUDENT, YEAR, 1)).thenReturn(timetable);
    }

    private List<ElectiveSummaryResponse> search(ElectiveSearchCriteria criteria) {
        return service.search(STUDENT, YEAR, 1, criteria);
    }

    private static List<String> codes(List<ElectiveSummaryResponse> result) {
        return result.stream().map(ElectiveSummaryResponse::courseCode).toList();
    }

    private static ElectiveSearchCriteria semester(Integer semester) {
        return new ElectiveSearchCriteria(null, semester, null, null, null, false);
    }

    private static ElectiveSearchCriteria dayTime(DayOfWeek day, TimeSlot timeSlot) {
        return new ElectiveSearchCriteria(null, null, day, timeSlot, null, false);
    }

    private static ElectiveSearchCriteria excludeConflicts() {
        return new ElectiveSearchCriteria(null, null, null, null, null, true);
    }

    private ElectiveDetailResponse detail(String code, TimetableResponse timetable) {
        when(electiveRepository.findRecommendedByCode(code, YEAR)).thenReturn(Optional.of(d.infos.get(code)));
        givenTimetable(timetable);
        givenSections();
        return service.getDetail(STUDENT, code, YEAR, 1);
    }

    private static ElectiveSectionResponse section(ElectiveDetailResponse detail, String sectionNo, int semester) {
        return detail.sections().stream()
                .filter(s -> s.sectionNo().equals(sectionNo) && s.semester() == semester)
                .findFirst().orElseThrow();
    }

    // ---------- search: รายการ ----------

    @Test
    void search_noFilters_returnsAllSortedByGroupThenCode() {
        givenCandidates(ALL);

        List<ElectiveSummaryResponse> result = search(ElectiveSearchCriteria.none());

        // LANGUAGE (FR205, NT001) → PSYCHOLOGY → SOCIETY → SCIENCE (EL001, X001) → MEDIA
        assertThat(codes(result)).containsExactly(F, N, P, S, E, X, M);
    }

    @Test
    void search_noFilters_mapsCardFieldsWithOfferedSemestersAndTagsInEnumOrder() {
        givenCandidates(F, P);

        List<ElectiveSummaryResponse> result = search(ElectiveSearchCriteria.none());

        ElectiveSummaryResponse f = result.get(0);
        assertThat(f.courseCode()).isEqualTo(F);
        assertThat(f.courseName()).isEqualTo("FRENCH FOR EVERYDAY LIFE");
        assertThat(f.courseNameTh()).isEqualTo(F_NAME_TH);
        assertThat(f.credits()).isEqualTo(3);
        assertThat(f.group()).isEqualTo(InterestGroup.LANGUAGE);
        assertThat(f.requiresQuota()).isTrue();
        assertThat(f.offeredSemesters()).containsExactly(1, 2);
        assertThat(f.tags()).containsExactly(ElectiveTag.KIND_INSTRUCTOR, ElectiveTag.NO_PREREQUISITE);
        assertThat(result.get(1).tags()).containsExactly(ElectiveTag.NO_ATTENDANCE, ElectiveTag.NO_GROUP_WORK);
    }

    @Test
    void search_withoutExcludeConflicts_doesNotLoadTimetable() {
        givenCandidates(ALL);

        search(ElectiveSearchCriteria.none());

        verifyNoInteractions(timetableService);
    }

    @Test
    void search_nullCriteria_treatedAsNoFilters() {
        givenCandidates(ALL);

        assertThat(service.search(STUDENT, YEAR, 1, null)).hasSize(7);
        verify(electiveRepository).searchRecommended(YEAR, null, null);
    }

    @Test
    void search_nullExcludeConflicts_treatedAsFalse() {
        givenCandidates(ALL);

        assertThat(search(new ElectiveSearchCriteria(null, null, null, null, null, null))).hasSize(7);
        verifyNoInteractions(timetableService);
    }

    @Test
    void search_passesQAndGroupToRepository() {
        when(electiveRepository.searchRecommended(YEAR, "py2", InterestGroup.PSYCHOLOGY)).thenReturn(d.infos(P));
        givenSections();

        List<ElectiveSummaryResponse> result = search(
                new ElectiveSearchCriteria("py2", null, null, null, InterestGroup.PSYCHOLOGY, false));

        assertThat(codes(result)).containsExactly(P);
    }

    @Test
    void search_noCandidates_returnsEmptyAndSkipsSectionQuery() {
        when(electiveRepository.searchRecommended(YEAR, "SA240", null)).thenReturn(List.of());

        List<ElectiveSummaryResponse> result = search(new ElectiveSearchCriteria("SA240", null, null, null, null, false));

        assertThat(result).isEmpty();
        verifyNoInteractions(sectionRepository);
    }

    // ---------- search: validate ภาค ----------

    @Test
    void search_currentSemester3_throws400BeforeQuery() {
        ResponseStatusException ex = catchThrowableOfType(ResponseStatusException.class,
                () -> service.search(STUDENT, YEAR, 3, ElectiveSearchCriteria.none()));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getReason()).isEqualTo("currentSemester ต้องเป็น 1 หรือ 2");
        verifyNoInteractions(electiveRepository, sectionRepository, timetableService);
    }

    @Test
    void search_semester3_throws400BeforeQuery() {
        ResponseStatusException ex = catchThrowableOfType(ResponseStatusException.class,
                () -> search(semester(3)));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getReason()).isEqualTo("semester ต้องเป็น 1 หรือ 2");
        verifyNoInteractions(electiveRepository, sectionRepository, timetableService);
    }

    // ---------- search: ตัวกรองระดับ Sec ----------

    @Test
    void search_semester2_keepsCoursesWithSemester2SectionAndOfferedSemestersNotFiltered() {
        givenCandidates(ALL);

        List<ElectiveSummaryResponse> result = search(semester(2));

        assertThat(codes(result)).containsExactly(F, P);
        assertThat(result).allSatisfy(r -> assertThat(r.offeredSemesters()).containsExactly(1, 2));
    }

    @Test
    void search_semester1_onlyFirstSemesterCourseShowsSingleOfferedSemester() {
        givenCandidates(ALL);

        List<ElectiveSummaryResponse> result = search(semester(1));

        assertThat(codes(result)).containsExactly(F, N, P, S, E, X, M);
        assertThat(result.get(1).offeredSemesters()).containsExactly(1);   // "เปิดเฉพาะเทอม 1"
    }

    @Test
    void search_dayAndTimeSlot_matchesSlotOnSameDayAndRange() {
        givenCandidates(ALL);

        // อังคารเย็น: S-F1 16:30 และ S-F2 19:00 ของ FR205 · X001 อังคาร 08:00 เป็นช่วงเช้า
        assertThat(codes(search(dayTime(TUESDAY, TimeSlot.EVENING)))).containsExactly(F);
        // จันทร์บ่าย: PY250 S-P1 13:30
        assertThat(codes(search(dayTime(MONDAY, TimeSlot.AFTERNOON)))).containsExactly(P);
    }

    @Test
    void search_dayOnly_excludesELearningSection() {
        givenCandidates(ALL);

        // S-E1 ไม่มีคาบ จึงไม่ผ่านตัวกรองวันใด ๆ
        assertThat(codes(search(dayTime(MONDAY, null)))).containsExactly(F, P);
        assertThat(codes(search(dayTime(null, TimeSlot.MORNING)))).doesNotContain(E);
    }

    @Test
    void search_timeSlotOnly_startTimeDecidesRange() {
        givenCandidates(ALL);

        // FR205 S-F1 16:30-18:00 เริ่มที่ขอบ 16:30 = EVENING ไม่ใช่ AFTERNOON
        assertThat(codes(search(dayTime(null, TimeSlot.AFTERNOON)))).containsExactly(P, S);
    }

    @Test
    void search_daySunday_returnsEmptyNotError() {
        givenCandidates(ALL);

        assertThat(search(dayTime(SUNDAY, null))).isEmpty();
    }

    @Test
    void search_dayAndTimeSlotFromDifferentSections_doesNotMatch() {
        // Sec A จันทร์เช้า, Sec B อังคารเย็น → ค้นจันทร์+เย็นต้องไม่ผ่าน (ต้องตรงในคาบเดียวกันของ Sec เดียวกัน)
        ElectiveInfo two = d.info("T6TWO01", "TWO SECTIONS", "สองกลุ่ม", InterestGroup.SOCIETY, false, List.of(), "r");
        d.section("A", two, 1, "000001", null, slot(MONDAY, "09:00", "12:00", null));
        d.section("B", two, 1, "000002", null, slot(TUESDAY, "17:00", "19:00", null));
        // Sec เดียวมีคาบจันทร์เช้าและอังคารเย็น → จันทร์+เย็นก็ต้องไม่ผ่าน
        ElectiveInfo one = d.info("T6ONE01", "ONE SECTION", "กลุ่มเดียว", InterestGroup.SOCIETY, false, List.of(), "r");
        d.section("C", one, 1, "000001", null,
                slot(MONDAY, "09:00", "12:00", null), slot(TUESDAY, "17:00", "19:00", null));
        givenCandidates("T6TWO01", "T6ONE01");

        assertThat(search(dayTime(MONDAY, TimeSlot.EVENING))).isEmpty();
        assertThat(codes(search(dayTime(MONDAY, TimeSlot.MORNING)))).containsExactly("T6ONE01", "T6TWO01");
    }

    @Test
    void search_semesterAndDayFromDifferentSections_doesNotMatch() {
        givenCandidates(ALL);

        // FR205: ภาค 2 มีแค่ S-F3 วันจันทร์ ส่วนวันอังคารเป็นของ S-F1/S-F2 ภาค 1
        assertThat(search(new ElectiveSearchCriteria(null, 2, TUESDAY, null, null, false)))
                .extracting(ElectiveSummaryResponse::courseCode).containsExactly(P);
        assertThat(codes(search(new ElectiveSearchCriteria(null, 2, MONDAY, null, null, false)))).containsExactly(F);
    }

    // ---------- search: excludeConflicts ----------

    @Test
    void search_excludeConflicts_emptyTimetable_keepsCoursesWithCurrentSemesterSection() {
        givenCandidates(ALL);
        givenTimetable(emptyTimetable());

        assertThat(codes(search(excludeConflicts()))).containsExactly(F, N, P, S, E, X, M);
    }

    @Test
    void search_excludeConflicts_removesConflictingCourseAndCourseAlreadyInTimetable() {
        givenCandidates(ALL);
        // CS111 จันทร์ 13:00-14:00 ชน S-P1 (Sec ภาค 2 ของ PY250 ไม่นับเพราะไม่ใช่ currentSemester)
        // NT001 S-N1 อยู่ในตารางแล้ว → ตัดออกแม้ไม่ชนกับใคร
        givenTimetable(timetable(
                entry("CS111", 900, MONDAY, "13:00", "14:00"),
                entryOf(d.sec("S-N1"))));

        List<ElectiveSummaryResponse> result = search(excludeConflicts());

        assertThat(codes(result)).containsExactly(F, S, E, X, M);
        verify(timetableService).getTimetable(STUDENT, YEAR, 1);
    }

    @Test
    void search_excludeConflicts_backToBackSlotIsNotConflict() {
        givenCandidates(N);
        // S-N1 พุธ 09:30-12:30 ต่อกันพอดีกับ 12:30-15:30 และ 08:00-09:30
        givenTimetable(timetable(
                entry("TU109", 901, WEDNESDAY, "12:30", "15:30"),
                entry("TU101", 902, WEDNESDAY, "08:00", "09:30")));

        assertThat(codes(search(excludeConflicts()))).containsExactly(N);
    }

    @Test
    void search_excludeConflicts_keepsCourseWhenAnotherSectionIsFree() {
        givenCandidates(F);
        // ชน S-F1 (อ. 16:30-18:00) แต่ S-F2 (อ. 19:00-20:00) ว่าง
        givenTimetable(timetable(entry("CS213", 903, TUESDAY, "17:00", "18:30")));

        assertThat(codes(search(excludeConflicts()))).containsExactly(F);
    }

    @Test
    void search_excludeConflictsWithDay_sameSectionMustPassBoth() {
        givenCandidates(F);
        // วันพฤหัสมีแค่ S-F1 ซึ่งชนตาราง ส่วน S-F2 ไม่ชนแต่ไม่มีคาบวันพฤหัส
        givenTimetable(timetable(entry("CS213", 903, TUESDAY, "17:00", "18:30")));

        assertThat(search(new ElectiveSearchCriteria(null, null, THURSDAY, null, null, true))).isEmpty();
    }

    @Test
    void search_excludeConflicts_eLearningSectionPasses() {
        givenCandidates(E);
        givenTimetable(timetable(entry("CS111", 900, MONDAY, "08:00", "20:00")));

        assertThat(codes(search(excludeConflicts()))).containsExactly(E);
    }

    @Test
    void search_excludeConflictsWithOtherSemester_returnsEmpty() {
        givenCandidates(ALL);
        givenTimetable(emptyTimetable());

        assertThat(search(new ElectiveSearchCriteria(null, 2, null, null, null, true))).isEmpty();
    }

    // ---------- getDetail ----------

    @Test
    void getDetail_returnsSummaryDescriptionAndAllSectionsSortedBySemesterThenSectionNo() {
        ElectiveDetailResponse detail = detail(F, emptyTimetable());

        assertThat(detail.courseCode()).isEqualTo(F);
        assertThat(detail.courseNameTh()).isEqualTo(F_NAME_TH);
        assertThat(detail.requiresQuota()).isTrue();
        assertThat(detail.offeredSemesters()).containsExactly(1, 2);
        assertThat(detail.tags()).containsExactly(ElectiveTag.KIND_INSTRUCTOR, ElectiveTag.NO_PREREQUISITE);
        assertThat(detail.description()).containsExactly(REVIEW_F0, REVIEW_F1);
        assertThat(detail.sections()).extracting(ElectiveSectionResponse::sectionNo)
                .containsExactly("260001", "260002", "260003");
        verify(sectionRepository).findByCourseCodesAndYear(List.of(F), YEAR);
    }

    @Test
    void getDetail_mapsSectionWithSortedSlotsAndNullableInstructorAndRoom() {
        ElectiveDetailResponse detail = detail(F, emptyTimetable());

        ElectiveSectionResponse f1 = section(detail, "260001", 1);
        assertThat(f1.sectionId()).isEqualTo(SEC.get("S-F1"));
        assertThat(f1.instructor()).isEqualTo(F_INSTRUCTOR);
        // entity เก็บพฤหัสก่อนอังคาร ต้องเรียงตามวันในสัปดาห์
        assertThat(f1.schedules()).containsExactly(
                new ScheduleSlotResponse(TUESDAY, LocalTime.of(16, 30), LocalTime.of(18, 0), "SC3-M10"),
                new ScheduleSlotResponse(THURSDAY, LocalTime.of(16, 30), LocalTime.of(18, 0), "SC3-M10"));

        ElectiveSectionResponse f2 = section(detail, "260002", 1);
        assertThat(f2.instructor()).isNull();
        assertThat(f2.schedules().get(0).room()).isNull();
    }

    @Test
    void getDetail_otherSemesterSectionNotSelectableAndNoConflictWith() {
        // ตารางภาค 1 มีวิชาชนกับคาบของ S-P2 (ภาค 2) ตามวันเวลา แต่ Sec อีกภาคต้องได้ conflictWith ว่าง
        ElectiveDetailResponse detail = detail(P, timetable(entry("CS111", 900, TUESDAY, "09:30", "11:00")));

        ElectiveSectionResponse p1 = section(detail, "820001", 1);
        ElectiveSectionResponse p2 = section(detail, "230001", 2);
        assertThat(p1.selectable()).isTrue();
        assertThat(p2.selectable()).isFalse();
        assertThat(p2.conflictWith()).isEmpty();
        assertThat(detail.sections()).extracting(ElectiveSectionResponse::semester).containsExactly(1, 2);
    }

    @Test
    void getDetail_emptyTimetable_noSectionInTimetableOrConflict() {
        ElectiveDetailResponse detail = detail(P, emptyTimetable());

        assertThat(detail.sections()).allSatisfy(s -> {
            assertThat(s.inTimetable()).isFalse();
            assertThat(s.conflictWith()).isEmpty();
        });
    }

    @Test
    void getDetail_sectionInTimetable_marksOnlyThatSection() {
        ElectiveDetailResponse detail = detail(F, timetable(entryOf(d.sec("S-F2"))));

        assertThat(section(detail, "260002", 1).inTimetable()).isTrue();
        assertThat(section(detail, "260001", 1).inTimetable()).isFalse();
        assertThat(section(detail, "260003", 2).inTimetable()).isFalse();
    }

    @Test
    void getDetail_conflictWith_distinctInEntryOrderAndSkipsSameCourse() {
        ScheduleSlotResponse tue17 = new ScheduleSlotResponse(TUESDAY, LocalTime.of(17, 0), LocalTime.of(18, 0), null);
        ScheduleSlotResponse thu16 = new ScheduleSlotResponse(THURSDAY, LocalTime.of(16, 0), LocalTime.of(17, 0), null);
        ElectiveDetailResponse detail = detail(F, timetable(
                entry("MA211", 904, THURSDAY, "17:00", "18:00"),
                entry("CS111", 905, tue17, thu16),           // ชน S-F1 สองคาบ ต้องได้รหัสเดียว
                entry("ST216", 906, TUESDAY, "18:00", "19:00"), // ต่อกันพอดีกับ S-F1 และ S-F2 ไม่ชน
                entryOf(d.sec("S-F2"))));                     // FR205 เอง ไม่นับว่าชนกับ S-F1

        assertThat(section(detail, "260001", 1).conflictWith()).containsExactly("MA211", "CS111");
        assertThat(section(detail, "260002", 1).conflictWith()).isEmpty();
    }

    @Test
    void getDetail_selfCourseOverlap_isNotReportedAsConflict() {
        // FR205 Sec อื่นในตารางมีคาบทับ S-F1 → ไม่รายงานว่าชนตัวเอง (กฎวิชาซ้ำตรวจแยกที่ POST ของ US1)
        ElectiveDetailResponse detail = detail(F, timetable(
                entry(F, 907, TUESDAY, "16:30", "18:00")));

        assertThat(section(detail, "260001", 1).conflictWith()).isEmpty();
    }

    @Test
    void getDetail_notRecommended_throws404WithoutLoadingTimetable() {
        when(electiveRepository.findRecommendedByCode("SA240", YEAR)).thenReturn(Optional.empty());

        ResourceNotFoundException ex = catchThrowableOfType(ResourceNotFoundException.class,
                () -> service.getDetail(STUDENT, "SA240", YEAR, 1));

        assertThat(ex.getMessage()).isEqualTo("ไม่พบวิชาเสรีแนะนำ: SA240");
        verifyNoInteractions(timetableService, sectionRepository);
    }

    @Test
    void getDetail_currentSemester3_throws400BeforeQuery() {
        ResponseStatusException ex = catchThrowableOfType(ResponseStatusException.class,
                () -> service.getDetail(STUDENT, F, YEAR, 3));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getReason()).isEqualTo("currentSemester ต้องเป็น 1 หรือ 2");
        verify(electiveRepository, never()).findRecommendedByCode(anyString(), anyInt());
        verifyNoInteractions(timetableService, sectionRepository);
    }

    @Test
    void getDetail_usesCurrentSemesterForTimetable() {
        when(electiveRepository.findRecommendedByCode(P, YEAR)).thenReturn(Optional.of(d.infos.get(P)));
        when(timetableService.getTimetable(STUDENT, YEAR, 2)).thenReturn(
                TimetableResponse.of(YEAR, 2, List.of(), 22, List.of(), null));
        givenSections();

        ElectiveDetailResponse detail = service.getDetail(STUDENT, P, YEAR, 2);

        // เปิดตารางภาค 2: S-P2 เลือกได้ S-P1 เลือกไม่ได้
        assertThat(section(detail, "230001", 2).selectable()).isTrue();
        assertThat(section(detail, "820001", 1).selectable()).isFalse();
    }
}
