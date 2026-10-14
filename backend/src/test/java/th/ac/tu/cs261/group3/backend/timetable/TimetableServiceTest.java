package th.ac.tu.cs261.group3.backend.timetable;

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
import th.ac.tu.cs261.group3.backend.course.CourseCategory;
import th.ac.tu.cs261.group3.backend.course.ScheduleSlot;
import th.ac.tu.cs261.group3.backend.course.Section;
import th.ac.tu.cs261.group3.backend.course.SectionRepository;
import th.ac.tu.cs261.group3.backend.timetable.dto.AddTimetableEntryRequest;
import th.ac.tu.cs261.group3.backend.timetable.dto.TimeConflictResponse;
import th.ac.tu.cs261.group3.backend.timetable.dto.TimetableEntryResponse;
import th.ac.tu.cs261.group3.backend.timetable.dto.TimetableResponse;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static java.time.DayOfWeek.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * กฎของ US1 ใน TimetableService (mock repository) ตาม US1-T05 DTO & API Spec และ US1-T06 Sequence Diagram
 */
@ExtendWith(MockitoExtension.class)
class TimetableServiceTest {

    private static final String STUDENT = "6609000000";
    private static final OffsetDateTime OLD_UPDATED_AT = OffsetDateTime.parse("2026-10-13T11:20:05+07:00");

    @Mock
    private SectionRepository sectionRepository;

    @Mock
    private TimetableRepository timetableRepository;

    @Mock
    private TimetableEntryRepository entryRepository;

    private TimetableService service;
    private long nextId = 1;

    @BeforeEach
    void setUp() {
        service = new TimetableService(22, sectionRepository, timetableRepository, entryRepository);
    }

    // ---------- test data ----------

    private static ScheduleSlot slot(DayOfWeek day, String start, String end) {
        ScheduleSlot slot = new ScheduleSlot();
        slot.setDayOfWeek(day);
        slot.setStartTime(LocalTime.parse(start));
        slot.setEndTime(LocalTime.parse(end));
        slot.setRoom("R-" + start);
        return slot;
    }

    private Section section(String courseCode, int credits, String sectionNo, ScheduleSlot... slots) {
        Course course = new Course();
        course.setCourseCode(courseCode);
        course.setCourseName(courseCode + " NAME");
        course.setCategory(CourseCategory.MAJOR);
        course.setCredits(credits);

        Section section = new Section();
        section.setSectionId(nextId++);
        section.setCourse(course);
        section.setSectionNo(sectionNo);
        section.setAcademicYear(2568);
        section.setSemester(1);
        section.setSlots(new ArrayList<>(List.of(slots)));
        for (ScheduleSlot s : slots) {
            s.setSection(section);
        }
        return section;
    }

    private Timetable timetable() {
        Timetable timetable = new Timetable();
        timetable.setTimetableId(nextId++);
        timetable.setStudentId(STUDENT);
        timetable.setAcademicYear(2568);
        timetable.setSemester(1);
        timetable.setUpdatedAt(OLD_UPDATED_AT);
        return timetable;
    }

    private TimetableEntry entry(Timetable timetable, Section section) {
        TimetableEntry entry = new TimetableEntry();
        entry.setEntryId(nextId++);
        entry.setTimetable(timetable);
        entry.setSection(section);
        return entry;
    }

    private Section tu109() {
        return section("TU109", 3, "780001", slot(WEDNESDAY, "09:30", "12:30"));
    }

    private Section las101() {
        return section("LAS101", 3, "780004", slot(WEDNESDAY, "09:30", "12:30"));
    }

    /** มีตารางอยู่แล้วพร้อม entries ตามที่ส่งมา */
    private Timetable givenTimetable(Section... sections) {
        Timetable timetable = timetable();
        List<TimetableEntry> entries = new ArrayList<>();
        for (Section s : sections) {
            entries.add(entry(timetable, s));
        }
        when(timetableRepository.findByStudentIdAndAcademicYearAndSemester(STUDENT, 2568, 1))
                .thenReturn(Optional.of(timetable));
        when(entryRepository.findByTimetableId(timetable.getTimetableId())).thenReturn(entries);
        return timetable;
    }

