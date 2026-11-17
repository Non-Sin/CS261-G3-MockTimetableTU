package th.ac.tu.cs261.group3.backend.quota;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import th.ac.tu.cs261.group3.backend.auth.JwtService;
import th.ac.tu.cs261.group3.backend.common.student.SecurityContextStudentProvider;
import th.ac.tu.cs261.group3.backend.config.SecurityConfig;
import th.ac.tu.cs261.group3.backend.quota.dto.QuotaSearchResponse;

import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static th.ac.tu.cs261.group3.backend.quota.QuotaTestData.*;

@WebMvcTest(QuotaController.class)
@Import({SecurityConfig.class, JwtService.class, SecurityContextStudentProvider.class})
@TestPropertySource(properties = {
        "app.auth.jwt.secret=quota-unit-test-secret-32-bytes-minimum!!",
        "app.auth.jwt.expiration-ms=60000"
})
class QuotaSecurityTest {

    @Autowired private MockMvc mvc;
    @Autowired private JwtService jwt;
    @MockitoBean private QuotaService service;

    @ParameterizedTest
    @ValueSource(strings = {"/api/quota/courses", "/api/quota/courses/EL395"})
    void noToken_is401BeforeController(String path) throws Exception {
        mvc.perform(get(path).param("academicYear", "2568").param("semester", "1").param("q", "EL395"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(401));
        verifyNoInteractions(service);
    }

    @Test
    void invalidSignature_is401BeforeController() throws Exception {
        String token = new JwtService("different-test-secret-at-least-32-bytes", 60000).generateToken(STUDENT);
        mvc.perform(get("/api/quota/courses").param("academicYear", "2568").param("semester", "1").param("q", "EL395")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @Test
    void validTokenUsesItsStudentId_evenWhenQueryContainsAnotherId() throws Exception {
        when(service.searchCourses(STUDENT, 2568, 1, null, true))
                .thenReturn(new QuotaSearchResponse(2568, 1, null, true, 0, List.of()));
        mvc.perform(get("/api/quota/courses").param("academicYear", "2568").param("semester", "1").param("mine", "true")
                        .param("studentId", "another-student").header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt.generateToken(STUDENT)))
                .andExpect(status().isOk());
        verify(service).searchCourses(STUDENT, 2568, 1, null, true);
    }

    @Test
    void validTokenDetail_passesAuthenticatedStudent() throws Exception {
        when(service.getCourseQuota(STUDENT, "EL395", 2568, 1)).thenReturn(requiredResponse());
        mvc.perform(get("/api/quota/courses/EL395").param("academicYear", "2568").param("semester", "1")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt.generateToken(STUDENT)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.courseCode").value("EL395"));
        verify(service).getCourseQuota(STUDENT, "EL395", 2568, 1);
    }
}
