package th.ac.tu.cs261.group3.backend.studyplan;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import th.ac.tu.cs261.group3.backend.course.Section;
import th.ac.tu.cs261.group3.backend.support.DaoTest;
import th.ac.tu.cs261.group3.backend.support.StudyPlanFixture;
import th.ac.tu.cs261.group3.backend.timetable.Timetable;
import th.ac.tu.cs261.group3.backend.timetable.TimetableEntry;
import th.ac.tu.cs261.group3.backend.timetable.TimetableEntryRepository;
import th.ac.tu.cs261.group3.backend.timetable.TimetableRepository;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static th.ac.tu.cs261.group3.backend.support.StudyPlanFixture.*;

/**
 * US8-T12 UT-DAO-US8-19 – 20: ขั้น ApplyPlanService.saveAdded
 * ({@code touch()} → {@code TimetableRepository.save} → {@code TimetableEntryRepository.saveAll})
 * ใช้ transaction ของ test ตามปกติ (rollback หลังจบ)
 */
@DaoTest
class ApplyPlanSaveRepositoryTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private TimetableRepository timetableRepository;

    @Autowired
    private TimetableEntryRepository entryRepository;

    private StudyPlanFixture fixture;

    @BeforeEach
    void setUp() {
        fixture = StudyPlanFixture.persist(em);
    }

    /** UT-DAO-US8-19 */
    @Test
    void saveAll_newTimetableWithPlanSections_insertsTimetableAndAllEntries() {
        assertTrue(timetableRepository.findByStudentIdAndAcademicYearAndSemester(NEW_STUDENT, 2568, 1).isEmpty());

        Timetable timetable = new Timetable();
        timetable.setStudentId(NEW_STUDENT);
        timetable.setAcademicYear(2568);
        timetable.setSemester(1);
        timetable.touch();
        timetableRepository.save(timetable);

        List<Long> sectionIds = List.of(fixture.m01, fixture.m02, fixture.m04, fixture.g02);
        entryRepository.saveAll(entries(timetable, sectionIds));
        em.flush();
        em.clear();

        Timetable saved = timetableRepository.findByStudentIdAndAcademicYearAndSemester(NEW_STUDENT, 2568, 1).orElseThrow();
        assertNotNull(saved.getTimetableId());
        assertNotNull(saved.getUpdatedAt());

        List<TimetableEntry> savedEntries = entryRepository.findByTimetableId(saved.getTimetableId());
        assertEquals(sectionIds, sectionIds(savedEntries));
        assertEquals(12, savedEntries.stream().mapToInt(e -> e.getSection().getCourse().getCredits()).sum());

        assertEquals(1, entryRepository.findByTimetableId(fixture.ttOld).size(), "ตาราง TT-OLD ไม่ถูกแตะ");
    }

    /** UT-DAO-US8-20 */
    @Test
    void saveAll_existingTimetable_appendsEntriesAndTouchesUpdatedAt() {
        Timetable ttOld = timetableRepository.findByStudentIdAndAcademicYearAndSemester(OLD_STUDENT, 2568, 1).orElseThrow();
        ttOld.touch();
        timetableRepository.save(ttOld);
        entryRepository.saveAll(entries(ttOld, List.of(fixture.m01, fixture.m04)));
        em.flush();
        em.clear();

        Number rows = (Number) em.getEntityManager()
                .createNativeQuery("SELECT COUNT(*) FROM timetable WHERE student_id = ?1")
                .setParameter(1, OLD_STUDENT)
                .getSingleResult();
        assertEquals(1, rows.intValue(), "ไม่สร้างตารางใหม่");

        Timetable reloaded = timetableRepository.findByStudentIdAndAcademicYearAndSemester(OLD_STUDENT, 2568, 1).orElseThrow();
        assertEquals(fixture.ttOld, reloaded.getTimetableId());
        assertTrue(reloaded.getUpdatedAt().isAfter(OLD), "updatedAt ต้องเปลี่ยนจาก OLD");

        List<TimetableEntry> savedEntries = entryRepository.findByTimetableId(fixture.ttOld);
        assertEquals(fixture.eOld, savedEntries.get(0).getEntryId(), "E-OLD ยังอยู่และมาก่อน");
        assertEquals(List.of(fixture.m02, fixture.m01, fixture.m04), sectionIds(savedEntries));
    }

    private List<TimetableEntry> entries(Timetable timetable, List<Long> sectionIds) {
        return sectionIds.stream().map(id -> {
            TimetableEntry entry = new TimetableEntry();
            entry.setTimetable(timetable);
            entry.setSection(em.find(Section.class, id));
            return entry;
        }).toList();
    }

    private static List<Long> sectionIds(List<TimetableEntry> entries) {
        return entries.stream().map(e -> e.getSection().getSectionId()).toList();
    }
}
