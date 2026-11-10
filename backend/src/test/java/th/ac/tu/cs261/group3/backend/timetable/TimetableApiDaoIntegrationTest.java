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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration Test ระหว่าง API กับ DAO ตาม US1-T14 (IT-API-DAO-01 ถึง 05)
 * <p>
 * รันจริงตั้งแต่ security filter (JWT) → TimetableController → TimetableService → Repository → SQL Server
 * Flyway รันทั้ง db/migration และ db/seed จึงใช้รายวิชา 1/2568 จาก seed ได้เลย
 * <p>
 * ไม่ใช้ {@code @Transactional} ที่ test เพื่อให้ service commit จริงแล้วนับแถวจาก DB
 * ข้อมูลของ {@link #STUDENT} ถูกลบทิ้งก่อนและหลังทุกเคส
 */
@SpringBootTest(properties = "app.auth.jwt.secret=test-secret-for-integration-32-bytes!!")
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class TimetableApiDaoIntegrationTest {

    /** ไม่ใช้บัญชี demo 6609000000 เพื่อไม่ให้ไปลบตารางของคนอื่น */
    private static final String STUDENT = "6609000099";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private JdbcTemplate jdbc;

    private String token;

    @BeforeEach
    void setUp() {
        deleteStudentTimetables();
        token = jwtService.generateToken(STUDENT);
    }

    @AfterEach
    void tearDown() {
        deleteStudentTimetables();
    }

    @Test
    void itApiDao01_addFirstEntry_createsTimetableAndEntry() throws Exception {
        long cs111Sec1 = sectionId("CS111", "030001");
        assertThat(countTimetables()).isZero();

        addEntry(cs111Sec1)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.academicYear").value(2568))
                .andExpect(jsonPath("$.semester").value(1))
                .andExpect(jsonPath("$.entries.length()").value(1))
                .andExpect(jsonPath("$.entries[0].courseCode").value("CS111"))
                .andExpect(jsonPath("$.entries[0].sectionNo").value("030001"))
                .andExpect(jsonPath("$.totalCredits").value(3))
                .andExpect(jsonPath("$.conflicts").isEmpty())
                .andExpect(jsonPath("$.updatedAt").isNotEmpty());

        assertThat(countTimetables()).isEqualTo(1);
        assertThat(countEntries()).isEqualTo(1);
        assertThat(jdbc.queryForObject("""
                SELECT e.section_id FROM timetable_entry e
                JOIN timetable t ON t.timetable_id = e.timetable_id
                WHERE t.student_id = ? AND t.academic_year = 2568 AND t.semester = 1
                """, Long.class, STUDENT)).isEqualTo(cs111Sec1);
    }

    @Test
    void itApiDao02_sameCourseOtherSection_returns409AndSavesNothing() throws Exception {
        addEntryOk("CS111", "030001");
        int entriesBefore = countEntries();

        addEntry(sectionId("CS111", "030002"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COURSE_ALREADY_IN_TIMETABLE"))
                .andExpect(jsonPath("$.courseCode").value("CS111"))
                .andExpect(jsonPath("$.existingSectionNo").value("030001"));

        assertThat(countEntries()).isEqualTo(entriesBefore);
        assertThat(countTimetables()).isEqualTo(1);
    }

    @Test
    void itApiDao03_creditOverLimit_returns409AndSavesNothing() throws Exception {
        // 7 วิชา × 3 หน่วยกิต = 21 เพิ่ม ST216 อีก 3 จะเป็น 24 > 22
        addEntryOk("CS180", "820001");
        addEntryOk("MA211", "020001");
        addEntryOk("CS111", "030001");
        addEntryOk("LAS101", "780004");
        addEntryOk("TU101", "900001");
        addEntryOk("TU106", "540001");
        addEntryOk("TU109", "780001");
        int entriesBefore = countEntries();
        assertThat(entriesBefore).isEqualTo(7);

        addEntry(sectionId("ST216", "040001"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CREDIT_LIMIT_EXCEEDED"))
                .andExpect(jsonPath("$.currentCredits").value(21))
                .andExpect(jsonPath("$.courseCredits").value(3))
                .andExpect(jsonPath("$.maxCredits").value(22));

        assertThat(countEntries()).isEqualTo(entriesBefore);
        assertThat(countTimetables()).isEqualTo(1);
    }

    @Test
    void itApiDao04_timeConflict_returns201WithConflictsAndSaves() throws Exception {
        addEntryOk("LAS101", "780004");
        int entriesBefore = countEntries();

        addEntry(sectionId("TU109", "780001"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.entries.length()").value(2))
                .andExpect(jsonPath("$.conflicts.length()").value(1))
                .andExpect(jsonPath("$.conflicts[0].dayOfWeek").value("WEDNESDAY"))
                .andExpect(jsonPath("$.conflicts[0].overlapStart").value("09:30"))
                .andExpect(jsonPath("$.conflicts[0].overlapEnd").value("12:30"))
                .andExpect(jsonPath("$.conflicts[0].courseCodes[0]").value("LAS101"))
                .andExpect(jsonPath("$.conflicts[0].courseCodes[1]").value("TU109"));

        assertThat(countEntries()).isEqualTo(entriesBefore + 1);
    }

    @Test
    void itApiDao05_unknownSection_returns404AndSavesNothing() throws Exception {
        long unknownId = jdbc.queryForObject("SELECT MAX(section_id) FROM section", Long.class) + 1000;

        addEntry(unknownId)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.detail").value("Section not found with id: " + unknownId));

        assertThat(countTimetables()).isZero();
        assertThat(countEntries()).isZero();
    }

    private ResultActions addEntry(long sectionId) throws Exception {
        return mockMvc.perform(post("/api/timetable/entries")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"sectionId": %d}
                        """.formatted(sectionId)));
    }

    /** เตรียม pre-condition ผ่าน API เดียวกัน */
    private void addEntryOk(String courseCode, String sectionNo) throws Exception {
        addEntry(sectionId(courseCode, sectionNo)).andExpect(status().isCreated());
    }

    /** section_id เป็น IDENTITY จึงหาจาก seed 2568/1 แทนการ hard-code */
    private long sectionId(String courseCode, String sectionNo) {
        return jdbc.queryForObject("""
                SELECT section_id FROM section
                WHERE course_code = ? AND section_no = ? AND academic_year = 2568 AND semester = 1
                """, Long.class, courseCode, sectionNo);
    }

    private int countTimetables() {
        return jdbc.queryForObject("SELECT COUNT(*) FROM timetable WHERE student_id = ?", Integer.class, STUDENT);
    }

    private int countEntries() {
        return jdbc.queryForObject("""
                SELECT COUNT(*) FROM timetable_entry e
                JOIN timetable t ON t.timetable_id = e.timetable_id
                WHERE t.student_id = ?
                """, Integer.class, STUDENT);
    }

    /** timetable_entry ลบตามด้วย ON DELETE CASCADE */
    private void deleteStudentTimetables() {
        jdbc.update("DELETE FROM timetable WHERE student_id = ?", STUDENT);
    }
}
