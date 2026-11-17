package th.ac.tu.cs261.group3.backend.elective;

import jakarta.persistence.PersistenceException;
import org.hibernate.exception.ConstraintViolationException;
import org.hibernate.query.NativeQuery;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import th.ac.tu.cs261.group3.backend.support.DaoTest;
import th.ac.tu.cs261.group3.backend.support.ElectiveDaoFixture;

import java.sql.SQLException;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static th.ac.tu.cs261.group3.backend.support.ElectiveDaoFixture.*;

/**
 * US6-T12 UT-DAO-US6-27 – 35: constraint ของ elective_info, elective_tag, elective_review_point
 * ตาม US6-T06 ER Diagram (insert / delete ด้วย native SQL แบบ bind parameter)
 * <p>
 * กรณีที่คาดว่า throw อยู่ขั้นสุดท้ายของ test เพราะ session ใช้ต่อไม่ได้หลัง constraint ล้ม
 * ค่า NULL bind ด้วยชนิดของคอลัมน์ ({@link Null}) ให้ทดสอบ NOT NULL จริง ไม่ล้มเพราะ driver อนุมานชนิดผิด
 * <p>
 * NOT NULL ไม่มีชื่อ constraint ใน SQL Server จึงตรวจ error 515 และชื่อคอลัมน์ ไม่ยึดข้อความ error ทั้งประโยค
 */
@DaoTest
class ElectiveSchemaConstraintTest {

    /** SQL Server: Cannot insert the value NULL into column */
    private static final int SQL_SERVER_NOT_NULL = 515;
    private static final String NOT_NULL = "NOT NULL:";

    private static final String INSERT_INFO =
            "INSERT INTO elective_info (course_code, course_name_th, interest_group, requires_quota) VALUES (?1, ?2, ?3, ?4)";
    private static final String INSERT_TAG = "INSERT INTO elective_tag (course_code, tag) VALUES (?1, ?2)";
    private static final String INSERT_REVIEW =
            "INSERT INTO elective_review_point (course_code, sort_order, review_text) VALUES (?1, ?2, ?3)";

    @Autowired
    private TestEntityManager em;

    @BeforeEach
    void setUp() {
        ElectiveDaoFixture.persist(em);
    }

    /** UT-DAO-US6-27 */
    @Test
    void insertInfo_duplicateCourseCode_violatesPrimaryKey() {
        assertEquals(1, count("SELECT COUNT(*) FROM course WHERE course_code = ?1", F), "course parent ต้องมีอยู่");

        assertViolates("pk_elective_info", () -> execute(INSERT_INFO, F, "ชื่อซ้ำ", "LANGUAGE", false));
    }

    /** UT-DAO-US6-28 */
    @Test
    void insertInfo_unknownCourse_violatesForeignKey() {
        assertViolates("fk_elective_info_course",
                () -> execute(INSERT_INFO, "T6MISS01", "ไม่มีวิชาแม่", "LANGUAGE", false));
    }

    /** UT-DAO-US6-29 ใช้ NI ซึ่งมี course แต่ยังไม่มี elective_info */
    @ParameterizedTest(name = "{0}: name={1}, group={2}, quota={3}")
    @MethodSource("invalidInfoRows")
    void insertInfo_invalidField_violatesConstraint(String expected, Object nameTh, Object group, Object quota) {
        assertEquals(0, count("SELECT COUNT(*) FROM elective_info WHERE course_code = ?1", NI));

        assertFails(expected, () -> execute(INSERT_INFO, NI, nameTh, group, quota));
    }

    static Stream<Arguments> invalidInfoRows() {
        return Stream.of(
                Arguments.of("ck_elective_info_group", "ข้อมูลทดสอบ", "UNKNOWN", false),
                Arguments.of(NOT_NULL + "interest_group", "ข้อมูลทดสอบ", new Null(String.class), false),
                Arguments.of(NOT_NULL + "course_name_th", new Null(String.class), "LANGUAGE", false),
                Arguments.of("ck_elective_info_name", "   ", "LANGUAGE", false),
                Arguments.of(NOT_NULL + "requires_quota", "ข้อมูลทดสอบ", "LANGUAGE", new Null(Boolean.class)));
    }

    /** UT-DAO-US6-30 */
    @Test
    void insertTag_duplicateTagOfSameCourse_violatesPrimaryKey() {
        assertViolates("pk_elective_tag", () -> execute(INSERT_TAG, F, "KIND_INSTRUCTOR"));
    }

    /** UT-DAO-US6-31 N มี elective_info และยังไม่มี tag */
    @ParameterizedTest(name = "{0}: tag={1}")
    @MethodSource("invalidTags")
    void insertTag_invalidValue_violatesConstraint(String expected, Object tag) {
        assertFails(expected, () -> execute(INSERT_TAG, N, tag));
    }

    static Stream<Arguments> invalidTags() {
        return Stream.of(
                Arguments.of("ck_elective_tag_value", "UNKNOWN_TAG"),
                Arguments.of(NOT_NULL + "tag", new Null(String.class)));
    }

    /** UT-DAO-US6-32 */
    @Test
    void insertReview_duplicateSortOrder_violatesPrimaryKey() {
        assertViolates("pk_elective_review_point", () -> execute(INSERT_REVIEW, F, 0, "รีวิวซ้ำตำแหน่ง"));
    }

