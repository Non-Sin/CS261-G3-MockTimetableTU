package th.ac.tu.cs261.group3.backend.quota;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.course.CourseRepository;
import th.ac.tu.cs261.group3.backend.course.SectionRepository;
import th.ac.tu.cs261.group3.backend.support.DaoTest;
import th.ac.tu.cs261.group3.backend.support.QuotaFixture;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** US7-T12 UT-DAO-US7-01 ถึง 21 ทดสอบ query กับ SQL Server จริง */
@DaoTest
class QuotaRepositoryTest {

    @Autowired private TestEntityManager em;
    @Autowired private CourseRepository courses;
    @Autowired private SectionRepository sections;
    @Autowired private QuotaInfoRepository infos;
    @Autowired private QuotaRoundRepository rounds;

    @BeforeEach
    void setUp() {
        QuotaFixture.persist(em);
    }

    @Test // 01
    void searchAllCourses_lowercaseCode_returnsSortedMatches() {
        assertThat(search("q7el", null)).containsExactly("Q7EL105", "Q7EL295", "Q7EL395");
    }

    @Test // 02
    void searchAllCourses_notOfferedAndWordAfterHyphen_returnsCourse() {
        assertThat(search("Q7OFF", null)).containsExactly("Q7OFF00");
        assertThat(search("data", null)).containsExactly("Q7OFF00");
    }

    @Test // 03
    void searchAllCourses_thaiSubstring_returnsThaiName() {
        assertThat(courses.searchAllCourses("แคลคูลัส", null)).singleElement()
                .satisfies(course -> {
                    assertThat(course.getCourseCode()).isEqualTo("Q7MA211");
                    assertThat(course.getCourseNameTh()).isEqualTo("แคลคูลัส 1");
                });
    }

    @Test // 04
    void searchAllCourses_queryAndCodes_intersectsFilters() {
        assertThat(search("Q7EL", List.of("Q7EL105", "Q7MA211"))).containsExactly("Q7EL105");
    }

    @Test // 05
    void searchAllCourses_likeWildcards_areLiteralAndRespectWordBoundary() {
        assertThat(search("50_test!", null)).containsExactly("Q7NODAT");
        assertThat(search("Topic_100%", null)).containsExactly("Q7NODAT");
        assertThat(search("100%", null)).isEmpty();
        assertThat(search("50Xtest!", null)).isEmpty();
        assertThat(search("[", null)).isEmpty();
    }

    @Test // 06 รวม regression ค้นภาษาไทยหลังคำค้น null บน connection เดียวกัน
    void searchAllCourses_noQuery_handlesOptionalCodesAndSubsequentThaiQuery() {
        var codes = List.of("Q7MA211", "Q7EL105");
        assertThat(search(null, codes)).containsExactly("Q7EL105", "Q7MA211");
        assertThat(search("", codes)).containsExactly("Q7EL105", "Q7MA211");
        assertThat(search(null, null)).hasSize(8).isSorted();
        assertThat(search("แคลคูลัส", null)).containsExactly("Q7MA211");
    }

    @Test // 07
    void searchAllCourses_unknownQuery_returnsEmpty() {
        assertThat(search("UNKNOWN999", null)).isEmpty();
    }

    @Test // 08
    void searchAllCourses_emptyCodes_returnsEmpty() {
        assertThat(search("Q7EL", List.of())).isEmpty();
        assertThat(search(null, List.of())).isEmpty();
    }

    @Test // 09
    void findById_unknownCode_returnsEmpty() {
        assertThat(courses.findById("UNKNOWN999")).isEmpty();
    }

    @Test // 10
    void findOfferedSemestersByCourseCodesAndYear_multipleSections_returnsDistinctSortedTerms() {
        assertThat(sections.findOfferedSemestersByCourseCodesAndYear(List.of("Q7MA211", "Q7EL105"), 2569))
                .containsExactly(new Object[]{"Q7EL105", 1}, new Object[]{"Q7EL105", 2}, new Object[]{"Q7MA211", 2});
    }

    @Test // 11
    void findOfferedSemestersByCourseCodesAndYear_previousYearOnly_returnsEmpty() {
        assertThat(sections.findOfferedSemestersByCourseCodesAndYear(List.of("Q7OFF00"), 2569)).isEmpty();
    }

    @Test // 12
    void findOfferedSemestersByCourseCodesAndYear_emptyCodes_returnsEmpty() {
        assertThat(sections.findOfferedSemestersByCourseCodesAndYear(List.of(), 2569)).isEmpty();
    }

    @Test // 13
    void findWithDetailsByCourseCodes_multipleChannels_loadsOrderedCollectionsWithoutDuplicates() {
        List<CourseQuotaInfo> result = infos.findWithDetailsByCourseCodes(List.of("Q7EL395", "Q7EL105"));
        assertThat(result).extracting(CourseQuotaInfo::getCourseCode).containsExactly("Q7EL105", "Q7EL395");
        result.forEach(this::assertDetailsLoaded);
        em.clear(); // หลัง detach ก็ต้องอ่าน collection ได้ (open-in-view=false)
        assertThat(result.getFirst().getChannels()).extracting(QuotaChannel::getChannelType)
                .containsExactly(QuotaChannelType.QUOTA_SYSTEM, QuotaChannelType.ONLINE_FORM, QuotaChannelType.FACULTY_OFFICE);
        assertThat(result.getFirst().getContacts()).hasSize(1);
        assertThat(result.get(1).getConditions()).extracting(QuotaCondition::getSortOrder).containsExactly(1, 2);
    }

