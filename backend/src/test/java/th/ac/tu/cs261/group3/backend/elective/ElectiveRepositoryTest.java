package th.ac.tu.cs261.group3.backend.elective;

import jakarta.persistence.PersistenceUnitUtil;
import org.hibernate.Hibernate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import th.ac.tu.cs261.group3.backend.support.DaoTest;
import th.ac.tu.cs261.group3.backend.support.ElectiveDaoFixture;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static th.ac.tu.cs261.group3.backend.elective.ElectiveTag.*;
import static th.ac.tu.cs261.group3.backend.support.ElectiveDaoFixture.*;

/**
 * US6-T12 UT-DAO-US6-01 – 18: {@link ElectiveRepository#searchRecommended} และ
 * {@link ElectiveRepository#findRecommendedByCode} พร้อมการอ่าน mapping ของผลลัพธ์
 * <p>
 * ผลค้นหาตรวจเป็นชุดรหัสวิชา (ไม่สนลำดับ) และจำนวนต้องเท่ากับชุด คือไม่มีวิชาซ้ำ
 * เพราะ repository ไม่สัญญาลำดับ (service เรียงตาม {@link InterestGroup})
 */
@DaoTest
class ElectiveRepositoryTest {

    private static final Set<String> ALL_2568 = Set.of(F, N, P, S, E, M, X);

    @Autowired
    private TestEntityManager em;

    @Autowired
    private ElectiveRepository repository;

    private ElectiveDaoFixture fixture;

    @BeforeEach
    void setUp() {
        fixture = ElectiveDaoFixture.persist(em);
    }

    // ---------- A. searchRecommended ----------

    /** UT-DAO-US6-01 */
    @Test
    void searchRecommended_wholeYear_returnsEligibleCoursesOnce() {
        assertCodes(ALL_2568, repository.searchRecommended(2568, null, null));
    }

    /** UT-DAO-US6-02 */
    @Test
    void searchRecommended_otherYear_returnsOnlyCoursesWithSectionInThatYear() {
        assertCodes(Set.of(F, OY), repository.searchRecommended(2569, null, null));
    }

    /** UT-DAO-US6-03 */
    @ParameterizedTest(name = "q=\"{0}\"")
    @NullSource
    @ValueSource(strings = {"", "   "})
    void searchRecommended_blankKeyword_doesNotFilter(String q) {
        assertCodes(ALL_2568, repository.searchRecommended(2568, q, null));
    }

    /** UT-DAO-US6-04 */
    @Test
    void searchRecommended_lowerCaseCodePrefixWithSpaces_matchesCourseCode() {
        assertCodes(Set.of(F), repository.searchRecommended(2568, "  t6fr  ", null));
    }

    /** UT-DAO-US6-05 */
    @ParameterizedTest(name = "q=\"{0}\"")
    @MethodSource("englishWordPrefixCases")
    void searchRecommended_englishName_matchesOnlyWordPrefix(String q, Set<String> expected) {
        assertCodes(expected, repository.searchRecommended(2568, q, null));
    }

    static Stream<Arguments> englishWordPrefixCases() {
        return Stream.of(
                Arguments.of("FRE", Set.of(F)),
                Arguments.of("ADJU", Set.of(P)),
                Arguments.of("oriented", Set.of(M)), // ต้นคำหลัง "-"
                Arguments.of("JUST", Set.of()));     // อยู่กลางคำ ADJUSTMENT
    }

    /** UT-DAO-US6-06 */
    @Test
    void searchRecommended_thaiSubstring_matchesThaiName() {
        List<ElectiveInfo> result = repository.searchRecommended(2568, "บุคลิก", null);

        assertCodes(Set.of(P), result);
        assertEquals(P_NAME_TH, result.get(0).getCourseNameTh());
    }

    /** UT-DAO-US6-07 */
    @ParameterizedTest(name = "group={0}")
    @EnumSource(InterestGroup.class)
    void searchRecommended_eachGroup_returnsOnlyCoursesOfThatGroup(InterestGroup group) {
        Map<InterestGroup, Set<String>> expected = Map.of(
                InterestGroup.LANGUAGE, Set.of(F, N),
                InterestGroup.PSYCHOLOGY, Set.of(P),
                InterestGroup.SOCIETY, Set.of(S), // ไม่ได้ GE แม้ metadata เป็น SOCIETY
                InterestGroup.SCIENCE, Set.of(E, X),
                InterestGroup.MEDIA, Set.of(M));

        assertCodes(expected.get(group), repository.searchRecommended(2568, null, group));
    }

    /** UT-DAO-US6-08 */
    @ParameterizedTest(name = "q=\"{0}\"")
    @ValueSource(strings = {"100%", "100%_", "100%_!", "[LAB]"})
    void searchRecommended_likeSpecialCharacters_matchLiterally(String q) {
        fixture.addWild();

        assertCodes(Set.of(X), repository.searchRecommended(2568, q, null));
    }

    /** UT-DAO-US6-09 */
    @ParameterizedTest(name = "({0}, {1}, {2})")
    @MethodSource("combinedFilterCases")
    void searchRecommended_combinedFilters_areAnded(int year, String q, InterestGroup group, Set<String> expected) {
        assertCodes(expected, repository.searchRecommended(year, q, group));
    }

