package th.ac.tu.cs261.group3.backend.support;

import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.course.CourseCategory;
import th.ac.tu.cs261.group3.backend.course.ScheduleSlot;
import th.ac.tu.cs261.group3.backend.course.Section;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static java.time.DayOfWeek.*;

/**
 * Test Fixture F0 (และ F-WILD) ของ US6-T12 "Design Unit Test Cases ส่วน DAO: วิชาเสรีแนะนำ"
 * <p>
 * แยกจาก {@link DaoFixture} ของ US1 รหัสวิชาขึ้นต้นด้วย {@code T6}
 * <p>
 * {@code course}, {@code section}, {@code schedule_slot} สร้างด้วย {@link TestEntityManager#persist}
 * ส่วน {@code elective_info}, {@code elective_tag}, {@code elective_review_point} สร้างด้วย native SQL แบบ bind parameter
 * เพื่อไม่ใช้ mapping ที่กำลังทดสอบเป็นผู้สร้างข้อมูลคาดหวังเอง
 * <p>
 * section_id ที่ DB สร้างเก็บใน {@link #sec} ตาม key ของ T12 (เช่น {@code "S-F1"}) ห้าม hard-code
 * เรียก {@link #persist} ใน {@code @BeforeEach} แล้ว fixture จะตรวจจำนวนแถวและ {@code flush()} + {@code clear()} ให้
 */
public final class ElectiveDaoFixture {

    public static final String F = "T6FR205";
    public static final String N = "T6NT001";
    public static final String P = "T6PY250";
    public static final String S = "T6SO101";
    public static final String E = "T6EL001";
    public static final String M = "T6ME101";
    public static final String X = "T6X001";
    public static final String NI = "T6NI001";
    public static final String NR = "T6NR001";
    public static final String OY = "T6OY001";
    public static final String NS = "T6NS001";
    public static final String MA = "T6MA001";
    public static final String GE = "T6GE001";
    /** F-WILD (เคส 08) */
    public static final String XC = "T6XC001";

    public static final String F_NAME_TH = "ภาษาฝรั่งเศสในชีวิตประจำวัน";
    public static final String P_NAME_TH = "จิตวิทยาบุคลิกภาพและการปรับตน";
    public static final String F_INSTRUCTOR = "อาจารย์ทดสอบ เอฟ";
    public static final String P_INSTRUCTOR = "อาจารย์ทดสอบ พี";
    public static final String REVIEW_F0 = "ฝึกสนทนาภาษาฝรั่งเศส";
    public static final String REVIEW_F1 = "มีแบบฝึกหัดในชั้นเรียน";

    /** key ของ T12 → section_id */
    public final Map<String, Long> sec = new HashMap<>();

    private final TestEntityManager em;

    private ElectiveDaoFixture(TestEntityManager em) {
        this.em = em;
    }

