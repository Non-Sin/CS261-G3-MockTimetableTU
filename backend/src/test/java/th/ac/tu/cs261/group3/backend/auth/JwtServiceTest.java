package th.ac.tu.cs261.group3.backend.auth;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String SECRET = "test-secret-for-unit-tests-32-bytes!!";

    private final JwtService jwtService = new JwtService(SECRET, 60_000);

    @Test
    void generateToken_canBeReadBack() {
        String token = jwtService.generateToken("6609000001");

        assertThat(jwtService.isTokenValid(token)).isTrue();
        assertThat(jwtService.extractStudentId(token)).isEqualTo("6609000001");
    }

    @Test
    void tokenSignedWithOtherSecret_invalid() {
        String token = new JwtService("another-secret-for-unit-tests-32-bytes", 60_000).generateToken("6609000001");

        assertThat(jwtService.isTokenValid(token)).isFalse();
    }

    @Test
    void expiredToken_invalid() {
        // ออกเมื่อ 3 นาทีก่อน อายุ 1 นาที หมดไปแล้ว 2 นาที เกินที่ NimbusJwtDecoder ยอมให้คลาดเคลื่อน (60 วินาที)
        Clock threeMinutesAgo = Clock.fixed(Instant.now().minusSeconds(180), ZoneOffset.UTC);
        String token = new JwtService(SECRET, 60_000, threeMinutesAgo).generateToken("6609000001");

        assertThat(jwtService.isTokenValid(token)).isFalse();
    }

    @Test
    void tamperedOrGarbageToken_invalid() {
        String token = jwtService.generateToken("6609000001");
        String otherSubject = jwtService.generateToken("6609000002");
        // เอา payload ของอีกคนมาต่อกับลายเซ็นเดิม
        String[] a = token.split("\\.");
        String[] b = otherSubject.split("\\.");

        assertThat(jwtService.isTokenValid(a[0] + "." + b[1] + "." + a[2])).isFalse();
        assertThat(jwtService.isTokenValid("not-a-jwt")).isFalse();
    }

    @Test
    void shortSecret_rejectedAtStartup() {
        assertThatThrownBy(() -> new JwtService("too-short", 60_000))
                .isInstanceOf(IllegalStateException.class);
    }
}