    /** UT-DAO-US6-33 N มีรีวิว sort_order 0 อยู่แล้ว ข้อมูลปกติคือ (N, 1, "รีวิวเพิ่ม") */
    @ParameterizedTest(name = "{0}: order={1}, text={2}")
    @MethodSource("invalidReviews")
    void insertReview_invalidOrderOrText_violatesConstraint(String expected, Object sortOrder, Object text) {
        assertFails(expected, () -> execute(INSERT_REVIEW, N, sortOrder, text));
    }

    static Stream<Arguments> invalidReviews() {
        return Stream.of(
                Arguments.of("ck_elective_review_order", -1, "รีวิวเพิ่ม"),
                Arguments.of(NOT_NULL + "sort_order", new Null(Integer.class), "รีวิวเพิ่ม"),
                Arguments.of("ck_elective_review_text", 1, "   "),
                Arguments.of(NOT_NULL + "review_text", 1, new Null(String.class)));
    }

    /** UT-DAO-US6-34 */
    @Test
    void deleteInfo_cascadesToOwnTagsAndReviewsOnly() {
        execute("DELETE FROM elective_info WHERE course_code = ?1", F);
        em.flush();
        em.clear();

        assertEquals(0, count("SELECT COUNT(*) FROM elective_info WHERE course_code = ?1", F));
        assertEquals(0, count("SELECT COUNT(*) FROM elective_tag WHERE course_code = ?1", F));
        assertEquals(0, count("SELECT COUNT(*) FROM elective_review_point WHERE course_code = ?1", F));

        assertEquals(1, count("SELECT COUNT(*) FROM course WHERE course_code = ?1", F));
        assertEquals(4, count("SELECT COUNT(*) FROM section WHERE course_code = ?1", F));
        assertEquals(5, count("""
                SELECT COUNT(*) FROM schedule_slot ss JOIN section s ON s.section_id = ss.section_id
                WHERE s.course_code = ?1""", F));

        assertEquals(1, count("SELECT COUNT(*) FROM elective_info WHERE course_code = ?1", P));
        assertEquals(2, count("SELECT COUNT(*) FROM elective_tag WHERE course_code = ?1", P));
        assertEquals(1, count("SELECT COUNT(*) FROM elective_review_point WHERE course_code = ?1", P));
    }

    /** UT-DAO-US6-35 NI มี course แต่ไม่มี elective_info */
    @ParameterizedTest(name = "{0}")
    @MethodSource("orphanChildren")
    void insertChild_withoutElectiveInfo_violatesForeignKey(String constraint, String sql, Object second, Object third) {
        Object[] params = third == null ? new Object[]{NI, second} : new Object[]{NI, second, third};

        assertViolates(constraint, () -> execute(sql, params));
    }

    static Stream<Arguments> orphanChildren() {
        return Stream.of(
                Arguments.of("fk_elective_tag_info", INSERT_TAG, "KIND_INSTRUCTOR", null),
                Arguments.of("fk_elective_review_info", INSERT_REVIEW, 0, "รีวิวทดสอบ"));
    }

    /** ค่า NULL ที่ bind ด้วยชนิดของคอลัมน์ */
    record Null(Class<?> type) {
        @Override
        public String toString() {
            return "NULL";
        }
    }

    private static void assertFails(String expected, Executable insert) {
        if (expected.startsWith(NOT_NULL)) {
            assertNotNullViolation(expected.substring(NOT_NULL.length()), insert);
        } else {
            assertViolates(expected, insert);
        }
    }

    private static void assertViolates(String constraint, Executable insert) {
        PersistenceException ex = assertThrows(PersistenceException.class, insert);

        ConstraintViolationException violation = findCause(ex, ConstraintViolationException.class);
        assertNotNull(violation, "ต้องมี ConstraintViolationException อยู่ข้างใน: " + ex);
        assertTrue(constraint.equalsIgnoreCase(violation.getConstraintName()),
                "คาดว่าล้มที่ " + constraint + " แต่ได้ " + violation.getConstraintName());
    }

    private static void assertNotNullViolation(String column, Executable insert) {
        PersistenceException ex = assertThrows(PersistenceException.class, insert);

        SQLException sql = findCause(ex, SQLException.class);
        assertNotNull(sql, "ต้องมี SQLException อยู่ข้างใน: " + ex);
        assertEquals(SQL_SERVER_NOT_NULL, sql.getErrorCode(), "คาดว่าเป็น NOT NULL แต่ได้: " + sql.getMessage());
        assertTrue(sql.getMessage().contains("'" + column + "'"),
                "คาดว่า NULL ที่คอลัมน์ " + column + " แต่ได้: " + sql.getMessage());
    }

    private static <T extends Throwable> T findCause(Throwable ex, Class<T> type) {
        for (Throwable t = ex; t != null; t = t.getCause()) {
            if (type.isInstance(t)) {
                return type.cast(t);
            }
        }
        return null;
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private void execute(String sql, Object... params) {
        NativeQuery<?> query = em.getEntityManager().createNativeQuery(sql).unwrap(NativeQuery.class);
        for (int i = 0; i < params.length; i++) {
            if (params[i] instanceof Null(Class<?> type)) {
                query.setParameter(i + 1, null, (Class) type);
            } else {
                query.setParameter(i + 1, params[i]);
            }
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
