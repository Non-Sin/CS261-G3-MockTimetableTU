package th.ac.tu.cs261.group3.backend.course.dto;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.json.JsonTest;
import org.springframework.boot.test.json.JacksonTester;
import org.springframework.boot.test.json.JsonContent;
import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.course.CourseCategory;
import th.ac.tu.cs261.group3.backend.course.ScheduleSlot;
import th.ac.tu.cs261.group3.backend.course.Section;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * แปลง entity เป็น DTO และรูปแบบ JSON ตามตัวอย่าง GET /api/courses ใน US1-T05 DTO & API Spec
 */
@JsonTest
class CourseResponseTest {

    @Autowired
    private JacksonTester<CourseResponse> json;

    private static Course cs111() {
        Course course = new Course();
        course.setCourseCode("CS111");
        course.setCourseName("OBJECT-ORIENTED CONCEPTS");
        course.setCategory(CourseCategory.MAJOR);
        course.setCredits(3);
        return course;
    }

    private static ScheduleSlot slot(DayOfWeek day, String start, String end) {
        ScheduleSlot slot = new ScheduleSlot();
        slot.setDayOfWeek(day);
        slot.setStartTime(LocalTime.parse(start));
        slot.setEndTime(LocalTime.parse(end));
        slot.setRoom("LC3-121");
        return slot;
    }

    private static Section section(Long id, List<ScheduleSlot> slots) {
        Section section = new Section();
        section.setSectionId(id);
        section.setCourse(cs111());
        section.setSectionNo("030001");
        section.setInstructor("ผศ.ดร.สมชาย ใจดี");
        section.setAcademicYear(2568);
        section.setSemester(1);
        section.setSlots(slots);
        return section;
    }

    @Test
    void from_mapsCourseAndSectionsAndSortsSlotsByDayThenTime() {
        // DB อาจคืนตามตัวอักษร (THURSDAY ก่อน TUESDAY) ต้องเรียงตามวันในสัปดาห์
        Section section = section(101L, List.of(
                slot(DayOfWeek.THURSDAY, "11:00", "12:30"),
                slot(DayOfWeek.TUESDAY, "13:30", "15:00"),
                slot(DayOfWeek.TUESDAY, "11:00", "12:30")));

        CourseResponse response = CourseResponse.from(cs111(), List.of(section));

        assertThat(response.courseCode()).isEqualTo("CS111");
        assertThat(response.courseName()).isEqualTo("OBJECT-ORIENTED CONCEPTS");
        assertThat(response.category()).isEqualTo(CourseCategory.MAJOR);
        assertThat(response.credits()).isEqualTo(3);
        assertThat(response.sections()).singleElement().satisfies(s -> {
            assertThat(s.sectionId()).isEqualTo(101L);
            assertThat(s.sectionNo()).isEqualTo("030001");
            assertThat(s.instructor()).isEqualTo("ผศ.ดร.สมชาย ใจดี");
            assertThat(s.schedules()).extracting(x -> x.dayOfWeek() + " " + x.startTime())
                    .containsExactly("TUESDAY 11:00", "TUESDAY 13:30", "THURSDAY 11:00");
        });
    }

    @Test
    void from_noSections_returnsEmptyList() {
        assertThat(CourseResponse.from(cs111(), List.of()).sections()).isEmpty();
    }

    @Test
    void json_matchesSpecExample() throws Exception {
        Section section = section(101L, List.of(
                slot(DayOfWeek.TUESDAY, "11:00", "12:30"),
                slot(DayOfWeek.THURSDAY, "11:00", "12:30")));

        JsonContent<CourseResponse> content = json.write(CourseResponse.from(cs111(), List.of(section)));

        assertThat(content).extractingJsonPathStringValue("$.category").isEqualTo("MAJOR");
        assertThat(content).extractingJsonPathNumberValue("$.credits").isEqualTo(3);
        assertThat(content).extractingJsonPathNumberValue("$.sections[0].sectionId").isEqualTo(101);
        assertThat(content).extractingJsonPathStringValue("$.sections[0].schedules[0].dayOfWeek").isEqualTo("TUESDAY");
        assertThat(content).extractingJsonPathStringValue("$.sections[0].schedules[0].startTime").isEqualTo("11:00");
        assertThat(content).extractingJsonPathStringValue("$.sections[0].schedules[0].endTime").isEqualTo("12:30");
        assertThat(content).extractingJsonPathStringValue("$.sections[0].schedules[0].room").isEqualTo("LC3-121");
    }
}
