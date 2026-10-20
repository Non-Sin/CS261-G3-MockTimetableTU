package th.ac.tu.cs261.group3.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import th.ac.tu.cs261.group3.backend.auth.AuthController;
import th.ac.tu.cs261.group3.backend.auth.AuthService;
import th.ac.tu.cs261.group3.backend.auth.JwtService;
import th.ac.tu.cs261.group3.backend.auth.dto.LoginResponse;
import th.ac.tu.cs261.group3.backend.common.student.SecurityContextStudentProvider;
import th.ac.tu.cs261.group3.backend.user.UserController;
import th.ac.tu.cs261.group3.backend.user.UserService;
import th.ac.tu.cs261.group3.backend.user.dto.UserProfileResponse;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Security filter chain จริง + JwtService จริง: login เรียกได้โดยไม่มี token ส่วน /api อื่นต้องมี token
 * และรหัสนักศึกษาจาก token ไปถึง controller ผ่าน SecurityContextStudentProvider (TC7)
 */
@WebMvcTest({UserController.class, AuthController.class})
@Import({SecurityConfig.class, JwtService.class, SecurityContextStudentProvider.class})
@TestPropertySource(properties = {
        "app.auth.jwt.secret=test-secret-for-unit-tests-32-bytes!!",
        "app.auth.jwt.expiration-ms=60000"
})
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private AuthService authService;

    @Test
    void login_withoutToken_isPermitted() throws Exception {
        when(authService.authenticate(any())).thenReturn(LoginResponse.of("jwt-token"));

        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username": "6609000001", "password": "Passw0rd!"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwt-token"));
    }

    @Test
    void me_withValidToken_usesStudentIdFromToken() throws Exception {
        when(userService.getProfile("6609000001")).thenReturn(new UserProfileResponse("6609000001", "สมชาย", "ใจดี"));

        mockMvc.perform(get("/api/users/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtService.generateToken("6609000001")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value("6609000001"))
                .andExpect(jsonPath("$.firstName").value("สมชาย"));
    }

    @Test
    void me_withoutToken_returns401ProblemDetail() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.detail").value("กรุณาเข้าสู่ระบบก่อนใช้งาน"));

        verify(userService, never()).getProfile(anyString());
    }

    @Test
    void me_withInvalidToken_returns401() throws Exception {
        String otherSecretToken = new JwtService("another-secret-for-unit-tests-32-bytes", 60_000)
                .generateToken("6609000001");

        mockMvc.perform(get("/api/users/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + otherSecretToken))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/users/me").header(HttpHeaders.AUTHORIZATION, "Bearer not-a-jwt"))
                .andExpect(status().isUnauthorized());

        verify(userService, never()).getProfile(anyString());
    }

    @Test
    void me_withNonBearerScheme_returns401() throws Exception {
        mockMvc.perform(get("/api/users/me").header(HttpHeaders.AUTHORIZATION,
                        "Basic " + jwtService.generateToken("6609000001")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void otherApi_withoutToken_returns401() throws Exception {
        // timetable ของ US1 ต้อง login แล้วเหมือนกัน (ตรวจที่ filter ก่อนถึง controller)
        mockMvc.perform(get("/api/timetable").param("academicYear", "2568").param("semester", "1"))
                .andExpect(status().isUnauthorized());
    }

    // ---------- logout (US4) ----------

    @Test
    void logout_withValidToken_returns204() throws Exception {
        mockMvc.perform(post("/api/auth/logout")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtService.generateToken("6609000001")))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));

        verify(authService, times(1)).logout();
    }

    @Test
    void logout_withoutToken_returns401ProblemDetail() throws Exception {
        // permitAll เฉพาะ /api/auth/login ส่วน /logout ต้องมี token (US4-T06 สมมติฐานข้อ 3)
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.title").value("Unauthorized"))
                .andExpect(jsonPath("$.detail").value("กรุณาเข้าสู่ระบบก่อนใช้งาน"));

        verify(authService, never()).logout();
    }

    @Test
    void logout_withInvalidToken_returns401() throws Exception {
        // token หมดอายุตรวจที่ isTokenValid() ทางเดียวกัน ดู JwtServiceTest.expiredToken_invalid
        String otherSecretToken = new JwtService("another-secret-for-unit-tests-32-bytes", 60_000)
                .generateToken("6609000001");

        mockMvc.perform(post("/api/auth/logout").header(HttpHeaders.AUTHORIZATION, "Bearer " + otherSecretToken))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/auth/logout").header(HttpHeaders.AUTHORIZATION, "Bearer not-a-jwt"))
                .andExpect(status().isUnauthorized());

        verify(authService, never()).logout();
    }

    @Test
    void sameToken_afterLogout_stillWorks() throws Exception {
        // stateless JWT ไม่มี denylist token เดิมใช้ต่อได้จนหมดอายุ (US4-T13 IT-08) ถ้าเพิ่ม denylist ต้องเปลี่ยนเป็น 401
        String token = jwtService.generateToken("6609000001");
        when(userService.getProfile("6609000001")).thenReturn(new UserProfileResponse("6609000001", "สมชาย", "ใจดี"));

        mockMvc.perform(post("/api/auth/logout").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/users/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk());
    }
}
