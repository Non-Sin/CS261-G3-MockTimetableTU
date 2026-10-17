package th.ac.tu.cs261.group3.backend.course;

import jakarta.persistence.PersistenceUnitUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import th.ac.tu.cs261.group3.backend.support.DaoFixture;
import th.ac.tu.cs261.group3.backend.support.DaoTest;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * US1-T12 UT-DAO-06 – 07: SectionRepository.findById
 * และ UT-DAO-22 – 23 (เพิ่มหลัง T12): SectionRepository.findByCourseCodesAndTerm
 */
@DaoTest
class SectionRepositoryTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private SectionRepository repository;

    private DaoFixture fixture;

    @BeforeEach
    void setUp() {
        fixture = DaoFixture.persist(em);
    }

    /** UT-DAO-06 */
    @Test
    void findById_existing_returnsSectionWithCourseAndSlots() {
        Section section = repository.findById(fixture.s1).orElseThrow();

        // ตรวจก่อนแตะ field เพราะการเรียก getter ของ lazy proxy จะทำให้โหลดเอง
        PersistenceUnitUtil util = em.getEntityManager().getEntityManagerFactory().getPersistenceUnitUtil();
        assertTrue(util.isLoaded(section, "course"), "course ต้องโหลดมาพร้อม section");
        assertTrue(util.isLoaded(section, "slots"), "slots ต้องโหลดมาพร้อม section");

        assertEquals("030001", section.getSectionNo());
        assertEquals(2568, section.getAcademicYear());
        assertEquals(1, section.getSemester());
        assertEquals(DaoFixture.S1_INSTRUCTOR, section.getInstructor());

        Course course = section.getCourse();
        assertEquals("CS111", course.getCourseCode());
        assertEquals("OBJECT-ORIENTED CONCEPTS", course.getCourseName());
        assertEquals(CourseCategory.MAJOR, course.getCategory());
        assertEquals(3, course.getCredits());

        Set<String> slots = section.getSlots().stream()
                .map(x -> x.getDayOfWeek() + " " + x.getStartTime() + "-" + x.getEndTime() + " " + x.getRoom())
                .collect(Collectors.toSet());
        assertEquals(Set.of("TUESDAY 11:00-12:30 LC3-121", "THURSDAY 11:00-12:30 LC3-121"), slots);
        assertTrue(section.getSlots().stream().allMatch(x -> x.getStartTime().equals(LocalTime.of(11, 0))));
        assertTrue(section.getSlots().stream().map(ScheduleSlot::getDayOfWeek)
                .allMatch(d -> d == DayOfWeek.TUESDAY || d == DayOfWeek.THURSDAY));

        // DB เก็บ enum เป็นข้อความ ไม่ใช่ ordinal
        Object category = em.getEntityManager()
                .createNativeQuery("SELECT category FROM course WHERE course_code = 'CS111'")
                .getSingleResult();
        assertEquals("MAJOR", category);

        @SuppressWarnings("unchecked")
        List<Object> days = em.getEntityManager()
                .createNativeQuery("SELECT day_of_week FROM schedule_slot WHERE section_id = ?1")
                .setParameter(1, fixture.s1)
                .getResultList();
        assertEquals(Set.of("TUESDAY", "THURSDAY"), Set.copyOf(days));
    }

    /** UT-DAO-07 */
    @Test
    void findById_notFound_returnsEmpty() {
        Optional<Section> result = assertDoesNotThrow(() -> repository.findById(fixture.maxId() + 1000));

        assertTrue(result.isEmpty());
    }

    /** UT-DAO-22 (เพิ่มหลัง T12) กลุ่มเรียนของรายการวิชาสำหรับ GET /api/courses */
    @Test
    void findByCourseCodesAndTerm_returnsSectionsOfTermWithCourseAndSlots() {
        List<Section> sections = repository.findByCourseCodesAndTerm(List.of("CS111", "TU109"), 2568, 1);

        PersistenceUnitUtil util = em.getEntityManager().getEntityManagerFactory().getPersistenceUnitUtil();
        for (Section s : sections) {
            assertTrue(util.isLoaded(s, "course"), "course ต้องโหลดมาแล้ว");
            assertTrue(util.isLoaded(s, "slots"), "slots ต้องโหลดมาแล้ว");
        }

        // เรียงตามรหัสวิชาแล้วรหัสกลุ่ม ไม่มี CS111 ของ 2568/2 (S7) และแต่ละกลุ่มไม่ซ้ำแม้มีหลายคาบ
        assertEquals(List.of("CS111 030001", "CS111 030002", "TU109 780001"), sections.stream()
                .map(s -> s.getCourse().getCourseCode() + " " + s.getSectionNo()).toList());
        assertEquals(List.of(2, 2, 1), sections.stream().map(s -> s.getSlots().size()).toList());
        assertEquals(DaoFixture.S1_INSTRUCTOR, sections.getFirst().getInstructor());
    }

    /** UT-DAO-22 ใช้ต่อจาก CourseRepository.search ได้ครบทุกวิชาของภาค */
    @Test
    void findByCourseCodesAndTerm_withSearchResult_returnsEverySectionOfTerm(@Autowired CourseRepository courses) {
        List<String> codes = courses.search(2568, 1, null, null).stream().map(Course::getCourseCode).toList();

        List<Long> ids = repository.findByCourseCodesAndTerm(codes, 2568, 1).stream()
                .map(Section::getSectionId).toList();

<<<<<<< HEAD
        assertEquals(Set.of(fixture.s1, fixture.s2, fixture.s3, fixture.s4, fixture.s5, fixture.s6), Set.copyOf(ids));
        assertEquals(6, ids.size());
=======
        assertEquals(Set.of(fixture.s1, fixture.s2, fixture.s3, fixture.s4, fixture.s5, fixture.s6, fixture.s9),
                Set.copyOf(ids));
        assertEquals(7, ids.size());
>>>>>>> fd86cedd0ffad13cf9368433c71a1cc2ce15e4a9
    }

    /** UT-DAO-23 (เพิ่มหลัง T12) */
    @Test
    void findByCourseCodesAndTerm_noMatch_returnsEmptyList() {
        assertEquals(List.of(), repository.findByCourseCodesAndTerm(List.of(), 2568, 1));
        // CS213 เปิดเฉพาะ 2568/2
        assertEquals(List.of(), repository.findByCourseCodesAndTerm(List.of("CS213"), 2568, 1));
        assertEquals(List.of(), repository.findByCourseCodesAndTerm(List.of("XX999"), 2568, 1));
    }
}