    private void givenSection(Section section) {
        when(sectionRepository.findById(section.getSectionId())).thenReturn(Optional.of(section));
    }

    private static List<String> codes(TimetableResponse response) {
        return response.entries().stream().map(TimetableEntryResponse::courseCode).toList();
    }

    /** 7 วิชา 3 หน่วยกิต = 21 หน่วยกิต ไม่ชนกัน */
    private Section[] twentyOneCredits() {
        DayOfWeek[] days = {MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, MONDAY, TUESDAY};
        String[] starts = {"08:00", "08:00", "08:00", "08:00", "08:00", "13:00", "13:00"};
        Section[] sections = new Section[7];
        for (int i = 0; i < 7; i++) {
            LocalTime start = LocalTime.parse(starts[i]);
            sections[i] = section("C" + (100 + i), 3, "000001",
                    slot(days[i], start.toString(), start.plusHours(2).toString()));
        }
        return sections;
    }

    // ---------- getTimetable ----------

    @Test
    void getTimetable_none_returnsEmptyTimetable() {
        when(timetableRepository.findByStudentIdAndAcademicYearAndSemester(STUDENT, 2568, 1))
                .thenReturn(Optional.empty());

        TimetableResponse response = service.getTimetable(STUDENT, 2568, 1);

        assertThat(response.academicYear()).isEqualTo(2568);
        assertThat(response.semester()).isEqualTo(1);
        assertThat(response.entries()).isEmpty();
        assertThat(response.conflicts()).isEmpty();
        assertThat(response.totalCredits()).isZero();
        assertThat(response.maxCredits()).isEqualTo(22);
        assertThat(response.updatedAt()).isNull();
    }

    @Test
    void getTimetable_overlappingCourses_returnsConflictsAndConflictWith() {
        Section ma211 = section("MA211", 3, "010001", slot(TUESDAY, "09:30", "11:00"));
        givenTimetable(tu109(), las101(), ma211);

        TimetableResponse response = service.getTimetable(STUDENT, 2568, 1);

        assertThat(codes(response)).containsExactly("TU109", "LAS101", "MA211");
        assertThat(response.totalCredits()).isEqualTo(9);
        assertThat(response.updatedAt()).isEqualTo(OLD_UPDATED_AT);
        assertThat(response.conflicts()).containsExactly(new TimeConflictResponse(
                WEDNESDAY, LocalTime.of(9, 30), LocalTime.of(12, 30), List.of("TU109", "LAS101")));
        assertThat(response.entries()).extracting(TimetableEntryResponse::conflictWith)
                .containsExactly(List.of("LAS101"), List.of("TU109"), List.of());
    }

    /** TC4 คาบต่อกันพอดีไม่นับเป็นชน */
    @Test
    void getTimetable_backToBackSlots_noConflict() {
        givenTimetable(
                section("MA211", 3, "010001", slot(TUESDAY, "09:30", "11:00")),
                section("CS111", 3, "030001", slot(TUESDAY, "11:00", "12:30")));

        TimetableResponse response = service.getTimetable(STUDENT, 2568, 1);

        assertThat(response.conflicts()).isEmpty();
        assertThat(response.entries()).allSatisfy(e -> assertThat(e.conflictWith()).isEmpty());
    }

    /** 1 รายการต่อ 1 คู่ต่อ 1 วัน ช่วงชนคือส่วนที่ซ้อนกันจริง */
    @Test
    void getTimetable_pairOverlapsOnTwoDays_returnsOneConflictPerDaySortedByDay() {
        givenTimetable(
                section("CS111", 3, "030001", slot(THURSDAY, "11:00", "12:30"), slot(TUESDAY, "11:00", "12:30")),
                section("ST216", 3, "040001", slot(TUESDAY, "12:00", "13:30"), slot(THURSDAY, "10:00", "11:30")));

        TimetableResponse response = service.getTimetable(STUDENT, 2568, 1);

        assertThat(response.conflicts()).containsExactly(
                new TimeConflictResponse(TUESDAY, LocalTime.of(12, 0), LocalTime.of(12, 30), List.of("CS111", "ST216")),
                new TimeConflictResponse(THURSDAY, LocalTime.of(11, 0), LocalTime.of(11, 30), List.of("CS111", "ST216")));
        assertThat(response.entries().getFirst().conflictWith()).containsExactly("ST216");
    }

