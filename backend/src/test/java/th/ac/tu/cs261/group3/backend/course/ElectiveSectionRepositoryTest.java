package th.ac.tu.cs261.group3.backend.course;

import jakarta.persistence.PersistenceUnitUtil;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import th.ac.tu.cs261.group3.backend.support.DaoTest;
import th.ac.tu.cs261.group3.backend.support.ElectiveDaoFixture;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static th.ac.tu.cs261.group3.backend.support.ElectiveDaoFixture.*;

/**
 * US6-T12 UT-DAO-US6-19 – 26: section ทั้งปีของ US6 ใน {@link SectionRepository}
 * <p>
 * เคส 19–24 เรียก query {@link SectionRepository#findWithSlotsByCourseCodesAndYear} โดยตรง
 * ส่วน 25–26 เรียก wrapper {@link SectionRepository#findByCourseCodesAndYear} ที่ service ใช้
 */
@DaoTest
class ElectiveSectionRepositoryTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private SectionRepository repository;

    private ElectiveDaoFixture fixture;

    @BeforeEach
    void setUp() {
        fixture = ElectiveDaoFixture.persist(em);
    }

    /** UT-DAO-US6-19 */
    @Test
    void findWithSlotsByCourseCodesAndYear_manyCourses_sortedByCodeSemesterSectionNo() {
        List<Section> result = repository.findWithSlotsByCourseCodesAndYear(List.of(P, F), 2568);

        assertEquals(fixture.ids("S-F1", "S-F2", "S-F3", "S-P1", "S-P2"), sectionIds(result));
    }

    /** UT-DAO-US6-20 */
    @Test
    void findWithSlotsByCourseCodesAndYear_otherYear_returnsOnlySectionsOfThatYear() {
        List<Section> result = repository.findWithSlotsByCourseCodesAndYear(List.of(F, P), 2569);

        assertEquals(fixture.ids("S-F69"), sectionIds(result));
    }

    /** UT-DAO-US6-21 */
    @Test
    void findWithSlotsByCourseCodesAndYear_bothSemesters_semesterBeforeSectionNo() {
        List<Section> result = repository.findWithSlotsByCourseCodesAndYear(List.of(P), 2568);

        assertEquals(fixture.ids("S-P1", "S-P2"), sectionIds(result),
                "ภาค 1 Sec 820001 ก่อนภาค 2 Sec 230001 แม้ insert P2 ก่อนและ section_no น้อยกว่า");
    }

    /** UT-DAO-US6-22 */
    @Test
    void findWithSlotsByCourseCodesAndYear_multipleSlots_oneSectionWithAssociationsLoaded() {
        List<Section> result = repository.findWithSlotsByCourseCodesAndYear(List.of(F), 2568);

        PersistenceUnitUtil util = em.getEntityManager().getEntityManagerFactory().getPersistenceUnitUtil();
        for (Section section : result) {
            assertTrue(util.isLoaded(section, "course"), "course ต้อง fetch มาแล้ว");
            assertTrue(util.isLoaded(section, "slots"), "slots ต้อง fetch มาแล้ว");
        }

        em.clear();

        assertEquals(fixture.ids("S-F1", "S-F2", "S-F3"), sectionIds(result));
        assertEquals(3, Set.copyOf(sectionIds(result)).size());
        Section f1 = result.get(0);
        assertEquals(F, f1.getCourse().getCourseCode());
        assertEquals(F_INSTRUCTOR, f1.getInstructor());
        assertEquals(Set.of("TUESDAY 16:30-18:00 SC3-M10", "THURSDAY 16:30-18:00 SC3-M10"), slots(f1));
    }

    /** UT-DAO-US6-23 */
    @Test
    void findWithSlotsByCourseCodesAndYear_noSlotAndNullableFields_sectionKept() {
        List<Section> result = repository.findWithSlotsByCourseCodesAndYear(List.of(E, P), 2568);

        assertEquals(fixture.ids("S-E1", "S-P1", "S-P2"), sectionIds(result));
        Section e1 = result.get(0);
        assertEquals(List.of(), e1.getSlots());
        assertNull(e1.getInstructor());
        Section p2 = result.get(2);
        assertNull(p2.getInstructor());
        assertEquals(1, p2.getSlots().size());
        assertNull(p2.getSlots().get(0).getRoom());
    }

    /** UT-DAO-US6-24 */
    @Test
    void findWithSlotsByCourseCodesAndYear_noMatch_returnsEmptyList() {
        assertEquals(List.of(), repository.findWithSlotsByCourseCodesAndYear(List.of("T6ZZ999"), 2568));
        assertEquals(List.of(), repository.findWithSlotsByCourseCodesAndYear(List.of(F), 2567));
    }

    /** UT-DAO-US6-25 */
    @Test
    void findByCourseCodesAndYear_duplicateAndUnknownCodes_returnsDistinctSections() {
        List<Section> result = repository.findByCourseCodesAndYear(List.of(F, "T6ZZ999", F), 2568);

        assertEquals(fixture.ids("S-F1", "S-F2", "S-F3"), sectionIds(result));
    }

    /** UT-DAO-US6-26 เปิด Hibernate Statistics เฉพาะช่วงเรียก wrapper แล้วปิดคืน */
    @Test
    void findByCourseCodesAndYear_emptyList_doesNotQueryDatabase() {
        Statistics stats = em.getEntityManager().getEntityManagerFactory()
                .unwrap(SessionFactory.class).getStatistics();
        boolean wasEnabled = stats.isStatisticsEnabled();
        stats.setStatisticsEnabled(true);
        try {
            long before = stats.getPrepareStatementCount();

            List<Section> result = repository.findByCourseCodesAndYear(List.of(), 2568);

            long after = stats.getPrepareStatementCount();
            assertEquals(List.of(), result);
            assertEquals(0, after - before, "ห้ามส่ง IN () ไป SQL Server");
        } finally {
            stats.setStatisticsEnabled(wasEnabled);
        }
    }

    private static List<Long> sectionIds(List<Section> sections) {
        return sections.stream().map(Section::getSectionId).toList();
    }

    /** ไม่สนลำดับคาบเพราะ repository ไม่สัญญาเรียงคาบ */
    private static Set<String> slots(Section section) {
        return section.getSlots().stream()
                .map(s -> s.getDayOfWeek() + " " + s.getStartTime() + "-" + s.getEndTime() + " " + s.getRoom())
                .collect(Collectors.toSet());
    }
}
