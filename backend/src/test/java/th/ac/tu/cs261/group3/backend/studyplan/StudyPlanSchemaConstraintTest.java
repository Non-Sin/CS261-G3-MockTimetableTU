package th.ac.tu.cs261.group3.backend.studyplan;

import jakarta.persistence.PersistenceException;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import th.ac.tu.cs261.group3.backend.support.DaoTest;
import th.ac.tu.cs261.group3.backend.support.StudyPlanFixture;

import static org.junit.jupiter.api.Assertions.*;
import static th.ac.tu.cs261.group3.backend.support.StudyPlanFixture.*;

/**
 * US8-T12 UT-DAO-US8-23 – 30: constraint ของ study_plan, study_plan_course, study_minor, study_minor_course
 * ตาม US8-T06 ER Diagram (insert แถวที่ผิดด้วย native SQL แบบ UT-DAO-21 ของ US1)
 * <p>
 * กรณีที่คาดว่า throw อยู่ขั้นสุดท้ายของ test เพราะ session ใช้ต่อไม่ได้หลัง constraint ล้ม
 * ค่าว่างใน {@code @CsvSource} คือ {@code NULL}
 */
@DaoTest
class StudyPlanSchemaConstraintTest {

    private static final String CUR_C = "หลักสูตรทดสอบ C";

    @Autowired
    private TestEntityManager em;

    private StudyPlanFixture fixture;

    @BeforeEach
    void setUp() {
        fixture = StudyPlanFixture.persist(em);
    }

    /** UT-DAO-US8-23 */
    @ParameterizedTest(name = "study_year={0}, plan_type={1}")
    @CsvSource({"1, SPECIAL_PROJECT", "2, CO_OP", "3, ", "4, ", "3, MINOR", "5, SPECIAL_PROJECT", "0, "})
    void insertPlan_studyYearAndPlanTypeMismatch_throwsConstraintViolation(int studyYear, String planType) {
        assertViolates("ck_study_plan_plan_type", () -> insertPlan(em, CS, CUR_C, studyYear, 1, planType));
    }

    /** UT-DAO-US8-24 */
    @ParameterizedTest(name = "semester={0}")
    @ValueSource(ints = {3, 0})
    void insertPlan_semesterOutOfRange_throwsConstraintViolation(int semester) {
        assertViolates("ck_study_plan_semester", () -> insertPlan(em, CS, CUR_C, 1, semester, null));
    }

    /** UT-DAO-US8-25 ข้อ 1–2 (ซ้ำกับ P-BASIC ที่ plan_type เป็น NULL และซ้ำกับ P-COOP) */
    @ParameterizedTest(name = "study_year={0}, plan_type={1}")
    @CsvSource({"2, ", "3, CO_OP"})
    void insertPlan_duplicatePlanOfTerm_throwsConstraintViolation(int studyYear, String planType) {
        assertViolates("uq_study_plan", () -> insertPlan(em, CS, CUR_A, studyYear, 1, planType));
    }

    /** UT-DAO-US8-25 ข้อ 3 */
    @Test
    void insertPlan_otherPlanTypeOfFourthYear_succeeds() {
        insertPlan(em, CS, CUR_A, 4, 1, "CO_OP");

        assertEquals(1, count("""
                SELECT COUNT(*) FROM study_plan
                WHERE curriculum_name = ?1 AND study_year = 4 AND semester = 1""", CUR_A));
    }

    /** UT-DAO-US8-26 (-1 แทน plan_id ของแผนที่ไม่มีอยู่) */
    @ParameterizedTest(name = "{0}: ({1}, {2}, {3})")
    @CsvSource({
            "pk_study_plan_course,        P-BASIC, T8M01, 9",
            "uq_study_plan_course_order,  P-BASIC, T8F01, 1",
            "fk_study_plan_course_course, P-BASIC, ZZ999, 9",
            "fk_study_plan_course_plan,   -1,      T8M01, 1"})
    void insertPlanCourse_invalidKey_throwsConstraintViolation(String constraint, String plan, String courseCode, int sortOrder) {
        long planId = "P-BASIC".equals(plan) ? fixture.pBasic : Long.parseLong(plan);

        assertViolates(constraint, () -> execute(
                "INSERT INTO study_plan_course (plan_id, course_code, sort_order) VALUES (?1, ?2, ?3)",
                planId, courseCode, sortOrder));
    }

    /** UT-DAO-US8-27 */
    @Test
    void deletePlan_cascadesToPlanCoursesOnly() {
        assertEquals(11, count("SELECT COUNT(*) FROM study_plan_course"));

        execute("DELETE FROM study_plan WHERE plan_id = ?1", fixture.pBasic);

        assertEquals(0, count("SELECT COUNT(*) FROM study_plan_course WHERE plan_id = ?1", fixture.pBasic));
        assertEquals(7, count("SELECT COUNT(*) FROM study_plan_course"));
        assertEquals(1, count("SELECT COUNT(*) FROM study_plan_course WHERE plan_id = ?1 AND course_code = 'T8M02'",
                fixture.pSecond));
        assertEquals(1, count("SELECT COUNT(*) FROM course WHERE course_code = 'T8M01'"));
    }

    /** UT-DAO-US8-28 ข้อ 1–2 */
    @ParameterizedTest(name = "{0}: ({1}, {2})")
    @CsvSource({
            "uq_study_minor,       วิทยาการข้อมูล,     9",
            "uq_study_minor_order, วิศวกรรมซอฟต์แวร์, 1"})
    void insertMinor_duplicateNameOrOrder_throwsConstraintViolation(String constraint, String minorName, int sortOrder) {
        assertViolates(constraint, () -> insertMinor(CUR_A, minorName, sortOrder));
    }

