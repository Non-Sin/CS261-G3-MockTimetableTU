package th.ac.tu.cs261.group3.backend;

import jakarta.persistence.PersistenceException;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.dao.DataIntegrityViolationException;
import th.ac.tu.cs261.group3.backend.auth.LoginAttempt;
import th.ac.tu.cs261.group3.backend.auth.LoginAttemptRepository;
import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.course.Section;
import th.ac.tu.cs261.group3.backend.course.SectionRepository;
import th.ac.tu.cs261.group3.backend.support.DaoFixture;
import th.ac.tu.cs261.group3.backend.support.DaoTest;
import th.ac.tu.cs261.group3.backend.timetable.Timetable;
import th.ac.tu.cs261.group3.backend.timetable.TimetableEntry;
import th.ac.tu.cs261.group3.backend.timetable.TimetableEntryRepository;
import th.ac.tu.cs261.group3.backend.timetable.TimetableRepository;

import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * US1-T12 UT-DAO-17 – 21: Flyway migration และ constraint ตาม US1-T06 ER Diagram
 * และ US3-T12 UT-DAO-US3-11: constraint ของ login_attempt ตาม US3-T06 ER Diagram
 * <p>
 * กรณีที่คาดว่า throw อยู่ขั้นสุดท้ายของ test เพราะ session ใช้ต่อไม่ได้หลัง constraint ล้ม
 */
@DaoTest
class SchemaConstraintTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private TimetableRepository timetableRepository;

    @Autowired
    private TimetableEntryRepository entryRepository;

    @Autowired
    private SectionRepository sectionRepository;

    @Autowired
    private LoginAttemptRepository loginAttemptRepository;

    private DaoFixture fixture;

    @BeforeEach
    void setUp() {
        fixture = DaoFixture.persist(em);
    }

    /** UT-DAO-17 context start ได้แปลว่า Hibernate validate ผ่านกับ entity ทุกตัว */
    @Test
    void contextLoads_flywayMigrationMatchesEntities() throws IOException {
        int migrationFiles = new PathMatchingResourcePatternResolver()
                .getResources("classpath:db/migration/V*.sql").length;

        @SuppressWarnings("unchecked")
        List<Object[]> history = em.getEntityManager()
                .createNativeQuery("SELECT version, success FROM flyway_schema_history WHERE version IS NOT NULL")
                .getResultList();

        assertEquals(migrationFiles, history.size(), "ทุกไฟล์ใน db/migration ต้องถูกรัน");
        assertTrue(history.stream().allMatch(row -> Boolean.TRUE.equals(row[1])), "ทุก migration ต้อง success");
        // version ไม่ชนกัน (ถ้าชน Flyway จะไม่ยอม start ตั้งแต่แรก)
        assertEquals(history.size(), history.stream().map(row -> row[0]).distinct().count());
    }

    /** UT-DAO-18 */
    @Test
    void saveAndFlush_duplicateTimetableForTerm_throwsDataIntegrityViolation() {
        assertDoesNotThrow(() -> timetableRepository.saveAndFlush(newTimetable("6609000000", 2569, 1)));

        assertThrows(DataIntegrityViolationException.class,
                () -> timetableRepository.saveAndFlush(newTimetable("6609000000", 2568, 1)));
    }

    /** UT-DAO-19 */
    @Test
    void saveAndFlush_duplicateSectionInTimetable_throwsDataIntegrityViolation() {
        // วิชาเดิมคนละกลุ่ม DB ไม่กัน TC8 ต้องกันที่ TimetableService.checkNotAlreadyAdded
        assertDoesNotThrow(() -> entryRepository.saveAndFlush(newEntry(fixture.t1, fixture.s2)));

        assertThrows(DataIntegrityViolationException.class,
                () -> entryRepository.saveAndFlush(newEntry(fixture.t1, fixture.s1)));
    }

    /** UT-DAO-20 */
    @Test
    void saveAndFlush_duplicateSectionNoInTerm_throwsDataIntegrityViolation() {
        Section s1 = sectionRepository.findById(fixture.s1).orElseThrow();
        Section s7 = sectionRepository.findById(fixture.s7).orElseThrow();
        assertEquals("030001", s1.getSectionNo());
        assertEquals("030001", s7.getSectionNo());
        assertNotEquals(s1.getSemester(), s7.getSemester());

        Section duplicate = new Section();
        duplicate.setCourse(em.find(Course.class, "CS111"));
        duplicate.setSectionNo("030001");
        duplicate.setInstructor("อ.ทดสอบ");
        duplicate.setAcademicYear(2568);
        duplicate.setSemester(1);

        assertThrows(DataIntegrityViolationException.class, () -> sectionRepository.saveAndFlush(duplicate));
    }

    /** US3-T12 UT-DAO-US3-11 */
    @Test
    void saveAndFlush_negativeFailedAttempts_throwsConstraintViolation() {
        LoginAttempt attempt = new LoginAttempt("negative_user");
        attempt.setFailedAttempts(-1);
        attempt.setUpdatedAt(DaoFixture.UPDATED_AT);

        assertThrows(DataIntegrityViolationException.class, () -> loginAttemptRepository.saveAndFlush(attempt));
    }

    /** UT-DAO-21 */
    @Test
    void insertEntry_unknownSection_throwsConstraintViolation() {
        PersistenceException ex = assertThrows(PersistenceException.class, () -> em.getEntityManager()
                .createNativeQuery("INSERT INTO timetable_entry (timetable_id, section_id) VALUES (?1, -1)")
                .setParameter(1, fixture.t1)
                .executeUpdate());

        assertTrue(hasCause(ex, ConstraintViolationException.class),
                "ต้องมี ConstraintViolationException จาก foreign key ของ section_id อยู่ข้างใน");
    }

    private static boolean hasCause(Throwable ex, Class<? extends Throwable> type) {
        for (Throwable t = ex; t != null; t = t.getCause()) {
            if (type.isInstance(t)) {
                return true;
            }
        }
        return false;
    }

    private Timetable newTimetable(String studentId, int academicYear, int semester) {
        Timetable timetable = new Timetable();
        timetable.setStudentId(studentId);
        timetable.setAcademicYear(academicYear);
        timetable.setSemester(semester);
        timetable.setUpdatedAt(DaoFixture.UPDATED_AT);
        return timetable;
    }

    private TimetableEntry newEntry(long timetableId, long sectionId) {
        TimetableEntry entry = new TimetableEntry();
        entry.setTimetable(em.find(Timetable.class, timetableId));
        entry.setSection(em.find(Section.class, sectionId));
        return entry;
    }
}
