package th.ac.tu.cs261.group3.backend.studyplan;

import jakarta.persistence.PersistenceUnitUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.course.CourseCategory;
import th.ac.tu.cs261.group3.backend.support.DaoTest;
import th.ac.tu.cs261.group3.backend.support.StudyPlanFixture;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static th.ac.tu.cs261.group3.backend.support.StudyPlanFixture.*;

/**
 * US8-T12 UT-DAO-US8-01 – 08: StudyPlanRepository
 */
@DaoTest
class StudyPlanRepositoryTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private StudyPlanRepository repository;

    private StudyPlanFixture fixture;

    @BeforeEach
    void setUp() {
        fixture = StudyPlanFixture.persist(em);
    }

    /** UT-DAO-US8-01 */
    @Test
    void findByDepartmentAndStudyYearAndSemester_twoCurricula_returnsEachPlanOnceWithSortedCourses() {
        List<StudyPlan> plans = repository.findByDepartmentAndStudyYearAndSemester(CS, 2, 1);

        assertCoursesLoaded(plans);
        assertEquals(List.of(fixture.pBasic, fixture.pSecond), planIds(plans),
                "เรียงตาม curriculumName แม้ P-SECOND จะ insert ก่อน และแผนละ 1 object");

        StudyPlan basic = plans.get(0);
        assertEquals(CS, basic.getDepartment());
        assertEquals(CUR_A, basic.getCurriculumName());
        assertEquals(2, basic.getStudyYear());
        assertEquals(1, basic.getSemester());
        assertNull(basic.getPlanType());
        assertEquals(List.of("T8M01", "T8M02", "T8M04", "T8G02"), courseCodes(basic));
        assertEquals(List.of(1, 2, 3, 4), basic.getCourses().stream().map(StudyPlanCourse::getSortOrder).toList());

        assertEquals(List.of("T8M02"), courseCodes(plans.get(1)));
    }

    /** UT-DAO-US8-02 */
    @Test
    void findByDepartmentAndStudyYearAndSemester_otherSemester_returnsOnlyPlansOfThatSemester() {
        List<StudyPlan> plans = repository.findByDepartmentAndStudyYearAndSemester(CS, 2, 2);

        assertEquals(List.of(fixture.pSem2), planIds(plans));
        assertEquals(2, plans.get(0).getSemester());
        assertEquals(List.of("T8X01"), courseCodes(plans.get(0)));
    }

    /** UT-DAO-US8-03 */
    @Test
    void findByDepartmentAndStudyYearAndSemester_thirdYear_returnsBothPlanTypes() {
        List<StudyPlan> plans = repository.findByDepartmentAndStudyYearAndSemester(CS, 3, 1);

        // หลักสูตรเดียวกัน จึงเรียงต่อด้วย planId การเรียงตาม planType เป็นหน้าที่ของ StudyPlanService
        assertEquals(List.of(fixture.pCoop, fixture.pConflict), planIds(plans));
        assertEquals(PlanType.CO_OP, plans.get(0).getPlanType());
        assertEquals(List.of("T8M05", "T8C01"), courseCodes(plans.get(0)));
        assertEquals(PlanType.SPECIAL_PROJECT, plans.get(1).getPlanType());
        assertEquals(List.of("T8M03", "T8G01", "T8X01"), courseCodes(plans.get(1)));
    }

    /** UT-DAO-US8-04 */
    @Test
    void findByDepartmentAndStudyYearAndSemester_noPlanForTerm_returnsEmptyList() {
        assertTrue(repository.findByDepartmentAndStudyYearAndSemester(CS, 4, 1).isEmpty());
        assertTrue(repository.findByDepartmentAndStudyYearAndSemester(CS, 4, 2).isEmpty());
        assertTrue(repository.findByDepartmentAndStudyYearAndSemester(CS, 1, 1).isEmpty());
    }

    /** UT-DAO-US8-05 */
    @Test
    void findByDepartmentAndStudyYearAndSemester_departmentSpelledDifferently_returnsEmptyList() {
        assertTrue(repository.findByDepartmentAndStudyYearAndSemester(CS_TYPO, 2, 1).isEmpty());
    }

    /** UT-DAO-US8-06 */
    @Test
    void findPlan_planWithoutCourses_isNotReturned() {
        assertTrue(repository.findByDepartmentAndStudyYearAndSemester(CS, 1, 2).isEmpty());
        assertTrue(repository.findWithCoursesById(fixture.pEmpty).isEmpty());
        assertTrue(repository.existsById(fixture.pEmpty), "แถวของ P-EMPTY ยังอยู่ใน study_plan");
    }

    /** UT-DAO-US8-07 */
    @Test
    void findWithCoursesById_existingPlan_returnsCoursesInSortOrder() {
        StudyPlan plan = repository.findWithCoursesById(fixture.pBasic).orElseThrow();

        assertCoursesLoaded(List.of(plan));
        assertEquals(fixture.pBasic, plan.getPlanId());
        assertEquals(List.of("T8M01", "T8M02", "T8M04", "T8G02"), courseCodes(plan));

        List<Course> courses = plan.getCourses().stream().map(StudyPlanCourse::getCourse).toList();
        assertEquals(List.of(CourseCategory.MAJOR, CourseCategory.MAJOR, CourseCategory.MAJOR, CourseCategory.GENERAL_EDUCATION),
                courses.stream().map(Course::getCategory).toList());
        assertEquals(12, courses.stream().mapToInt(Course::getCredits).sum());
    }

    /** UT-DAO-US8-08 */
    @Test
    void findWithCoursesById_unknownId_returnsEmpty() {
        assertTrue(repository.findWithCoursesById(-1L).isEmpty());
    }

    /** ตรวจก่อนแตะ field เพราะ getter ของ lazy proxy จะทำให้โหลดเอง */
    private void assertCoursesLoaded(List<StudyPlan> plans) {
        PersistenceUnitUtil util = em.getEntityManager().getEntityManagerFactory().getPersistenceUnitUtil();
        for (StudyPlan plan : plans) {
            assertTrue(util.isLoaded(plan, "courses"), "courses ต้องโหลดมาพร้อมแผน");
            for (StudyPlanCourse pc : plan.getCourses()) {
                assertTrue(util.isLoaded(pc, "course"), "course ต้องโหลดมาพร้อมวิชาในแผน");
            }
        }
    }

    private static List<Long> planIds(List<StudyPlan> plans) {
        return plans.stream().map(StudyPlan::getPlanId).toList();
    }

    private static List<String> courseCodes(StudyPlan plan) {
        return plan.getCourses().stream().map(pc -> pc.getCourse().getCourseCode()).toList();
    }
}