    // ---------- addEntry ----------

    @Test
    void addEntry_sectionNotFound_throws404AndSavesNothing() {
        when(sectionRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.addEntry(STUDENT, new AddTimetableEntryRequest(999L)))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Section not found with id: 999");
        verify(timetableRepository, never()).save(any());
        verify(entryRepository, never()).save(any());
    }

    @Test
    void addEntry_firstEntryOfTerm_createsTimetableFromSectionTerm() {
        Section tu109 = tu109();
        givenSection(tu109);
        when(timetableRepository.findByStudentIdAndAcademicYearAndSemester(STUDENT, 2568, 1))
                .thenReturn(Optional.empty());
        OffsetDateTime before = OffsetDateTime.now();

        TimetableResponse response = service.addEntry(STUDENT, new AddTimetableEntryRequest(tu109.getSectionId()));

        ArgumentCaptor<Timetable> timetable = ArgumentCaptor.forClass(Timetable.class);
        verify(timetableRepository).save(timetable.capture());
        assertThat(timetable.getValue().getStudentId()).isEqualTo(STUDENT);
        assertThat(timetable.getValue().getAcademicYear()).isEqualTo(2568);
        assertThat(timetable.getValue().getSemester()).isEqualTo(1);
        // column updated_at เป็น NOT NULL ต้องตั้งก่อนบันทึกตารางใหม่
        assertThat(timetable.getValue().getUpdatedAt()).isAfterOrEqualTo(before);

        ArgumentCaptor<TimetableEntry> entry = ArgumentCaptor.forClass(TimetableEntry.class);
        verify(entryRepository).save(entry.capture());
        assertThat(entry.getValue().getTimetable()).isSameAs(timetable.getValue());
        assertThat(entry.getValue().getSection()).isSameAs(tu109);

        assertThat(codes(response)).containsExactly("TU109");
        assertThat(response.totalCredits()).isEqualTo(3);
        assertThat(response.conflicts()).isEmpty();
        assertThat(response.updatedAt()).isEqualTo(timetable.getValue().getUpdatedAt());
    }

    /** TC5 เวลาชนไม่ใช่ error เพิ่มได้และได้ conflicts กลับไป */
    @Test
    void addEntry_overlappingCourse_savesAndReturnsConflict() {
        Timetable timetable = givenTimetable(tu109());
        Section las101 = las101();
        givenSection(las101);

        TimetableResponse response = service.addEntry(STUDENT, new AddTimetableEntryRequest(las101.getSectionId()));

        verify(timetableRepository).save(timetable);
        verify(entryRepository).save(any(TimetableEntry.class));
        assertThat(timetable.getUpdatedAt()).isAfter(OLD_UPDATED_AT);
        assertThat(codes(response)).containsExactly("TU109", "LAS101");
        assertThat(response.totalCredits()).isEqualTo(6);
        assertThat(response.conflicts()).singleElement()
                .satisfies(c -> assertThat(c.courseCodes()).containsExactly("TU109", "LAS101"));
    }