    static Stream<Arguments> combinedFilterCases() {
        return Stream.of(
                Arguments.of(2568, "T6FR", InterestGroup.LANGUAGE, Set.of(F)),
                Arguments.of(2568, "T6FR", InterestGroup.SCIENCE, Set.of()),
                Arguments.of(2569, "T6PY", InterestGroup.PSYCHOLOGY, Set.of()));
    }

    /** UT-DAO-US6-10 */
    @ParameterizedTest(name = "q={0}")
    @ValueSource(strings = {NI, NR, OY, NS, MA, GE})
    void searchRecommended_ineligibleCourse_returnsEmptyList(String code) {
        assertEquals(List.of(), repository.searchRecommended(2568, code, null));
    }

    /** UT-DAO-US6-11 */
    @Test
    void searchRecommended_noMatch_returnsEmptyList() {
        assertEquals(List.of(), repository.searchRecommended(2568, "T6ZZ999", null));
        assertEquals(List.of(), repository.searchRecommended(2567, null, null));
    }

    /** UT-DAO-US6-12 */
    @Test
    void searchRecommended_fetchesCourseAndTagsWithoutDuplicateRoot() {
        List<ElectiveInfo> result = repository.searchRecommended(2568, "T6FR", null);

        assertEquals(1, result.size());
        ElectiveInfo info = result.get(0);
        PersistenceUnitUtil util = em.getEntityManager().getEntityManagerFactory().getPersistenceUnitUtil();
        assertTrue(util.isLoaded(info, "course"), "course ต้อง fetch มาแล้ว");
        assertTrue(util.isLoaded(info, "tags"), "tags ต้อง fetch มาแล้ว");

        em.clear();

        assertEquals(F, info.getCourseCode());
        assertEquals("FRENCH FOR EVERYDAY LIFE", info.getCourse().getCourseName());
        assertEquals(F_NAME_TH, info.getCourseNameTh());
        assertTrue(info.isRequiresQuota());
        assertEquals(Set.of(KIND_INSTRUCTOR, NO_PREREQUISITE), info.getTags());
    }

    // ---------- B. findRecommendedByCode / mapping ----------

    /** UT-DAO-US6-13 */
    @Test
    void findRecommendedByCode_eligibleCourse_returnsMappedInfo() {
        ElectiveInfo info = repository.findRecommendedByCode(F, 2568).orElseThrow();

        assertEquals(F, info.getCourseCode());
        assertEquals(F, info.getCourse().getCourseCode());
        assertEquals("FRENCH FOR EVERYDAY LIFE", info.getCourse().getCourseName());
        assertEquals(3, info.getCourse().getCredits());
        assertEquals(F_NAME_TH, info.getCourseNameTh());
        assertEquals(InterestGroup.LANGUAGE, info.getInterestGroup());
        assertTrue(info.isRequiresQuota());
        assertEquals(Set.of(KIND_INSTRUCTOR, NO_PREREQUISITE), info.getTags());
    }

    /** UT-DAO-US6-14 */
    @Test
    void findRecommendedByCode_unknownCode_returnsEmpty() {
        assertEquals(Optional.empty(), repository.findRecommendedByCode("T6ZZ999", 2568));
    }

    /** UT-DAO-US6-15 */
    @ParameterizedTest(name = "code={0}")
    @ValueSource(strings = {NI, NR, OY, NS, MA, GE})
    void findRecommendedByCode_ineligibleCourse_returnsEmpty(String code) {
        assertEquals(Optional.empty(), repository.findRecommendedByCode(code, 2568));
    }

    /** UT-DAO-US6-16 */
    @Test
    void findRecommendedByCode_usesRequestedYearForOpenSection() {
        assertTrue(repository.findRecommendedByCode(F, 2569).isPresent(), "F มี S-F69");
        assertEquals(Optional.empty(), repository.findRecommendedByCode(P, 2569), "P มี Sec เฉพาะ 2568");
    }

    /** UT-DAO-US6-17 */
    @Test
    void findRecommendedByCode_thaiReviewsSortedBySortOrder() {
        ElectiveInfo info = repository.findRecommendedByCode(F, 2568).orElseThrow();
        Hibernate.initialize(info.getDescription());

        List<String> expected = List.of(REVIEW_F0, REVIEW_F1);
        assertEquals(expected, info.getDescription());

        em.clear();

        assertEquals(expected, info.getDescription(), "อ่านหลัง clear ได้เพราะ initialize ไว้แล้ว");
    }

    /** UT-DAO-US6-18 */
    @Test
    void findRecommendedByCode_courseWithoutTags_isStillReturned() {
        ElectiveInfo info = repository.findRecommendedByCode(N, 2568).orElseThrow();

        assertEquals(Set.of(), info.getTags());
        assertEquals(List.of(defaultReview(N)), info.getDescription());
    }

    private static void assertCodes(Set<String> expected, List<ElectiveInfo> actual) {
        List<String> codes = actual.stream().map(ElectiveInfo::getCourseCode).toList();
        assertEquals(expected, Set.copyOf(codes));
        assertEquals(expected.size(), codes.size(), "ห้ามมีวิชาซ้ำ: " + codes);
    }
}
