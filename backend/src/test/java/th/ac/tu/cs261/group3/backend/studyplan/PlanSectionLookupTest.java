package th.ac.tu.cs261.group3.backend.studyplan;

import jakarta.persistence.PersistenceUnitUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.course.ScheduleSlot;
import th.ac.tu.cs261.group3.backend.course.Section;
import th.ac.tu.cs261.group3.backend.course.SectionRepository;
import th.ac.tu.cs261.group3.backend.support.DaoTest;
import th.ac.tu.cs261.group3.backend.support.StudyPlanFixture;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * US8-T12 UT-DAO-US8-16 – 18: SectionRepository.findByCourseCodesAndTerm (US1) กับรหัสวิชาของแผนและวิชาโท
 * แยกจาก SectionRepositoryTest ของ US1 ตาม T12
 */
@DaoTest
class PlanSectionLookupTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private SectionRepository sectionRepository;

    @Autowired
    private StudyPlanRepository planRepository;

    @Autowired
    private StudyMinorRepository minorRepository;

    private StudyPlanFixture fixture;

    @BeforeEach
    void setUp() {
        fixture = StudyPlanFixture.persist(em);
    }

    /** UT-DAO-US8-16 */
    @Test
    void findByCourseCodesAndTerm_planCourseCodes_returnsSectionsWithCourseAndSlots() {
        List<String> codes = planCodes(fixture.pBasic);
        assertEquals(List.of("T8M01", "T8M02", "T8M04", "T8G02"), codes);

        List<Section> sections = sectionRepository.findByCourseCodesAndTerm(codes, 2568, 1);

        assertSlotsLoaded(sections);
        // T8G02 780001 มาก่อน 780002 แม้ insert ทีหลัง และ section ละ 1 object
        assertEquals(List.of("T8G02 780001", "T8G02 780002", "T8G02 780003",
                "T8M01 010001", "T8M02 010001", "T8M04 010001"), labels(sections));

        assertSlot(sections.get(3), DayOfWeek.MONDAY, "09:30", "12:30");  // T8M01
        assertSlot(sections.get(5), DayOfWeek.MONDAY, "12:30", "14:00");  // T8M04
        assertSlot(sections.get(2), DayOfWeek.FRIDAY, "13:30", "16:30");  // T8G02 780003
    }

    /** UT-DAO-US8-17 */
    @Test
    void findByCourseCodesAndTerm_planAndMinorCodes_skipsUnofferedCourseAndReturnsEachSectionOnce() {
        List<String> codes = conflictCoopAndMinorCodes();
        assertEquals(8, codes.size());

        List<Section> sections = sectionRepository.findByCourseCodesAndTerm(codes, 2568, 1);

        assertSlotsLoaded(sections);
        assertEquals(List.of("T8C01 010001", "T8G01 780001", "T8M03 010001",
                "T8M05 010001", "T8N01 990001", "T8N02 990001"), labels(sections));

        Section c01 = sections.get(0);
        assertNotNull(c01.getSlots());
        assertTrue(c01.getSlots().isEmpty(), "T8C01 ไม่มีคาบเรียน แต่ต้องยังอยู่ในผล (left join fetch)");
    }

    /** UT-DAO-US8-18 */
    @Test
    void findByCourseCodesAndTerm_otherTerm_returnsOnlySectionsOfThatTerm() {
        List<String> codes = conflictCoopAndMinorCodes();

        List<Section> semester2 = sectionRepository.findByCourseCodesAndTerm(codes, 2568, 2);
        assertEquals(List.of("T8X01 010001"), labels(semester2));
        assertEquals(2, semester2.get(0).getSemester());

        assertTrue(sectionRepository.findByCourseCodesAndTerm(codes, 2569, 1).isEmpty());
    }

    /** รหัสของ P-CONFLICT + P-COOP + MN-1.coursesOf(3, 1) ตามลำดับ (T8M05 อยู่ 2 ครั้ง) */
    private List<String> conflictCoopAndMinorCodes() {
        List<String> codes = new ArrayList<>(planCodes(fixture.pConflict));
        codes.addAll(planCodes(fixture.pCoop));
        StudyMinor mn1 = minorRepository.findWithCoursesById(fixture.mn1).orElseThrow();
        mn1.coursesOf(3, 1).stream().map(Course::getCourseCode).forEach(codes::add);
        em.clear();
        return codes;
    }

    private List<String> planCodes(long planId) {
        StudyPlan plan = planRepository.findWithCoursesById(planId).orElseThrow();
        List<String> codes = plan.getCourses().stream().map(pc -> pc.getCourse().getCourseCode()).toList();
        em.clear();
        return codes;
    }

    private void assertSlotsLoaded(List<Section> sections) {
        PersistenceUnitUtil util = em.getEntityManager().getEntityManagerFactory().getPersistenceUnitUtil();
        for (Section section : sections) {
            assertTrue(util.isLoaded(section, "course"), "course ต้องโหลดมาพร้อม section");
            assertTrue(util.isLoaded(section, "slots"), "slots ต้องโหลดมาพร้อม section");
        }
    }

    private static void assertSlot(Section section, DayOfWeek day, String start, String end) {
        assertEquals(1, section.getSlots().size());
        ScheduleSlot slot = section.getSlots().get(0);
        assertEquals(day, slot.getDayOfWeek());
        assertEquals(LocalTime.parse(start), slot.getStartTime());
        assertEquals(LocalTime.parse(end), slot.getEndTime());
    }

    private static List<String> labels(List<Section> sections) {
        return sections.stream().map(s -> s.getCourse().getCourseCode() + " " + s.getSectionNo()).toList();
    }
}
