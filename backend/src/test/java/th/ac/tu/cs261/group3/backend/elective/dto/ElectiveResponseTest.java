package th.ac.tu.cs261.group3.backend.elective.dto;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.json.JsonTest;
import org.springframework.boot.test.json.JacksonTester;
import org.springframework.boot.test.json.JsonContent;
import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.course.CourseCategory;
import th.ac.tu.cs261.group3.backend.course.ScheduleSlot;
import th.ac.tu.cs261.group3.backend.course.Section;
import th.ac.tu.cs261.group3.backend.elective.ElectiveInfo;
import th.ac.tu.cs261.group3.backend.elective.ElectiveTag;
import th.ac.tu.cs261.group3.backend.elective.InterestGroup;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * แปลง entity เป็น DTO ของ US6 และรูปแบบ JSON ตามตัวอย่าง PY250 ใน US6-T05 DTO & API Spec
 */
@JsonTest
class ElectiveResponseTest {

    @Autowired
    private JacksonTester<ElectiveDetailResponse> json;

    private static ElectiveInfo py250(ElectiveTag... tags) {
        Course course = new Course();
        course.setCourseCode("PY250");
        course.setCourseName("PSYCHOLOGY OF PERSONALITY AND ADJUSTMENT");
        course.setCategory(CourseCategory.FREE_ELECTIVE);
        course.setCredits(3);

        ElectiveInfo info = new ElectiveInfo();
        info.setCourseCode("PY250");
        info.setCourse(course);
        info.setCourseNameTh("จิตวิทยาบุคลิกภาพและการปรับตน");
        info.setInterestGroup(InterestGroup.PSYCHOLOGY);
        info.setRequiresQuota(false);
        info.setTags(new LinkedHashSet<>(List.of(tags)));
        info.setDescription(new ArrayList<>(List.of("ไม่มีงานกลุ่ม")));
        return info;
    }

    private static ScheduleSlot slot(DayOfWeek day, String start, String end, String room) {
        ScheduleSlot slot = new ScheduleSlot();
        slot.setDayOfWeek(day);
        slot.setStartTime(LocalTime.parse(start));
        slot.setEndTime(LocalTime.parse(end));
        slot.setRoom(room);
        return slot;
    }

    private static Section section(long id, String sectionNo, int semester, String instructor, ScheduleSlot... slots) {
        Section section = new Section();
        section.setSectionId(id);
        section.setSectionNo(sectionNo);
        section.setSemester(semester);
        section.setAcademicYear(2568);
        section.setInstructor(instructor);
        section.setSlots(new ArrayList<>(List.of(slots)));
        return section;
    }

    @Test
    void summaryFrom_mapsCourseAndInfoAndSortsTagsByEnumOrder() {
        // Set ใส่ไว้กลับลำดับ enum
        ElectiveInfo info = py250(ElectiveTag.EASY_GRADE, ElectiveTag.NO_GROUP_WORK, ElectiveTag.NO_ATTENDANCE);

        ElectiveSummaryResponse summary = ElectiveSummaryResponse.from(info, List.of(1, 2));

        assertThat(summary).isEqualTo(new ElectiveSummaryResponse("PY250", "PSYCHOLOGY OF PERSONALITY AND ADJUSTMENT",
                "จิตวิทยาบุคลิกภาพและการปรับตน", 3, InterestGroup.PSYCHOLOGY, false, List.of(1, 2),
                List.of(ElectiveTag.NO_ATTENDANCE, ElectiveTag.NO_GROUP_WORK, ElectiveTag.EASY_GRADE)));
    }

    @Test
    void summaryFrom_noTags_returnsEmptyList() {
        assertThat(ElectiveSummaryResponse.from(py250(), List.of(1)).tags()).isEmpty();
    }

