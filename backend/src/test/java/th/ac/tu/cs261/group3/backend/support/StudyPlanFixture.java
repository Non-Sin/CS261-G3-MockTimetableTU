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

import static java.time.DayOfWeek.*;

/**
 * ข้อมูลตั้งต้นของ US8-T12 (หัวข้อ "ข้อมูลตั้งต้น (Test Fixture)")
 * <p>
 * แยกจาก {@link DaoFixture} ของ US1 รหัสวิชาขึ้นต้นด้วย {@code T8} และรหัสนักศึกษาช่วง {@code 66090008xx}
 * <p>
 * {@code course}, {@code section}, {@code schedule_slot}, {@code timetable}, {@code timetable_entry} สร้างด้วย
 * {@link TestEntityManager#persist} ส่วน {@code study_plan*} / {@code study_minor*} สร้างด้วย native SQL
 * เพราะ entity เป็น {@code @Immutable} id เป็น IDENTITY จึงเก็บค่าจาก {@code OUTPUT INSERTED} ไว้ใน field ห้าม hard-code
 * <p>
 * เรียก {@link #persist} ใน {@code @BeforeEach} แล้ว fixture จะ {@code flush()} + {@code clear()} ให้
 */
public final class StudyPlanFixture {

    public static final String CS = "ภาควิชาวิทยาการคอมพิวเตอร์";
    public static final String CS_TYPO = "วิทยาการคอมพิวเตอร์";
    public static final String CUR_A = "หลักสูตรทดสอบ A";
    public static final String CUR_B = "หลักสูตรทดสอบ B";
    public static final OffsetDateTime OLD = OffsetDateTime.parse("2000-01-01T00:00:00+07:00");

    public static final String NEW_STUDENT = "6609000801";
    public static final String OLD_STUDENT = "6609000802";

    /** section ภาค 1/2568 ของแต่ละวิชา (T8G02 ใช้กลุ่ม 780001) */
    public long m01, m02, m03, m04, m05, c01, g01, g02, n01, n02, f01;
    /** T8G02 กลุ่ม 780002, 780003 และ T8X01 ภาค 2/2568 */
    public long g02s780002, g02s780003, x01;

    public long pSecond, pBasic, pSem2, pCoop, pConflict, pEmpty;
    public long mnOther, mn1, mn2;
    public long ttOld, eOld;

    private final TestEntityManager em;

    private StudyPlanFixture(TestEntityManager em) {
        this.em = em;
    }

