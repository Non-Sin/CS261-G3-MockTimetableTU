package th.ac.tu.cs261.group3.backend.course;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * ทดสอบกับ SQL Server จริงและ seed 2568/1 (ต้องเปิด docker compose ก่อน)
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class CourseRepositoryTest {

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private SectionRepository sectionRepository;

    private List<String> codes(List<Course> courses) {
        return courses.stream().map(Course::getCourseCode).toList();
    }

    @Test
    void search_noFilter_returnsCoursesOfTermSortedByCode() {
        List<String> codes = codes(courseRepository.search(2568, 1, null, null));

        assertEquals(List.of("CS111", "CS213", "EL171", "JP171", "LAS101", "MA211", "ST216", "TU109"), codes);
    }

    @Test
    void search_otherTerm_returnsOnlyThatTerm() {
        assertEquals(List.of("CS111", "CS223"), codes(courseRepository.search(2568, 2, null, null)));
        assertEquals(List.of("MA211"), codes(courseRepository.search(2567, 1, null, null)));
        assertTrue(courseRepository.search(2569, 1, null, null).isEmpty());
    }

    @Test
    void search_emptyQ_sameAsNull() {
        assertEquals(8, courseRepository.search(2568, 1, "", null).size());
    }

    @Test
    void search_qMatchesCodePrefixIgnoringCase() {
        assertEquals(List.of("CS213"), codes(courseRepository.search(2568, 1, "cs2", null)));
        // รหัสต้องขึ้นต้นด้วย q ไม่ใช่แค่มี q อยู่ข้างใน
        assertTrue(courseRepository.search(2568, 1, "111", null).isEmpty());
    }

    @Test
    void search_qMatchesNameWordPrefixIgnoringCase() {
        // คำแรกของชื่อ
        assertEquals(List.of("CS111"), codes(courseRepository.search(2568, 1, "object", null)));
        // คำหลังช่องว่าง
        assertEquals(List.of("LAS101"), codes(courseRepository.search(2568, 1, "thinking", null)));
        // คำหลัง "-" (OBJECT-ORIENTED)
        assertEquals(List.of("CS111"), codes(courseRepository.search(2568, 1, "oriented", null)));
    }

    @Test
    void search_qInMiddleOfWord_doesNotMatch() {
        // STATISTICS ของ ST216 มี "CS" อยู่ท้ายคำ จึงได้แค่วิชาที่รหัสขึ้นต้นด้วย CS
        assertEquals(List.of("CS111", "CS213"), codes(courseRepository.search(2568, 1, "CS", null)));
        assertTrue(courseRepository.search(2568, 1, "hinking", null).isEmpty());
    }

    @Test
    void search_category() {
        assertEquals(List.of("EL171", "LAS101", "TU109"),
                codes(courseRepository.search(2568, 1, null, CourseCategory.GENERAL_EDUCATION)));
        assertEquals(List.of("JP171"),
                codes(courseRepository.search(2568, 1, null, CourseCategory.FREE_ELECTIVE)));
    }

    @Test
    void search_qAndCategoryCombined() {
        assertEquals(List.of("CS111"), codes(courseRepository.search(2568, 1, "CS1", CourseCategory.MAJOR)));
        assertTrue(courseRepository.search(2568, 1, "CS1", CourseCategory.GENERAL_EDUCATION).isEmpty());
    }

    @Test
    void sectionFindById_returnsSectionOrEmpty() {
        Section any = sectionRepository.findAll().getFirst();

        assertEquals(any.getSectionNo(), sectionRepository.findById(any.getSectionId()).orElseThrow().getSectionNo());
        assertTrue(sectionRepository.findById(-1L).isEmpty());
    }
}
