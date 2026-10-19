package th.ac.tu.cs261.group3.backend.auth;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneId;

/**
 * นับครั้งที่กรอกรหัสผิดติดต่อกันต่อ username เก็บในตาราง {@code login_attempt}
 * <p>
 * ทุก method ใช้ transaction ของตัวเอง ({@code REQUIRES_NEW}) แยกจาก AuthService (US3-T06):
 * <ul>
 *   <li>{@code loginFailed}/{@code loginSucceeded} commit ทันที ไม่ rollback ตอน AuthService โยน 401/403/429</li>
 *   <li>{@code isLocked}/{@code getWaitTime} อ่านค่าใหม่จาก DB ทุกครั้ง ถ้าอ่านใน transaction ของ AuthService
 *       จะได้ entity ที่ cache ไว้ตั้งแต่ตรวจครั้งแรก และไม่เห็นการล็อกที่ loginFailed เพิ่ง commit</li>
 * </ul>
 */
@Service
public class LoginAttemptService {

    private final int maxAttempts;
    private final long lockSeconds;
    private final LoginAttemptRepository loginAttemptRepository;
    private final Clock clock;

    @Autowired
    public LoginAttemptService(@Value("${app.auth.max-attempts}") int maxAttempts,
                               @Value("${app.auth.lock-seconds}") long lockSeconds,
                               LoginAttemptRepository loginAttemptRepository) {
        this(maxAttempts, lockSeconds, loginAttemptRepository, Clock.system(ZoneId.of("Asia/Bangkok")));
    }

    /** test กำหนดเวลาได้ */
    LoginAttemptService(int maxAttempts, long lockSeconds, LoginAttemptRepository loginAttemptRepository, Clock clock) {
        this.maxAttempts = maxAttempts;
        this.lockSeconds = lockSeconds;
        this.loginAttemptRepository = loginAttemptRepository;
        this.clock = clock;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void loginSucceeded(String key) {
        loginAttemptRepository.deleteById(key);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void loginFailed(String key) {
        LoginAttempt attempt = loginAttemptRepository.findById(key).orElseGet(() -> new LoginAttempt(key));
        attempt.incrementFailedAttempts(maxAttempts, lockSeconds, OffsetDateTime.now(clock));
        loginAttemptRepository.save(attempt);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public boolean isLocked(String key) {
        return loginAttemptRepository.findById(key)
                .map(a -> a.isLocked(OffsetDateTime.now(clock)))
                .orElse(false);
    }

    /** วินาทีที่เหลือก่อนปลดล็อก ใช้เป็น {@code retryAfterSeconds} ไม่ล็อกคืน 0 */
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public long getWaitTime(String key) {
        return loginAttemptRepository.findById(key)
                .map(a -> a.remainingLockSeconds(OffsetDateTime.now(clock)))
                .orElse(0L);
    }
}
