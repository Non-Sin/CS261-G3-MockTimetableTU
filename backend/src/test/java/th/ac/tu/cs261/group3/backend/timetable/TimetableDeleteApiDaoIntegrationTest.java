package th.ac.tu.cs261.group3.backend.timetable;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import th.ac.tu.cs261.group3.backend.auth.JwtService;
import th.ac.tu.cs261.group3.backend.support.TestcontainersConfig;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration Test ระหว่าง API กับ DAO ตาม US2-T14 (IT-01 ถึง 06) ลบวิชาออกจากตารางเรียน
 * <p>
 * รันจริงตั้งแต่ security filter (JWT) → TimetableDeleteController → TimetableDeleteService
 * → TimetableEntryRepository / TimetableService → SQL Server ไม่ mock อะไร
 * <p>
 * ไม่ใช้ {@code @Transactional} ที่ test เพื่อให้ service commit จริงแล้วตรวจแถวจาก DB ด้วย JdbcTemplate
 * entry_id เป็น IDENTITY จึงเตรียมวิชาผ่าน {@code POST /api/timetable/entries} แล้วอ่าน id กลับจาก DB
 * ข้อมูลของ {@link #STUDENT} และ {@link #OTHER_STUDENT} ถูกลบทิ้งก่อนและหลังทุกเคส
 */
@SpringBootTest(properties = "app.auth.jwt.secret=test-secret-for-integration-32-bytes!!")
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class TimetableDeleteApiDaoIntegrationTest {

    /** ไม่ใช้บัญชี demo 6609000000 และไม่ซ้ำกับ 6609000099 ของ US1-T18 */
    private static final String STUDENT = "6609000097";
    /** เจ้าของ entry อีกคน ใช้ตรวจ ownership (IT-04) */
    private static final String OTHER_STUDENT = "6609000098";

    /** เวลาเก่าที่ตั้งให้ updated_at ก่อนลบ เพื่อให้เห็นว่า touch() เปลี่ยนค่าจริง (touch() ตัดเหลือหลักวินาที) */
    private static final OffsetDateTime OLD_UPDATED_AT = OffsetDateTime.parse("2000-01-01T00:00:00+07:00");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private JdbcTemplate jdbc;

    private String token;
    private String otherToken;

    /** entry ในตาราง 1/2568 ของ STUDENT: CS111 030001, MA211 020001, TU101 900001 (เวลาไม่ชนกัน) */
    private long e1, e2, e3;

    @BeforeEach
    void setUp() throws Exception {
        deleteTimetables();
        token = jwtService.generateToken(STUDENT);
        otherToken = jwtService.generateToken(OTHER_STUDENT);

        addEntryOk(token, "CS111", "030001", 1);
        addEntryOk(token, "MA211", "020001", 1);
        addEntryOk(token, "TU101", "900001", 1);
        e1 = entryId(STUDENT, "CS111", 1);
        e2 = entryId(STUDENT, "MA211", 1);
        e3 = entryId(STUDENT, "TU101", 1);
        assertThat(countEntries(STUDENT)).isEqualTo(3);
    }

    @AfterEach
    void tearDown() {
        deleteTimetables();
    }

    @Test
    void it01_removeSingleEntry_deletesOnlyThatRowAndTouchesTimetable() throws Exception {
        setUpdatedAt(STUDENT, 1, OLD_UPDATED_AT);
        int sectionsBefore = countSections();

        removeEntry(token, e1)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.academicYear").value(2568))
                .andExpect(jsonPath("$.semester").value(1))
                .andExpect(jsonPath("$.entries.length()").value(2))
                .andExpect(jsonPath("$.entries[?(@.entryId == %d)]".formatted(e1)).isEmpty())
                .andExpect(jsonPath("$.totalCredits").value(6))
                .andExpect(jsonPath("$.updatedAt").isNotEmpty());

        assertThat(entryIds(STUDENT)).containsExactlyInAnyOrder(e2, e3);
        assertThat(countTimetables(STUDENT)).isEqualTo(1);
        assertThat(updatedAt(STUDENT, 1)).isAfter(OLD_UPDATED_AT);
        assertThat(countSections()).isEqualTo(sectionsBefore);
    }

    @Test
    void it02_removeMultipleEntries_deletesBothInOneRequest() throws Exception {
        setUpdatedAt(STUDENT, 1, OLD_UPDATED_AT);
        int sectionsBefore = countSections();

        removeEntries(token, e1 + "," + e2)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entries.length()").value(1))
                .andExpect(jsonPath("$.entries[0].entryId").value(e3))
                .andExpect(jsonPath("$.entries[0].courseCode").value("TU101"))
                .andExpect(jsonPath("$.totalCredits").value(3));

        assertThat(entryIds(STUDENT)).containsExactly(e3);
        assertThat(countTimetables(STUDENT)).isEqualTo(1);
        assertThat(updatedAt(STUDENT, 1)).isAfter(OLD_UPDATED_AT);
        assertThat(countSections()).isEqualTo(sectionsBefore);
    }

    @Test
    void it03_removeAllEntries_keepsEmptyTimetableRow() throws Exception {
        setUpdatedAt(STUDENT, 1, OLD_UPDATED_AT);
        int sectionsBefore = countSections();

        removeEntries(token, e1 + "," + e2 + "," + e3)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entries").isEmpty())
                .andExpect(jsonPath("$.conflicts").isEmpty())
                .andExpect(jsonPath("$.totalCredits").value(0))
                .andExpect(jsonPath("$.updatedAt").isNotEmpty());

        assertThat(countEntries(STUDENT)).isZero();
        assertThat(countTimetables(STUDENT)).isEqualTo(1);
        assertThat(updatedAt(STUDENT, 1)).isAfter(OLD_UPDATED_AT);
        assertThat(countSections()).isEqualTo(sectionsBefore);
    }

    @Test
    void it04_unknownOrOtherStudentsEntry_returns404AndDeletesNothing() throws Exception {
        addEntryOk(otherToken, "CS111", "030001", 1);
        long otherEntry = entryId(OTHER_STUDENT, "CS111", 1);
        long unknownEntry = jdbc.queryForObject("SELECT MAX(entry_id) FROM timetable_entry", Long.class) + 1000;
        setUpdatedAt(STUDENT, 1, OLD_UPDATED_AT);

        // entry ที่ไม่มีอยู่จริง
        removeEntry(token, unknownEntry)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.detail").value("ไม่พบวิชาในตารางเรียนของคุณ: entryId " + unknownEntry));

        // entry ของนักศึกษาคนอื่น ตอบเหมือนไม่พบ
        removeEntry(token, otherEntry)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("ไม่พบวิชาในตารางเรียนของคุณ: entryId " + otherEntry));

        // ปนกับ entry ของตัวเอง ต้องไม่ลบ e1 (all-or-nothing)
        removeEntries(token, e1 + "," + otherEntry)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("ไม่พบวิชาในตารางเรียนของคุณ: entryId " + otherEntry));

        assertThat(entryIds(STUDENT)).containsExactlyInAnyOrder(e1, e2, e3);
        assertThat(entryIds(OTHER_STUDENT)).containsExactly(otherEntry);
        assertThat(updatedAt(STUDENT, 1)).isEqualTo(OLD_UPDATED_AT);
    }

    @Test
    void it05_emptyOrNonNumericEntryIds_returns400AndDeletesNothing() throws Exception {
        setUpdatedAt(STUDENT, 1, OLD_UPDATED_AT);

        removeEntries(token, "")
                .andExpect(status().isBadRequest());

        removeEntries(token, "abc")
                .andExpect(status().isBadRequest());

        removeEntries(token, e1 + ",abc")
                .andExpect(status().isBadRequest());

        assertThat(entryIds(STUDENT)).containsExactlyInAnyOrder(e1, e2, e3);
        assertThat(updatedAt(STUDENT, 1)).isEqualTo(OLD_UPDATED_AT);
    }

    @Test
    void it06_entriesFromDifferentTimetables_returns400AndDeletesNothing() throws Exception {
        // CS111 030001 ของ 2568/2 จาก seed ทำให้ STUDENT มีตารางที่สอง
        addEntryOk(token, "CS111", "030001", 2);
        long e4 = entryId(STUDENT, "CS111", 2);
        assertThat(countTimetables(STUDENT)).isEqualTo(2);
        setUpdatedAt(STUDENT, 1, OLD_UPDATED_AT);
        setUpdatedAt(STUDENT, 2, OLD_UPDATED_AT);

        removeEntries(token, e1 + "," + e4)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.detail")
                        .value("entryIds ต้องเป็นวิชาในตารางเดียวกัน (ปีการศึกษาและภาคเรียนเดียวกัน)"));

        assertThat(entryIds(STUDENT)).containsExactlyInAnyOrder(e1, e2, e3, e4);
        assertThat(countTimetables(STUDENT)).isEqualTo(2);
        assertThat(updatedAt(STUDENT, 1)).isEqualTo(OLD_UPDATED_AT);
        assertThat(updatedAt(STUDENT, 2)).isEqualTo(OLD_UPDATED_AT);
    }

    // ---------- API ----------

    private ResultActions removeEntry(String bearer, long entryId) throws Exception {
        return mockMvc.perform(delete("/api/timetable/entries/{entryId}", entryId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + bearer));
    }

    private ResultActions removeEntries(String bearer, String entryIds) throws Exception {
        return mockMvc.perform(delete("/api/timetable/entries")
                .param("entryIds", entryIds)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + bearer));
    }

    /** เตรียม pre-condition ผ่าน API ของ US1 */
    private void addEntryOk(String bearer, String courseCode, String sectionNo, int semester) throws Exception {
        mockMvc.perform(post("/api/timetable/entries")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sectionId": %d}
                                """.formatted(sectionId(courseCode, sectionNo, semester))))
                .andExpect(status().isCreated());
    }

    // ---------- DB ----------

    /** section_id เป็น IDENTITY จึงหาจาก seed 2568 แทนการ hard-code */
    private long sectionId(String courseCode, String sectionNo, int semester) {
        return jdbc.queryForObject("""
                SELECT section_id FROM section
                WHERE course_code = ? AND section_no = ? AND academic_year = 2568 AND semester = ?
                """, Long.class, courseCode, sectionNo, semester);
    }

    private long entryId(String studentId, String courseCode, int semester) {
        return jdbc.queryForObject("""
                SELECT e.entry_id FROM timetable_entry e
                JOIN timetable t ON t.timetable_id = e.timetable_id
                JOIN section s ON s.section_id = e.section_id
                WHERE t.student_id = ? AND t.academic_year = 2568 AND t.semester = ? AND s.course_code = ?
                """, Long.class, studentId, semester, courseCode);
    }

    private List<Long> entryIds(String studentId) {
        return jdbc.queryForList("""
                SELECT e.entry_id FROM timetable_entry e
                JOIN timetable t ON t.timetable_id = e.timetable_id
                WHERE t.student_id = ?
                """, Long.class, studentId);
    }

    private int countEntries(String studentId) {
        return entryIds(studentId).size();
    }

    private int countTimetables(String studentId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM timetable WHERE student_id = ?", Integer.class, studentId);
    }

    private int countSections() {
        return jdbc.queryForObject("SELECT COUNT(*) FROM section", Integer.class);
    }

    private OffsetDateTime updatedAt(String studentId, int semester) {
        return jdbc.queryForObject("""
                SELECT updated_at FROM timetable
                WHERE student_id = ? AND academic_year = 2568 AND semester = ?
                """, OffsetDateTime.class, studentId, semester);
    }

    private void setUpdatedAt(String studentId, int semester, OffsetDateTime value) {
        jdbc.update("""
                UPDATE timetable SET updated_at = ?
                WHERE student_id = ? AND academic_year = 2568 AND semester = ?
                """, value, studentId, semester);
    }

    /** timetable_entry ลบตามด้วย ON DELETE CASCADE */
    private void deleteTimetables() {
        jdbc.update("DELETE FROM timetable WHERE student_id IN (?, ?)", STUDENT, OTHER_STUDENT);
    }
}
