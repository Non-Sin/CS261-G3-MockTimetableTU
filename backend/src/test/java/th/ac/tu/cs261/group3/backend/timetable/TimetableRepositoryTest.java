package th.ac.tu.cs261.group3.backend.timetable;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import th.ac.tu.cs261.group3.backend.support.DaoFixture;
import th.ac.tu.cs261.group3.backend.support.DaoTest;

import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * US1-T12 UT-DAO-08 – 11: TimetableRepository
 */
@DaoTest
class TimetableRepositoryTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private TimetableRepository repository;

    private DaoFixture fixture;

    @BeforeEach
    void setUp() {
        fixture = DaoFixture.persist(em);
    }

    private long find(String studentId, int academicYear, int semester) {
        return repository.findByStudentIdAndAcademicYearAndSemester(studentId, academicYear, semester)
                .orElseThrow().getTimetableId();
    }

    /** UT-DAO-08 */
    @Test
    void findByStudentIdAndTerm_existing_returnsOnlyThatTimetable() {
        assertEquals(fixture.t1, find("6609000000", 2568, 1));
        assertEquals(fixture.t3, find("6609000000", 2568, 2));
        assertEquals(fixture.t2, find("6609000001", 2568, 1));
    }

    /** UT-DAO-09 */
    @Test
    void findByStudentIdAndTerm_none_returnsEmpty() {
        assertTrue(repository.findByStudentIdAndAcademicYearAndSemester("6609000002", 2568, 1).isEmpty());
        assertTrue(repository.findByStudentIdAndAcademicYearAndSemester("6609000000", 2569, 1).isEmpty());
    }

    /** UT-DAO-10 */
    @Test
    void save_newTimetable_generatesIdAndKeepsUpdatedAt() {
        Timetable timetable = new Timetable();
        timetable.setStudentId("6609000002");
        timetable.setAcademicYear(2568);
        timetable.setSemester(1);
        timetable.setUpdatedAt(DaoFixture.UPDATED_AT);

        Long id = repository.save(timetable).getTimetableId();
        em.flush();
        em.clear();

        assertNotNull(id);
        Timetable reloaded = repository.findByStudentIdAndAcademicYearAndSemester("6609000002", 2568, 1).orElseThrow();
        assertEquals(id, reloaded.getTimetableId());
        assertEquals(DaoFixture.UPDATED_AT.toInstant(), reloaded.getUpdatedAt().toInstant());
    }

    /** UT-DAO-11 */
    @Test
    void save_existingTimetable_updatesWithoutNewRow() {
        OffsetDateTime newUpdatedAt = OffsetDateTime.parse("2026-10-14T09:00:00+07:00");
        Timetable t1 = repository.findById(fixture.t1).orElseThrow();
        t1.setUpdatedAt(newUpdatedAt);

        repository.save(t1);
        em.flush();
        em.clear();

        Timetable reloaded = repository.findById(fixture.t1).orElseThrow();
        assertEquals(fixture.t1, reloaded.getTimetableId());
        assertEquals(newUpdatedAt.toInstant(), reloaded.getUpdatedAt().toInstant());
        assertEquals(4, repository.count());
    }
}
