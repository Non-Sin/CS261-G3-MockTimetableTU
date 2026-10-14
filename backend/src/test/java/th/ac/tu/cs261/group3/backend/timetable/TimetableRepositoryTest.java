package th.ac.tu.cs261.group3.backend.timetable;

import org.hibernate.Hibernate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import th.ac.tu.cs261.group3.backend.course.Section;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * ทดสอบกับ SQL Server จริงและ seed 2568/1 (ต้องเปิด docker compose ก่อน) rollback ทุกเทสต์
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class TimetableRepositoryTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private TimetableRepository timetableRepository;

    @Autowired
    private TimetableEntryRepository entryRepository;

    private Section findSection(String courseCode, String sectionNo) {
        return em.getEntityManager().createQuery("""
                        select s from Section s
                        where s.course.courseCode = :code and s.sectionNo = :no
                          and s.academicYear = 2568 and s.semester = 1""", Section.class)
                .setParameter("code", courseCode)
                .setParameter("no", sectionNo)
                .getSingleResult();
    }

    private Timetable saveTimetable(String studentId, int academicYear, int semester) {
        Timetable timetable = new Timetable();
        timetable.setStudentId(studentId);
        timetable.setAcademicYear(academicYear);
        timetable.setSemester(semester);
        return timetableRepository.saveAndFlush(timetable);
    }

    private TimetableEntry saveEntry(Timetable timetable, Section section) {
        TimetableEntry entry = new TimetableEntry();
        entry.setTimetable(timetable);
        entry.setSection(section);
        return entryRepository.saveAndFlush(entry);
    }

    @Test
    void findByStudentIdAndTerm_matchesOnlyExactTerm() {
        Timetable t = saveTimetable("TEST000001", 2568, 1);
        saveTimetable("TEST000001", 2568, 2);
        saveTimetable("TEST000002", 2568, 1);

        assertEquals(t.getTimetableId(), timetableRepository
                .findByStudentIdAndAcademicYearAndSemester("TEST000001", 2568, 1)
                .orElseThrow().getTimetableId());
        assertTrue(timetableRepository.findByStudentIdAndAcademicYearAndSemester("TEST000001", 2567, 1).isEmpty());
        assertTrue(timetableRepository.findByStudentIdAndAcademicYearAndSemester("TEST999999", 2568, 1).isEmpty());
    }

    @Test
    void findByTimetableId_returnsOwnEntriesInOrderWithSectionAndCourseLoaded() {
        Timetable mine = saveTimetable("TEST000001", 2568, 1);
        Timetable other = saveTimetable("TEST000002", 2568, 1);
        saveEntry(mine, findSection("TU109", "780001"));
        saveEntry(mine, findSection("LAS101", "780004"));
        saveEntry(other, findSection("CS111", "030001"));
        em.clear();

        List<TimetableEntry> entries = entryRepository.findByTimetableId(mine.getTimetableId());

        assertEquals(2, entries.size());
        assertTrue(Hibernate.isInitialized(entries.getFirst().getSection()));
        assertTrue(Hibernate.isInitialized(entries.getFirst().getSection().getCourse()));
        assertEquals(List.of("TU109", "LAS101"),
                entries.stream().map(e -> e.getSection().getCourse().getCourseCode()).toList());
    }

    @Test
    void findByTimetableId_emptyTimetable_returnsEmptyList() {
        Timetable t = saveTimetable("TEST000001", 2568, 1);

        assertTrue(entryRepository.findByTimetableId(t.getTimetableId()).isEmpty());
    }
}
