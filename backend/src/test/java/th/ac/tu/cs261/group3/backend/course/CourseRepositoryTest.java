package th.ac.tu.cs261.group3.backend.course;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import th.ac.tu.cs261.group3.backend.support.DaoFixture;
import th.ac.tu.cs261.group3.backend.support.DaoTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * US1-T12 UT-DAO-01 – 05: CourseRepository.search
 */
@DaoTest
class CourseRepositoryTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private CourseRepository repository;

    @BeforeEach
    void setUp() {
        DaoFixture.persist(em);
    }

    private List<String> search(String q, CourseCategory category) {
        return repository.search(2568, 1, q, category).stream().map(Course::getCourseCode).toList();
    }

    /** UT-DAO-01 */
    @Test
    void search_byTermOnly_returnsOfferedCoursesSortedByCode() {
        List<String> expected = List.of("CS111", "FE001", "LAS101", "MA211", "TU107", "TU109");

        // CS111 มี 2 กลุ่ม 4 คาบในภาคนี้ แต่ต้องได้ครั้งเดียว และไม่มี CS213 ที่เปิดเฉพาะ 2568/2
        assertEquals(expected, search(null, null));
        assertEquals(expected, search("", null));
    }

    /** UT-DAO-02 */
    @Test
    void search_codePrefixIgnoreCase_returnsMatchingCourses() {
        assertEquals(List.of("CS111"), search("cs1", null));
        // รหัสต้องขึ้นต้นด้วย q ไม่ใช่มี q อยู่กลางรหัส
        assertEquals(List.of(), search("S11", null));
    }

    /**
     * UT-DAO-03 ปรับตาม spec ปัจจุบัน (ค้นชื่อแบบคำขึ้นต้นด้วย q แทนแบบมี q อยู่ตรงไหนก็ได้)
     * ภาษาไทยไม่เว้นวรรคระหว่างคำ "ถ่ายภาพ" จึงไม่ตรงกับ "การถ่ายภาพเบื้องต้น" แต่ "การถ่าย" ตรง
     */
    @Test
    void search_nameWordPrefixIgnoreCase_returnsMatchingCourses() {
        assertEquals(List.of("LAS101"), search("thinking", null));
        // ยืนยันว่า parameter ภาษาไทยส่งเป็น NVARCHAR ไม่กลายเป็น ?
        assertEquals(List.of("FE001"), search("การถ่าย", null));
        assertEquals(List.of(), search("ถ่ายภาพ", null));
    }

    /**
     * Regression (CI flaky): ถ้า query เคย bind prefix เป็น null ก่อน การค้นภาษาไทยบน connection เดิมเคยไม่เจออะไรเลย
     * เรียกต่อกันใน method เดียวเพื่อไม่ให้ผลขึ้นกับลำดับที่ JUnit รัน test
     */
    @Test
    void search_thaiNameAfterSearchWithoutQuery_stillMatches() {
        assertEquals(6, search(null, null).size());
        assertEquals(List.of("FE001"), search("การถ่าย", null));
    }

    /** UT-DAO-04 */
    @Test
    void search_byCategory_returnsOnlyThatCategory() {
        assertEquals(List.of("LAS101", "TU107", "TU109"), search(null, CourseCategory.GENERAL_EDUCATION));
        assertEquals(List.of("FE001"), search(null, CourseCategory.FREE_ELECTIVE));
        // CS111 ไม่ใช่หมวดศึกษาทั่วไป
        assertEquals(List.of(), search("cs", CourseCategory.GENERAL_EDUCATION));
    }

    /** UT-DAO-05 */
    @Test
    void search_likeWildcardInQuery_isTreatedLiterally() {
        // ถ้าไม่ escape ข้อแรกจะได้ CS111 และข้อสองจะได้ทุกวิชา
        assertEquals(List.of(), search("_S1", null));
        assertEquals(List.of(), search("%", null));
    }
}