    public static StudyPlanFixture persist(TestEntityManager em) {
        StudyPlanFixture f = new StudyPlanFixture(em);

        // 1. course + section + schedule_slot
        f.m01 = f.courseWithSection("T8M01", "วิชาเอกทดสอบ 1", CourseCategory.MAJOR, 3, "010001", 1, MONDAY, "09:30", "12:30");
        f.m02 = f.courseWithSection("T8M02", "วิชาเอกทดสอบ 2", CourseCategory.MAJOR, 3, "010001", 1, TUESDAY, "09:30", "12:30");
        f.m03 = f.courseWithSection("T8M03", "วิชาเอกทดสอบ 3", CourseCategory.MAJOR, 3, "010001", 1, WEDNESDAY, "09:30", "12:30");
        f.m04 = f.courseWithSection("T8M04", "วิชาเอกทดสอบ 4", CourseCategory.MAJOR, 3, "010001", 1, MONDAY, "12:30", "14:00");
        f.m05 = f.courseWithSection("T8M05", "วิชาเอกทดสอบ 5", CourseCategory.MAJOR, 3, "010001", 1, THURSDAY, "09:30", "12:30");

        Course c01 = f.course("T8C01", "สหกิจศึกษาทดสอบ", CourseCategory.MAJOR, 3);
        f.c01 = f.section(c01, "010001", 1).getSectionId(); // ไม่มีคาบเรียน

        f.g01 = f.courseWithSection("T8G01", "วิชาศึกษาทั่วไปทดสอบ 1", CourseCategory.GENERAL_EDUCATION, 3, "780001", 1, WEDNESDAY, "09:30", "12:30");

        // insert 780002 ก่อน 780001 ให้พิสูจน์ว่าผลเรียงตาม sectionNo
        Course g02 = f.course("T8G02", "วิชาศึกษาทั่วไปทดสอบ 2", CourseCategory.GENERAL_EDUCATION, 3);
        f.g02s780002 = f.sectionWithSlot(g02, "780002", 1, THURSDAY, "13:30", "16:30");
        f.g02 = f.sectionWithSlot(g02, "780001", 1, THURSDAY, "13:30", "16:30");
        f.g02s780003 = f.sectionWithSlot(g02, "780003", 1, FRIDAY, "13:30", "16:30");

        f.x01 = f.courseWithSection("T8X01", "วิชาเอกเปิดภาค 2", CourseCategory.MAJOR, 3, "010001", 2, MONDAY, "09:30", "12:30");
        f.n01 = f.courseWithSection("T8N01", "วิชาโททดสอบ 1", CourseCategory.FREE_ELECTIVE, 3, "990001", 1, FRIDAY, "13:30", "16:30");
        f.n02 = f.courseWithSection("T8N02", "วิชาโททดสอบ 2", CourseCategory.FREE_ELECTIVE, 4, "990001", 1, THURSDAY, "09:30", "12:30");
        f.f01 = f.courseWithSection("T8F01", "วิชาโททดสอบ 3", CourseCategory.FREE_ELECTIVE, 3, "900001", 1, SATURDAY, "13:00", "14:30");

        // 2. study_plan + study_plan_course (ลำดับ insert ไม่ตรงกับ sort_order โดยตั้งใจ)
        f.pSecond = f.plan(CUR_B, 2, 1, null);
        f.planCourse(f.pSecond, "T8M02", 1);

        f.pBasic = f.plan(CUR_A, 2, 1, null);
        f.planCourse(f.pBasic, "T8G02", 4);
        f.planCourse(f.pBasic, "T8M01", 1);
        f.planCourse(f.pBasic, "T8M04", 3);
        f.planCourse(f.pBasic, "T8M02", 2);

        f.pSem2 = f.plan(CUR_A, 2, 2, null);
        f.planCourse(f.pSem2, "T8X01", 1);

        f.pCoop = f.plan(CUR_A, 3, 1, "CO_OP");
        f.planCourse(f.pCoop, "T8M05", 1);
        f.planCourse(f.pCoop, "T8C01", 2);

        f.pConflict = f.plan(CUR_A, 3, 1, "SPECIAL_PROJECT");
        f.planCourse(f.pConflict, "T8M03", 1);
        f.planCourse(f.pConflict, "T8G01", 2);
        f.planCourse(f.pConflict, "T8X01", 3);

        f.pEmpty = f.plan(CUR_A, 1, 2, null); // ไม่มีวิชา (seed ผิด)

        // 3. study_minor + study_minor_course
        f.mnOther = f.minor(CUR_B, "ความมั่นคงปลอดภัยไซเบอร์", 3);
        f.minorCourse(f.mnOther, "T8N01", 3, 1, 1);

        f.mn1 = f.minor(CUR_A, "วิทยาการข้อมูล", 1);
        f.minorCourse(f.mn1, "T8F01", 4, 1, 1);
        f.minorCourse(f.mn1, "T8M05", 3, 1, 3);
        f.minorCourse(f.mn1, "T8N01", 3, 1, 1);
        f.minorCourse(f.mn1, "T8N02", 3, 1, 2);

        f.mn2 = f.minor(CUR_A, "ปัญญาประดิษฐ์", 2);
        f.minorCourse(f.mn2, "T8N01", 4, 2, 1);

        // 4. timetable + timetable_entry
        Timetable ttOld = new Timetable();
        ttOld.setStudentId(OLD_STUDENT);
        ttOld.setAcademicYear(2568);
        ttOld.setSemester(1);
        ttOld.setUpdatedAt(OLD);
        em.persist(ttOld);
        f.ttOld = ttOld.getTimetableId();

        TimetableEntry eOld = new TimetableEntry();
        eOld.setTimetable(ttOld);
        eOld.setSection(em.find(Section.class, f.m02));
        em.persist(eOld);
        f.eOld = eOld.getEntryId();

        em.flush();
        em.clear();
        return f;
    }

    private long courseWithSection(String code, String name, CourseCategory category, int credits,
                                   String sectionNo, int semester, DayOfWeek day, String start, String end) {
        return sectionWithSlot(course(code, name, category, credits), sectionNo, semester, day, start, end);
    }

