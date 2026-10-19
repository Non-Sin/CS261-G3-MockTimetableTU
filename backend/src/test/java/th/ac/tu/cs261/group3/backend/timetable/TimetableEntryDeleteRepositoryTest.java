package th.ac.tu.cs261.group3.backend.timetable;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.course.CourseCategory;
import th.ac.tu.cs261.group3.backend.course.ScheduleSlot;
import th.ac.tu.cs261.group3.backend.course.Section;
import th.ac.tu.cs261.group3.backend.course.SectionRepository;
import th.ac.tu.cs261.group3.backend.support.DaoTest;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static java.time.DayOfWeek.*;
import static org.junit.jupiter.api.Assertions.*;

/**
 * US2-T12 UT-DAO-US2-01 – 08: TimetableEntryRepository.deleteAll / findAllById ที่ US2 (ลบวิชา) ใช้
 * <p>
 * แยกจาก {@link TimetableEntryRepositoryTest} เพราะไม่ใช้ DaoFixture ของ US1
 * ค่า {@code count()} และจำนวน schedule_slot จึงมาจาก fixture ของ US2 อย่างเดียว
 */
@DaoTest
class TimetableEntryDeleteRepositoryTest {

    private static final String STUDENT_A = "6609000010";
    private static final String STUDENT_B = "6609000011";

    @Autowired
    private TestEntityManager em;

    @Autowired
    private TimetableEntryRepository repository;

    @Autowired
    private SectionRepository sectionRepository;

    private long s1, s2;
    private long tA, tB;
    private long e1, e2, e3, e4;

    /**
     * Test Fixture ของ US2-T12: นักศึกษา A มี E1–E3 นักศึกษา B มี E4 ซึ่งลง S1 เดียวกับ E1
     * ทุกตารางอยู่ภาค 1/2568 รวม schedule_slot 5 แถว
     */
    @BeforeEach
    void setUp() {
        Course cs261 = course("CS261", "SOFTWARE ENGINEERING");
        Course cs180 = course("CS180", "INTRODUCTION TO USER INTERFACE AND USER EXPERIENCE");
        Course ma211 = course("MA211", "CALCULUS 1");

        Section sec1 = section(cs261, "100001");
        slot(sec1, WEDNESDAY, "15:00", "16:30");
        slot(sec1, FRIDAY, "15:00", "16:30");

        Section sec2 = section(cs180, "820001");
        slot(sec2, MONDAY, "13:30", "16:30");

        Section sec3 = section(ma211, "020001");
        slot(sec3, TUESDAY, "09:30", "11:00");
        slot(sec3, THURSDAY, "09:30", "11:00");

        Timetable timetableA = timetable(STUDENT_A);
        Timetable timetableB = timetable(STUDENT_B);

        e1 = entry(timetableA, sec1);
        e2 = entry(timetableA, sec2);
        e3 = entry(timetableA, sec3);
        e4 = entry(timetableB, sec1);

        s1 = sec1.getSectionId();
        s2 = sec2.getSectionId();
        tA = timetableA.getTimetableId();
        tB = timetableB.getTimetableId();

        em.flush();
        em.clear();
    }

    /** UT-DAO-US2-01 */
    @Test
    void deleteAll_oneMultiSlotEntry_removesOnlyThatEntry() {
        deleteAndClear(e1);

        assertNull(em.find(TimetableEntry.class, e1));
        List<TimetableEntry> remaining = repository.findByTimetableId(tA);
        assertEquals(Set.of(e2, e3), ids(remaining));
        // คาบพุธและศุกร์ของ CS261 ไม่อยู่ในตาราง A แล้ว
        Set<DayOfWeek> days = remaining.stream()
                .flatMap(e -> e.getSection().getSlots().stream())
                .map(ScheduleSlot::getDayOfWeek)
                .collect(Collectors.toSet());
        assertFalse(days.contains(WEDNESDAY));
        assertFalse(days.contains(FRIDAY));
        assertEquals(3, repository.count());
        // นักศึกษา B ลง S1 เดียวกัน ต้องไม่ถูกลบตาม
        assertEquals(Set.of(e4), ids(repository.findByTimetableId(tB)));
    }

    /** UT-DAO-US2-02 */
    @Test
    void deleteAll_multipleEntries_removesAllGiven() {
        deleteAndClear(e1, e2);

        assertNull(em.find(TimetableEntry.class, e1));
        assertNull(em.find(TimetableEntry.class, e2));
        assertEquals(Set.of(e3), ids(repository.findByTimetableId(tA)));
        assertEquals(2, repository.count());
    }

    /** UT-DAO-US2-03 */
    @Test
    void deleteAll_everyEntryOfTimetable_keepsTimetableRow() {
        deleteAndClear(e1, e2, e3);

        assertTrue(repository.findByTimetableId(tA).isEmpty());
        // แถว timetable ไม่ถูกลบ ตารางที่ลบจนว่างจึงยังมี updatedAt ตาม API Spec
        assertNotNull(em.find(Timetable.class, tA));
        assertNotNull(em.find(TimetableEntry.class, e4));
        assertEquals(1, repository.count());
    }

