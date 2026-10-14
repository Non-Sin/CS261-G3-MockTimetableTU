package th.ac.tu.cs261.group3.backend.timetable.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.json.JsonTest;
import org.springframework.boot.test.json.JacksonTester;
import org.springframework.boot.test.json.JsonContent;
import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.course.CourseCategory;
import th.ac.tu.cs261.group3.backend.course.ScheduleSlot;
import th.ac.tu.cs261.group3.backend.course.Section;
import th.ac.tu.cs261.group3.backend.timetable.TimetableEntry;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * แปลง entity เป็น DTO และรูปแบบ JSON ตามตัวอย่าง GET /api/timetable (frame 1:1057) ใน US1-T05 DTO & API Spec
 */
@JsonTest
class TimetableResponseTest {

    @Autowired
    private JacksonTester<TimetableResponse> json;

    private static TimetableEntry entry(long entryId, String code, String name, int credits,
                                        long sectionId, String sectionNo, String room) {
        Course course = new Course();
        course.setCourseCode(code);
        course.setCourseName(name);
        course.setCategory(CourseCategory.GENERAL_EDUCATION);
        course.setCredits(credits);

        ScheduleSlot slot = new ScheduleSlot();
        slot.setDayOfWeek(DayOfWeek.WEDNESDAY);
        slot.setStartTime(LocalTime.of(9, 30));
        slot.setEndTime(LocalTime.of(12, 30));
        slot.setRoom(room);

        Section section = new Section();
        section.setSectionId(sectionId);
        section.setCourse(course);
        section.setSectionNo(sectionNo);
        section.setSlots(new ArrayList<>(List.of(slot)));
        slot.setSection(section);

        TimetableEntry entry = new TimetableEntry();
        entry.setEntryId(entryId);
        entry.setSection(section);
        return entry;
    }

    private static TimetableResponse specExample() {
        TimetableEntryResponse tu109 = TimetableEntryResponse.from(
                entry(7, "TU109", "INNOVATION AND ENTREPRENEURIAL MINDSET", 3, 305, "780001", "SC3-413"),
                List.of("LAS101"));
        TimetableEntryResponse las101 = TimetableEntryResponse.from(
                entry(8, "LAS101", "CRITICAL THINKING, READING, AND WRITING", 3, 306, "780004", "SC-1026"),
                List.of("TU109"));
        TimeConflictResponse conflict = new TimeConflictResponse(
                DayOfWeek.WEDNESDAY, LocalTime.of(9, 30), LocalTime.of(12, 30), List.of("TU109", "LAS101"));

        return TimetableResponse.of(2568, 1, List.of(tu109, las101), 22, List.of(conflict),
                OffsetDateTime.parse("2026-10-13T11:20:05+07:00"));
    }

    @Test
    void entryFrom_mapsSectionCourseAndConflicts() {
        TimetableEntryResponse response = TimetableEntryResponse.from(
                entry(7, "TU109", "INNOVATION AND ENTREPRENEURIAL MINDSET", 3, 305, "780001", "SC3-413"),
                List.of("LAS101"));

        assertThat(response.entryId()).isEqualTo(7L);
        assertThat(response.courseCode()).isEqualTo("TU109");
        assertThat(response.category()).isEqualTo(CourseCategory.GENERAL_EDUCATION);
        assertThat(response.credits()).isEqualTo(3);
        assertThat(response.sectionId()).isEqualTo(305L);
        assertThat(response.sectionNo()).isEqualTo("780001");
        assertThat(response.schedules()).singleElement()
                .satisfies(x -> assertThat(x.room()).isEqualTo("SC3-413"));
        assertThat(response.conflictWith()).containsExactly("LAS101");
    }

    @Test
    void of_sumsCreditsOfEntries() {
        TimetableResponse response = specExample();

        assertThat(response.totalCredits()).isEqualTo(6);
        assertThat(response.maxCredits()).isEqualTo(22);
        assertThat(response.entries()).hasSize(2);
    }

    @Test
    void of_emptyTimetable_hasZeroCreditsAndNullUpdatedAt() {
        TimetableResponse response = TimetableResponse.of(2568, 1, List.of(), 22, List.of(), null);

        assertThat(response.totalCredits()).isZero();
        assertThat(response.entries()).isEmpty();
        assertThat(response.conflicts()).isEmpty();
        assertThat(response.updatedAt()).isNull();
    }

    @Test
    void json_matchesSpecExample() throws Exception {
        JsonContent<TimetableResponse> content = json.write(specExample());

        assertThat(content).extractingJsonPathNumberValue("$.academicYear").isEqualTo(2568);
        assertThat(content).extractingJsonPathNumberValue("$.totalCredits").isEqualTo(6);
        assertThat(content).extractingJsonPathNumberValue("$.maxCredits").isEqualTo(22);
        // ISO 8601 พร้อม offset เดิม ไม่แปลงเป็น UTC หรือตัวเลข timestamp
        assertThat(content).extractingJsonPathStringValue("$.updatedAt").isEqualTo("2026-10-13T11:20:05+07:00");
        assertThat(content).extractingJsonPathStringValue("$.entries[0].schedules[0].startTime").isEqualTo("09:30");
        assertThat(content).extractingJsonPathArrayValue("$.entries[0].conflictWith").containsExactly("LAS101");
        assertThat(content).extractingJsonPathStringValue("$.conflicts[0].dayOfWeek").isEqualTo("WEDNESDAY");
        assertThat(content).extractingJsonPathStringValue("$.conflicts[0].overlapStart").isEqualTo("09:30");
        assertThat(content).extractingJsonPathStringValue("$.conflicts[0].overlapEnd").isEqualTo("12:30");
        assertThat(content).extractingJsonPathArrayValue("$.conflicts[0].courseCodes").containsExactly("TU109", "LAS101");
    }

    @Test
    void json_emptyTimetable_writesNullUpdatedAt() throws Exception {
        JsonContent<TimetableResponse> content = json.write(TimetableResponse.of(2568, 1, List.of(), 22, List.of(), null));

        assertThat(content).hasJsonPathValue("$.entries");
        assertThat(content).extractingJsonPathArrayValue("$.entries").isEmpty();
        assertThat(content).hasEmptyJsonPathValue("$.updatedAt");
        assertThat(content.getJson()).contains("\"updatedAt\":null");
    }

    @Test
    void addEntryRequest_missingSectionId_isInvalid() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            Validator validator = factory.getValidator();

            assertThat(validator.validate(new AddTimetableEntryRequest(null))).hasSize(1);
            assertThat(validator.validate(new AddTimetableEntryRequest(305L))).isEmpty();
        }
    }
}