    /** UT-DAO-US8-28 ข้อ 3 */
    @Test
    void insertMinor_sameOrderInOtherCurriculum_succeeds() {
        insertMinor(CUR_B, "วิศวกรรมซอฟต์แวร์", 1);

        assertEquals(1, count("SELECT COUNT(*) FROM study_minor WHERE curriculum_name = ?1 AND sort_order = 1", CUR_B));
    }

    /**
     * UT-DAO-US8-29 (ทุกค่าใส่ใน MN-1 แผนหัวข้อพิเศษ ตามแถวของ fixture)
     * และ UT-DAO-US8-33 (เพิ่มใน T09): plan_type นอก SPECIAL_PROJECT / CO_OP
     */
    @ParameterizedTest(name = "{0}: ({1}, {2}, {3}/{4}, {5})")
    @CsvSource({
            "ck_study_minor_course_year,      T8G01, SPECIAL_PROJECT, 2, 1, 9",
            "ck_study_minor_course_year,      T8G01, SPECIAL_PROJECT, 5, 1, 9",
            "ck_study_minor_course_semester,  T8G01, SPECIAL_PROJECT, 3, 3, 9",
            "pk_study_minor_course,           T8N01, SPECIAL_PROJECT, 4, 2, 9",
            "uq_study_minor_course_order,     T8G01, SPECIAL_PROJECT, 3, 1, 1",
            "fk_study_minor_course_course,    ZZ999, SPECIAL_PROJECT, 3, 1, 9",
            "ck_study_minor_course_plan_type, T8G01, MINOR,           3, 1, 9"})
    void insertMinorCourse_invalidRow_throwsConstraintViolation(String constraint, String courseCode, String planType,
                                                                int studyYear, int semester, int sortOrder) {
        assertViolates(constraint, () -> execute("""
                        INSERT INTO study_minor_course (minor_id, course_code, plan_type, study_year, semester, sort_order)
                        VALUES (?1, ?2, ?3, ?4, ?5, ?6)""",
                fixture.mn1, courseCode, planType, studyYear, semester, sortOrder));
    }

    /** UT-DAO-US8-33 (เพิ่มใน T09) วิชาเดียวกันใน MN-1 อยู่ได้อีกแถวถ้าเป็นแผนสหกิจ และ sort_order แยกตามแผน */
    @Test
    void insertMinorCourse_sameCourseOtherPlanType_succeeds() {
        execute("""
                INSERT INTO study_minor_course (minor_id, course_code, plan_type, study_year, semester, sort_order)
                VALUES (?1, 'T8N01', 'CO_OP', 3, 1, 1)""", fixture.mn1);

        assertEquals(2, count("SELECT COUNT(*) FROM study_minor_course WHERE minor_id = ?1 AND course_code = 'T8N01'",
                fixture.mn1));
    }

    /** UT-DAO-US8-30 */
    @Test
    void deleteMinor_cascadesToMinorCoursesOnly() {
        assertEquals(6, count("SELECT COUNT(*) FROM study_minor_course"));

        execute("DELETE FROM study_minor WHERE minor_id = ?1", fixture.mn1);

        assertEquals(0, count("SELECT COUNT(*) FROM study_minor_course WHERE minor_id = ?1", fixture.mn1));
        assertEquals(2, count("SELECT COUNT(*) FROM study_minor_course"));
        assertEquals(1, count("SELECT COUNT(*) FROM study_minor_course WHERE minor_id = ?1", fixture.mn2));
        assertEquals(1, count("SELECT COUNT(*) FROM study_minor_course WHERE minor_id = ?1", fixture.mnOther));
        assertEquals(4, count("SELECT COUNT(*) FROM course WHERE course_code IN ('T8N01', 'T8N02', 'T8M05', 'T8F01')"));
    }

    private static void assertViolates(String constraint, Executable insert) {
        PersistenceException ex = assertThrows(PersistenceException.class, insert);

        ConstraintViolationException violation = findCause(ex);
        assertNotNull(violation, "ต้องมี ConstraintViolationException อยู่ข้างใน: " + ex);
        assertTrue(constraint.equalsIgnoreCase(violation.getConstraintName()),
                "คาดว่าล้มที่ " + constraint + " แต่ได้ " + violation.getConstraintName());
    }

    private static ConstraintViolationException findCause(Throwable ex) {
        for (Throwable t = ex; t != null; t = t.getCause()) {
            if (t instanceof ConstraintViolationException violation) {
                return violation;
            }
        }
        return null;
    }

    private void insertMinor(String curriculumName, String minorName, int sortOrder) {
        execute("INSERT INTO study_minor (department, curriculum_name, minor_name, sort_order) VALUES (?1, ?2, ?3, ?4)",
                CS, curriculumName, minorName, sortOrder);
    }

    private void execute(String sql, Object... params) {
        var query = em.getEntityManager().createNativeQuery(sql);
        for (int i = 0; i < params.length; i++) {
            query.setParameter(i + 1, params[i]);
        }
        query.executeUpdate();
    }

    private int count(String sql, Object... params) {
        var query = em.getEntityManager().createNativeQuery(sql);
        for (int i = 0; i < params.length; i++) {
            query.setParameter(i + 1, params[i]);
        }
        return ((Number) query.getSingleResult()).intValue();
    }
}
