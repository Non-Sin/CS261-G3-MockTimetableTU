package th.ac.tu.cs261.group3.backend.support;

import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation ของ DAO test ตาม US1-T12 Test Approach:
 * {@code @DataJpaTest} + {@code @AutoConfigureTestDatabase(replace = NONE)} + {@code @Import(TestcontainersConfig.class)}
 * <p>
 * Flyway รันเฉพาะ {@code db/migration} ไม่รัน {@code db/seed} เพื่อไม่ให้รายวิชาใน seed ชนกับ {@link DaoFixture}
 * ทุก test class ใช้ค่าชุดเดียวกัน จึงได้ Spring context และ container ตัวเดียวกัน
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@DataJpaTest(properties = "spring.flyway.locations=classpath:db/migration")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfig.class)
public @interface DaoTest {
}
