package th.ac.tu.cs261.group3.backend.studyplan;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import th.ac.tu.cs261.group3.backend.common.exception.BusinessRuleException;
import th.ac.tu.cs261.group3.backend.common.exception.ResourceNotFoundException;
import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.course.Section;
import th.ac.tu.cs261.group3.backend.course.SectionRepository;
import th.ac.tu.cs261.group3.backend.studyplan.dto.AddedPlanCourseResponse;
import th.ac.tu.cs261.group3.backend.studyplan.dto.ApplyPlanRequest;
import th.ac.tu.cs261.group3.backend.studyplan.dto.ApplyPlanResponse;
import th.ac.tu.cs261.group3.backend.studyplan.dto.PlanCourseSource;
import th.ac.tu.cs261.group3.backend.studyplan.dto.PlanSkipReason;
import th.ac.tu.cs261.group3.backend.studyplan.dto.SkippedPlanCourseResponse;
import th.ac.tu.cs261.group3.backend.timetable.Timetable;
import th.ac.tu.cs261.group3.backend.timetable.TimetableEntry;
import th.ac.tu.cs261.group3.backend.timetable.TimetableEntryRepository;
import th.ac.tu.cs261.group3.backend.timetable.TimetableRepository;
import th.ac.tu.cs261.group3.backend.timetable.TimetableService;
import th.ac.tu.cs261.group3.backend.timetable.dto.TimetableResponse;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import static java.time.DayOfWeek.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static th.ac.tu.cs261.group3.backend.course.CourseCategory.*;
import static th.ac.tu.cs261.group3.backend.studyplan.PlanTestData.*;
import static th.ac.tu.cs261.group3.backend.studyplan.StudyPlanEntities.*;

/**
 * POST /api/timetable/apply-plan ระดับ service (mock repository + PlanScheduler จริง)
 * ตาม US8-T05 Spec ข้อ 2 และ US8-T06 Sequence Diagram Preview / Confirm
 */
@ExtendWith(MockitoExtension.class)
class ApplyPlanServiceTest {

    private static final String STUDENT = "6609000000";
    private static final OffsetDateTime OLD = OffsetDateTime.parse("2026-10-13T11:20:05+07:00");

    @Mock
    private StudyPlanRepository studyPlanRepository;
    @Mock
    private StudyMinorRepository studyMinorRepository;
    @Mock
    private SectionRepository sectionRepository;
    @Mock
    private TimetableRepository timetableRepository;
    @Mock
    private TimetableEntryRepository timetableEntryRepository;
    @Mock
    private TimetableService timetableService;

    private ApplyPlanService service;

    // แผนปี 3/1 หัวข้อพิเศษ: CS311 (จ.), EL295 (อ.)
    private final Course cs311 = course("CS311", MAJOR, 3);
    private final Course el295 = course("EL295", GENERAL_EDUCATION, 3);
    private final Section cs311s = section(cs311, "010001", slot(MONDAY, "09:30", "12:30"));
    private final Section el295s = section(el295, "780001", slot(TUESDAY, "09:30", "12:30"));

    @BeforeEach
    void setUp() {
        service = new ApplyPlanService(22, studyPlanRepository, studyMinorRepository, sectionRepository,
                timetableRepository, timetableEntryRepository, timetableService, new PlanScheduler(50_000));
    }

    private StudyPlan year3Plan() {
        StudyPlan p = plan(6, CUR, 3, 1, PlanType.SPECIAL_PROJECT, cs311, el295);
        when(studyPlanRepository.findWithCoursesById(6L)).thenReturn(Optional.of(p));
        return p;
    }

    private void noTimetable() {
        when(timetableRepository.findByStudentIdAndAcademicYearAndSemester(STUDENT, 2568, 1)).thenReturn(Optional.empty());
    }

    private void sectionsReturn(Section... sections) {
        when(sectionRepository.findByCourseCodesAndTerm(any(), eq(2568), eq(1))).thenReturn(List.of(sections));
    }

    private static ApplyPlanRequest request(Long minorId, boolean dryRun) {
        return new ApplyPlanRequest(6L, minorId, 2568, dryRun);
    }

    // ---------- error ----------

    @Test
    void planNotFound_throws404_andWritesNothing() {
        when(studyPlanRepository.findWithCoursesById(99L)).thenReturn(Optional.empty());

        assertThat(catchThrowableOfType(ResourceNotFoundException.class,
                () -> service.applyPlan(STUDENT, new ApplyPlanRequest(99L, null, 2568, false)))).isNotNull();
        verifyNoInteractions(timetableRepository, timetableEntryRepository, sectionRepository);
    }

