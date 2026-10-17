package th.ac.tu.cs261.group3.backend.course;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import th.ac.tu.cs261.group3.backend.course.dto.CourseResponse;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * ทดสอบการประกอบผลจาก CourseRepository.search กับ SectionRepository.findByCourseCodesAndTerm (mock repository)
 */
@ExtendWith(MockitoExtension.class)
class CourseServiceTest {

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private SectionRepository sectionRepository;

    @InjectMocks
    private CourseService courseService;

    private static Course course(String code, int credits) {
        Course course = new Course();
        course.setCourseCode(code);
        course.setCourseName(code + " NAME");
        course.setCategory(CourseCategory.MAJOR);
        course.setCredits(credits);
        return course;
    }

    private static Section section(Course course, long id, String sectionNo) {
        ScheduleSlot slot = new ScheduleSlot();
        slot.setDayOfWeek(DayOfWeek.MONDAY);
        slot.setStartTime(LocalTime.of(9, 30));
        slot.setEndTime(LocalTime.of(11, 0));

        Section section = new Section();
        section.setSectionId(id);
        section.setCourse(course);
        section.setSectionNo(sectionNo);
        section.setSlots(new ArrayList<>(List.of(slot)));
        return section;
    }

    @Test
    void search_attachesSectionsToTheirCourseInSearchOrder() {
        Course cs111 = course("CS111", 3);
        Course ma211 = course("MA211", 3);
        when(courseRepository.search(2568, 1, null, null)).thenReturn(List.of(cs111, ma211));
        when(sectionRepository.findByCourseCodesAndTerm(List.of("CS111", "MA211"), 2568, 1)).thenReturn(List.of(
                section(cs111, 1, "030001"), section(cs111, 2, "030002"), section(ma211, 3, "010001")));

        List<CourseResponse> result = courseService.search(2568, 1, null, null);

        assertThat(result).extracting(CourseResponse::courseCode).containsExactly("CS111", "MA211");
        assertThat(result.get(0).sections()).extracting(s -> s.sectionNo()).containsExactly("030001", "030002");
        assertThat(result.get(1).sections()).extracting(s -> s.sectionNo()).containsExactly("010001");
        assertThat(result.get(0).sections().getFirst().schedules()).hasSize(1);
    }

    @Test
    void search_courseWithoutSectionsInResult_getsEmptyList() {
        Course cs111 = course("CS111", 3);
        when(courseRepository.search(2568, 1, null, null)).thenReturn(List.of(cs111));
        when(sectionRepository.findByCourseCodesAndTerm(List.of("CS111"), 2568, 1)).thenReturn(List.of());

        assertThat(courseService.search(2568, 1, null, null)).singleElement()
                .satisfies(c -> assertThat(c.sections()).isEmpty());
    }

    @Test
    void search_noCourses_returnsEmptyList() {
        when(courseRepository.search(2569, 1, null, null)).thenReturn(List.of());

        assertThat(courseService.search(2569, 1, null, null)).isEmpty();
    }

    @Test
    void search_stripsQAndPassesCategory() {
        when(courseRepository.search(2568, 1, "CS1", CourseCategory.MAJOR)).thenReturn(List.of());

        courseService.search(2568, 1, "  CS1 ", CourseCategory.MAJOR);

        verify(courseRepository).search(2568, 1, "CS1", CourseCategory.MAJOR);
    }
}
