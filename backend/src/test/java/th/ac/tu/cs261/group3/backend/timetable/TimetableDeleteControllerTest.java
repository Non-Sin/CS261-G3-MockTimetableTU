package th.ac.tu.cs261.group3.backend.timetable;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;
import th.ac.tu.cs261.group3.backend.common.exception.ResourceNotFoundException;
import th.ac.tu.cs261.group3.backend.common.student.CurrentStudentProvider;
import th.ac.tu.cs261.group3.backend.timetable.dto.TimetableResponse;

import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Controller test แบบไม่ต้องใช้ฐานข้อมูล (mock TimetableDeleteService) ตาม US2-T05 DTO & API Spec
 */
@WebMvcTest(TimetableDeleteController.class)
@AutoConfigureMockMvc(addFilters = false)   // ทดสอบเฉพาะ controller การตรวจ token อยู่ใน SecurityConfigTest
class TimetableDeleteControllerTest {

    private static final String STUDENT = "6609000000";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TimetableDeleteService timetableDeleteService;

    @MockitoBean
    private CurrentStudentProvider currentStudentProvider;

    @BeforeEach
    void setUp() {
        when(currentStudentProvider.currentStudentId()).thenReturn(STUDENT);
    }

    /** ลบจนหมดได้ entries ว่างแต่ updatedAt ไม่เป็น null (TC3) */
    private static TimetableResponse emptiedTimetable() {
        return TimetableResponse.of(2568, 1, List.of(), 22, List.of(),
                OffsetDateTime.parse("2026-10-15T20:31:40+07:00"));
    }

    // ---------- DELETE /api/timetable/entries/{entryId} ----------

    @Test
    void removeEntry_returns200WithTimetable() throws Exception {
        when(timetableDeleteService.removeEntry(STUDENT, 8L)).thenReturn(emptiedTimetable());

        mockMvc.perform(delete("/api/timetable/entries/8"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.academicYear").value(2568))
                .andExpect(jsonPath("$.entries.length()").value(0))
                .andExpect(jsonPath("$.totalCredits").value(0))
                .andExpect(jsonPath("$.updatedAt").value("2026-10-15T20:31:40+07:00"));
    }

    @Test
    void removeEntry_notFound_returns404() throws Exception {
        when(timetableDeleteService.removeEntry(STUDENT, 9L))
                .thenThrow(new ResourceNotFoundException("ไม่พบวิชาในตารางเรียนของคุณ: entryId 9"));

        mockMvc.perform(delete("/api/timetable/entries/9"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("ไม่พบวิชาในตารางเรียนของคุณ: entryId 9"));
    }

    @Test
    void removeEntry_nonNumericId_returns400() throws Exception {
        mockMvc.perform(delete("/api/timetable/entries/abc"))
                .andExpect(status().isBadRequest());

        verify(timetableDeleteService, never()).removeEntry(anyString(), any());
    }

    // ---------- DELETE /api/timetable/entries?entryIds= ----------

    @Test
    void removeEntries_commaSeparated_returns200() throws Exception {
        when(timetableDeleteService.removeEntries(STUDENT, List.of(7L, 8L))).thenReturn(emptiedTimetable());

        mockMvc.perform(delete("/api/timetable/entries").param("entryIds", "7,8"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entries.length()").value(0));
    }

    @Test
    void removeEntries_repeatedKey_returns200() throws Exception {
        when(timetableDeleteService.removeEntries(STUDENT, List.of(7L, 8L))).thenReturn(emptiedTimetable());

        mockMvc.perform(delete("/api/timetable/entries").param("entryIds", "7").param("entryIds", "8"))
                .andExpect(status().isOk());
    }

    @Test
    void removeEntries_missingParam_returns400() throws Exception {
        mockMvc.perform(delete("/api/timetable/entries"))
                .andExpect(status().isBadRequest());

        verify(timetableDeleteService, never()).removeEntries(anyString(), any());
    }

    @Test
    void removeEntries_nonNumeric_returns400() throws Exception {
        mockMvc.perform(delete("/api/timetable/entries").param("entryIds", "7,abc"))
                .andExpect(status().isBadRequest());

        verify(timetableDeleteService, never()).removeEntries(anyString(), any());
    }

    @Test
    void removeEntries_serviceRejects_returns400ProblemDetail() throws Exception {
        when(timetableDeleteService.removeEntries(STUDENT, List.of(7L, 9L)))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "entryIds ต้องเป็นวิชาในตารางเดียวกัน (ปีการศึกษาและภาคเรียนเดียวกัน)"));

        mockMvc.perform(delete("/api/timetable/entries").param("entryIds", "7,9"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Bad Request"))
                .andExpect(jsonPath("$.detail").value("entryIds ต้องเป็นวิชาในตารางเดียวกัน (ปีการศึกษาและภาคเรียนเดียวกัน)"));
    }
}
