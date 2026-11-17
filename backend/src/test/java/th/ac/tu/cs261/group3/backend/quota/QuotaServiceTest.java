package th.ac.tu.cs261.group3.backend.quota;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;
import th.ac.tu.cs261.group3.backend.common.exception.BusinessRuleException;
import th.ac.tu.cs261.group3.backend.common.exception.ResourceNotFoundException;
import th.ac.tu.cs261.group3.backend.quota.data.QuotaCourseData;
import th.ac.tu.cs261.group3.backend.quota.data.QuotaDataReader;
import th.ac.tu.cs261.group3.backend.quota.data.QuotaDetailsData;
import th.ac.tu.cs261.group3.backend.quota.dto.QuotaCourseResponse;
import th.ac.tu.cs261.group3.backend.timetable.TimetableEntryRepository;
import th.ac.tu.cs261.group3.backend.timetable.TimetableRepository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static th.ac.tu.cs261.group3.backend.quota.QuotaTestData.*;

@ExtendWith(MockitoExtension.class)
class QuotaServiceTest {

    @Mock private QuotaDataReader reader;
    @Mock private TimetableRepository timetables;
    @Mock private TimetableEntryRepository entries;
    private QuotaService service;

    @BeforeEach
    void setUp() {
        service = new QuotaService(Optional.of(reader), timetables, entries, 50);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "\t\n"})
    void emptyQueryWithoutMine_is400BeforeReadingData(String q) {
        assertThatThrownBy(() -> service.searchCourses(STUDENT, 2568, 1, q, false))
                .isInstanceOfSatisfying(BusinessRuleException.class, error -> {
                    assertThat(error.getStatus().value()).isEqualTo(400);
                    assertThat(error.getCode()).isEqualTo("QUOTA_SEARCH_QUERY_REQUIRED");
                });
        verifyNoInteractions(reader, timetables, entries);
    }

    @Test
    void search_stripsQueryAndReturnsNormalizedQuery() {
        when(reader.searchCourses("el3", null)).thenReturn(List.of(course("EL395")));
        when(reader.loadDetails(List.of("EL395"), 2568, 1)).thenReturn(Map.of("EL395", completeDetails()));

        var result = service.searchCourses(STUDENT, 2568, 1, "  el3  ", false);
        assertThat(result.query()).isEqualTo("el3");
        assertThat(result.total()).isEqualTo(1);
        assertThat(result.courses().getFirst().inMyTimetable()).isFalse();
        verify(timetables).findByStudentIdAndAcademicYearAndSemester(STUDENT, 2568, 1);
        verifyNoInteractions(entries);
    }

    @Test
    void mineWithNoTimetable_returnsEmptyWithoutSearchingCatalog() {
        var result = service.searchCourses(STUDENT, 2568, 1, "  ", true);
        assertThat(result.query()).isNull();
        assertThat(result.mine()).isTrue();
        assertThat(result.total()).isZero();
        assertThat(result.courses()).isEmpty();
        verifyNoInteractions(reader, entries);
    }

    @Test
    void mineWithEmptyTimetable_returnsEmptyWithoutSearchingCatalog() {
        when(timetables.findByStudentIdAndAcademicYearAndSemester(STUDENT, 2568, 1)).thenReturn(Optional.of(timetable(10)));
        when(entries.findByTimetableId(10L)).thenReturn(List.of());
        assertThat(service.searchCourses(STUDENT, 2568, 1, null, true).courses()).isEmpty();
        verifyNoInteractions(reader);
    }

    @Test
    void mineAndQuery_passesBothFiltersAndDeduplicatesCourseCodes() {
        when(timetables.findByStudentIdAndAcademicYearAndSemester(STUDENT, 2568, 1)).thenReturn(Optional.of(timetable(10)));
        when(entries.findByTimetableId(10L)).thenReturn(List.of(entry("MA211"), entry("MA211"), entry("LAS101")));
        when(reader.searchCourses("MA", Set.of("MA211", "LAS101"))).thenReturn(List.of(course("MA211")));
        when(reader.loadDetails(List.of("MA211"), 2568, 1)).thenReturn(Map.of("MA211", completeDetails()));

        var result = service.searchCourses(STUDENT, 2568, 1, "MA", true);
        assertThat(result.courses()).singleElement().satisfies(c -> assertThat(c.inMyTimetable()).isTrue());
        verify(reader).searchCourses("MA", Set.of("MA211", "LAS101"));
    }

    @Test
    void mineFalse_stillMarksCoursesInMyTimetable() {
        when(timetables.findByStudentIdAndAcademicYearAndSemester(STUDENT, 2568, 1)).thenReturn(Optional.of(timetable(10)));
        when(entries.findByTimetableId(10L)).thenReturn(List.of(entry("MA211")));
        when(reader.searchCourses("NAME", null)).thenReturn(List.of(course("MA211"), course("EL395")));
        when(reader.loadDetails(List.of("EL395", "MA211"), 2568, 1))
                .thenReturn(Map.of("EL395", completeDetails(), "MA211", completeDetails()));

        var courses = service.searchCourses(STUDENT, 2568, 1, "NAME", false).courses();
        assertThat(courses).extracting(QuotaCourseResponse::courseCode).containsExactly("EL395", "MA211");
        assertThat(courses).extracting(QuotaCourseResponse::inMyTimetable).containsExactly(false, true);
    }

    @Test
    void emptySearch_skipsDetailBatch() {
        when(reader.searchCourses("DM201", null)).thenReturn(List.of());
        var result = service.searchCourses(STUDENT, 2568, 1, "DM201", false);
        assertThat(result.total()).isZero();
        assertThat(result.courses()).isEmpty();
        verify(reader).searchCourses("DM201", null);
        verifyNoMoreInteractions(reader);
    }

    @Test
    void limit_isAppliedAfterSortingAndTotalIsBeforeLimit() {
        service = new QuotaService(Optional.of(reader), timetables, entries, 2);
        when(reader.searchCourses("NAME", null)).thenReturn(List.of(course("TU101"), course("MA211"), course("EL395")));
        when(reader.loadDetails(List.of("EL395", "MA211"), 2568, 1))
                .thenReturn(Map.of("EL395", completeDetails(), "MA211", completeDetails()));

        var result = service.searchCourses(STUDENT, 2568, 1, "NAME", false);
        assertThat(result.total()).isEqualTo(3);
        assertThat(result.courses()).extracting(QuotaCourseResponse::courseCode).containsExactly("EL395", "MA211");
        verify(reader).loadDetails(List.of("EL395", "MA211"), 2568, 1);
        verifyNoMoreInteractions(reader);
    }

    @Test
    void defaultLimit_returns50Of55AndLoadsOnlyThose50() {
        List<QuotaCourseData> found = new ArrayList<>();
        Map<String, QuotaDetailsData> metadata = new HashMap<>();
        for (int i = 0; i < 55; i++) {
            String code = "ZZ%03d".formatted(i);
            found.add(course(code));
            metadata.put(code, details(null, List.of(1)));
        }
        when(reader.searchCourses("ZZ", null)).thenReturn(found);
        List<String> codes = found.subList(0, 50).stream().map(QuotaCourseData::courseCode).toList();
        when(reader.loadDetails(codes, 2568, 1)).thenReturn(metadata);
        var result = service.searchCourses(STUDENT, 2568, 1, "ZZ", false);
        assertThat(result.total()).isEqualTo(55);
        assertThat(result.courses()).hasSize(50);
        verify(reader).loadDetails(codes, 2568, 1);
    }

    @Test
    void detail_normalizesCodeAndUsesRequestedTerm() {
        when(reader.findCourse("EL295")).thenReturn(Optional.of(course("EL295")));
        when(reader.loadDetails(List.of("EL295"), 2569, 2)).thenReturn(Map.of("EL295", completeDetails()));
        assertThat(service.getCourseQuota(STUDENT, "  el295  ", 2569, 2).courseCode()).isEqualTo("EL295");
        verify(timetables).findByStudentIdAndAcademicYearAndSemester(STUDENT, 2569, 2);
        verify(reader).findCourse("EL295");
    }

    @Test
    void detailUnknown_is404BeforeReadingTimetableOrMetadata() {
        when(reader.findCourse("DM201")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getCourseQuota(STUDENT, "dm201", 2568, 1))
                .isInstanceOf(ResourceNotFoundException.class).hasMessage("ไม่พบรายวิชา DM201");
        verifyNoInteractions(timetables, entries);
        verify(reader).findCourse("DM201");
        verifyNoMoreInteractions(reader);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void notOffered_hasPriorityOverQuotaRequired(boolean required) {
        when(reader.findCourse("FR205")).thenReturn(Optional.of(course("FR205")));
        when(reader.loadDetails(List.of("FR205"), 2568, 2)).thenReturn(Map.of("FR205", details(required, List.of(1))));
        var result = service.getCourseQuota(STUDENT, "FR205", 2568, 2);
        assertThat(result.quotaStatus()).isEqualTo(QuotaStatus.NOT_OFFERED);
        assertThat(result.offeredSemesters()).containsExactly(1);
        assertEmptyDetails(result);
    }

    @Test
    void notOffered_hasPriorityOverMissingInfoAndCanHaveNoSemesters() {
        var result = detailWith(details(null, List.of()));
        assertThat(result.quotaStatus()).isEqualTo(QuotaStatus.NOT_OFFERED);
        assertThat(result.offeredSemesters()).isEmpty();
        assertEmptyDetails(result);
    }

    @Test
    void existingOfferedCourseWithoutQuotaInfo_isNoDataNot404() {
        var result = detailWith(details(null, List.of(1)));
        assertThat(result.quotaStatus()).isEqualTo(QuotaStatus.NO_DATA);
        assertEmptyDetails(result);
    }

    @Test
    void notRequired_hidesAllDetailsEvenIfReaderProvidesThem() {
        var full = completeDetails();
        var result = detailWith(new QuotaDetailsData(List.of(1), false, full.conditions(), full.rounds(), full.channels(), full.contacts()));
        assertThat(result.quotaStatus()).isEqualTo(QuotaStatus.NOT_REQUIRED);
        assertEmptyDetails(result);
    }

    @Test
    void required_keepsMultipleChannelsNullFieldsAndRounds() {
        var result = detailWith(completeDetails());
        assertThat(result.quotaStatus()).isEqualTo(QuotaStatus.REQUIRED);
        assertThat(result.channels()).hasSize(2);
        assertThat(result.channels().get(1).url()).isNull();
        assertThat(result.rounds().getFirst().startDate()).isNull();
        assertThat(result.contacts().getFirst().url()).isNull();
        assertThat(result.conditions().getFirst().relatedCourseCode()).isEqualTo("EL295");
    }

    @Test
    void requiredWithoutRounds_isStillRequired() {
        var result = detailWith(details(true, List.of(1)));
        assertThat(result.quotaStatus()).isEqualTo(QuotaStatus.REQUIRED);
        assertThat(result.rounds()).isEmpty();
    }

    @Test
    void offeredSemesters_areDistinctSortedAndNotLimitedToRequestedSemester() {
        assertThat(detailWith(details(true, List.of(2, 1, 2))).offeredSemesters()).containsExactly(1, 2);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void noT09Reader_is503NotFakeEmptyOr404(boolean search) {
        service = new QuotaService(Optional.empty(), timetables, entries, 50);
        assertThatThrownBy(() -> {
            if (search) service.searchCourses(STUDENT, 2568, 1, "EL395", false);
            else service.getCourseQuota(STUDENT, "EL395", 2568, 1);
        }).isInstanceOfSatisfying(ResponseStatusException.class, error -> assertThat(error.getStatusCode().value()).isEqualTo(503));
        verifyNoInteractions(reader, timetables, entries);
    }

    @Test
    void nonPositiveConfiguredLimit_failsClearly() {
        assertThatIllegalArgumentException().isThrownBy(() -> new QuotaService(Optional.of(reader), timetables, entries, 0));
    }

    @Test
    void incompleteReaderResult_isNotSilentlyTurnedIntoNoData() {
        when(reader.findCourse("EL395")).thenReturn(Optional.of(course("EL395")));
        when(reader.loadDetails(List.of("EL395"), 2568, 1)).thenReturn(Map.of());
        assertThatIllegalStateException().isThrownBy(() -> service.getCourseQuota(STUDENT, "EL395", 2568, 1));
    }

    private QuotaCourseResponse detailWith(QuotaDetailsData details) {
        when(reader.findCourse("EL395")).thenReturn(Optional.of(course("EL395")));
        when(reader.loadDetails(List.of("EL395"), 2568, 1)).thenReturn(Map.of("EL395", details));
        return service.getCourseQuota(STUDENT, "EL395", 2568, 1);
    }

    private static void assertEmptyDetails(QuotaCourseResponse result) {
        assertThat(result.conditions()).isEmpty();
        assertThat(result.rounds()).isEmpty();
        assertThat(result.channels()).isEmpty();
        assertThat(result.contacts()).isEmpty();
    }
}
