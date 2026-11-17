package th.ac.tu.cs261.group3.backend.quota;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;
import th.ac.tu.cs261.group3.backend.auth.JwtService;
import th.ac.tu.cs261.group3.backend.common.exception.GlobalExceptionHandler;
import th.ac.tu.cs261.group3.backend.common.student.SecurityContextStudentProvider;
import th.ac.tu.cs261.group3.backend.config.SecurityConfig;
import th.ac.tu.cs261.group3.backend.quota.data.QuotaDataReader;
import th.ac.tu.cs261.group3.backend.timetable.TimetableEntryRepository;
import th.ac.tu.cs261.group3.backend.timetable.TimetableRepository;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * HTTP server สำหรับ Postman ก่อน T09: ใช้ Controller/Service/DTO/JWT จริง แต่ข้อมูลอยู่ใน test fixtures
 * ไม่มี component scan ของ app หลัก ไม่มี DataSource และไม่ถูกบรรจุใน production WAR
 */
@TestConfiguration(proxyBeanMethods = false)
@EnableAutoConfiguration(excludeName = {
        "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration",
        "org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration",
        "org.springframework.boot.data.jpa.autoconfigure.DataJpaRepositoriesAutoConfiguration",
        "org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration",
        "org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration"
})
@Import({QuotaController.class, QuotaService.class, GlobalExceptionHandler.class,
        SecurityConfig.class, JwtService.class, SecurityContextStudentProvider.class})
public class QuotaPostmanApplication {

    public static void main(String[] args) throws Exception {
        SpringApplication app = new SpringApplication(QuotaPostmanApplication.class);
        app.setDefaultProperties(Map.of(
                "spring.config.name", "quota-postman-test",
                "server.address", "127.0.0.1",
                "server.port", "18087",
                "spring.main.banner-mode", "off",
                "logging.level.root", "WARN",
                "app.auth.jwt.secret", "quota-postman-test-only-secret-at-least-32-bytes!!",
                "app.auth.jwt.expiration-ms", "3600000"));
        var context = app.run(args);
        JwtService jwt = context.getBean(JwtService.class);
        Files.createDirectories(Path.of("target"));
        Files.writeString(Path.of("target/quota-postman-token.txt"), jwt.generateToken(QuotaTestData.STUDENT));
        Files.writeString(Path.of("target/quota-postman-other-token.txt"), jwt.generateToken("6609000002"));
        System.out.println("US7 Postman test server ready at http://127.0.0.1:18087 (test fixtures, no database)");
    }

    @Bean
    QuotaDataReader quotaDataReader() {
        return new FixtureQuotaDataReader();
    }

    @Bean
    TimetableRepository timetableRepository() {
        TimetableRepository repository = mock(TimetableRepository.class);
        when(repository.findByStudentIdAndAcademicYearAndSemester(QuotaTestData.STUDENT, 2568, 1))
                .thenReturn(Optional.of(QuotaTestData.timetable(10)));
        when(repository.findByStudentIdAndAcademicYearAndSemester("6609000002", 2568, 1))
                .thenReturn(Optional.of(QuotaTestData.timetable(20)));
        return repository;
    }

    @Bean
    TimetableEntryRepository timetableEntryRepository() {
        TimetableEntryRepository repository = mock(TimetableEntryRepository.class);
        when(repository.findByTimetableId(10L)).thenReturn(List.of(QuotaTestData.entry("MA211"), QuotaTestData.entry("LAS101")));
        when(repository.findByTimetableId(20L)).thenReturn(List.of(QuotaTestData.entry("TU101")));
        return repository;
    }
}