    public static ElectiveDaoFixture persist(TestEntityManager em) {
        ElectiveDaoFixture f = new ElectiveDaoFixture(em);

        // 1. รายวิชา (credits = 3 ทุกวิชา)
        Course cF = f.course(F, "FRENCH FOR EVERYDAY LIFE", CourseCategory.FREE_ELECTIVE);
        Course cN = f.course(N, "INTRODUCTION TO COMMUNICATION", CourseCategory.FREE_ELECTIVE);
        Course cP = f.course(P, "PSYCHOLOGY OF PERSONALITY AND ADJUSTMENT", CourseCategory.FREE_ELECTIVE);
        Course cS = f.course(S, "SOCIETY AND HEALTH", CourseCategory.FREE_ELECTIVE);
        Course cE = f.course(E, "ONLINE SCIENCE", CourseCategory.FREE_ELECTIVE);
        Course cM = f.course(M, "OBJECT-ORIENTED MEDIA WORKSHOP", CourseCategory.FREE_ELECTIVE);
        Course cX = f.course(X, "DATA 100%_! [LAB] BASICS", CourseCategory.FREE_ELECTIVE);
        Course cNI = f.course(NI, "NO METADATA COURSE", CourseCategory.FREE_ELECTIVE);
        Course cNR = f.course(NR, "UNREVIEWED LANGUAGE", CourseCategory.FREE_ELECTIVE);
        Course cOY = f.course(OY, "OLD YEAR ELECTIVE", CourseCategory.FREE_ELECTIVE);
        f.course(NS, "NO SECTION ELECTIVE", CourseCategory.FREE_ELECTIVE);
        Course cMA = f.course(MA, "SOFTWARE ENGINEERING", CourseCategory.MAJOR);
        Course cGE = f.course(GE, "GENERAL EDUCATION", CourseCategory.GENERAL_EDUCATION);

        // 2. metadata / tags / review points (NI ไม่มี metadata, NR ไม่มีรีวิว)
        f.info(F, F_NAME_TH, "LANGUAGE", true);
        f.info(N, "การสื่อสารเบื้องต้น", "LANGUAGE", false);
        f.info(P, P_NAME_TH, "PSYCHOLOGY", false);
        f.info(S, "สังคมและสุขภาพ", "SOCIETY", false);
        f.info(E, "วิทยาศาสตร์ออนไลน์", "SCIENCE", false);
        f.info(M, "การสื่อดิจิทัลเชิงวัตถุ", "MEDIA", false);
        f.info(X, "ข้อมูลทดสอบอักขระพิเศษ", "SCIENCE", false);
        f.info(NR, "วิชาที่ยังไม่มีรีวิว", "LANGUAGE", false);
        f.info(OY, "วิชาที่เปิดเฉพาะปีอื่น", "LANGUAGE", false);
        f.info(NS, "วิชาที่ยังไม่เปิดกลุ่มเรียน", "LANGUAGE", false);
        f.info(MA, "วิชาเอกทดสอบ", "LANGUAGE", false);
        f.info(GE, "วิชาศึกษาทั่วไปทดสอบ", "SOCIETY", false);

        f.tag(F, "KIND_INSTRUCTOR");
        f.tag(F, "NO_PREREQUISITE");
        f.tag(P, "NO_ATTENDANCE");
        f.tag(P, "NO_GROUP_WORK");

        // F: insert sort_order 1 ก่อน 0 เพื่อพิสูจน์ว่าผลเรียงตาม sort_order ไม่ใช่ลำดับ insert
        f.review(F, 1, REVIEW_F1);
        f.review(F, 0, REVIEW_F0);
        for (String code : List.of(N, P, S, E, M, X, OY, NS, MA, GE)) {
            f.review(code, 0, defaultReview(code));
        }

        // 3. sections + slots (ลำดับ insert ตาม T12 ไม่เรียง sectionNo/semester โดยตั้งใจ)
        f.sec.put("S-F2", f.section(cF, 2568, 1, "260002", null, slot(TUESDAY, "19:00", "20:00", null)));
        f.sec.put("S-F1", f.section(cF, 2568, 1, "260001", F_INSTRUCTOR,
                slot(TUESDAY, "16:30", "18:00", "SC3-M10"), slot(THURSDAY, "16:30", "18:00", "SC3-M10")));
        f.sec.put("S-F3", f.section(cF, 2568, 2, "260003", null, slot(MONDAY, "09:30", "12:30", null)));
        f.sec.put("S-F69", f.section(cF, 2569, 1, "260001", null, slot(WEDNESDAY, "08:00", "10:00", null)));
        f.sec.put("S-P2", f.section(cP, 2568, 2, "230001", null, slot(TUESDAY, "09:30", "12:30", null)));
        f.sec.put("S-P1", f.section(cP, 2568, 1, "820001", P_INSTRUCTOR, slot(MONDAY, "13:30", "16:30", "LC1-201")));
        f.sec.put("S-N1", f.section(cN, 2568, 1, "010001", null, slot(WEDNESDAY, "09:30", "12:30", null)));
        f.sec.put("S-S1", f.section(cS, 2568, 1, "010001", null, slot(FRIDAY, "13:30", "16:30", null)));
        f.sec.put("S-E1", f.section(cE, 2568, 1, "010001", null));
        f.sec.put("S-M1", f.section(cM, 2568, 1, "010001", null, slot(SATURDAY, "08:00", "10:00", null)));
        f.sec.put("S-X1", f.section(cX, 2568, 1, "010001", null, slot(TUESDAY, "08:00", "09:00", null)));
        f.sec.put("S-NI1", f.section(cNI, 2568, 1, "010001", null, slot(WEDNESDAY, "08:00", "09:00", null)));
        f.sec.put("S-NR1", f.section(cNR, 2568, 1, "010001", null, slot(THURSDAY, "08:00", "09:00", null)));
        f.sec.put("S-OY69", f.section(cOY, 2569, 1, "010001", null, slot(FRIDAY, "08:00", "09:00", null)));
        f.sec.put("S-MA1", f.section(cMA, 2568, 1, "010001", null, slot(MONDAY, "08:00", "09:00", null)));
        f.sec.put("S-GE1", f.section(cGE, 2568, 1, "010001", null, slot(MONDAY, "10:00", "11:00", null)));

        em.flush();
        f.assertRowCounts();
        em.clear();
        return f;
    }

