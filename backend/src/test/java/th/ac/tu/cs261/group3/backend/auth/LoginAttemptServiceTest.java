package th.ac.tu.cs261.group3.backend.auth;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * กฎล็อกบัญชี (TC6) ผิด 5 ครั้งล็อก 900 วินาที ใช้ Clock คงที่แทนเวลาจริง
 */
@ExtendWith(MockitoExtension.class)
class LoginAttemptServiceTest {

    private static final String USER = "6609000004";
    private static final OffsetDateTime NOW = OffsetDateTime.of(2026, 10, 19, 10, 0, 0, 0, ZoneOffset.ofHours(7));

    @Mock
    private LoginAttemptRepository loginAttemptRepository;

    private LoginAttemptService serviceAt(OffsetDateTime now) {
        return new LoginAttemptService(5, 900, loginAttemptRepository,
                Clock.fixed(now.toInstant(), ZoneId.of("Asia/Bangkok")));
    }

    private static LoginAttempt attempt(int failed, OffsetDateTime lockedUntil) {
        LoginAttempt attempt = new LoginAttempt(USER);
        attempt.setFailedAttempts(failed);
        attempt.setLockedUntil(lockedUntil);
        attempt.setUpdatedAt(NOW.minusMinutes(1));
        return attempt;
    }

    private LoginAttempt savedAttempt() {
        ArgumentCaptor<LoginAttempt> captor = ArgumentCaptor.forClass(LoginAttempt.class);
        verify(loginAttemptRepository).save(captor.capture());
        return captor.getValue();
    }

    @Test
    void loginFailed_firstTime_createsAttemptWithCountOne() {
        when(loginAttemptRepository.findById(USER)).thenReturn(Optional.empty());

        serviceAt(NOW).loginFailed(USER);

        LoginAttempt saved = savedAttempt();
        assertThat(saved.getUsername()).isEqualTo(USER);
        assertThat(saved.getFailedAttempts()).isEqualTo(1);
        assertThat(saved.getLockedUntil()).isNull();
        assertThat(saved.getUpdatedAt()).isEqualTo(NOW);
    }

    @Test
    void loginFailed_fourthTime_notLockedYet() {
        when(loginAttemptRepository.findById(USER)).thenReturn(Optional.of(attempt(3, null)));

        serviceAt(NOW).loginFailed(USER);

        LoginAttempt saved = savedAttempt();
        assertThat(saved.getFailedAttempts()).isEqualTo(4);
        assertThat(saved.getLockedUntil()).isNull();
    }

    @Test
    void loginFailed_fifthTime_locksFor900Seconds() {
        when(loginAttemptRepository.findById(USER)).thenReturn(Optional.of(attempt(4, null)));

        serviceAt(NOW).loginFailed(USER);

        LoginAttempt saved = savedAttempt();
        assertThat(saved.getFailedAttempts()).isEqualTo(5);
        assertThat(saved.getLockedUntil()).isEqualTo(NOW.plusSeconds(900));
    }

    @Test
    void loginFailed_afterLockExpired_startsCountingAgain() {
        when(loginAttemptRepository.findById(USER)).thenReturn(Optional.of(attempt(5, NOW.minusSeconds(1))));

        serviceAt(NOW).loginFailed(USER);

        LoginAttempt saved = savedAttempt();
        assertThat(saved.getFailedAttempts()).isEqualTo(1);
        assertThat(saved.getLockedUntil()).isNull();
    }

    @Test
    void loginSucceeded_deletesAttempt() {
        serviceAt(NOW).loginSucceeded(USER);

        verify(loginAttemptRepository).deleteById(USER);
    }

    @Test
    void isLocked_noHistory_falseAndZeroWait() {
        when(loginAttemptRepository.findById(USER)).thenReturn(Optional.empty());
        LoginAttemptService service = serviceAt(NOW);

        assertThat(service.isLocked(USER)).isFalse();
        assertThat(service.getWaitTime(USER)).isZero();
    }

    @Test
    void isLocked_beforeLockedUntil_trueWithRemainingSeconds() {
        when(loginAttemptRepository.findById(USER)).thenReturn(Optional.of(attempt(5, NOW.plusSeconds(900))));
        LoginAttemptService service = serviceAt(NOW.plusSeconds(300));

        assertThat(service.isLocked(USER)).isTrue();
        assertThat(service.getWaitTime(USER)).isEqualTo(600);
    }

    @Test
    void isLocked_exactlyAtLockedUntil_unlocked() {
        when(loginAttemptRepository.findById(USER)).thenReturn(Optional.of(attempt(5, NOW)));
        LoginAttemptService service = serviceAt(NOW);

        assertThat(service.isLocked(USER)).isFalse();
        assertThat(service.getWaitTime(USER)).isZero();
    }
}
