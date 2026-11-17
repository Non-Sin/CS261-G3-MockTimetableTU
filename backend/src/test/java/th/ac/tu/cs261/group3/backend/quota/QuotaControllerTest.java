package th.ac.tu.cs261.group3.backend.quota;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;
import th.ac.tu.cs261.group3.backend.common.exception.BusinessRuleException;
import th.ac.tu.cs261.group3.backend.common.exception.ResourceNotFoundException;
import th.ac.tu.cs261.group3.backend.common.student.CurrentStudentProvider;
import th.ac.tu.cs261.group3.backend.quota.dto.QuotaCourseResponse;
import th.ac.tu.cs261.group3.backend.quota.dto.QuotaSearchResponse;

import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.nullValue;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static th.ac.tu.cs261.group3.backend.quota.QuotaTestData.*;

@WebMvcTest(QuotaController.class)
@AutoConfigureMockMvc(addFilters = false)
class QuotaControllerTest {

    @Autowired private MockMvc mvc;
    @MockitoBean private QuotaService service;
    @MockitoBean private CurrentStudentProvider student;

    @BeforeEach
    void setUp() {
        when(student.currentStudentId()).thenReturn(STUDENT);
    }

    @Test
    void search_serializesFullResponseIncludingExplicitNullsAndTime() throws Exception {
        when(service.searchCourses(STUDENT, 2568, 1, "EL395", false))
                .thenReturn(new QuotaSearchResponse(2568, 1, "EL395", false, 1, List.of(requiredResponse())));

        mvc.perform(get("/api/quota/courses").param("academicYear", "2568").param("semester", "1").param("q", "EL395"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.courses[0].quotaStatus").value("REQUIRED"))
                .andExpect(jsonPath("$.courses[0].category").value("GENERAL_EDUCATION"))
                .andExpect(jsonPath("$.courses[0].conditions[0].relatedCourseCode").value("EL295"))
                .andExpect(jsonPath("$.courses[0].rounds[0].endDate").value("2025-08-20"))
                .andExpect(jsonPath("$.courses[0].rounds[0].endTime").value("15:00"))
                .andExpect(jsonPath("$.courses[0].channels.length()").value(2))
                .andExpect(content().json("""
                        {"courses":[{"courseNameTh":null,"rounds":[{"label":null,"startDate":null}],
                        "channels":[{"note":null},{"url":null}],"contacts":[{"url":null}]}]}
                        """));
    }

    @Test
    void searchMine_preservesNullQueryAndEmptyLists() throws Exception {
        when(service.searchCourses(STUDENT, 2568, 1, null, true))
                .thenReturn(new QuotaSearchResponse(2568, 1, null, true, 0, List.of()));
        mvc.perform(get("/api/quota/courses").param("academicYear", "2568").param("semester", "1").param("mine", "true"))
                .andExpect(status().isOk())
                .andExpect(content().json("""
                        {"academicYear":2568,"semester":1,"query":null,"mine":true,"total":0,"courses":[]}
                        """));
    }

    @Test
    void searchNoMatch_is200Not404() throws Exception {
        when(service.searchCourses(STUDENT, 2568, 1, "DM201", false))
                .thenReturn(new QuotaSearchResponse(2568, 1, "DM201", false, 0, List.of()));
        mvc.perform(get("/api/quota/courses").param("academicYear", "2568").param("semester", "1").param("q", "DM201"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.courses").isEmpty());
    }

    @Test
    void searchMissingQuery_usesExistingBusinessProblemDetail() throws Exception {
        when(service.searchCourses(STUDENT, 2568, 1, null, false)).thenThrow(
                new BusinessRuleException(HttpStatus.BAD_REQUEST, "QUOTA_SEARCH_QUERY_REQUIRED", "กรุณาระบุคำค้นหา", Map.of()));
        mvc.perform(get("/api/quota/courses").param("academicYear", "2568").param("semester", "1"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("QUOTA_SEARCH_QUERY_REQUIRED"));
    }

    @Test
    void detailAbsent_is404ProblemDetail() throws Exception {
        when(service.getCourseQuota(STUDENT, "DM201", 2568, 1)).thenThrow(new ResourceNotFoundException("ไม่พบรายวิชา DM201"));
        mvc.perform(get("/api/quota/courses/DM201").param("academicYear", "2568").param("semester", "1"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("ไม่พบรายวิชา DM201"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"NO_DATA", "NOT_OFFERED", "NOT_REQUIRED"})
    void detailNonRequiredStatuses_are200WithEmptyLists(String status) throws Exception {
        QuotaCourseResponse response = switch (status) {
            case "NO_DATA" -> QuotaCourseResponse.noData(course("TU101"), false, List.of(1));
            case "NOT_OFFERED" -> QuotaCourseResponse.notOffered(course("TU101"), false, List.of());
            default -> QuotaCourseResponse.notRequired(course("TU101"), false, List.of(1));
        };
        when(service.getCourseQuota(STUDENT, "TU101", 2568, 1)).thenReturn(response);
        mvc.perform(get("/api/quota/courses/TU101").param("academicYear", "2568").param("semester", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quotaStatus").value(status))
                .andExpect(jsonPath("$.conditions").isEmpty())
                .andExpect(jsonPath("$.rounds").isEmpty())
                .andExpect(jsonPath("$.channels").isEmpty())
                .andExpect(jsonPath("$.contacts").isEmpty());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/quota/courses", "/api/quota/courses/EL395"})
    void missingAcademicYear_is400BeforeService(String path) throws Exception {
        mvc.perform(get(path).param("semester", "1").param("q", "EL395"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value(400));
        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/quota/courses", "/api/quota/courses/EL395"})
    void missingSemester_is400BeforeService(String path) throws Exception {
        mvc.perform(get(path).param("academicYear", "2568").param("q", "EL395"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "3", "-1", "abc"})
    void invalidSemesterInSearch_is400Not500(String semester) throws Exception {
        mvc.perform(get("/api/quota/courses").param("academicYear", "2568").param("semester", semester).param("q", "EL395"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value(400));
        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "3", "abc"})
    void invalidSemesterInDetail_is400Not500(String semester) throws Exception {
        mvc.perform(get("/api/quota/courses/EL395").param("academicYear", "2568").param("semester", semester))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    void nonNumericYear_is400() throws Exception {
        mvc.perform(get("/api/quota/courses").param("academicYear", "abc").param("semester", "1").param("q", "EL395"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    void query51Characters_is400BeforeService() throws Exception {
        mvc.perform(get("/api/quota/courses").param("academicYear", "2568").param("semester", "1").param("q", "x".repeat(51)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value(400));
        verifyNoInteractions(service);
    }

    @Test
    void query50Characters_isAccepted() throws Exception {
        String q = "x".repeat(50);
        when(service.searchCourses(STUDENT, 2568, 1, q, false))
                .thenReturn(new QuotaSearchResponse(2568, 1, q, false, 0, List.of()));
        mvc.perform(get("/api/quota/courses").param("academicYear", "2568").param("semester", "1").param("q", q))
                .andExpect(status().isOk());
    }

    @Test
    void invalidBoolean_is400() throws Exception {
        mvc.perform(get("/api/quota/courses").param("academicYear", "2568").param("semester", "1").param("q", "EL395").param("mine", "wrong"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    void missingT09Reader_is503ProblemDetail() throws Exception {
        when(service.searchCourses(STUDENT, 2568, 1, "EL395", false))
                .thenThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "ระบบข้อมูลโควตายังไม่พร้อมใช้งาน"));
        mvc.perform(get("/api/quota/courses").param("academicYear", "2568").param("semester", "1").param("q", "EL395"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(503));
    }
}
