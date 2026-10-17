package th.ac.tu.cs261.group3.backend.timetable;

import jakarta.persistence.PersistenceUnitUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import th.ac.tu.cs261.group3.backend.course.ScheduleSlot;
import th.ac.tu.cs261.group3.backend.course.Section;
import th.ac.tu.cs261.group3.backend.support.DaoFixture;
import th.ac.tu.cs261.group3.backend.support.DaoTest;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * US1-T12 UT-DAO-12 – 16: TimetableEntryRepository
 */
@DaoTest
class TimetableEntryRepositoryTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private TimetableEntryRepository repository;

    private DaoFixture fixture;

    @BeforeEach
    void setUp() {
        fixture = DaoFixture.persist(em);
    }

    private TimetableEntry newEntry(long timetableId, long sectionId) {
        TimetableEntry entry = new TimetableEntry();
        entry.setTimetable(em.find(Timetable.class, timetableId));
        entry.setSection(em.find(Section.class, sectionId));
        return entry;
    }

    private void addEntry(long timetableId, long sectionId) {
        repository.save(newEntry(timetableId, sectionId));
        em.flush();
        em.clear();
    }

    private static String label(TimetableEntry e) {
        return e.getSection().getCourse().getCourseCode() + " " + e.getSection().getSectionNo();
    }

    private static Set<String> labels(List<TimetableEntry> entries) {
        return entries.stream().map(TimetableEntryRepositoryTest::label).collect(Collectors.toSet());
    }

    /** UT-DAO-12 */
    @Test
    void save_newEntry_isReturnedByFindByTimetableId() {
        Long entryId = repository.save(newEntry(fixture.t2, fixture.s6)).getEntryId();
        em.flush();
        em.clear();

        assertNotNull(entryId);
        assertEquals(Set.of("MA211 010001", "FE001 900001"), labels(repository.findByTimetableId(fixture.t2)));
    }

    /** UT-DAO-13 */
    @Test
    void findByTimetableId_returnsAllEntriesOfThatTimetableOnly() {
        List<TimetableEntry> entries = repository.findByTimetableId(fixture.t1);

        // ตรวจก่อนแตะ field เพราะการเรียก getter ของ lazy proxy จะทำให้โหลดเอง
        PersistenceUnitUtil util = em.getEntityManager().getEntityManagerFactory().getPersistenceUnitUtil();
        for (TimetableEntry e : entries) {
            assertTrue(util.isLoaded(e, "section"), "section ต้องโหลดมาแล้ว");
            assertTrue(util.isLoaded(e.getSection(), "course"), "course ต้องโหลดมาแล้ว");
            assertTrue(util.isLoaded(e.getSection(), "slots"), "slots ต้องโหลดมาแล้ว");
        }

        // ไม่มี MA211 ของ T2 และไม่มี CS111 ภาค 2568/2 ของ T3
        assertEquals(Set.of("CS111 030001", "TU109 780001", "LAS101 780004"), labels(entries));
        assertTrue(entries.stream().allMatch(e -> e.getSection().getAcademicYear() == 2568
                && e.getSection().getSemester() == 1));

        for (TimetableEntry e : entries) {
            var course = e.getSection().getCourse();
            assertNotNull(course.getCourseName());
            assertNotNull(course.getCategory());
            assertTrue(course.getCredits() > 0);
            assertFalse(e.getSection().getSlots().isEmpty());
        }

        // sectionNo ของ CS111 คือ existingSectionNo ใน 409 COURSE_ALREADY_IN_TIMETABLE
        String cs111SectionNo = entries.stream()
                .filter(e -> e.getSection().getCourse().getCourseCode().equals("CS111"))
                .findFirst().orElseThrow().getSection().getSectionNo();
        assertEquals("030001", cs111SectionNo);
    }

    /** UT-DAO-14 */
    @Test
    void findByTimetableId_noEntries_returnsEmptyList() {
        List<TimetableEntry> empty = assertDoesNotThrow(() -> repository.findByTimetableId(fixture.t4));
        List<TimetableEntry> unknown = assertDoesNotThrow(() -> repository.findByTimetableId(fixture.maxId() + 1000));

        assertNotNull(empty);
        assertTrue(empty.isEmpty());
        assertNotNull(unknown);
        assertTrue(unknown.isEmpty());
    }

    private record Slot(String courseCode, DayOfWeek day, LocalTime start, LocalTime end) {
        boolean overlaps(Slot other) {
            return day == other.day && start.isBefore(other.end) && other.start.isBefore(end);
        }
    }

    /** UT-DAO-15 */
    @Test
    void findByTimetableId_returnsExactSlotTimesForConflictCheck() {
        addEntry(fixture.t1, fixture.s3);

        List<Slot> slots = new ArrayList<>();
        for (TimetableEntry e : repository.findByTimetableId(fixture.t1)) {
            for (ScheduleSlot x : e.getSection().getSlots()) {
                slots.add(new Slot(e.getSection().getCourse().getCourseCode(),
                        x.getDayOfWeek(), x.getStartTime(), x.getEndTime()));
            }
        }
        Map<String, List<Slot>> byCourse = slots.stream().collect(Collectors.groupingBy(Slot::courseCode));

        Slot wed = new Slot(null, DayOfWeek.WEDNESDAY, LocalTime.of(9, 30), LocalTime.of(12, 30));
        for (String code : List.of("TU109", "LAS101")) {
            assertEquals(List.of(new Slot(code, wed.day, wed.start, wed.end)), byCourse.get(code));
        }
        // ต่อกันพอดีที่ 11:00 ไม่คลาดเป็นวินาทีหรือเศษวินาที
        assertTrue(byCourse.get("MA211").stream().allMatch(x -> x.end.equals(LocalTime.of(11, 0))));
        assertTrue(byCourse.get("CS111").stream().allMatch(x -> x.start.equals(LocalTime.of(11, 0))));
        assertEquals(Set.of(DayOfWeek.TUESDAY, DayOfWeek.THURSDAY),
                byCourse.get("MA211").stream().map(Slot::day).collect(Collectors.toSet()));

        // สูตรเดียวกับ API Spec: a.startTime < b.endTime && b.startTime < a.endTime
        Set<Set<String>> conflictPairs = new java.util.HashSet<>();
        for (int i = 0; i < slots.size(); i++) {
            for (int j = i + 1; j < slots.size(); j++) {
                Slot a = slots.get(i);
                Slot b = slots.get(j);
                if (!a.courseCode.equals(b.courseCode) && a.overlaps(b)) {
                    conflictPairs.add(Set.of(a.courseCode, b.courseCode));
                }
            }
        }
        assertEquals(Set.of(Set.of("TU109", "LAS101")), conflictPairs);
    }

    /** UT-DAO-16 */
    @Test
    void findByTimetableId_multiSlotSection_returnsEachEntryOnce() {
        List<TimetableEntry> before = repository.findByTimetableId(fixture.t1);
        // ถ้า fetch join คาบเรียนแล้วได้แถวซ้ำ CS111 (2 คาบ) จะถูกนับ 2 ครั้งเป็น 12
        assertEquals(3, before.size());
        assertEquals(9, before.stream().mapToInt(e -> e.getSection().getCourse().getCredits()).sum());

        addEntry(fixture.t1, fixture.s6);

        List<TimetableEntry> after = repository.findByTimetableId(fixture.t1);
        assertEquals(4, after.size());
        assertEquals(11, after.stream().mapToInt(e -> e.getSection().getCourse().getCredits()).sum());
    }

    /** กลุ่มเรียน e-learning ไม่มีคาบ ต้องยังได้ entry คืนมา (left join fetch s.slots) */
    @Test
    void findByTimetableId_sectionWithoutSlots_returnsEntryWithEmptySlots() {
        addEntry(fixture.t2, fixture.s9);

        List<TimetableEntry> entries = repository.findByTimetableId(fixture.t2);

        assertEquals(Set.of("MA211 010001", "TU107 000002"), labels(entries));
        Map<String, Section> byCode = entries.stream().map(TimetableEntry::getSection)
                .collect(Collectors.toMap(s -> s.getCourse().getCourseCode(), s -> s));
        assertTrue(byCode.get("TU107").getSlots().isEmpty());
        assertEquals(2, byCode.get("MA211").getSlots().size());
    }
}
