package th.ac.tu.cs261.group3.backend.studyplan;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import th.ac.tu.cs261.group3.backend.course.Section;
import th.ac.tu.cs261.group3.backend.course.SectionRepository;
import th.ac.tu.cs261.group3.backend.support.DaoTest;
import th.ac.tu.cs261.group3.backend.timetable.Timetable;
import th.ac.tu.cs261.group3.backend.timetable.TimetableEntry;
import th.ac.tu.cs261.group3.backend.timetable.TimetableEntryRepository;
import th.ac.tu.cs261.group3.backend.timetable.TimetableRepository;

import java.time.OffsetDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static th.ac.tu.cs261.group3.backend.support.StudyPlanFixture.*;

/**
 * US8-T12 UT-DAO-US8-21 – 22: บันทึกหลายวิชาแล้ว rollback ทั้งชุดเมื่อมีแถวผิด constraint
 * <p>
 * ปิด transaction ของ {@code @DataJpaTest} แล้วคุมเองด้วย {@link TransactionTemplate} เพื่อดูผลหลัง rollback จริง
 * ข้อมูลตั้งต้นถูก commit จริง (รหัส {@code T8R} ใช้เฉพาะคลาสนี้) จึงต้องลบใน {@link #cleanUp()} ทุกครั้ง
 * เพราะทุก test class ใช้ container เดียวกัน
 */
@DaoTest
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class ApplyPlanSaveRollbackTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private TimetableRepository timetableRepository;

    @Autowired
    private TimetableEntryRepository entryRepository;

    @Autowired
    private SectionRepository sectionRepository;

    private TransactionTemplate transactionTemplate;
    private long r01, r02, ttR;

    @BeforeEach
    void setUp() {
        cleanUp(); // กันข้อมูลค้างถ้ารอบก่อนหยุดกลางทาง
        transactionTemplate = new TransactionTemplate(transactionManager);
        transactionTemplate.executeWithoutResult(status -> {
            r01 = courseWithSection("T8R01", "วิชาทดสอบย้อนกลับ 1", "MONDAY");
            r02 = courseWithSection("T8R02", "วิชาทดสอบย้อนกลับ 2", "TUESDAY");
            ttR = jdbc.queryForObject("""
                    INSERT INTO timetable (student_id, academic_year, semester, updated_at)
                    OUTPUT INSERTED.timetable_id VALUES (?, 2568, 1, ?)""", Long.class, OLD_STUDENT, OLD);
            jdbc.update("INSERT INTO timetable_entry (timetable_id, section_id) VALUES (?, ?)", ttR, r02);
        });
    }

    @AfterEach
    void cleanUp() {
        jdbc.update("DELETE FROM timetable WHERE student_id IN (?, ?)", NEW_STUDENT, OLD_STUDENT);
        jdbc.update("DELETE FROM section WHERE course_code IN ('T8R01', 'T8R02')");
        jdbc.update("DELETE FROM course WHERE course_code IN ('T8R01', 'T8R02')");
    }

    /** UT-DAO-US8-21 */
    @Test
    void saveAll_existingTimetableWithDuplicateSection_rollsBackWholeBatch() {
        assertEquals(List.of(r02), entrySectionIds(ttR));
        assertEquals(OLD.toInstant(), updatedAt(ttR).toInstant());

        assertThrows(DataIntegrityViolationException.class, () -> transactionTemplate.executeWithoutResult(status -> {
            Timetable timetable = timetableRepository.findById(ttR).orElseThrow();
            timetable.touch();
            timetableRepository.save(timetable);
            // T8R02 อยู่ในตารางแล้ว จำลองวิชาที่ถูกเพิ่มจากแท็บอื่นหลัง scheduler อ่านตาราง
            entryRepository.saveAll(entries(timetable, List.of(r01, r02)));
            entryRepository.flush();
        }));

        assertEquals(List.of(r02), entrySectionIds(ttR), "แถวของ T8R01 ที่ insert ไปก่อนต้องถูก rollback");
        assertEquals(0, count("SELECT COUNT(*) FROM timetable_entry WHERE section_id = ?", r01));
        assertEquals(OLD.toInstant(), updatedAt(ttR).toInstant(), "touch() ต้องถูก rollback ด้วย");
    }

    /** UT-DAO-US8-22 */
    @Test
    void saveAll_newTimetableWithDuplicateInBatch_rollsBackTimetableAndEntries() {
        int entriesBefore = count("SELECT COUNT(*) FROM timetable_entry");
        assertEquals(1, entriesBefore);

        assertThrows(DataIntegrityViolationException.class, () -> transactionTemplate.executeWithoutResult(status -> {
            Timetable timetable = new Timetable();
            timetable.setStudentId(NEW_STUDENT);
            timetable.setAcademicYear(2568);
            timetable.setSemester(1);
            timetable.touch();
            timetableRepository.save(timetable);
            entryRepository.saveAll(entries(timetable, List.of(r01, r01)));
            entryRepository.flush();
        }));

        assertEquals(0, count("""
                SELECT COUNT(*) FROM timetable
                WHERE student_id = ? AND academic_year = 2568 AND semester = 1""", NEW_STUDENT),
                "ตารางที่สร้างใหม่ต้องถูก rollback ไม่เหลือตารางว่าง");
        assertEquals(entriesBefore, count("SELECT COUNT(*) FROM timetable_entry"));
    }

    private long courseWithSection(String code, String name, String day) {
        jdbc.update("INSERT INTO course (course_code, course_name, category, credits) VALUES (?, ?, 'MAJOR', 3)", code, name);
        Long sectionId = jdbc.queryForObject("""
                INSERT INTO section (course_code, section_no, academic_year, semester)
                OUTPUT INSERTED.section_id VALUES (?, '010001', 2568, 1)""", Long.class, code);
        jdbc.update("""
                INSERT INTO schedule_slot (section_id, day_of_week, start_time, end_time)
                VALUES (?, ?, '09:30', '12:30')""", sectionId, day);
        return sectionId;
    }

    private List<TimetableEntry> entries(Timetable timetable, List<Long> sectionIds) {
        return sectionIds.stream().map(id -> {
            Section section = sectionRepository.findById(id).orElseThrow();
            TimetableEntry entry = new TimetableEntry();
            entry.setTimetable(timetable);
            entry.setSection(section);
            return entry;
        }).toList();
    }

    private List<Long> entrySectionIds(long timetableId) {
        return jdbc.queryForList("SELECT section_id FROM timetable_entry WHERE timetable_id = ? ORDER BY entry_id",
                Long.class, timetableId);
    }

    private OffsetDateTime updatedAt(long timetableId) {
        return jdbc.queryForObject("SELECT updated_at FROM timetable WHERE timetable_id = ?", OffsetDateTime.class, timetableId);
    }

    private int count(String sql, Object... args) {
        return jdbc.queryForObject(sql, Integer.class, args);
    }
}