    /** TC8 วิชาเดิมคนละกลุ่ม */
    @Test
    void addEntry_sameCourseOtherSection_throws409CourseAlreadyInTimetable() {
        givenTimetable(section("CS111", 3, "030001", slot(TUESDAY, "11:00", "12:30")));
        Section otherSection = section("CS111", 3, "030002", slot(MONDAY, "13:30", "15:00"));
        givenSection(otherSection);

        BusinessRuleException ex = catchThrowableOfType(BusinessRuleException.class,
                () -> service.addEntry(STUDENT, new AddTimetableEntryRequest(otherSection.getSectionId())));

        assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(ex.getCode()).isEqualTo("COURSE_ALREADY_IN_TIMETABLE");
        assertThat(ex.getMessage()).isEqualTo("CS111 อยู่ในตารางแล้ว (Sec 030001) 1 วิชาเพิ่มได้ 1 กลุ่มเรียน");
        assertThat(ex.getProperties()).isEqualTo(Map.of("courseCode", "CS111", "existingSectionNo", "030001"));
        verify(entryRepository, never()).save(any());
    }

    /** TC7 21 + 3 = 24 เกิน 22 */
    @Test
    void addEntry_overCreditLimit_throws409CreditLimitExceeded() {
        givenTimetable(twentyOneCredits());
        Section st216 = section("ST216", 3, "040001", slot(FRIDAY, "13:30", "15:00"));
        givenSection(st216);

        BusinessRuleException ex = catchThrowableOfType(BusinessRuleException.class,
                () -> service.addEntry(STUDENT, new AddTimetableEntryRequest(st216.getSectionId())));

        assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(ex.getCode()).isEqualTo("CREDIT_LIMIT_EXCEEDED");
        assertThat(ex.getMessage()).isEqualTo("เพิ่ม ST216 (3 หน่วยกิต) แล้วจะเป็น 24 หน่วยกิต เกินกำหนด 22 หน่วยกิต");
        assertThat(ex.getProperties())
                .isEqualTo(Map.of("currentCredits", 21, "courseCredits", 3, "maxCredits", 22));
        verify(timetableRepository, never()).save(any());
        verify(entryRepository, never()).save(any());
    }

    /** ขอบเขต 21 + 1 = 22 ต้องผ่าน */
    @Test
    void addEntry_reachingExactlyMaxCredits_isAllowed() {
        givenTimetable(twentyOneCredits());
        Section oneCredit = section("PE101", 1, "950001", slot(FRIDAY, "15:30", "17:30"));
        givenSection(oneCredit);

        TimetableResponse response = service.addEntry(STUDENT, new AddTimetableEntryRequest(oneCredit.getSectionId()));

        assertThat(response.totalCredits()).isEqualTo(22);
        assertThat(response.entries()).hasSize(8);
    }

    /** ตรวจวิชาซ้ำก่อนหน่วยกิต คนที่เพิ่มกลุ่มที่ 2 ของวิชาเดิมตอนครบ 21 ต้องเห็นสาเหตุจริง */
    @Test
    void addEntry_duplicateCourseAtCreditLimit_reportsDuplicateFirst() {
        Section[] sections = twentyOneCredits();
        givenTimetable(sections);
        Section sameCourse = section(sections[0].getCourse().getCourseCode(), 3, "000002", slot(FRIDAY, "13:00", "15:00"));
        givenSection(sameCourse);

        BusinessRuleException ex = catchThrowableOfType(BusinessRuleException.class,
                () -> service.addEntry(STUDENT, new AddTimetableEntryRequest(sameCourse.getSectionId())));

        assertThat(ex.getCode()).isEqualTo("COURSE_ALREADY_IN_TIMETABLE");
    }

    /** กลุ่มเดิมซ้ำก็ถูกจับที่กฎวิชาซ้ำ ก่อนถึง unique constraint ใน DB */
    @Test
    void addEntry_sameSectionAgain_throws409CourseAlreadyInTimetable() {
        Section tu109 = tu109();
        givenTimetable(tu109);
        givenSection(tu109);

        BusinessRuleException ex = catchThrowableOfType(BusinessRuleException.class,
                () -> service.addEntry(STUDENT, new AddTimetableEntryRequest(tu109.getSectionId())));

        assertThat(ex.getCode()).isEqualTo("COURSE_ALREADY_IN_TIMETABLE");
        assertThat(ex.getProperties()).containsEntry("existingSectionNo", "780001");
    }
}