    /** UT-DAO-US2-04 */
    @Test
    void deleteAll_emptyList_deletesNothing() {
        assertDoesNotThrow(() -> repository.deleteAll(List.of()));
        em.flush();
        em.clear();

        assertEquals(4, repository.count());
        assertEquals(Set.of(e1, e2, e3, e4), ids(repository.findAll()));
    }

    /** UT-DAO-US2-05 */
    @Test
    void deleteAll_entry_keepsSectionAndScheduleSlots() {
        deleteAndClear(e1);

        assertTrue(sectionRepository.findById(s1).isPresent());
        assertEquals(2, em.find(Section.class, s1).getSlots().size());
        Long slotCount = em.getEntityManager()
                .createQuery("select count(s) from ScheduleSlot s", Long.class)
                .getSingleResult();
        assertEquals(5, slotCount);
    }

    /** UT-DAO-US2-06 */
    @Test
    void findAllById_existingIds_returnsThoseEntries() {
        List<TimetableEntry> entries = repository.findAllById(List.of(e1, e2));

        assertEquals(Set.of(e1, e2), ids(entries));
        assertEquals(Set.of("CS261 100001", "CS180 820001"), labels(entries));
        assertEquals(Set.of(s1, s2), entries.stream()
                .map(e -> e.getSection().getSectionId())
                .collect(Collectors.toSet()));
    }

    /** UT-DAO-US2-07 */
    @Test
    void findAllById_withUnknownId_skipsIt() {
        List<TimetableEntry> entries = assertDoesNotThrow(() -> repository.findAllById(List.of(e1, Long.MAX_VALUE)));

        assertEquals(Set.of(e1), ids(entries));
        assertEquals(1, entries.size());
    }

    /** UT-DAO-US2-08 */
    @Test
    void findAllById_withOtherStudentsId_doesNotFilterByOwner() {
        List<TimetableEntry> entries = repository.findAllById(List.of(e1, e4));

        assertEquals(Set.of(e1, e4), ids(entries));
        // DAO ไม่กรองเจ้าของ service ต้องเช็ก timetable.studentId เอง (อ่าน LAZY ใน transaction ของเทส)
        TimetableEntry other = entries.stream().filter(e -> e.getEntryId() == e4).findFirst().orElseThrow();
        assertEquals(STUDENT_B, other.getTimetable().getStudentId());
        assertEquals(tB, other.getTimetable().getTimetableId());
    }

    /** โหลดด้วย em.find() ให้เป็น managed entity เหมือนที่ service ได้จาก findAllById แล้วลบ */
    private void deleteAndClear(long... entryIds) {
        List<TimetableEntry> entries = Arrays.stream(entryIds)
                .mapToObj(id -> em.find(TimetableEntry.class, id))
                .toList();
        repository.deleteAll(entries);
        em.flush();
        em.clear();
    }

    private static Set<Long> ids(List<TimetableEntry> entries) {
        return entries.stream().map(TimetableEntry::getEntryId).collect(Collectors.toSet());
    }

    private static Set<String> labels(List<TimetableEntry> entries) {
        return entries.stream()
                .map(e -> e.getSection().getCourse().getCourseCode() + " " + e.getSection().getSectionNo())
                .collect(Collectors.toSet());
    }

    private Course course(String code, String name) {
        Course course = new Course();
        course.setCourseCode(code);
        course.setCourseName(name);
        course.setCategory(CourseCategory.MAJOR);
        course.setCredits(3);
        return em.persist(course);
    }

    private Section section(Course course, String sectionNo) {
        Section section = new Section();
        section.setCourse(course);
        section.setSectionNo(sectionNo);
        section.setAcademicYear(2568);
        section.setSemester(1);
        return em.persist(section);
    }

    private void slot(Section section, DayOfWeek day, String start, String end) {
        ScheduleSlot slot = new ScheduleSlot();
        slot.setSection(section);
        slot.setDayOfWeek(day);
        slot.setStartTime(LocalTime.parse(start));
        slot.setEndTime(LocalTime.parse(end));
        em.persist(slot);
    }

    private Timetable timetable(String studentId) {
        Timetable timetable = new Timetable();
        timetable.setStudentId(studentId);
        timetable.setAcademicYear(2568);
        timetable.setSemester(1);
        timetable.setUpdatedAt(OffsetDateTime.parse("2026-10-16T10:00:00+07:00"));
        return em.persist(timetable);
    }

    private long entry(Timetable timetable, Section section) {
        TimetableEntry entry = new TimetableEntry();
        entry.setTimetable(timetable);
        entry.setSection(section);
        return em.persist(entry).getEntryId();
    }
}
