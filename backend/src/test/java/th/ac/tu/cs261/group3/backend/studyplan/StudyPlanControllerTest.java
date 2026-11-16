package th.ac.tu.cs261.group3.backend.studyplan;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import th.ac.tu.cs261.group3.backend.common.exception.ResourceNotFoundException;
import th.ac.tu.cs261.group3.backend.common.student.CurrentStudentProvider;
import th.ac.tu.cs261.group3.backend.course.CourseCategory;
import th.ac.tu.cs261.group3.backend.studyplan.dto.StudyMinorResponse;
import th.ac.tu.cs261.group3.backend.studyplan.dto.StudyPlanCourseResponse;
import th.ac.tu.cs261.group3.backend.studyplan.dto.StudyPlanListResponse;
import th.ac.tu.cs261.group3.backend.studyplan.dto.StudyPlanResponse;

import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** GET /api/study-plans ระดับ controller (mock service) ตาม US8-T05 Spec ข้อ 1 และหัวข้อ "Validation ของ query param" */
@WebMvcTest(StudyPlanController.class)
@AutoConfigureMockMvc(addFilters = false)
class StudyPlanControllerTest {

    private static final String STUDENT = "6609000000";
    private static final String CS = "ภาควิชาวิทยาการคอมพิวเตอร์";
    private static final String CUR = "หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ (ฉบับปรับปรุง พ.ศ. 2566)";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private StudyPlanService studyPlanService;

    @MockitoBean
    private CurrentStudentProvider currentStudentProvider;

    @BeforeEach
    void setUp() {
        when(currentStudentProvider.currentStudentId()).thenReturn(STUDENT);
    }

    @Test
    void year2_returns200_withPlanTypeNullInJson() throws Exception {
        when(studyPlanService.getPlans(STUDENT, 2, 1)).thenReturn(new StudyPlanListResponse(CS, 2, 1,
                List.of(new StudyPlanResponse(3L, CUR, 2, 1, null, 3,
                        List.of(new StudyPlanCourseResponse("CS221", "Introduction to Computer System and Organization",
                                CourseCategory.MAJOR, 3)))),
                List.of()));

        mockMvc.perform(get("/api/study-plans").param("studyYear", "2").param("semester", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.department").value(CS))
                .andExpect(jsonPath("$.studyYear").value(2))
                .andExpect(jsonPath("$.plans[0].planId").value(3))
                .andExpect(content().string(containsString("\"planType\":null")))
                .andExpect(jsonPath("$.plans[0].totalCredits").value(3))
                .andExpect(jsonPath("$.plans[0].courses[0].category").value("MAJOR"))
                .andExpect(jsonPath("$.minors.length()").value(0));
    }

    @Test
    void year3_returnsPlansAndMinorsWithPlanType() throws Exception {
        StudyPlanCourseResponse ml = new StudyPlanCourseResponse("CS345", "Practical Machine Learning",
                CourseCategory.MINOR, 3);
        when(studyPlanService.getPlans(STUDENT, 3, 1)).thenReturn(new StudyPlanListResponse(CS, 3, 1,
                List.of(new StudyPlanResponse(6L, CUR, 3, 1, PlanType.SPECIAL_PROJECT, 3, List.of(ml)),
                        new StudyPlanResponse(5L, CUR, 3, 1, PlanType.CO_OP, 3, List.of(ml))),
                List.of(new StudyMinorResponse(1L, PlanType.SPECIAL_PROJECT, CUR, "วิทยาการข้อมูล", 3, List.of(ml)))));

        mockMvc.perform(get("/api/study-plans").param("studyYear", "3").param("semester", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.plans[0].planType").value("SPECIAL_PROJECT"))
                .andExpect(jsonPath("$.plans[1].planType").value("CO_OP"))
                .andExpect(jsonPath("$.minors[0].minorId").value(1))
                .andExpect(jsonPath("$.minors[0].planType").value("SPECIAL_PROJECT"))
                .andExpect(jsonPath("$.minors[0].minorName").value("วิทยาการข้อมูล"))
                .andExpect(jsonPath("$.minors[0].courses[0].courseCode").value("CS345"));
    }

    /** กันคนเติม {@code @Validated} ที่ class ภายหลัง (จะกลายเป็น 500) */
    @ParameterizedTest
    @CsvSource({"5,1", "0,1", "3,0", "3,3", "abc,1"})
    void outOfRangeOrInvalidParam_returns400(String studyYear, String semester) throws Exception {
        mockMvc.perform(get("/api/study-plans").param("studyYear", studyYear).param("semester", semester))
                .andExpect(status().isBadRequest());

        verify(studyPlanService, never()).getPlans(anyString(), anyInt(), anyInt());
    }

    @Test
    void missingStudyYear_returns400() throws Exception {
        mockMvc.perform(get("/api/study-plans").param("semester", "1"))
                .andExpect(status().isBadRequest());

        verify(studyPlanService, never()).getPlans(anyString(), anyInt(), anyInt());
    }

    @Test
    void userNotFound_returns404() throws Exception {
        when(studyPlanService.getPlans(STUDENT, 1, 1))
                .thenThrow(new ResourceNotFoundException("User not found with id: " + STUDENT));

        mockMvc.perform(get("/api/study-plans").param("studyYear", "1").param("semester", "1"))
                .andExpect(status().isNotFound());
    }
}