    private Course course(String code, String name, CourseCategory category, int credits) {
        Course course = new Course();
        course.setCourseCode(code);
        course.setCourseName(name);
        course.setCategory(category);
        course.setCredits(credits);
        return em.persist(course);
    }

    private long sectionWithSlot(Course course, String sectionNo, int semester, DayOfWeek day, String start, String end) {
        Section section = section(course, sectionNo, semester);
        ScheduleSlot slot = new ScheduleSlot();
        slot.setSection(section);
        slot.setDayOfWeek(day);
        slot.setStartTime(LocalTime.parse(start));
        slot.setEndTime(LocalTime.parse(end));
        em.persist(slot);
        return section.getSectionId();
    }

    private Section section(Course course, String sectionNo, int semester) {
        Section section = new Section();
        section.setCourse(course);
        section.setSectionNo(sectionNo);
        section.setAcademicYear(2568);
        section.setSemester(semester);
        return em.persist(section);
    }

    /** {@code planType} เป็น null ได้ (ปี 1–2) จึงเขียน NULL ลง SQL ตรง ๆ ไม่ bind parameter ที่ไม่มีชนิด */
    private long plan(String curriculumName, int studyYear, int semester, String planType) {
        em.flush();
        return insertPlan(em, CS, curriculumName, studyYear, semester, planType);
    }

    private void planCourse(long planId, String courseCode, int sortOrder) {
        em.getEntityManager()
                .createNativeQuery("INSERT INTO study_plan_course (plan_id, course_code, sort_order) VALUES (?1, ?2, ?3)")
                .setParameter(1, planId)
                .setParameter(2, courseCode)
                .setParameter(3, sortOrder)
                .executeUpdate();
    }

    private long minor(String curriculumName, String minorName, int sortOrder) {
        Object id = em.getEntityManager()
                .createNativeQuery("""
                        INSERT INTO study_minor (department, curriculum_name, minor_name, sort_order)
                        OUTPUT INSERTED.minor_id VALUES (?1, ?2, ?3, ?4)""")
                .setParameter(1, CS)
                .setParameter(2, curriculumName)
                .setParameter(3, minorName)
                .setParameter(4, sortOrder)
                .getSingleResult();
        return ((Number) id).longValue();
    }

    /** วิชาโทใน T12 เป็นของแผนหัวข้อพิเศษทั้งหมด (T12 ออกแบบก่อนเพิ่ม plan_type ใน study_minor_course) */
    private void minorCourse(long minorId, String courseCode, int studyYear, int semester, int sortOrder) {
        insertMinorCourse(em, minorId, courseCode, "SPECIAL_PROJECT", studyYear, semester, sortOrder);
    }

    /** insert {@code study_minor_course} 1 แถว ใช้ทั้งใน fixture และ test ที่เพิ่มแถวของแผนสหกิจ */
    public static void insertMinorCourse(TestEntityManager em, long minorId, String courseCode, String planType,
                                         int studyYear, int semester, int sortOrder) {
        em.getEntityManager()
                .createNativeQuery("""
                        INSERT INTO study_minor_course (minor_id, course_code, plan_type, study_year, semester, sort_order)
                        VALUES (?1, ?2, ?3, ?4, ?5, ?6)""")
                .setParameter(1, minorId)
                .setParameter(2, courseCode)
                .setParameter(3, planType)
                .setParameter(4, studyYear)
                .setParameter(5, semester)
                .setParameter(6, sortOrder)
                .executeUpdate();
    }

    /**
     * insert {@code study_plan} 1 แถวแล้วคืน {@code plan_id} ใช้ทั้งใน fixture และ test ของ constraint
     * ({@code planType} null = เขียน NULL ลง SQL)
     */
    public static long insertPlan(TestEntityManager em, String department, String curriculumName,
                                  int studyYear, int semester, String planType) {
        String planTypeSql = planType == null ? "NULL" : "?5";
        var query = em.getEntityManager()
                .createNativeQuery("""
                        INSERT INTO study_plan (department, curriculum_name, study_year, semester, plan_type)
                        OUTPUT INSERTED.plan_id VALUES (?1, ?2, ?3, ?4, %s)""".formatted(planTypeSql))
                .setParameter(1, department)
                .setParameter(2, curriculumName)
                .setParameter(3, studyYear)
                .setParameter(4, semester);
        if (planType != null) {
            query.setParameter(5, planType);
        }
        return ((Number) query.getSingleResult()).longValue();
    }
}
