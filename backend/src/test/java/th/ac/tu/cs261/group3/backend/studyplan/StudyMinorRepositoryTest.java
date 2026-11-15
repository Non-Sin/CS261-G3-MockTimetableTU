package th.ac.tu.cs261.group3.backend.studyplan;

import jakarta.persistence.PersistenceUnitUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.support.DaoTest;
import th.ac.tu.cs261.group3.backend.support.StudyPlanFixture;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static th.ac.tu.cs261.group3.backend.support.StudyPlanFixture.*;

/**
 * US8-T12 UT-DAO-US8-09 – 15: StudyMinorRepository และ StudyMinor.coursesOf
 */
@DaoTest
class StudyMinorRepositoryTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private StudyMinorRepository repository;

    private StudyPlanFixture fixture;

    @BeforeEach
    void setUp() {
        fixture = StudyPlanFixture.persist(em);
    }

    /** UT-DAO-US8-09 */
    @Test
    void findByDepartmentAndTerm_termWithMinorCourses_returnsMinorsWithAllCourses() {
        List<StudyMinor> minors = repository.findByDepartmentAndTerm(CS, 3, 1);

        assertCoursesLoaded(minors);
        // เรียงตาม sortOrder (1, 3) แม้ MN-OTHER จะ insert ก่อน, ไม่มี MN-2, วิชาโทละ 1 object
        assertEquals(List.of(fixture.mn1, fixture.mnOther), minorIds(minors));

        StudyMinor mn1 = minors.get(0);
        assertEquals("วิทยาการข้อมูล", mn1.getMinorName());
        // ได้วิชาครบทุกภาครวม T8F01 (4/1)
        assertEquals(List.of("T8N01", "T8N02", "T8M05", "T8F01"), courseCodes(mn1));
        assertEquals(List.of("3/1", "3/1", "3/1", "4/1"),
                mn1.getCourses().stream().map(mc -> mc.getStudyYear() + "/" + mc.getSemester()).toList());

        assertEquals(CUR_B, minors.get(1).getCurriculumName(), "query ไม่กรอง curriculumName");
    }

    /** UT-DAO-US8-10 */
    @Test
    void findByDepartmentAndTerm_fourthYear_returnsOnlyMinorsWithCoursesInThatTerm() {
        assertEquals(List.of(fixture.mn1), minorIds(repository.findByDepartmentAndTerm(CS, 4, 1)));
        assertEquals(List.of(fixture.mn2), minorIds(repository.findByDepartmentAndTerm(CS, 4, 2)));
    }

    /** UT-DAO-US8-11 */
    @Test
    void findByDepartmentAndTerm_noMinorCourseInTerm_returnsEmptyList() {
        assertTrue(repository.findByDepartmentAndTerm(CS, 3, 2).isEmpty());
        assertTrue(repository.findByDepartmentAndTerm(CS, 1, 1).isEmpty());
        assertTrue(repository.findByDepartmentAndTerm(CS, 2, 1).isEmpty());
    }

    /** UT-DAO-US8-12 */
    @Test
    void findByDepartmentAndTerm_departmentSpelledDifferently_returnsEmptyList() {
        assertTrue(repository.findByDepartmentAndTerm(CS_TYPO, 3, 1).isEmpty());
    }

    /** UT-DAO-US8-13 */
    @Test
    void findWithCoursesById_existingMinor_returnsAllCoursesSorted() {
        StudyMinor mn1 = repository.findWithCoursesById(fixture.mn1).orElseThrow();

        assertCoursesLoaded(List.of(mn1));
        assertEquals(CS, mn1.getDepartment());
        assertEquals(CUR_A, mn1.getCurriculumName());
        assertEquals("วิทยาการข้อมูล", mn1.getMinorName());
        assertEquals(1, mn1.getSortOrder());
        assertEquals(List.of("T8N01", "T8N02", "T8M05", "T8F01"), courseCodes(mn1));
        assertEquals(4, mn1.getCourses().get(1).getCourse().getCredits());
    }

    /** UT-DAO-US8-14 */
    @Test
    void findWithCoursesById_unknownMinorId_returnsEmpty() {
        assertTrue(repository.findWithCoursesById(-1L).isEmpty());
    }

    /** UT-DAO-US8-15 */
    @Test
    void coursesOf_givenTerm_returnsOnlyCoursesOfThatTermInSortOrder() {
        StudyMinor mn1 = repository.findWithCoursesById(fixture.mn1).orElseThrow();
        em.clear(); // ให้ MN-1 เป็น detached ถ้า coursesOf ต้อง query เพิ่มจะได้ LazyInitializationException

        List<Course> term31 = mn1.coursesOf(PlanType.SPECIAL_PROJECT, 3, 1);
        assertEquals(List.of("T8N01", "T8N02", "T8M05"), codes(term31));
        assertEquals(10, term31.stream().mapToInt(Course::getCredits).sum());

        assertEquals(List.of("T8F01"), codes(mn1.coursesOf(PlanType.SPECIAL_PROJECT, 4, 1)));
        assertTrue(mn1.coursesOf(PlanType.SPECIAL_PROJECT, 3, 2).isEmpty());
    }

    /**
     * UT-DAO-US8-31 (เพิ่มใน T09 หลังเพิ่ม plan_type ใน study_minor_course)
     * วิชาเดียวกันอยู่ต่างภาคได้ตามแผน เช่น CS440 หัวข้อพิเศษเรียนปี 4/1 สหกิจเรียนปี 3/1
     */
    @Test
    void coursesOf_coopPlan_returnsOnlyCoursesOfThatPlan() {
        insertMinorCourse(em, fixture.mn1, "T8F01", "CO_OP", 3, 1, 1);
        em.flush();
        em.clear();

        StudyMinor mn1 = repository.findWithCoursesById(fixture.mn1).orElseThrow();
        em.clear();

        assertEquals(5, mn1.getCourses().size(), "T8F01 มี 2 แถว (แผนละ 1 แถว)");
        assertEquals(List.of("T8F01"), codes(mn1.coursesOf(PlanType.CO_OP, 3, 1)));
        assertTrue(mn1.coursesOf(PlanType.CO_OP, 4, 1).isEmpty());
        assertEquals(List.of("T8N01", "T8N02", "T8M05"), codes(mn1.coursesOf(PlanType.SPECIAL_PROJECT, 3, 1)),
                "แถวของแผนสหกิจไม่ปนกับแผนหัวข้อพิเศษ");
        assertEquals(List.of("T8F01"), codes(mn1.coursesOf(PlanType.SPECIAL_PROJECT, 4, 1)));
    }

    /** UT-DAO-US8-32 (เพิ่มใน T09) วิชาโทที่มีวิชาในภาคนั้นเฉพาะแผนสหกิจก็ต้องถูกคืน */
    @Test
    void findByDepartmentAndTerm_courseOnlyInCoopPlan_returnsMinor() {
        assertTrue(repository.findByDepartmentAndTerm(CS, 3, 2).isEmpty());

        insertMinorCourse(em, fixture.mn2, "T8N02", "CO_OP", 3, 2, 1);
        em.flush();
        em.clear();

        List<StudyMinor> minors = repository.findByDepartmentAndTerm(CS, 3, 2);
        assertEquals(List.of(fixture.mn2), minorIds(minors));
        assertEquals(List.of("T8N02"), codes(minors.get(0).coursesOf(PlanType.CO_OP, 3, 2)));
        assertTrue(minors.get(0).coursesOf(PlanType.SPECIAL_PROJECT, 3, 2).isEmpty());
    }

    private static List<String> codes(List<Course> courses) {
        return courses.stream().map(Course::getCourseCode).toList();
    }

    /** ตรวจก่อนแตะ field เพราะ getter ของ lazy proxy จะทำให้โหลดเอง */
    private void assertCoursesLoaded(List<StudyMinor> minors) {
        PersistenceUnitUtil util = em.getEntityManager().getEntityManagerFactory().getPersistenceUnitUtil();
        for (StudyMinor minor : minors) {
            assertTrue(util.isLoaded(minor, "courses"), "courses ต้องโหลดมาพร้อมวิชาโท");
            for (StudyMinorCourse mc : minor.getCourses()) {
                assertTrue(util.isLoaded(mc, "course"), "course ต้องโหลดมาพร้อมวิชาในวิชาโท");
            }
        }
    }

    private static List<Long> minorIds(List<StudyMinor> minors) {
        return minors.stream().map(StudyMinor::getMinorId).toList();
    }

    private static List<String> courseCodes(StudyMinor minor) {
        return minor.getCourses().stream().map(mc -> mc.getCourse().getCourseCode()).toList();
    }
}
