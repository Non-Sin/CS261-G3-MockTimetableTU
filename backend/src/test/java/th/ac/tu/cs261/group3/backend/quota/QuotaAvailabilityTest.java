package th.ac.tu.cs261.group3.backend.quota;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import th.ac.tu.cs261.group3.backend.common.student.CurrentStudentProvider;
import th.ac.tu.cs261.group3.backend.timetable.TimetableEntryRepository;
import th.ac.tu.cs261.group3.backend.timetable.TimetableRepository;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Service จริง แต่ไม่มี QuotaDataReader: ตรวจว่าเริ่ม context ได้และไม่ปลอมผลค้นหา */
@WebMvcTest(QuotaController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(QuotaService.class)
class QuotaAvailabilityTest {

    @Autowired private MockMvc mvc;
    @MockitoBean private CurrentStudentProvider student;
    @MockitoBean private TimetableRepository timetables;
    @MockitoBean private TimetableEntryRepository entries;

    @ParameterizedTest
    @ValueSource(strings = {"/api/quota/courses", "/api/quota/courses/EL395"})
    void absentReader_returns503WithRealService(String path) throws Exception {
        mvc.perform(get(path).param("academicYear", "2568").param("semester", "1").param("q", "EL395"))
                .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.status").value(503));
        verifyNoInteractions(timetables, entries);
    }

    @Test
    void absentReader_doesNotHideInvalidSearch() throws Exception {
        mvc.perform(get("/api/quota/courses").param("academicYear", "2568").param("semester", "1"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("QUOTA_SEARCH_QUERY_REQUIRED"));
        verifyNoInteractions(timetables, entries);
    }
}
