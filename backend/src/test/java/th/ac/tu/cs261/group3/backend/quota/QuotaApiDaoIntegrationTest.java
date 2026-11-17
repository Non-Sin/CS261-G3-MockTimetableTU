package th.ac.tu.cs261.group3.backend.quota;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import th.ac.tu.cs261.group3.backend.auth.JwtService;
import th.ac.tu.cs261.group3.backend.support.TestcontainersConfig;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** JWT → Controller → Service → JpaQuotaDataReader → SQL Server พร้อม Flyway seed จริง */
@SpringBootTest(properties = "app.auth.jwt.secret=test-secret-for-integration-32-bytes!!")
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class QuotaApiDaoIntegrationTest {

    private static final String STUDENT = "Q7-INTEGRATION";
    @Autowired private MockMvc mvc;
    @Autowired private JwtService jwt;
    @Autowired private JdbcTemplate jdbc;
    private String token;

    @BeforeEach
    void setUp() {
        deleteTimetable();
        token = jwt.generateToken(STUDENT);
    }

    @AfterEach
    void tearDown() {
        deleteTimetable();
    }

    @Test
    void search_requiredCourse_readsThaiNameConditionsMultipleChannelsAndRounds() throws Exception {
        perform(get("/api/quota/courses").param("q", " el395 "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.query").value("el395"))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.courses[0].courseNameTh").value("ภาษาอังกฤษเชิงวิชาการและทักษะการศึกษา 2"))
                .andExpect(jsonPath("$.courses[0].quotaStatus").value("REQUIRED"))
                .andExpect(jsonPath("$.courses[0].offeredSemesters[1]").value(2))
                .andExpect(jsonPath("$.courses[0].conditions[0].relatedCourseCode").value("EL295"))
                .andExpect(jsonPath("$.courses[0].rounds.length()").value(2))
                .andExpect(jsonPath("$.courses[0].channels.length()").value(2))
                .andExpect(jsonPath("$.courses[0].channels[1].channelType").value("FACULTY_OFFICE"))
                .andExpect(jsonPath("$.courses[0].channels[1].url").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.courses[0].inMyTimetable").value(false));
    }

    @Test
    void detail_deadlineOnly_serializesNullStartAndHhMmTime() throws Exception {
        perform(get("/api/quota/courses/ma211"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.courseCode").value("MA211"))
                .andExpect(jsonPath("$.rounds[0].startDate").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.rounds[0].endDate").value("2025-08-20"))
                .andExpect(jsonPath("$.rounds[0].endTime").value("15:00"));
    }

    @Test
    void detail_notRequired_returnsEmptyDetails() throws Exception {
        perform(get("/api/quota/courses/CS232"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quotaStatus").value("NOT_REQUIRED"))
                .andExpect(jsonPath("$.conditions").isEmpty())
                .andExpect(jsonPath("$.rounds").isEmpty())
                .andExpect(jsonPath("$.channels").isEmpty())
                .andExpect(jsonPath("$.contacts").isEmpty());
    }

    @Test
    void detail_existingCourseWithoutInfo_returnsNoData() throws Exception {
        perform(get("/api/quota/courses/TU101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quotaStatus").value("NO_DATA"))
                .andExpect(jsonPath("$.channels").isEmpty());
    }

    @Test
    void detail_courseOfferedOnlyInOtherTerm_returnsNotOffered() throws Exception {
        mvc.perform(get("/api/quota/courses/FR205").param("academicYear", "2568").param("semester", "2")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quotaStatus").value("NOT_OFFERED"))
                .andExpect(jsonPath("$.offeredSemesters[0]").value(1))
                .andExpect(jsonPath("$.channels").isEmpty());
    }

    @Test
    void search_thaiName_readsCourseColumnAndKeepsElectiveLegacyName() throws Exception {
        perform(get("/api/quota/courses").param("q", "แคลคูลัส"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.courses[0].courseCode").value("MA211"));
        assertThat(jdbc.queryForObject("""
                SELECT c.course_name_th FROM course c JOIN elective_info e ON e.course_code = c.course_code
                WHERE c.course_code = 'FR205' AND c.course_name_th = e.course_name_th""", String.class)).isNotBlank();
    }

    @Test
    void searchAndDetail_unknownCourse_returnEmptyAnd404Respectively() throws Exception {
        perform(get("/api/quota/courses").param("q", "DM201"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0)).andExpect(jsonPath("$.courses").isEmpty());
        perform(get("/api/quota/courses/DM201"))
                .andExpect(status().isNotFound()).andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
    }

    @Test
    void search_mine_usesAuthenticatedStudentAndIntersectsQueryWithoutWritingData() throws Exception {
        jdbc.update("""
                INSERT INTO timetable (student_id, academic_year, semester, updated_at)
                VALUES (?, 2568, 1, SYSDATETIMEOFFSET())""", STUDENT);
        jdbc.update("""
                INSERT INTO timetable_entry (timetable_id, section_id)
                SELECT t.timetable_id, MIN(s.section_id) FROM timetable t CROSS JOIN section s
                WHERE t.student_id = ? AND s.course_code IN ('MA211', 'LAS101')
                  AND s.academic_year = 2568 AND s.semester = 1 GROUP BY t.timetable_id, s.course_code""", STUDENT);
        perform(get("/api/quota/courses").param("mine", "true").param("studentId", "Q7-OTHER"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.courses[0].courseCode").value("LAS101"))
                .andExpect(jsonPath("$.courses[1].courseCode").value("MA211"))
                .andExpect(jsonPath("$.courses[0].inMyTimetable").value(true));
        perform(get("/api/quota/courses").param("mine", "true").param("q", "MA"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1));
        mvc.perform(get("/api/quota/courses").param("academicYear", "2568").param("semester", "1").param("mine", "true")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt.generateToken("Q7-OTHER")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.courses").isEmpty());
        assertThat(jdbc.queryForObject("""
                SELECT COUNT(*) FROM timetable_entry e JOIN timetable t ON t.timetable_id = e.timetable_id
                WHERE t.student_id = ?""", Integer.class, STUDENT)).isEqualTo(2);
    }

    @Test
    void search_noToken_returns401() throws Exception {
        mvc.perform(get("/api/quota/courses").param("academicYear", "2568").param("semester", "1").param("q", "EL395"))
                .andExpect(status().isUnauthorized());
    }

    private ResultActions perform(MockHttpServletRequestBuilder request) throws Exception {
        return mvc.perform(request.param("academicYear", "2568").param("semester", "1")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
    }

    private void deleteTimetable() {
        jdbc.update("DELETE FROM timetable WHERE student_id = ?", STUDENT);
    }
}
