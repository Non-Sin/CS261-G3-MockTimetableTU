package th.ac.tu.cs261.group3.backend.course;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import th.ac.tu.cs261.group3.backend.course.dto.CourseResponse;
import th.ac.tu.cs261.group3.backend.course.dto.ScheduleSlotResponse;
import th.ac.tu.cs261.group3.backend.course.dto.SectionResponse;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Controller test แบบไม่ต้องใช้ฐานข้อมูล (mock CourseService) ตาม GET /api/courses ใน US1-T05 DTO & API Spec
 */
@WebMvcTest(CourseController.class)
@AutoConfigureMockMvc(addFilters = false)   // ทดสอบเฉพาะ controller การตรวจ token อยู่ใน SecurityConfigTest
class CourseControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CourseService courseService;

    private static CourseResponse cs111() {
        return new CourseResponse("CS111", "OBJECT-ORIENTED CONCEPTS", CourseCategory.MAJOR, 3, List.of(
                new SectionResponse(101L, "030001", "ผศ.ดร.สมชาย ใจดี", List.of(
                        new ScheduleSlotResponse(DayOfWeek.TUESDAY, LocalTime.of(11, 0), LocalTime.of(12, 30), "LC3-121"),
                        new ScheduleSlotResponse(DayOfWeek.THURSDAY, LocalTime.of(11, 0), LocalTime.of(12, 30), "LC3-121")))));
    }

    @Test
    void getCourses_termOnly_returnsCourses() throws Exception {
        when(courseService.search(2568, 1, null, null)).thenReturn(List.of(cs111()));

        mockMvc.perform(get("/api/courses").param("academicYear", "2568").param("semester", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].courseCode").value("CS111"))
                .andExpect(jsonPath("$[0].category").value("MAJOR"))
                .andExpect(jsonPath("$[0].credits").value(3))
                .andExpect(jsonPath("$[0].sections[0].sectionId").value(101))
                .andExpect(jsonPath("$[0].sections[0].instructor").value("ผศ.ดร.สมชาย ใจดี"))
                .andExpect(jsonPath("$[0].sections[0].schedules[0].dayOfWeek").value("TUESDAY"))
                .andExpect(jsonPath("$[0].sections[0].schedules[0].startTime").value("11:00"))
                .andExpect(jsonPath("$[0].sections[0].schedules[0].endTime").value("12:30"));
    }

    @Test
    void getCourses_withQAndCategory_passesThemToService() throws Exception {
        when(courseService.search(2568, 1, "CS1", CourseCategory.MAJOR)).thenReturn(List.of(cs111()));

        mockMvc.perform(get("/api/courses")
                        .param("academicYear", "2568").param("semester", "1")
                        .param("q", "CS1").param("category", "MAJOR"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].courseCode").value("CS111"));
    }

    @Test
    void getCourses_noMatch_returnsEmptyArray() throws Exception {
        when(courseService.search(2569, 1, null, null)).thenReturn(List.of());

        mockMvc.perform(get("/api/courses").param("academicYear", "2569").param("semester", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void getCourses_missingAcademicYear_returns400() throws Exception {
        mockMvc.perform(get("/api/courses").param("semester", "1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        verify(courseService, never()).search(anyInt(), anyInt(), any(), any());
    }

    @Test
    void getCourses_missingSemester_returns400() throws Exception {
        mockMvc.perform(get("/api/courses").param("academicYear", "2568"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getCourses_invalidCategory_returns400() throws Exception {
        mockMvc.perform(get("/api/courses")
                        .param("academicYear", "2568").param("semester", "1").param("category", "SCIENCE"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        verify(courseService, never()).search(anyInt(), anyInt(), any(), any());
    }

    @Test
    void getCourses_nonNumericAcademicYear_returns400() throws Exception {
        mockMvc.perform(get("/api/courses").param("academicYear", "abc").param("semester", "1"))
                .andExpect(status().isBadRequest());
    }
}
