package th.ac.tu.cs261.group3.backend.auth;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

/**
 * จำนวนครั้งที่กรอกรหัสผิดติดต่อกันต่อ {@code username} และเวลาที่สิ้นสุดการระงับบัญชี
 * <p>
 * ไม่ผูก FK กับ {@code users} เพราะ username ที่กรอกผิดอาจยังไม่เคย login สำเร็จ
 * เมื่อ login สำเร็จ service ลบแถวด้วย {@code deleteById} จึงไม่มี method reset
 */
@Entity
@Table(name = "login_attempt")
@Getter
@Setter
@NoArgsConstructor
public class LoginAttempt {

    @Id
    @Column(length = 50)
    private String username;

    @Column(name = "failed_attempts", nullable = false)
    private int failedAttempts;

    /** {@code null} = ไม่ถูกล็อก */
    @Column(name = "locked_until")
    private OffsetDateTime lockedUntil;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    /** ยังไม่มีประวัติ ต้องเรียก {@link #incrementFailedAttempts} ก่อน save (updated_at เป็น NOT NULL) */
    public LoginAttempt(String username) {
        this.username = username;
    }

    public void incrementFailedAttempts(int maxAttempts, long lockSeconds) {
        incrementFailedAttempts(maxAttempts, lockSeconds, OffsetDateTime.now(ZoneId.of("Asia/Bangkok")));
    }

    /**
     * บวกจำนวนครั้งที่ผิด ถ้าครบ {@code maxAttempts} ตั้ง {@code lockedUntil = now + lockSeconds}
     * ถ้าเคยถูกล็อกแต่หมดเวลาแล้ว จะเริ่มนับรอบใหม่ที่ 1
     */
    public void incrementFailedAttempts(int maxAttempts, long lockSeconds, OffsetDateTime now) {
        OffsetDateTime at = now.truncatedTo(ChronoUnit.SECONDS);
        if (lockedUntil != null && !isLocked(at)) {
            failedAttempts = 0;
            lockedUntil = null;
        }
        failedAttempts++;
        if (failedAttempts >= maxAttempts) {
            lockedUntil = at.plusSeconds(lockSeconds);
        }
        updatedAt = at;
    }

    /** ล็อกอยู่ถ้า {@code now < lockedUntil} ครบเวลาพอดีถือว่าปลดล็อกแล้ว */
    public boolean isLocked(OffsetDateTime now) {
        return lockedUntil != null && now.isBefore(lockedUntil);
    }

    /** วินาทีที่เหลือก่อนปลดล็อก (ปัดเศษขึ้น) ใช้เป็น {@code retryAfterSeconds}, ไม่ล็อกคืน 0 */
    public long remainingLockSeconds(OffsetDateTime now) {
        if (!isLocked(now)) {
            return 0;
        }
        Duration remaining = Duration.between(now, lockedUntil);
        return remaining.getSeconds() + (remaining.getNano() > 0 ? 1 : 0);
    }
}
