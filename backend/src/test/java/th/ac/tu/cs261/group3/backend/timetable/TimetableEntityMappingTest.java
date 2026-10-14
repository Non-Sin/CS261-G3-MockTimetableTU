package th.ac.tu.cs261.group3.backend.timetable;

import jakarta.persistence.PersistenceException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import th.ac.tu.cs261.group3.backend.course.CourseCategory;
import th.ac.tu.cs261.group3.backend.course.ScheduleSlot;
import th.ac.tu.cs261.group3.backend.course.Section;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * ทดสอบ mapping ของ entity กับ schema จริงใน SQL Server (ต้องเปิด docker compose ก่อน)
 * ใช้ข้อมูลจาก seed 2568/1 และ rollback ทุกเทสต์ จึงไม่ทิ้งข้อมูลไว้ใน DB
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class TimetableEntityMappingTest {

    @Autowired
    private TestEntityManager em;

    private Section findSection(String courseCode, String sectionNo, int academicYear, int semester) {
        return em.getEntityManager().createQuery("""
                        select s from Section s
                        where s.course.courseCode = :code and s.sectionNo = :no
                          and s.academicYear = :year and s.semester = :sem""", Section.class)
                .setParameter("code", courseCode)
                .setParameter("no", sectionNo)
                .setParameter("year", academicYear)
                .setParameter("sem", semester)
                .getSingleResult();
    }

    private Timetable newTimetable() {
        Timetable timetable = new Timetable();
        timetable.setStudentId("6609000000");
        timetable.setAcademicYear(2568);
        timetable.setSemester(1);
        return timetable;
    }

    @Test
    void section_loadsCourseWithEnumAndThaiInstructor() {
        Section section = findSection("CS111", "030001", 2568, 1);

        assertEquals("OBJECT-ORIENTED CONCEPTS", section.getCourse().getCourseName());
        assertEquals(CourseCategory.MAJOR, section.getCourse().getCategory());
        assertEquals(3, section.getCourse().getCredits());
        assertEquals("ผศ.ดร.สมชาย ใจดี", section.getInstructor());
    }

    @Test
    void scheduleSlot_mapsDayOfWeekAndTime() {
        Section section = findSection("CS111", "030001", 2568, 1);

        List<ScheduleSlot> slots = em.getEntityManager().createQuery(
                        "select x from ScheduleSlot x where x.section = :s order by x.dayOfWeek", ScheduleSlot.class)
                .setParameter("s", section)
                .getResultList();

        assertEquals(2, slots.size());
        assertTrue(slots.stream().allMatch(x -> x.getStartTime().equals(LocalTime.of(11, 0))
                && x.getEndTime().equals(LocalTime.of(12, 30))
                && "LC3-121".equals(x.getRoom())));
        assertEquals(List.of(DayOfWeek.THURSDAY, DayOfWeek.TUESDAY),
                slots.stream().map(ScheduleSlot::getDayOfWeek).toList()); // เรียงตามข้อความใน DB
    }

    @Test
    void courseFilter_2568_1_hasEightCoursesWithoutCs223() {
        List<String> codes = em.getEntityManager().createQuery("""
                        select distinct s.course.courseCode from Section s
                        where s.academicYear = 2568 and s.semester = 1""", String.class)
                .getResultList();

        assertEquals(8, codes.size());
        assertFalse(codes.contains("CS223"));
    }

    @Test
    void timetableAndEntry_persistAndReload() {
        Timetable timetable = em.persistAndFlush(newTimetable());
        TimetableEntry entry = new TimetableEntry();
        entry.setTimetable(timetable);
        entry.setSection(findSection("TU109", "780001", 2568, 1));
        Long entryId = em.persistAndFlush(entry).getEntryId();
        em.clear();

        TimetableEntry reloaded = em.find(TimetableEntry.class, entryId);
        assertEquals("6609000000", reloaded.getTimetable().getStudentId());
        assertNotNull(reloaded.getTimetable().getUpdatedAt());
        assertEquals("TU109", reloaded.getSection().getCourse().getCourseCode());
    }

    @Test
    void touch_updatesUpdatedAt() throws InterruptedException {
        Timetable timetable = em.persistAndFlush(newTimetable());
        OffsetDateTime created = timetable.getUpdatedAt();

        Thread.sleep(20);
        timetable.touch();
        em.flush();

        assertTrue(timetable.getUpdatedAt().isAfter(created));
    }

    @Test
    void duplicateSectionInSameTimetable_rejectedByUniqueConstraint() {
        Timetable timetable = em.persistAndFlush(newTimetable());
        Section section = findSection("CS111", "030001", 2568, 1);

        TimetableEntry first = new TimetableEntry();
        first.setTimetable(timetable);
        first.setSection(section);
        em.persistAndFlush(first);

        TimetableEntry duplicate = new TimetableEntry();
        duplicate.setTimetable(timetable);
        duplicate.setSection(section);
        assertThrows(PersistenceException.class, () -> em.persistAndFlush(duplicate));
    }
}
