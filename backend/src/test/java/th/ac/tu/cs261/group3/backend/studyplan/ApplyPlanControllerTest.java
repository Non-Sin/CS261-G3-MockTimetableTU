package th.ac.tu.cs261.group3.backend.studyplan;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import th.ac.tu.cs261.group3.backend.common.exception.BusinessRuleException;
import th.ac.tu.cs261.group3.backend.common.exception.ResourceNotFoundException;
import th.ac.tu.cs261.group3.backend.common.student.CurrentStudentProvider;
import th.ac.tu.cs261.group3.backend.course.CourseCategory;
import th.ac.tu.cs261.group3.backend.studyplan.dto.AddedPlanCourseResponse;
import th.ac.tu.cs261.group3.backend.studyplan.dto.ApplyPlanRequest;
import th.ac.tu.cs261.group3.backend.studyplan.dto.ApplyPlanResponse;
import th.ac.tu.cs261.group3.backend.studyplan.dto.PlanCourseSource;
import th.ac.tu.cs261.group3.backend.studyplan.dto.SkippedPlanCourseResponse;
import th.ac.tu.cs261.group3.backend.timetable.dto.TimetableResponse;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static th.ac.tu.cs261.group3.backend.studyplan.PlanTestData.course;

/** POST /api/timetable/apply-plan ระดับ controller (mock service) ตาม US8-T05 Spec ข้อ 2 และหัวข้อ Error */
@WebMvcTest(ApplyPlanController.class)
@AutoConfigureMockMvc(addFilters = false)
class ApplyPlanControllerTest {

    private static final String STUDENT = "6609000000";
    private static final String URL = "/api/timetable/apply-plan";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ApplyPlanService applyPlanService;

    @MockitoBean
    private CurrentStudentProvider currentStudentProvider;

    @BeforeEach
    void setUp() {
        when(currentStudentProvider.currentStudentId()).thenReturn(STUDENT);
    }

    private static ApplyPlanResponse preview(Long minorId) {
        return new ApplyPlanResponse(8L, minorId, true,
                List.of(new AddedPlanCourseResponse("CS372", "Machine Learning", CourseCategory.MAJOR, 3,
                        PlanCourseSource.PLAN, 401L, "040001")),
                List.of(SkippedPlanCourseResponse.timeConflict(course("CS246", CourseCategory.MINOR, 3),
                                PlanCourseSource.MINOR, List.of("CS332", "CS314")),
                        SkippedPlanCourseResponse.alreadyInTimetable(course("CS305", CourseCategory.MAJOR, 3),
                                PlanCourseSource.PLAN, "090001")),
                null);
    }

    @Test
    void dryRun_returns200_timetableNull_skippedOmitsNullFields() throws Exception {
        when(applyPlanService.applyPlan(STUDENT, new ApplyPlanRequest(8L, 1L, 2568, true))).thenReturn(preview(1L));

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planId\": 8, \"minorId\": 1, \"academicYear\": 2568, \"dryRun\": true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.planId").value(8))
                .andExpect(jsonPath("$.minorId").value(1))
                .andExpect(jsonPath("$.dryRun").value(true))
                .andExpect(content().string(containsString("\"timetable\":null")))
                .andExpect(jsonPath("$.added[0].sectionNo").value("040001"))
                .andExpect(jsonPath("$.added[0].source").value("PLAN"))
                .andExpect(jsonPath("$.skipped[0].reason").value("TIME_CONFLICT"))
                .andExpect(jsonPath("$.skipped[0].conflictWith[1]").value("CS314"))
                .andExpect(jsonPath("$.skipped[0].message").value("CS246 ทุกกลุ่มเรียนเวลาชนกับ CS332, CS314"))
                .andExpect(jsonPath("$.skipped[0].existingSectionNo").doesNotExist())
                .andExpect(jsonPath("$.skipped[0].currentCredits").doesNotExist())
                .andExpect(jsonPath("$.skipped[1].reason").value("COURSE_ALREADY_IN_TIMETABLE"))
                .andExpect(jsonPath("$.skipped[1].existingSectionNo").value("090001"))
                .andExpect(jsonPath("$.skipped[1].conflictWith").doesNotExist());
    }

    @Test
    void noMinorAndNoDryRun_defaultsDryRunFalse_minorIdNullInJson() throws Exception {
        TimetableResponse tt = TimetableResponse.of(2568, 2, List.of(), 22, List.of(),
                OffsetDateTime.parse("2026-11-16T10:00:00+07:00"));
        when(applyPlanService.applyPlan(STUDENT, new ApplyPlanRequest(8L, null, 2568, false)))
                .thenReturn(new ApplyPlanResponse(8L, null, false, List.of(), List.of(), tt));

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planId\": 8, \"academicYear\": 2568}"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("\"minorId\":null")))
                .andExpect(jsonPath("$.dryRun").value(false))
                .andExpect(jsonPath("$.timetable.semester").value(2))
                .andExpect(jsonPath("$.timetable.maxCredits").value(22));
    }

    @Test
    void missingPlanIdAndAcademicYear_returns400WithErrors() throws Exception {
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("{\"dryRun\": true}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.planId").exists())
                .andExpect(jsonPath("$.errors.academicYear").exists());

        verify(applyPlanService, never()).applyPlan(any(), any());
    }

    @Test
    void minorNotAllowed_returns400WithCode() throws Exception {
        when(applyPlanService.applyPlan(STUDENT, new ApplyPlanRequest(3L, 1L, 2568, false)))
                .thenThrow(new BusinessRuleException(HttpStatus.BAD_REQUEST, "MINOR_NOT_ALLOWED",
                        "ชั้นปีที่ 2 เลือกวิชาโทไม่ได้", Map.of("planId", 3L, "minorId", 1L)));

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planId\": 3, \"minorId\": 1, \"academicYear\": 2568}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MINOR_NOT_ALLOWED"));
    }

    @Test
    void planNotFound_returns404() throws Exception {
        when(applyPlanService.applyPlan(STUDENT, new ApplyPlanRequest(99L, null, 2568, true)))
                .thenThrow(new ResourceNotFoundException("Study plan not found with id: 99"));

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planId\": 99, \"academicYear\": 2568, \"dryRun\": true}"))
                .andExpect(status().isNotFound());
    }
}