    @Test
    void minorWithYear2Plan_throwsMinorNotAllowed_beforeLookingUpMinor() {
        when(studyPlanRepository.findWithCoursesById(3L)).thenReturn(Optional.of(plan(3, CUR, 2, 1, null, cs311)));

        BusinessRuleException ex = catchThrowableOfType(BusinessRuleException.class,
                () -> service.applyPlan(STUDENT, new ApplyPlanRequest(3L, 1L, 2568, false)));

        assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getCode()).isEqualTo("MINOR_NOT_ALLOWED");
        verify(studyMinorRepository, never()).findWithCoursesById(anyLong());
        verifyNoInteractions(timetableRepository, timetableEntryRepository, sectionRepository);
    }

    @Test
    void minorNotFound_throws404() {
        year3Plan();
        when(studyMinorRepository.findWithCoursesById(77L)).thenReturn(Optional.empty());

        assertThat(catchThrowableOfType(ResourceNotFoundException.class,
                () -> service.applyPlan(STUDENT, request(77L, true)))).isNotNull();
        verifyNoInteractions(timetableRepository, timetableEntryRepository);
    }

    @Test
    void minorOfOtherCurriculum_throwsMinorPlanMismatch() {
        year3Plan();
        when(studyMinorRepository.findWithCoursesById(2L)).thenReturn(Optional.of(minor(2, "หลักสูตรอื่น", "ภาษาญี่ปุ่น")));

        BusinessRuleException ex = catchThrowableOfType(BusinessRuleException.class,
                () -> service.applyPlan(STUDENT, request(2L, false)));

        assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getCode()).isEqualTo("MINOR_PLAN_MISMATCH");
        verifyNoInteractions(timetableRepository, timetableEntryRepository);
    }

    // ---------- Preview (dryRun: true) ----------

    @Test
    void dryRun_returnsAddedWithoutWriting_timetableNull_minorIdNull() {
        year3Plan();
        noTimetable();
        sectionsReturn(cs311s, el295s);

        ApplyPlanResponse r = service.applyPlan(STUDENT, request(null, true));

        assertThat(r.planId()).isEqualTo(6L);
        assertThat(r.minorId()).isNull();
        assertThat(r.dryRun()).isTrue();
        assertThat(r.timetable()).isNull();
        assertThat(r.added()).extracting(AddedPlanCourseResponse::courseCode, AddedPlanCourseResponse::sectionNo,
                        AddedPlanCourseResponse::sectionId, AddedPlanCourseResponse::source)
                .containsExactly(tuple("CS311", "010001", cs311s.getSectionId(), PlanCourseSource.PLAN),
                        tuple("EL295", "780001", el295s.getSectionId(), PlanCourseSource.PLAN));
        assertThat(r.skipped()).isEmpty();
        verify(timetableRepository, never()).save(any());
        verify(timetableEntryRepository, never()).saveAll(any());
        verifyNoInteractions(timetableService);
    }

    @Test
    void dryRun_withExistingEntry_courseAlreadyInTimetable() {
        year3Plan();
        Timetable tt = new Timetable();
        tt.setTimetableId(10L);
        tt.setUpdatedAt(OLD);
        TimetableEntry e = new TimetableEntry();
        e.setTimetable(tt);
        e.setSection(el295s);
        when(timetableRepository.findByStudentIdAndAcademicYearAndSemester(STUDENT, 2568, 1)).thenReturn(Optional.of(tt));
        when(timetableEntryRepository.findByTimetableId(10L)).thenReturn(List.of(e));
        sectionsReturn(cs311s, el295s);

        ApplyPlanResponse r = service.applyPlan(STUDENT, request(null, true));

        assertThat(r.added()).extracting(AddedPlanCourseResponse::courseCode).containsExactly("CS311");
        assertThat(r.skipped()).extracting(SkippedPlanCourseResponse::courseCode, SkippedPlanCourseResponse::reason,
                        SkippedPlanCourseResponse::existingSectionNo)
                .containsExactly(tuple("EL295", PlanSkipReason.COURSE_ALREADY_IN_TIMETABLE, "780001"));
    }

    @Test
    void minor_usesCoursesOfPlanTypeYearAndSemester_dropsDuplicateOfPlan_sourceMinor() {
        year3Plan();
        noTimetable();
        Course cs345 = course("CS345", MINOR, 3);
        Course cs440 = course("CS440", MINOR, 3);
        StudyMinor ds = minor(1, CUR, "วิทยาการข้อมูล");
        addCourse(ds, PlanType.SPECIAL_PROJECT, 3, 1, cs311);   // ซ้ำกับแผน → เป็น PLAN ตัวเดียว
        addCourse(ds, PlanType.SPECIAL_PROJECT, 3, 1, cs345);
        addCourse(ds, PlanType.CO_OP, 3, 1, cs440);             // คนละแผน ไม่เอา
        addCourse(ds, PlanType.SPECIAL_PROJECT, 4, 1, cs440);   // คนละชั้นปี ไม่เอา
        when(studyMinorRepository.findWithCoursesById(1L)).thenReturn(Optional.of(ds));
        Section cs345s = section(cs345, "090001", slot(THURSDAY, "09:30", "12:30"));
        sectionsReturn(cs311s, el295s, cs345s);

        ApplyPlanResponse r = service.applyPlan(STUDENT, request(1L, true));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Collection<String>> codes = ArgumentCaptor.forClass(Collection.class);
        verify(sectionRepository).findByCourseCodesAndTerm(codes.capture(), eq(2568), eq(1));
        assertThat(codes.getValue()).containsExactly("CS311", "EL295", "CS345");
        assertThat(r.minorId()).isEqualTo(1L);
        assertThat(r.added()).extracting(AddedPlanCourseResponse::courseCode, AddedPlanCourseResponse::source)
                .containsExactly(tuple("CS311", PlanCourseSource.PLAN), tuple("EL295", PlanCourseSource.PLAN),
                        tuple("CS345", PlanCourseSource.MINOR));
    }

    // ---------- Confirm (dryRun: false) ----------

    @Test
    void confirm_noTimetable_createsTimetableOfPlanSemester_savesEntries_returnsUs1Timetable() {
        year3Plan();
        noTimetable();
        sectionsReturn(cs311s, el295s);
        TimetableResponse after = TimetableResponse.of(2568, 1, List.of(), 22, List.of(), OLD);
        when(timetableService.getTimetable(STUDENT, 2568, 1)).thenReturn(after);

        ApplyPlanResponse r = service.applyPlan(STUDENT, request(null, false));

        ArgumentCaptor<Timetable> tt = ArgumentCaptor.forClass(Timetable.class);
        verify(timetableRepository).save(tt.capture());
        assertThat(tt.getValue().getStudentId()).isEqualTo(STUDENT);
        assertThat(tt.getValue().getAcademicYear()).isEqualTo(2568);
        assertThat(tt.getValue().getSemester()).isEqualTo(1);
        assertThat(tt.getValue().getUpdatedAt()).isNotNull();

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<TimetableEntry>> entries = ArgumentCaptor.forClass(List.class);
        verify(timetableEntryRepository).saveAll(entries.capture());
        assertThat(entries.getValue()).extracting(TimetableEntry::getSection).containsExactly(cs311s, el295s);
        assertThat(entries.getValue()).allMatch(e -> e.getTimetable() == tt.getValue());

        assertThat(r.dryRun()).isFalse();
        assertThat(r.timetable()).isSameAs(after);
    }

    @Test
    void confirm_existingTimetable_touchesUpdatedAt() {
        year3Plan();
        Timetable tt = new Timetable();
        tt.setTimetableId(10L);
        tt.setStudentId(STUDENT);
        tt.setAcademicYear(2568);
        tt.setSemester(1);
        tt.setUpdatedAt(OLD);
        when(timetableRepository.findByStudentIdAndAcademicYearAndSemester(STUDENT, 2568, 1)).thenReturn(Optional.of(tt));
        when(timetableEntryRepository.findByTimetableId(10L)).thenReturn(List.of());
        sectionsReturn(cs311s, el295s);

        service.applyPlan(STUDENT, request(null, false));

        verify(timetableRepository).save(tt);
        assertThat(tt.getUpdatedAt()).isAfter(OLD);
    }

    @Test
    void confirm_nothingAdded_doesNotWrite_stillReturnsTimetable() {
        year3Plan();
        noTimetable();
        sectionsReturn();   // ไม่มี section เลย ทุกวิชา NO_SECTION_AVAILABLE
        when(timetableService.getTimetable(STUDENT, 2568, 1))
                .thenReturn(TimetableResponse.of(2568, 1, List.of(), 22, List.of(), null));

        ApplyPlanResponse r = service.applyPlan(STUDENT, request(null, false));

        assertThat(r.added()).isEmpty();
        assertThat(r.skipped()).extracting(SkippedPlanCourseResponse::reason)
                .containsOnly(PlanSkipReason.NO_SECTION_AVAILABLE);
        assertThat(r.timetable()).isNotNull();
        verify(timetableRepository, never()).save(any());
        verify(timetableEntryRepository, never()).saveAll(any());
        verify(timetableService).getTimetable(anyString(), anyInt(), anyInt());
    }
}
