package th.ac.tu.cs261.group3.backend.quota;

import jakarta.persistence.PersistenceException;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.course.CourseCategory;
import th.ac.tu.cs261.group3.backend.course.CourseRepository;
import th.ac.tu.cs261.group3.backend.support.DaoTest;
import th.ac.tu.cs261.group3.backend.support.QuotaFixture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** US7-T12 UT-DAO-US7-22 ถึง 28: ทดสอบ constraint ด้วย native SQL เป็นคำสั่งสุดท้ายของ transaction */
@DaoTest
class QuotaSchemaConstraintTest {

    @Autowired private TestEntityManager em;
    @Autowired private CourseRepository courses;

    @BeforeEach
    void setUp() {
        QuotaFixture.persist(em);
    }

    @Test // 22
    void saveAndFlush_nullableThaiName_roundTripsUnicode() {
        for (String code : new String[]{"Q7NULL", "Q7THAI"}) {
            Course course = new Course();
            course.setCourseCode(code);
            course.setCourseName("Thai name test");
            course.setCourseNameTh(code.equals("Q7THAI") ? "ภาษาไทยทดสอบ" : null);
            course.setCategory(CourseCategory.MAJOR);
            course.setCredits(3);
            courses.saveAndFlush(course);
        }
        em.clear();
        assertThat(courses.findById("Q7NULL").orElseThrow().getCourseNameTh()).isNull();
        assertThat(courses.findById("Q7THAI").orElseThrow().getCourseNameTh()).isEqualTo("ภาษาไทยทดสอบ");
    }

    @Test // 23
    void insertInfo_unknownCourse_violatesForeignKey() {
        assertViolates("fk_course_quota_info_course",
                "INSERT INTO course_quota_info (course_code, quota_required) VALUES ('NO_COURSE', 1)");
    }

    @ParameterizedTest // 24
    @ValueSource(strings = {"quota_channel", "quota_contact"})
    void insertLink_insecureUrl_violatesHttpsConstraint(String table) {
        String columns = table.equals("quota_channel") ? "channel_type" : "organization_name";
        String value = table.equals("quota_channel") ? "OTHER" : "Test faculty";
        assertViolates("ck_" + table + "_url", "INSERT INTO " + table
                + " (course_code, sort_order, " + columns + ", label, url) VALUES"
                + " ('Q7PC280', 2, '" + value + "', 'Test', 'http://insecure.example.com')");
    }

    @Test // 25
    void insertChannel_unknownType_violatesEnumConstraint() {
        assertViolates("ck_quota_channel_type", """
                INSERT INTO quota_channel (course_code, sort_order, channel_type, label)
                VALUES ('Q7PC280', 2, 'WALK_IN', N'ติดต่อเอง')""");
    }

    @ParameterizedTest // 26
    @CsvSource({"3,2026-10-05,2026-10-10,ck_quota_round_semester",
            "2,2026-10-10,2026-10-05,ck_quota_round_dates"})
    void insertRound_invalidTermOrDates_violatesCheck(int semester, String start, String end, String constraint) {
        assertViolates(constraint, """
                INSERT INTO quota_round (course_code, academic_year, semester, round_no, start_date, end_date)
                VALUES ('Q7PC280', 2569, %d, 1, '%s', '%s')""".formatted(semester, start, end));
    }

    @ParameterizedTest // 27
    @ValueSource(strings = {"channel", "round"})
    void insertDuplicate_channelOrderOrRound_violatesUnique(String child) {
        if (child.equals("channel")) {
            assertViolates("uq_quota_channel_order", """
                    INSERT INTO quota_channel (course_code, sort_order, channel_type, label)
                    VALUES ('Q7EL105', 1, 'OTHER', 'Duplicate')""");
        } else {
            assertViolates("uq_quota_round_term_no", """
                    INSERT INTO quota_round (course_code, academic_year, semester, round_no, end_date)
                    VALUES ('Q7EL105', 2569, 2, 1, '2026-10-09')""");
        }
    }

    @Test // 28
    void deleteInfo_nativeDelete_cascadesAllChildrenAndKeepsCourse() {
        // Fixture EL105 เดิมไม่มี condition: เพิ่มให้ทดสอบ cascade ครบทั้ง 4 ตารางจริง
        execute("INSERT INTO quota_condition (course_code, sort_order, condition_text) VALUES ('Q7EL105', 1, N'เงื่อนไขทดสอบ')");
        for (String table : new String[]{"quota_condition", "quota_round", "quota_channel", "quota_contact"}) {
            assertThat(count(table, "Q7EL105")).isPositive();
        }
        execute("DELETE FROM course_quota_info WHERE course_code = 'Q7EL105'");
        em.flush();
        em.clear();
        for (String table : new String[]{"quota_condition", "quota_round", "quota_channel", "quota_contact"}) {
            assertThat(count(table, "Q7EL105")).isZero();
        }
        assertThat(courses.findById("Q7EL105")).isPresent();
        assertThat(count("quota_channel", "Q7PC280")).isEqualTo(1);
    }

    private void assertViolates(String name, String sql) {
        PersistenceException error = assertThrows(PersistenceException.class, () -> execute(sql));
        // Hibernate รุ่นนี้โยน ConstraintViolationException (ซึ่งเป็น PersistenceException) โดยตรง
        assertThat(error).isInstanceOf(ConstraintViolationException.class).hasMessageContaining(name);
    }

    private void execute(String sql) {
        em.getEntityManager().createNativeQuery(sql).executeUpdate();
    }

    private int count(String table, String courseCode) {
        return ((Number) em.getEntityManager().createNativeQuery("SELECT COUNT(*) FROM " + table + " WHERE course_code = ?1")
                .setParameter(1, courseCode).getSingleResult()).intValue();
    }
}
