package th.ac.tu.cs261.group3.backend.quota;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mssqlserver.MSSQLServerContainer;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;

/** ตรวจทั้ง fresh install และ upgrade โดยสร้างฐานข้อมูลเฉพาะใน container เท่านั้น */
@Testcontainers
class QuotaMigrationTest {

    @Container
    static final MSSQLServerContainer SQL = new MSSQLServerContainer("mcr.microsoft.com/mssql/server:2025-latest")
            .acceptLicense();

    @Test
    void migrate_freshDatabase_runsHistoricalSeedsAndQuotaExamples() throws SQLException {
        String url = createDatabase("quota_fresh");
        Flyway flyway = flyway(url, null);
        flyway.migrate();
        assertSeedData(url);
        assertThat(flyway.migrate().migrationsExecuted).isZero();
        assertThat(flyway.validateWithResult().validationSuccessful).isTrue();
    }

    @Test
    void migrate_existingElectiveData_preservesNamesAndTimetable() throws SQLException {
        String url = createDatabase("quota_upgrade");
        flyway(url, "20261116.1734").migrate();
        try (Connection connection = connect(url); var statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO course (course_code, course_name, category, credits)
                    VALUES ('Q7LEGACY', 'Existing elective', 'FREE_ELECTIVE', 3)""");
            statement.executeUpdate("""
                    INSERT INTO elective_info (course_code, course_name_th, interest_group, requires_quota)
                    VALUES ('Q7LEGACY', N'ชื่อไทยเดิมที่ต้องรักษา', 'LANGUAGE', 0)""");
            statement.executeUpdate("""
                    INSERT INTO timetable (student_id, academic_year, semester, updated_at)
                    VALUES ('Q7-UPGRADE', 2568, 1, SYSDATETIMEOFFSET())""");
            statement.executeUpdate("""
                    INSERT INTO timetable_entry (timetable_id, section_id)
                    SELECT t.timetable_id, MIN(s.section_id) FROM timetable t CROSS JOIN section s
                    WHERE t.student_id = 'Q7-UPGRADE' AND s.course_code = 'MA211'
                      AND s.academic_year = 2568 AND s.semester = 1 GROUP BY t.timetable_id""");
        }
        Flyway flyway = flyway(url, null);
        assertThat(flyway.migrate().migrationsExecuted).isEqualTo(3);
        assertSeedData(url);
        try (Connection connection = connect(url); var statement = connection.createStatement()) {
            var names = statement.executeQuery("""
                    SELECT c.course_name_th, e.course_name_th FROM course c
                    JOIN elective_info e ON e.course_code = c.course_code WHERE c.course_code = 'Q7LEGACY'""");
            assertThat(names.next()).isTrue();
            assertThat(names.getString(1)).isEqualTo("ชื่อไทยเดิมที่ต้องรักษา").isEqualTo(names.getString(2));
            var entries = statement.executeQuery("""
                    SELECT COUNT(*) FROM timetable_entry e JOIN timetable t ON t.timetable_id = e.timetable_id
                    WHERE t.student_id = 'Q7-UPGRADE'""");
            entries.next();
            assertThat(entries.getInt(1)).isEqualTo(1);
        }
        assertThat(flyway.validateWithResult().validationSuccessful).isTrue();
    }

    private Flyway flyway(String url, String target) {
        var config = Flyway.configure().dataSource(url, SQL.getUsername(), SQL.getPassword())
                .locations("classpath:db/migration", "classpath:db/seed");
        if (target != null) {
            config.target(target);
        }
        return config.load();
    }

    private String createDatabase(String name) throws SQLException {
        try (Connection connection = connect(SQL.getJdbcUrl()); var statement = connection.createStatement()) {
            statement.executeUpdate("CREATE DATABASE [" + name + "]");
        }
        return "jdbc:sqlserver://" + SQL.getHost() + ":" + SQL.getMappedPort(1433)
                + ";databaseName=" + name + ";encrypt=false;trustServerCertificate=true";
    }

    private Connection connect(String url) throws SQLException {
        return DriverManager.getConnection(url, SQL.getUsername(), SQL.getPassword());
    }

    private void assertSeedData(String url) throws SQLException {
        try (Connection connection = connect(url); var statement = connection.createStatement()) {
            var names = statement.executeQuery("""
                    SELECT COUNT(*) FROM elective_info e JOIN course c ON c.course_code = e.course_code
                    WHERE c.course_name_th = e.course_name_th""");
            names.next();
            assertThat(names.getInt(1)).isGreaterThanOrEqualTo(18);
            var channels = statement.executeQuery("SELECT COUNT(*) FROM quota_channel WHERE course_code = 'EL395'");
            channels.next();
            assertThat(channels.getInt(1)).isEqualTo(2);
            var noData = statement.executeQuery("""
                    SELECT COUNT(*) FROM course c LEFT JOIN course_quota_info q ON q.course_code = c.course_code
                    WHERE c.course_code = 'TU101' AND q.course_code IS NULL""");
            noData.next();
            assertThat(noData.getInt(1)).isEqualTo(1);
            var offline = statement.executeQuery("""
                    SELECT label, url FROM quota_contact WHERE course_code = 'PC280'""");
            assertThat(offline.next()).isTrue();
            assertThat(offline.getString(1)).isEqualTo("MS Teams wchumpon@tu.ac.th");
            assertThat(offline.getString(2)).isNull();
        }
    }
}
