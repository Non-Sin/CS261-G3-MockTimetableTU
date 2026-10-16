package th.ac.tu.cs261.group3.backend.support;

import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.course.CourseCategory;
import th.ac.tu.cs261.group3.backend.course.ScheduleSlot;
import th.ac.tu.cs261.group3.backend.course.Section;
import th.ac.tu.cs261.group3.backend.timetable.Timetable;
import th.ac.tu.cs261.group3.backend.timetable.TimetableEntry;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.stream.LongStream;

import static java.time.DayOfWeek.*;

/**
 * Test Data ของ US1-T12 (กลุ่มเรียน S1–S9 และตารางเรียน T1–T4)
 * <p>
 * S9 (TU107 เรียน e-learning) ไม่มีคาบเรียน และไม่อยู่ในตารางใด
 * <p>
 * เรียก {@link #persist} ใน {@code @BeforeEach} แล้ว fixture จะ {@code flush()} + {@code clear()} ให้
 * id ทุกตัวเป็น IDENTITY จึงเก็บไว้ใน field ห้าม hard-code ตัวเลข
 */
public final class DaoFixture {

    public static final OffsetDateTime UPDATED_AT = OffsetDateTime.parse("2026-10-13T11:20:05+07:00");
    public static final String S1_INSTRUCTOR = "ผศ.ดร.ทรงศักดิ์ รองวิริยะพานิช";

    public long s1, s2, s3, s4, s5, s6, s7, s8, s9;
    public long t1, t2, t3, t4;

    private final TestEntityManager em;

    private DaoFixture(TestEntityManager em) {
        this.em = em;
    }

    public static DaoFixture persist(TestEntityManager em) {
        DaoFixture f = new DaoFixture(em);

        Course cs111 = f.course("CS111", "OBJECT-ORIENTED CONCEPTS", CourseCategory.MAJOR, 3);
        Course ma211 = f.course("MA211", "CALCULUS 1", CourseCategory.MAJOR, 3);
        Course tu109 = f.course("TU109", "INNOVATION AND ENTREPRENEURIAL MINDSET", CourseCategory.GENERAL_EDUCATION, 3);
        Course las101 = f.course("LAS101", "CRITICAL THINKING, READING, AND WRITING", CourseCategory.GENERAL_EDUCATION, 3);
        Course fe001 = f.course("FE001", "การถ่ายภาพเบื้องต้น", CourseCategory.FREE_ELECTIVE, 2);
        Course cs213 = f.course("CS213", "DATA STRUCTURES", CourseCategory.MAJOR, 3);
        Course tu107 = f.course("TU107", "DIGITAL SKILL AND PROBLEM SOLVING", CourseCategory.GENERAL_EDUCATION, 3);

        Section s1 = f.section(cs111, "030001", S1_INSTRUCTOR, 2568, 1);
        f.slot(s1, TUESDAY, "11:00", "12:30", "LC3-121");
        f.slot(s1, THURSDAY, "11:00", "12:30", "LC3-121");

        Section s2 = f.section(cs111, "030002", "อ.ดร.วิไลวรรณ ศรีสุข", 2568, 1);
        f.slot(s2, TUESDAY, "13:30", "15:00", "LC3-122");
        f.slot(s2, THURSDAY, "13:30", "15:00", "LC3-122");

        Section s3 = f.section(ma211, "010001", "รศ.ดร.ประเสริฐ มั่นคง", 2568, 1);
        f.slot(s3, TUESDAY, "09:30", "11:00", "SC3-217");
        f.slot(s3, THURSDAY, "09:30", "11:00", "SC3-217");

        Section s4 = f.section(tu109, "780001", "อ.ดร.ธนวัฒน์ รุ่งเรือง", 2568, 1);
        f.slot(s4, WEDNESDAY, "09:30", "12:30", "SC3-413");

        Section s5 = f.section(las101, "780004", "อ.พิมพ์ชนก บุญมา", 2568, 1);
        f.slot(s5, WEDNESDAY, "09:30", "12:30", "SC-1026");

        Section s6 = f.section(fe001, "900001", "อ.ชยพล แสงทอง", 2568, 1);
        f.slot(s6, FRIDAY, "13:00", "16:00", "LC2-204");

        Section s7 = f.section(cs111, "030001", S1_INSTRUCTOR, 2568, 2);
        f.slot(s7, MONDAY, "09:30", "11:00", "LC3-121");

        Section s8 = f.section(cs213, "040001", "อ.กิตติพงษ์ แสงทอง", 2568, 2);
        f.slot(s8, WEDNESDAY, "13:30", "16:30", "SC3-216");

        // เรียน e-learning จึงไม่มีคาบ
        Section s9 = f.section(tu107, "000002", null, 2568, 1);

        Timetable t1 = f.timetable("6609000000", 2568, 1);
        f.entry(t1, s1);
        f.entry(t1, s4);
        f.entry(t1, s5);

        Timetable t2 = f.timetable("6609000001", 2568, 1);
        f.entry(t2, s3);

        Timetable t3 = f.timetable("6609000000", 2568, 2);
        f.entry(t3, s7);

        Timetable t4 = f.timetable("6609000003", 2568, 1);

        f.s1 = s1.getSectionId();
        f.s2 = s2.getSectionId();
        f.s3 = s3.getSectionId();
        f.s4 = s4.getSectionId();
        f.s5 = s5.getSectionId();
        f.s6 = s6.getSectionId();
        f.s7 = s7.getSectionId();
        f.s8 = s8.getSectionId();
        f.s9 = s9.getSectionId();
        f.t1 = t1.getTimetableId();
        f.t2 = t2.getTimetableId();
        f.t3 = t3.getTimetableId();
        f.t4 = t4.getTimetableId();

        em.flush();
        em.clear();
        return f;
    }

    /** id ที่มากที่สุดใน fixture ใช้สร้าง id ที่ไม่มีอยู่จริง */
    public long maxId() {
        return LongStream.of(s1, s2, s3, s4, s5, s6, s7, s8, s9, t1, t2, t3, t4).max().orElseThrow();
    }

    private Course course(String code, String name, CourseCategory category, int credits) {
        Course course = new Course();
        course.setCourseCode(code);
        course.setCourseName(name);
        course.setCategory(category);
        course.setCredits(credits);
        return em.persist(course);
    }

    private Section section(Course course, String sectionNo, String instructor, int academicYear, int semester) {
        Section section = new Section();
        section.setCourse(course);
        section.setSectionNo(sectionNo);
        section.setInstructor(instructor);
        section.setAcademicYear(academicYear);
        section.setSemester(semester);
        return em.persist(section);
    }

    private void slot(Section section, DayOfWeek day, String start, String end, String room) {
        ScheduleSlot slot = new ScheduleSlot();
        slot.setSection(section);
        slot.setDayOfWeek(day);
        slot.setStartTime(LocalTime.parse(start));
        slot.setEndTime(LocalTime.parse(end));
        slot.setRoom(room);
        em.persist(slot);
    }

    private Timetable timetable(String studentId, int academicYear, int semester) {
        Timetable timetable = new Timetable();
        timetable.setStudentId(studentId);
        timetable.setAcademicYear(academicYear);
        timetable.setSemester(semester);
        timetable.setUpdatedAt(UPDATED_AT);
        return em.persist(timetable);
    }

    private void entry(Timetable timetable, Section section) {
        TimetableEntry entry = new TimetableEntry();
        entry.setTimetable(timetable);
        entry.setSection(section);
        em.persist(entry);
    }
}
