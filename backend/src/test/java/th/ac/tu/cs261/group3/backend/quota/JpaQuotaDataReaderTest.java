package th.ac.tu.cs261.group3.backend.quota;

import org.hibernate.SessionFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import th.ac.tu.cs261.group3.backend.quota.data.JpaQuotaDataReader;
import th.ac.tu.cs261.group3.backend.quota.dto.QuotaChannelResponse;
import th.ac.tu.cs261.group3.backend.quota.dto.QuotaConditionResponse;
import th.ac.tu.cs261.group3.backend.quota.dto.QuotaRoundResponse;
import th.ac.tu.cs261.group3.backend.support.DaoTest;
import th.ac.tu.cs261.group3.backend.support.QuotaFixture;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** ทดสอบตัวเชื่อม T08/T09 และจำนวน query จริง เพื่อจับปัญหา N+1 */
@DaoTest
@Import(JpaQuotaDataReader.class)
@TestPropertySource(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
class JpaQuotaDataReaderTest {

    @Autowired private TestEntityManager em;
    @Autowired private JpaQuotaDataReader reader;

    @BeforeEach
    void setUp() {
        QuotaFixture.persist(em);
    }

    @Test
    void searchCourses_andFindCourse_mapsSharedThaiName() {
        assertThat(reader.searchCourses("แคลคูลัส", null)).singleElement().satisfies(course -> {
            assertThat(course.courseCode()).isEqualTo("Q7MA211");
            assertThat(course.courseNameTh()).isEqualTo("แคลคูลัส 1");
        });
        assertThat(reader.searchCourses(null, Set.of())).isEmpty();
        assertThat(reader.findCourse("Q7EL105")).isPresent();
        assertThat(reader.findCourse("UNKNOWN999")).isEmpty();
    }

    @Test
    void loadDetails_allRequestedCodes_distinguishesMissingInfoFromFalseAndKeepsOrder() {
        var result = reader.loadDetails(List.of("Q7EL105", "Q7EL295", "Q7NODAT", "Q7OFF00", "UNKNOWN999"), 2569, 2);
        assertThat(result).hasSize(5);
        assertThat(result.get("Q7EL105").offeredSemesters()).containsExactly(1, 2);
        assertThat(result.get("Q7EL105").channels()).extracting(QuotaChannelResponse::channelType)
                .containsExactly(QuotaChannelType.QUOTA_SYSTEM, QuotaChannelType.ONLINE_FORM, QuotaChannelType.FACULTY_OFFICE);
        assertThat(result.get("Q7EL105").rounds()).extracting(QuotaRoundResponse::roundNo).containsExactly(1, 2);
        assertThat(result.get("Q7EL295").quotaRequired()).isFalse();
        assertThat(result.get("Q7NODAT").quotaRequired()).isNull();
        assertThat(result.get("Q7NODAT").offeredSemesters()).containsExactly(2);
        assertThat(result.get("Q7OFF00").offeredSemesters()).isEmpty();
        assertThat(result.get("UNKNOWN999").quotaRequired()).isNull();
        em.clear();
        assertThat(result.get("Q7EL105").contacts()).hasSize(1);
    }

    @Test
    void loadDetails_nullableRelatedCodeAndLinks_preservesContract() {
        var result = reader.loadDetails(List.of("Q7EL395", "Q7PC280"), 2569, 2);
        assertThat(result.get("Q7EL395").conditions()).extracting(QuotaConditionResponse::relatedCourseCode)
                .containsExactly("Q7EL295", null);
        assertThat(result.get("Q7PC280").contacts().getFirst().url()).isNull();
        assertThat(result.get("Q7PC280").channels().getFirst().url()).isNull();
    }

    @Test
    void loadDetails_multipleCourses_usesThreeBatchQueriesWithoutNPlusOne() {
        var statistics = em.getEntityManager().getEntityManagerFactory().unwrap(SessionFactory.class).getStatistics();
        statistics.clear();
        reader.loadDetails(List.of("Q7EL105", "Q7EL395", "Q7AN347", "Q7MA211", "Q7NODAT"), 2569, 2);
        assertThat(statistics.getPrepareStatementCount()).isEqualTo(3);
        assertThat(statistics.getEntityFetchCount()).isZero();
        assertThat(statistics.getCollectionFetchCount()).isZero();
    }

    @Test
    void loadDetails_emptyCodes_doesNotQueryDatabase() {
        var statistics = em.getEntityManager().getEntityManagerFactory().unwrap(SessionFactory.class).getStatistics();
        statistics.clear();
        assertThat(reader.loadDetails(List.of(), 2569, 2)).isEmpty();
        assertThat(statistics.getPrepareStatementCount()).isZero();
    }
}
