package th.ac.tu.cs261.group3.backend.auth;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;

/**
 * ออกและตรวจ JWT (HS256) ที่มี subject เป็นรหัสนักศึกษา
 * <p>
 * ใช้ Nimbus ผ่าน spring-security-oauth2-jose ตัวตรวจของ NimbusJwtDecoder เช็คลายเซ็นและวันหมดอายุให้
 */
@Service
public class JwtService {

    private final JwtEncoder encoder;
    private final JwtDecoder decoder;
    private final long expirationMs;
    private final Clock clock;

    @Autowired
    public JwtService(@Value("${app.auth.jwt.secret}") String secretKey,
                      @Value("${app.auth.jwt.expiration-ms}") long expirationMs) {
        this(secretKey, expirationMs, Clock.systemUTC());
    }

    /** test ออก token ย้อนเวลาได้ ส่วนการตรวจวันหมดอายุใช้เวลาจริงเสมอ */
    JwtService(String secretKey, long expirationMs, Clock clock) {
        byte[] secret = secretKey.getBytes(StandardCharsets.UTF_8);
        if (secret.length < 32) {
            throw new IllegalStateException("app.auth.jwt.secret ต้องยาวอย่างน้อย 32 byte สำหรับ HS256");
        }
        SecretKey key = new SecretKeySpec(secret, "HmacSHA256");
        this.encoder = NimbusJwtEncoder.withSecretKey(key).algorithm(MacAlgorithm.HS256).build();
        this.decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        this.expirationMs = expirationMs;
        this.clock = clock;
    }

    public String generateToken(String studentId) {
        Instant now = clock.instant();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(studentId)
                .issuedAt(now)
                .expiresAt(now.plusMillis(expirationMs))
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    /** ต้องเรียก {@link #isTokenValid} ก่อน token ที่ไม่ถูกต้องโยน JwtException */
    public String extractStudentId(String token) {
        return decoder.decode(token).getSubject();
    }

    public boolean isTokenValid(String token) {
        try {
            decoder.decode(token);
            return true;
        } catch (JwtException ex) {
            return false;
        }
    }
}