    @Test // 14
    void findWithDetailsByCourseCodes_nullableFields_preservesNullsAndRelatedCode() {
        var result = infos.findWithDetailsByCourseCodes(List.of("Q7PC280", "Q7EL395"));
        var academic = result.getFirst();
        assertThat(academic.getConditions()).extracting(QuotaCondition::getRelatedCourseCode).containsExactly("Q7EL295", null);
        var astronomy = result.get(1);
        assertThat(astronomy.getChannels()).singleElement().satisfies(channel -> assertThat(channel.getUrl()).isNull());
        assertThat(astronomy.getContacts()).singleElement().satisfies(contact -> {
            assertThat(contact.getLabel()).isEqualTo("MS Teams wchumpon@tu.ac.th");
            assertThat(contact.getUrl()).isNull();
        });
    }

    @Test // 15
    void findWithDetailsByCourseCodes_notRequired_loadsEmptyCollections() {
        var info = infos.findWithDetailsByCourseCodes(List.of("Q7EL295")).getFirst();
        assertDetailsLoaded(info);
        assertThat(info.isQuotaRequired()).isFalse();
        assertThat(info.getConditions()).isEmpty();
        assertThat(info.getChannels()).isEmpty();
        assertThat(info.getContacts()).isEmpty();
    }

    @Test // 16
    void findWithDetailsByCourseCodes_missingInfoAndUnknownCode_returnsEmpty() {
        assertThat(infos.findWithDetailsByCourseCodes(List.of("Q7NODAT", "UNKNOWN999"))).isEmpty();
    }

    @Test // 17
    void findWithDetailsByCourseCodes_emptyCodes_returnsEmpty() {
        assertThat(infos.findWithDetailsByCourseCodes(List.of())).isEmpty();
    }

    @Test
    void findWithDetailsByCourseCodes_crossProduct_doesNotDuplicateAnyCollection() {
        em.getEntityManager().createNativeQuery("""
                INSERT INTO quota_channel (course_code, sort_order, channel_type, label)
                VALUES ('Q7EL395', 2, 'OTHER', 'Second'), ('Q7EL395', 1, 'INSTRUCTOR', 'First')""").executeUpdate();
        em.getEntityManager().createNativeQuery("""
                INSERT INTO quota_contact (course_code, sort_order, organization_name, label)
                VALUES ('Q7EL395', 2, 'LITU', 'Second'), ('Q7EL395', 1, 'LITU', 'First')""").executeUpdate();
        em.clear();
        var info = infos.findWithDetailsByCourseCodes(List.of("Q7EL395")).getFirst();
        assertDetailsLoaded(info);
        em.clear();
        // 2 conditions × 2 channels × 2 contacts = 8 SQL rows แต่แต่ละ Set ต้องมี 2 รายการ
        assertThat(info.getConditions()).extracting(QuotaCondition::getSortOrder).containsExactly(1, 2);
        assertThat(info.getChannels()).extracting(QuotaChannel::getSortOrder).containsExactly(1, 2);
        assertThat(info.getContacts()).extracting(QuotaContact::getSortOrder).containsExactly(1, 2);
    }

    @Test // 18
    void findByCourseCodesAndTerm_multipleRounds_filtersYearAndTermAndOrdersNumbers() {
        var result = rounds.findByCourseCodesAndTerm(List.of("Q7EL105", "Q7AN347"), 2569, 2);
        assertThat(result).hasSize(6);
        assertThat(result.subList(0, 4)).extracting(QuotaRound::getRoundNo).containsExactly(1, 2, 3, 4);
        assertThat(result.subList(0, 4)).allSatisfy(round -> {
            assertThat(round.getQuotaInfo().getCourseCode()).isEqualTo("Q7AN347");
            assertThat(round.getStartTime()).isEqualTo(LocalTime.of(9, 0));
            assertThat(round.getEndTime()).isEqualTo(LocalTime.of(16, 0));
        });
        assertThat(result.subList(4, 6)).extracting(QuotaRound::getRoundNo).containsExactly(1, 2);
        assertThat(result).allSatisfy(round -> {
            assertThat(round.getAcademicYear()).isEqualTo(2569);
            assertThat(round.getSemester()).isEqualTo(2);
        });
    }

    @Test // 19
    void findByCourseCodesAndTerm_deadlineOnly_preservesNullableStartAndEndTime() {
        assertThat(rounds.findByCourseCodesAndTerm(List.of("Q7MA211"), 2569, 2)).singleElement().satisfies(round -> {
            assertThat(round.getStartDate()).isNull();
            assertThat(round.getStartTime()).isNull();
            assertThat(round.getLabel()).isNull();
            assertThat(round.getEndDate()).isEqualTo(LocalDate.of(2026, 10, 20));
            assertThat(round.getEndTime()).isEqualTo(LocalTime.of(15, 0));
        });
    }

    @Test // 20
    void findByCourseCodesAndTerm_noRoundsInTerm_returnsEmpty() {
        assertThat(rounds.findByCourseCodesAndTerm(List.of("Q7EL295", "Q7EL105"), 2569, 1)).isEmpty();
    }

    @Test // 21
    void findByCourseCodesAndTerm_emptyCodes_returnsEmpty() {
        assertThat(rounds.findByCourseCodesAndTerm(List.of(), 2569, 2)).isEmpty();
    }

    private List<String> search(String q, List<String> codes) {
        return courses.searchAllCourses(q, codes).stream().map(Course::getCourseCode).toList();
    }

    private void assertDetailsLoaded(CourseQuotaInfo info) {
        var util = em.getEntityManager().getEntityManagerFactory().getPersistenceUnitUtil();
        assertThat(util.isLoaded(info, "conditions")).isTrue();
        assertThat(util.isLoaded(info, "channels")).isTrue();
        assertThat(util.isLoaded(info, "contacts")).isTrue();
    }
}
