package th.ac.tu.cs261.group3.backend.elective;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;
import th.ac.tu.cs261.group3.backend.common.exception.ResourceNotFoundException;
import th.ac.tu.cs261.group3.backend.common.student.CurrentStudentProvider;
import th.ac.tu.cs261.group3.backend.course.dto.ScheduleSlotResponse;
import th.ac.tu.cs261.group3.backend.elective.dto.ElectiveDetailResponse;
import th.ac.tu.cs261.group3.backend.elective.dto.ElectiveSearchCriteria;
import th.ac.tu.cs261.group3.backend.elective.dto.ElectiveSectionResponse;
import th.ac.tu.cs261.group3.backend.elective.dto.ElectiveSummaryResponse;
import th.ac.tu.cs261.group3.backend.elective.dto.TimeSlot;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Controller test แบบไม่ต้องใช้ฐานข้อมูล (mock ElectiveService) ตาม GET /api/electives และ
 * GET /api/electives/{courseCode} ใน US6-T05 DTO & API Spec ข้อมูลตัวอย่างตาม JSON ใน Spec
 */
@WebMvcTest(ElectiveController.class)
@AutoConfigureMockMvc(addFilters = false)   // ทดสอบเฉพาะ controller การตรวจ token อยู่ใน SecurityConfigTest
class ElectiveControllerTest {

    private static final String STUDENT = "6609000000";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ElectiveService electiveService;

    @MockitoBean
    private CurrentStudentProvider currentStudentProvider;

    @BeforeEach
    void setUp() {
        when(currentStudentProvider.currentStudentId()).thenReturn(STUDENT);
    }

    private static ElectiveSummaryResponse fr205() {
        return new ElectiveSummaryResponse("FR205", "FRENCH FOR EVERYDAY LIFE", "ภาษาฝรั่งเศสในชีวิตประจำวัน", 3,
                InterestGroup.LANGUAGE, true, List.of(1),
                List.of(ElectiveTag.KIND_INSTRUCTOR, ElectiveTag.NO_PREREQUISITE));
    }

    private static ElectiveSummaryResponse py250() {
        return new ElectiveSummaryResponse("PY250", "PSYCHOLOGY OF PERSONALITY AND ADJUSTMENT",
                "จิตวิทยาบุคลิกภาพและการปรับตน", 3, InterestGroup.PSYCHOLOGY, false, List.of(1, 2),
                List.of(ElectiveTag.NO_ATTENDANCE, ElectiveTag.NO_GROUP_WORK));
    }

    /** ตัวอย่าง PY250 ใน API Spec ข้อ 2 */
    private static ElectiveDetailResponse py250Detail() {
        return ElectiveDetailResponse.of(py250(),
                List.of("เรียนบรรยายในห้อง อาจารย์สอนสนุก สไลด์เป็นภาษาอังกฤษ", "ไม่มีงานกลุ่ม"),
                List.of(new ElectiveSectionResponse(612L, "820001", 1, "อ.วรรณปรัชญ์ พิทักษ์ไพบูลย์กิจ",
                                List.of(new ScheduleSlotResponse(DayOfWeek.MONDAY, LocalTime.of(13, 30),
                                        LocalTime.of(16, 30), "LC1-201")),
                                true, false, List.of("TU109")),
                        new ElectiveSectionResponse(640L, "230001", 2, null,
                                List.of(new ScheduleSlotResponse(DayOfWeek.TUESDAY, LocalTime.of(9, 30),
                                        LocalTime.of(12, 30), null)),
                                false, false, List.of())));
    }

    private ElectiveSearchCriteria capturedCriteria() {
        ArgumentCaptor<ElectiveSearchCriteria> captor = ArgumentCaptor.forClass(ElectiveSearchCriteria.class);
        verify(electiveService).search(eq(STUDENT), eq(2568), eq(1), captor.capture());
        return captor.getValue();
    }

    // ---------- GET /api/electives ----------