    @Test
    void sectionFrom_selectableOnlyInCurrentSemesterAndSlotsSortedByDayThenTime() {
        Section s = section(612, "820001", 1, "อ.ทดสอบ",
                slot(DayOfWeek.THURSDAY, "09:30", "11:00", "LC1-201"),
                slot(DayOfWeek.TUESDAY, "09:30", "11:00", "LC1-201"));

        ElectiveSectionResponse current = ElectiveSectionResponse.from(s, 1, true, List.of("TU109"));
        ElectiveSectionResponse other = ElectiveSectionResponse.from(s, 2, false, List.of());

        assertThat(current.selectable()).isTrue();
        assertThat(current.inTimetable()).isTrue();
        assertThat(current.conflictWith()).containsExactly("TU109");
        assertThat(current.schedules()).extracting(sl -> sl.dayOfWeek())
                .containsExactly(DayOfWeek.TUESDAY, DayOfWeek.THURSDAY);
        assertThat(other.selectable()).isFalse();
    }

    @Test
    void sectionFrom_eLearningSection_hasEmptySchedules() {
        ElectiveSectionResponse s = ElectiveSectionResponse.from(section(1, "010001", 1, null), 1, false, List.of());

        assertThat(s.schedules()).isEmpty();
        assertThat(s.instructor()).isNull();
    }

    @Test
    void detailOf_copiesSummaryFieldsFlatAndSerializesLikeSpec() throws Exception {
        ElectiveInfo info = py250(ElectiveTag.NO_ATTENDANCE, ElectiveTag.NO_GROUP_WORK);
        ElectiveSummaryResponse summary = ElectiveSummaryResponse.from(info, List.of(1, 2));
        List<ElectiveSectionResponse> sections = List.of(
                ElectiveSectionResponse.from(section(612, "820001", 1, "อ.วรรณปรัชญ์ พิทักษ์ไพบูลย์กิจ",
                        slot(DayOfWeek.MONDAY, "13:30", "16:30", "LC1-201")), 1, false, List.of()),
                ElectiveSectionResponse.from(section(640, "230001", 2, null,
                        slot(DayOfWeek.TUESDAY, "09:30", "12:30", null)), 1, false, List.of()));

        ElectiveDetailResponse detail = ElectiveDetailResponse.of(summary, info.getDescription(), sections);
        JsonContent<ElectiveDetailResponse> content = json.write(detail);

        assertThat(content).extractingJsonPathStringValue("$.courseCode").isEqualTo("PY250");
        assertThat(content).extractingJsonPathStringValue("$.courseNameTh").isEqualTo("จิตวิทยาบุคลิกภาพและการปรับตน");
        assertThat(content).extractingJsonPathStringValue("$.group").isEqualTo("PSYCHOLOGY");
        assertThat(content).extractingJsonPathBooleanValue("$.requiresQuota").isFalse();
        assertThat(content).extractingJsonPathArrayValue("$.offeredSemesters").containsExactly(1, 2);
        assertThat(content).extractingJsonPathArrayValue("$.tags").containsExactly("NO_ATTENDANCE", "NO_GROUP_WORK");
        assertThat(content).extractingJsonPathArrayValue("$.description").containsExactly("ไม่มีงานกลุ่ม");
        assertThat(content).extractingJsonPathNumberValue("$.sections[0].sectionId").isEqualTo(612);
        assertThat(content).extractingJsonPathStringValue("$.sections[0].schedules[0].startTime").isEqualTo("13:30");
        assertThat(content).extractingJsonPathStringValue("$.sections[0].schedules[0].endTime").isEqualTo("16:30");
        assertThat(content).extractingJsonPathBooleanValue("$.sections[0].selectable").isTrue();
        assertThat(content).extractingJsonPathBooleanValue("$.sections[1].selectable").isFalse();
        assertThat(content).extractingJsonPathArrayValue("$.sections[1].conflictWith").isEmpty();
        // null ส่งเป็น null (UI แสดง "ไม่ระบุ")
        assertThat(content.getJson()).contains("\"instructor\":null").contains("\"room\":null");
    }
}
