package th.ac.tu.cs261.group3.backend.timetable;

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
import th.ac.tu.cs261.group3.backend.course.dto.ScheduleSlotResponse;
import th.ac.tu.cs261.group3.backend.timetable.dto.AddTimetableEntryRequest;
import th.ac.tu.cs261.group3.backend.timetable.dto.TimeConflictResponse;
import th.ac.tu.cs261.group3.backend.timetable.dto.TimetableEntryResponse;
import th.ac.tu.cs261.group3.backend.timetable.dto.TimetableResponse;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Controller test แบบไม่ต้องใช้ฐานข้อมูล (mock TimetableService) ตาม US1-T05 DTO & API Spec
 */
@WebMvcTest(TimetableController.class)
@AutoConfigureMockMvc(addFilters = false)   // ทดสอบเฉพาะ controller การตรวจ token อยู่ใน SecurityConfigTest
class TimetableControllerTest {

    private static final String STUDENT = "6609000000";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TimetableService timetableService;

    @MockitoBean
    private CurrentStudentProvider currentStudentProvider;

    @BeforeEach
    void setUp() {
        when(currentStudentProvider.currentStudentId()).thenReturn(STUDENT);
    }

    private static TimetableResponse withConflict() {
        ScheduleSlotResponse wed = new ScheduleSlotResponse(DayOfWeek.WEDNESDAY, LocalTime.of(9, 30), LocalTime.of(12, 30), "SC3-413");
        return TimetableResponse.of(2568, 1, List.of(
                        new TimetableEntryResponse(7L, "TU109", "INNOVATION AND ENTREPRENEURIAL MINDSET",
                                CourseCategory.GENERAL_EDUCATION, 3, 305L, "780001", List.of(wed), List.of("LAS101")),
                        new TimetableEntryResponse(8L, "LAS101", "CRITICAL THINKING, READING, AND WRITING",
                                CourseCategory.GENERAL_EDUCATION, 3, 306L, "780004", List.of(wed), List.of("TU109"))),
                22,
                List.of(new TimeConflictResponse(DayOfWeek.WEDNESDAY, LocalTime.of(9, 30), LocalTime.of(12, 30),
                        List.of("TU109", "LAS101"))),
                OffsetDateTime.parse("2026-10-13T11:20:05+07:00"));
    }

    private static String body(Long sectionId) {
        return sectionId == null ? "{}" : "{\"sectionId\": " + sectionId + "}";
    }

    // ---------- GET /api/timetable ----------

    @Test
    void getMyTimetable_usesCurrentStudentAndReturnsTimetable() throws Exception {
        when(timetableService.getTimetable(STUDENT, 2568, 1)).thenReturn(withConflict());

        mockMvc.perform(get("/api/timetable").param("academicYear", "2568").param("semester", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCredits").value(6))
                .andExpect(jsonPath("$.maxCredits").value(22))
                .andExpect(jsonPath("$.updatedAt").value("2026-10-13T11:20:05+07:00"))
                .andExpect(jsonPath("$.entries[0].courseCode").value("TU109"))
                .andExpect(jsonPath("$.entries[0].conflictWith[0]").value("LAS101"))
                .andExpect(jsonPath("$.conflicts[0].overlapStart").value("09:30"))
                .andExpect(jsonPath("$.conflicts[0].courseCodes[1]").value("LAS101"));
    }

    @Test
    void getMyTimetable_empty_returnsNullUpdatedAt() throws Exception {
        when(timetableService.getTimetable(STUDENT, 2568, 1))
                .thenReturn(TimetableResponse.of(2568, 1, List.of(), 22, List.of(), null));

        mockMvc.perform(get("/api/timetable").param("academicYear", "2568").param("semester", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entries.length()").value(0))
                .andExpect(jsonPath("$.totalCredits").value(0))
                .andExpect(jsonPath("$.updatedAt").doesNotExist());
    }

    @Test
    void getMyTimetable_missingSemester_returns400() throws Exception {
        mockMvc.perform(get("/api/timetable").param("academicYear", "2568"))
                .andExpect(status().isBadRequest());

        verify(timetableService, never()).getTimetable(anyString(), any(Integer.class), any(Integer.class));
    }

    // ---------- POST /api/timetable/entries ----------

    @Test
    void addEntry_valid_returns201WithTimetable() throws Exception {
        when(timetableService.addEntry(STUDENT, new AddTimetableEntryRequest(306L))).thenReturn(withConflict());

        mockMvc.perform(post("/api/timetable/entries").contentType(MediaType.APPLICATION_JSON).content(body(306L)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.entries.length()").value(2))
                .andExpect(jsonPath("$.conflicts.length()").value(1));
    }

    @Test
    void addEntry_missingSectionId_returns400WithErrors() throws Exception {
        mockMvc.perform(post("/api/timetable/entries").contentType(MediaType.APPLICATION_JSON).content(body(null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.sectionId").exists());

        verify(timetableService, never()).addEntry(any(), any());
    }

    @Test
    void addEntry_sectionNotFound_returns404() throws Exception {
        when(timetableService.addEntry(STUDENT, new AddTimetableEntryRequest(999L)))
                .thenThrow(new ResourceNotFoundException("Section not found with id: 999"));

        mockMvc.perform(post("/api/timetable/entries").contentType(MediaType.APPLICATION_JSON).content(body(999L)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Section not found with id: 999"));
    }

    @Test
    void addEntry_courseAlreadyInTimetable_returns409WithCode() throws Exception {
        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put("courseCode", "CS111");
        properties.put("existingSectionNo", "030001");
        when(timetableService.addEntry(STUDENT, new AddTimetableEntryRequest(2L)))
                .thenThrow(new BusinessRuleException(HttpStatus.CONFLICT, "COURSE_ALREADY_IN_TIMETABLE",
                        "CS111 อยู่ในตารางแล้ว (Sec 030001) 1 วิชาเพิ่มได้ 1 กลุ่มเรียน", properties));

        mockMvc.perform(post("/api/timetable/entries").contentType(MediaType.APPLICATION_JSON).content(body(2L)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.title").value("Conflict"))
                .andExpect(jsonPath("$.code").value("COURSE_ALREADY_IN_TIMETABLE"))
                .andExpect(jsonPath("$.detail").value("CS111 อยู่ในตารางแล้ว (Sec 030001) 1 วิชาเพิ่มได้ 1 กลุ่มเรียน"))
                .andExpect(jsonPath("$.courseCode").value("CS111"))
                .andExpect(jsonPath("$.existingSectionNo").value("030001"));
    }

    @Test
    void addEntry_creditLimitExceeded_returns409WithCode() throws Exception {
        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put("currentCredits", 21);
        properties.put("courseCredits", 3);
        properties.put("maxCredits", 22);
        when(timetableService.addEntry(STUDENT, new AddTimetableEntryRequest(5L)))
                .thenThrow(new BusinessRuleException(HttpStatus.CONFLICT, "CREDIT_LIMIT_EXCEEDED",
                        "เพิ่ม ST216 (3 หน่วยกิต) แล้วจะเป็น 24 หน่วยกิต เกินกำหนด 22 หน่วยกิต", properties));

        mockMvc.perform(post("/api/timetable/entries").contentType(MediaType.APPLICATION_JSON).content(body(5L)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CREDIT_LIMIT_EXCEEDED"))
                .andExpect(jsonPath("$.currentCredits").value(21))
                .andExpect(jsonPath("$.courseCredits").value(3))
                .andExpect(jsonPath("$.maxCredits").value(22));
    }
}
