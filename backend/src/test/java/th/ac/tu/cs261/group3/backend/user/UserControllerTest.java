package th.ac.tu.cs261.group3.backend.user;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import th.ac.tu.cs261.group3.backend.common.exception.ResourceNotFoundException;
import th.ac.tu.cs261.group3.backend.common.student.CurrentStudentProvider;
import th.ac.tu.cs261.group3.backend.user.dto.UserProfileResponse;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Controller test แบบไม่ต้องใช้ฐานข้อมูล (mock UserService) ตาม GET /api/users/me ใน US3-T05 DTO & API Spec
 */
@WebMvcTest(UserController.class)
@AutoConfigureMockMvc(addFilters = false)   // ทดสอบเฉพาะ controller การตรวจ token อยู่ใน SecurityConfigTest
class UserControllerTest {

    private static final String STUDENT = "6609000001";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private CurrentStudentProvider currentStudentProvider;

    @BeforeEach
    void setUp() {
        when(currentStudentProvider.currentStudentId()).thenReturn(STUDENT);
    }

    @Test
    void getCurrentUser_returnsProfileOfCurrentStudent() throws Exception {
        when(userService.getProfile(STUDENT)).thenReturn(new UserProfileResponse(STUDENT, "สมชาย", "ใจดี"));

        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value(STUDENT))
                .andExpect(jsonPath("$.firstName").value("สมชาย"))
                .andExpect(jsonPath("$.lastName").value("ใจดี"));
    }

    @Test
    void getCurrentUser_userNotFound_returns404() throws Exception {
        when(userService.getProfile(STUDENT)).thenThrow(new ResourceNotFoundException("ไม่พบผู้ใช้ " + STUDENT));

        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }
}
