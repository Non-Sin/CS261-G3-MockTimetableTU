package th.ac.tu.cs261.group3.backend.support;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.mssqlserver.MSSQLServerContainer;

/**
 * SQL Server ใน container ตัวเดียวกับ compose.yaml ทุก test class ที่ใช้ {@link DaoTest}
 * ได้ container ตัวเดียวกันผ่าน context cache
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfig {

    @Bean
    @ServiceConnection
    MSSQLServerContainer sqlServer() {
        return new MSSQLServerContainer("mcr.microsoft.com/mssql/server:2025-latest")
                .acceptLicense();
    }
}
