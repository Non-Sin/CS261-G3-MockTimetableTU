package th.ac.tu.cs261.group3.backend.auth;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import th.ac.tu.cs261.group3.backend.auth.dto.LoginRequest;
import th.ac.tu.cs261.group3.backend.auth.dto.LoginResponse;
import th.ac.tu.cs261.group3.backend.auth.tu.TuApiClient;
import th.ac.tu.cs261.group3.backend.common.exception.BusinessRuleException;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Controller test แบบไม่ต้องใช้ฐานข้อมูล (mock AuthService) ตาม POST /api/auth/login ใน US3-T05 DTO & API Spec
 * และ POST /api/auth/logout ใน US4-T05 DTO & API Spec
 */
@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)   // ทดสอบเฉพาะ controller การตรวจ token อยู่ใน SecurityConfigTest
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService authService;

    private ResultActions login(String body) throws Exception {
        return mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private static final String VALID_BODY = """
            {"username": "6609000001", "password": "Passw0rd!"}
            """;

    @Test
    void login_success_returnsToken() throws Exception {
        when(authService.authenticate(new LoginRequest("6609000001", "Passw0rd!")))
                .thenReturn(LoginResponse.of("jwt-token"));

        login(VALID_BODY)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwt-token"));
    }

    @Test
    void login_missingPassword_returns400WithFieldError() throws Exception {
        login("""
                {"username": "6609000001"}
                """)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.password").exists());

        verify(authService, never()).authenticate(any());
    }

    @Test
    void login_blankUsername_returns400() throws Exception {
        login("""
                {"username": "  ", "password": "Passw0rd!"}
                """)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.username").exists());

        verify(authService, never()).authenticate(any());
    }

    @Test
    void login_invalidCredentials_returns401ProblemDetail() throws Exception {
        when(authService.authenticate(any())).thenThrow(new BusinessRuleException(HttpStatus.UNAUTHORIZED,
                "INVALID_CREDENTIALS", "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง", null));

        login(VALID_BODY)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andExpect(jsonPath("$.retryAfterSeconds").doesNotExist());
    }

    @Test
    void login_notCsStudent_returns403() throws Exception {
        when(authService.authenticate(any())).thenThrow(new BusinessRuleException(HttpStatus.FORBIDDEN,
                "NOT_CS_STUDENT", "เฉพาะนักศึกษาสาขาวิทยาการคอมพิวเตอร์ ภาคปกติ", null));

        login(VALID_BODY)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_CS_STUDENT"));
    }

    @Test
    void login_accountInactive_returns403() throws Exception {
        when(authService.authenticate(any())).thenThrow(new BusinessRuleException(HttpStatus.FORBIDDEN,
                "ACCOUNT_INACTIVE", "บัญชีของท่านไม่อยู่ในสถานะใช้งานปกติ", null));

        login(VALID_BODY)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_INACTIVE"));
    }

    @Test
    void login_locked_returns429WithRetryAfterSeconds() throws Exception {
        when(authService.authenticate(any())).thenThrow(new BusinessRuleException(HttpStatus.TOO_MANY_REQUESTS,
                "ACCOUNT_LOCKED", "ระงับการเข้าสู่ระบบชั่วคราว", Map.of("retryAfterSeconds", 900L)));

        login(VALID_BODY)
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"))
                .andExpect(jsonPath("$.retryAfterSeconds").value(900));
    }

    @Test
    void login_tuApiUnavailable_returns503() throws Exception {
        when(authService.authenticate(any())).thenThrow(TuApiClient.unavailable());

        login(VALID_BODY)
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("TU_API_UNAVAILABLE"));
    }

    // ---------- logout (US4) ----------

    @Test
    void logout_returns204WithoutBody() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));

        verify(authService, times(1)).logout();
    }
}