    /**
     * F-WILD (เคส 08): ตัวควบคุมที่ SQL wildcard ของ {@code 100%}, {@code 100%_}, {@code 100%_!}, {@code [LAB]}
     * จะจับผิดถ้าไม่ escape
     */
    public void addWild() {
        Course xc = course(XC, "DATA 100ZZZ LATER BASICS", CourseCategory.FREE_ELECTIVE);
        info(XC, "ข้อมูลตัวควบคุมการค้นหา", "SCIENCE", false);
        review(XC, 0, defaultReview(XC));
        sec.put("S-XC1", section(xc, 2568, 1, "010001", null, slot(MONDAY, "08:00", "09:00", null)));
        em.flush();
        em.clear();
    }

    /** section_id ตามลำดับ key ที่ส่ง */
    public List<Long> ids(String... keys) {
        return Arrays.stream(keys).map(sec::get).toList();
    }

    public static String defaultReview(String code) {
        return "รีวิวทดสอบ " + code;
    }

    /** ตาม T12: 13 courses, 12 elective_info, 4 elective_tag, 12 review points, 16 sections, 16 schedule slots */
    private void assertRowCounts() {
        check("SELECT COUNT(*) FROM course WHERE course_code LIKE 'T6%'", 13);
        check("SELECT COUNT(*) FROM elective_info WHERE course_code LIKE 'T6%'", 12);
        check("SELECT COUNT(*) FROM elective_tag WHERE course_code LIKE 'T6%'", 4);
        check("SELECT COUNT(*) FROM elective_review_point WHERE course_code LIKE 'T6%'", 12);
        check("SELECT COUNT(*) FROM section WHERE course_code LIKE 'T6%'", 16);
        check("""
                SELECT COUNT(*) FROM schedule_slot ss JOIN section s ON s.section_id = ss.section_id
                WHERE s.course_code LIKE 'T6%'""", 16);
    }

    private void check(String sql, int expected) {
        int actual = ((Number) em.getEntityManager().createNativeQuery(sql).getSingleResult()).intValue();
        if (actual != expected) {
            throw new IllegalStateException("fixture F0 ไม่ครบ: " + sql + " ได้ " + actual + " คาดว่า " + expected);
        }
    }

    private Course course(String code, String name, CourseCategory category) {
        Course course = new Course();
        course.setCourseCode(code);
        course.setCourseName(name);
        course.setCategory(category);
        course.setCredits(3);
        return em.persist(course);
    }

    private long section(Course course, int academicYear, int semester, String sectionNo, String instructor,
                         SlotSpec... slots) {
        Section section = new Section();
        section.setCourse(course);
        section.setAcademicYear(academicYear);
        section.setSemester(semester);
        section.setSectionNo(sectionNo);
        section.setInstructor(instructor);
        em.persist(section);
        for (SlotSpec spec : slots) {
            ScheduleSlot slot = new ScheduleSlot();
            slot.setSection(section);
            slot.setDayOfWeek(spec.day());
            slot.setStartTime(LocalTime.parse(spec.start()));
            slot.setEndTime(LocalTime.parse(spec.end()));
            slot.setRoom(spec.room());
            em.persist(slot);
        }
        return section.getSectionId();
    }

    private static SlotSpec slot(DayOfWeek day, String start, String end, String room) {
        return new SlotSpec(day, start, end, room);
    }

    private record SlotSpec(DayOfWeek day, String start, String end, String room) {
    }

    private void info(String code, String nameTh, String group, boolean quota) {
        insertNative("INSERT INTO elective_info (course_code, course_name_th, interest_group, requires_quota) VALUES (?1, ?2, ?3, ?4)",
                code, nameTh, group, quota);
    }

    private void tag(String code, String tag) {
        insertNative("INSERT INTO elective_tag (course_code, tag) VALUES (?1, ?2)", code, tag);
    }

    private void review(String code, int sortOrder, String text) {
        insertNative("INSERT INTO elective_review_point (course_code, sort_order, review_text) VALUES (?1, ?2, ?3)",
                code, sortOrder, text);
    }

    private void insertNative(String sql, Object... params) {
        // ให้ course/section ที่ persist ไว้ลง DB ก่อน native insert ที่อ้าง FK
        em.flush();
        var query = em.getEntityManager().createNativeQuery(sql);
        for (int i = 0; i < params.length; i++) {
            query.setParameter(i + 1, params[i]);
        }
        query.executeUpdate();
    }
}