    @Test
    void search_requiredParamsOnly_returnsCardsWithEmptyCriteria() throws Exception {
        when(electiveService.search(eq(STUDENT), eq(2568), eq(1), any())).thenReturn(List.of(fr205(), py250()));

        mockMvc.perform(get("/api/electives").param("academicYear", "2568").param("currentSemester", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].courseCode").value("FR205"))
                .andExpect(jsonPath("$[0].courseName").value("FRENCH FOR EVERYDAY LIFE"))
                .andExpect(jsonPath("$[0].courseNameTh").value("ภาษาฝรั่งเศสในชีวิตประจำวัน"))
                .andExpect(jsonPath("$[0].credits").value(3))
                .andExpect(jsonPath("$[0].group").value("LANGUAGE"))
                .andExpect(jsonPath("$[0].requiresQuota").value(true))
                .andExpect(jsonPath("$[0].offeredSemesters[0]").value(1))
                .andExpect(jsonPath("$[0].tags[0]").value("KIND_INSTRUCTOR"))
                .andExpect(jsonPath("$[0].tags[1]").value("NO_PREREQUISITE"))
                .andExpect(jsonPath("$[1].offeredSemesters.length()").value(2));

        assertThat(capturedCriteria()).isEqualTo(ElectiveSearchCriteria.none());
    }

    @Test
    void search_allFilters_bindsCriteria() throws Exception {
        when(electiveService.search(eq(STUDENT), eq(2568), eq(1), any())).thenReturn(List.of(py250()));

        mockMvc.perform(get("/api/electives")
                        .param("academicYear", "2568").param("currentSemester", "1")
                        .param("q", "PY2").param("semester", "2").param("day", "MONDAY")
                        .param("timeSlot", "AFTERNOON").param("group", "PSYCHOLOGY")
                        .param("excludeConflicts", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].courseCode").value("PY250"));

        assertThat(capturedCriteria()).isEqualTo(new ElectiveSearchCriteria(
                "PY2", 2, DayOfWeek.MONDAY, TimeSlot.AFTERNOON, InterestGroup.PSYCHOLOGY, true));
    }

    @Test
    void search_noResult_returnsEmptyArray() throws Exception {
        when(electiveService.search(eq(STUDENT), eq(2568), eq(1), any())).thenReturn(List.of());

        mockMvc.perform(get("/api/electives").param("academicYear", "2568").param("currentSemester", "1")
                        .param("q", "SA240"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void search_daySunday_isValidEnum() throws Exception {
        when(electiveService.search(eq(STUDENT), eq(2568), eq(1), any())).thenReturn(List.of());

        mockMvc.perform(get("/api/electives").param("academicYear", "2568").param("currentSemester", "1")
                        .param("day", "SUNDAY"))
                .andExpect(status().isOk());

        assertThat(capturedCriteria().day()).isEqualTo(DayOfWeek.SUNDAY);
    }

    @Test
    void search_missingCurrentSemester_returns400() throws Exception {
        mockMvc.perform(get("/api/electives").param("academicYear", "2568"))
                .andExpect(status().isBadRequest());

        verify(electiveService, never()).search(anyString(), anyInt(), anyInt(), any());
    }

    @Test
    void search_nonNumericAcademicYear_returns400() throws Exception {
        mockMvc.perform(get("/api/electives").param("academicYear", "abc").param("currentSemester", "1"))
                .andExpect(status().isBadRequest());

        verify(electiveService, never()).search(anyString(), anyInt(), anyInt(), any());
    }

    @Test
    void search_invalidEnumOrBoolean_returns400() throws Exception {
        String[][] invalid = {{"day", "FOO"}, {"timeSlot", "NIGHT"}, {"group", "SPORT"},
                {"excludeConflicts", "maybe"}, {"semester", "x"}};
        for (String[] param : invalid) {
            mockMvc.perform(get("/api/electives").param("academicYear", "2568").param("currentSemester", "1")
                            .param(param[0], param[1]))
                    .andExpect(status().isBadRequest());
        }

        verify(electiveService, never()).search(anyString(), anyInt(), anyInt(), any());
    }

    @Test
    void search_serviceRejectsSemester_returns400ProblemDetail() throws Exception {
        when(electiveService.search(eq(STUDENT), eq(2568), eq(3), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "currentSemester ต้องเป็น 1 หรือ 2"));

        mockMvc.perform(get("/api/electives").param("academicYear", "2568").param("currentSemester", "3"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.title").value("Bad Request"))
                .andExpect(jsonPath("$.detail").value("currentSemester ต้องเป็น 1 หรือ 2"));
    }

    // ---------- GET /api/electives/{courseCode} ----------

    @Test
    void getDetail_returnsDetailWithSectionsAndNullFields() throws Exception {
        when(electiveService.getDetail(STUDENT, "PY250", 2568, 1)).thenReturn(py250Detail());

        mockMvc.perform(get("/api/electives/PY250").param("academicYear", "2568").param("currentSemester", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.courseCode").value("PY250"))
                .andExpect(jsonPath("$.group").value("PSYCHOLOGY"))
                .andExpect(jsonPath("$.offeredSemesters.length()").value(2))
                .andExpect(jsonPath("$.tags[0]").value("NO_ATTENDANCE"))
                .andExpect(jsonPath("$.description.length()").value(2))
                .andExpect(jsonPath("$.description[1]").value("ไม่มีงานกลุ่ม"))
                .andExpect(jsonPath("$.sections.length()").value(2))
                .andExpect(jsonPath("$.sections[0].sectionId").value(612))
                .andExpect(jsonPath("$.sections[0].sectionNo").value("820001"))
                .andExpect(jsonPath("$.sections[0].semester").value(1))
                .andExpect(jsonPath("$.sections[0].instructor").value("อ.วรรณปรัชญ์ พิทักษ์ไพบูลย์กิจ"))
                .andExpect(jsonPath("$.sections[0].schedules[0].dayOfWeek").value("MONDAY"))
                .andExpect(jsonPath("$.sections[0].schedules[0].startTime").value("13:30"))
                .andExpect(jsonPath("$.sections[0].schedules[0].endTime").value("16:30"))
                .andExpect(jsonPath("$.sections[0].schedules[0].room").value("LC1-201"))
                .andExpect(jsonPath("$.sections[0].selectable").value(true))
                .andExpect(jsonPath("$.sections[0].inTimetable").value(false))
                .andExpect(jsonPath("$.sections[0].conflictWith[0]").value("TU109"))
                .andExpect(jsonPath("$.sections[1].instructor").value(nullValue()))
                .andExpect(jsonPath("$.sections[1].schedules[0].room").value(nullValue()))
                .andExpect(jsonPath("$.sections[1].selectable").value(false))
                .andExpect(jsonPath("$.sections[1].conflictWith.length()").value(0));
    }

    @Test
    void getDetail_notFound_returns404ProblemDetail() throws Exception {
        when(electiveService.getDetail(STUDENT, "SA240", 2568, 1))
                .thenThrow(new ResourceNotFoundException("ไม่พบวิชาเสรีแนะนำ: SA240"));

        mockMvc.perform(get("/api/electives/SA240").param("academicYear", "2568").param("currentSemester", "1"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("Not Found"))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.detail").value("ไม่พบวิชาเสรีแนะนำ: SA240"))
                .andExpect(jsonPath("$.instance").value("/api/electives/SA240"));
    }

    @Test
    void getDetail_missingAcademicYear_returns400() throws Exception {
        mockMvc.perform(get("/api/electives/PY250").param("currentSemester", "1"))
                .andExpect(status().isBadRequest());

        verify(electiveService, never()).getDetail(anyString(), anyString(), anyInt(), anyInt());
    }

    @Test
    void getDetail_serviceRejectsSemester_returns400ProblemDetail() throws Exception {
        when(electiveService.getDetail(STUDENT, "PY250", 2568, 3))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "currentSemester ต้องเป็น 1 หรือ 2"));

        mockMvc.perform(get("/api/electives/PY250").param("academicYear", "2568").param("currentSemester", "3"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("currentSemester ต้องเป็น 1 หรือ 2"));
    }
}
