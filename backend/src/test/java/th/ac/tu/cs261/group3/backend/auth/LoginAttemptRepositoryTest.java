package th.ac.tu.cs261.group3.backend.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import th.ac.tu.cs261.group3.backend.support.DaoTest;

import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * US3-T12 UT-DAO-US3-05 – 10: LoginAttemptRepository และ LoginAttempt
 * <p>
 * ส่ง BASE_TIME เข้า incrementFailedAttempts / isLocked / remainingLockSeconds แทนเวลาจริง
 * ให้ผลการนับเวลาล็อก 15 นาทีแน่นอน
 */
@DaoTest
class LoginAttemptRepositoryTest {

    private static final OffsetDateTime BASE_TIME = OffsetDateTime.parse("2026-10-18T10:00:00+07:00");
    private static final int MAX_ATTEMPTS = 5;
    private static final long LOCK_SECONDS = 900;

    @Autowired
    private TestEntityManager em;

    @Autowired
    private LoginAttemptRepository repository;

    @BeforeEach
    void setUp() {
        // LA1 ผิดสะสม 4 ครั้ง, LA2 กำลังถูกล็อก, LA3 เคยถูกล็อกแต่หมดเวลาแล้ว
        em.persist(attempt("6809610001", 4, null, BASE_TIME));
        em.persist(attempt("6809610002", 5, BASE_TIME.plusMinutes(15), BASE_TIME));
        em.persist(attempt("6809610003", 5, BASE_TIME.minusMinutes(15), BASE_TIME.minusMinutes(30)));
        em.flush();
        em.clear();
    }

    private static LoginAttempt attempt(String username, int failedAttempts,
                                        OffsetDateTime lockedUntil, OffsetDateTime updatedAt) {
        LoginAttempt attempt = new LoginAttempt(username);
        attempt.setFailedAttempts(failedAttempts);
        attempt.setLockedUntil(lockedUntil);
        attempt.setUpdatedAt(updatedAt);
        return attempt;
    }

    private LoginAttempt saveAndReload(LoginAttempt attempt) {
        repository.save(attempt);
        em.flush();
        em.clear();
        return repository.findById(attempt.getUsername()).orElseThrow();
    }

    /** UT-DAO-US3-05 username นี้ไม่มีในตาราง users บันทึกได้เพราะไม่มี FK */
    @Test
    void save_firstFailedAttemptForUnknownUsername_savesCountOneUnlocked() {
        LoginAttempt attempt = new LoginAttempt("unknown_user");
        attempt.incrementFailedAttempts(MAX_ATTEMPTS, LOCK_SECONDS, BASE_TIME);

        LoginAttempt reloaded = saveAndReload(attempt);

        assertEquals(1, reloaded.getFailedAttempts());
        assertNull(reloaded.getLockedUntil());
        assertFalse(reloaded.isLocked(BASE_TIME));
        assertEquals(0, reloaded.remainingLockSeconds(BASE_TIME));
    }

    /** UT-DAO-US3-06 */
    @Test
    void save_fourthFailedAttempt_incrementsCountWithoutLocking() {
        saveAndReload(attempt("student_retry", 3, null, BASE_TIME));
        LoginAttempt attempt = repository.findById("student_retry").orElseThrow();
        attempt.incrementFailedAttempts(MAX_ATTEMPTS, LOCK_SECONDS, BASE_TIME);

        LoginAttempt reloaded = saveAndReload(attempt);

        assertEquals(4, reloaded.getFailedAttempts());
        assertNull(reloaded.getLockedUntil());
        assertFalse(reloaded.isLocked(BASE_TIME));
        assertEquals(0, reloaded.remainingLockSeconds(BASE_TIME));
    }

    /** UT-DAO-US3-07 */
    @Test
    void save_fifthFailedAttempt_locksAccountFor15Minutes() {
        LoginAttempt la1 = repository.findById("6809610001").orElseThrow();
        la1.incrementFailedAttempts(MAX_ATTEMPTS, LOCK_SECONDS, BASE_TIME);

        LoginAttempt reloaded = saveAndReload(la1);

        assertEquals(5, reloaded.getFailedAttempts());
        assertEquals(BASE_TIME.plusSeconds(900).toInstant(), reloaded.getLockedUntil().toInstant());
        assertTrue(reloaded.isLocked(BASE_TIME));
        assertEquals(900, reloaded.remainingLockSeconds(BASE_TIME));
        assertTrue(reloaded.isLocked(BASE_TIME.plusMinutes(5)));
        assertEquals(600, reloaded.remainingLockSeconds(BASE_TIME.plusMinutes(5)));
    }

    /** UT-DAO-US3-08 ครบ 15 นาทีพอดีถือว่าปลดล็อกแล้ว */
    @Test
    void isLocked_when15MinutesElapsed_unlocksAndReturnsZeroRemainingSeconds() {
        LoginAttempt la2 = repository.findById("6809610002").orElseThrow();
        LoginAttempt la3 = repository.findById("6809610003").orElseThrow();

        OffsetDateTime oneSecondBefore = BASE_TIME.plusMinutes(14).plusSeconds(59);
        assertTrue(la2.isLocked(oneSecondBefore));
        assertEquals(1, la2.remainingLockSeconds(oneSecondBefore));

        OffsetDateTime exactly15Minutes = BASE_TIME.plusMinutes(15);
        assertFalse(la2.isLocked(exactly15Minutes));
        assertEquals(0, la2.remainingLockSeconds(exactly15Minutes));

        assertFalse(la3.isLocked(BASE_TIME));
        assertEquals(0, la3.remainingLockSeconds(BASE_TIME));
    }

    /** UT-DAO-US3-09 */
    @Test
    void save_failedAttemptAfterLockExpired_resetsCountToOneAndClearsLock() {
        LoginAttempt la3 = repository.findById("6809610003").orElseThrow();
        la3.incrementFailedAttempts(MAX_ATTEMPTS, LOCK_SECONDS, BASE_TIME);

        LoginAttempt reloaded = saveAndReload(la3);

        assertEquals(1, reloaded.getFailedAttempts());
        assertNull(reloaded.getLockedUntil());
        assertFalse(reloaded.isLocked(BASE_TIME));
    }

    /** UT-DAO-US3-10 */
    @Test
    void deleteById_existingAttempt_removesOnlyTargetUserAttempt() {
        repository.deleteById("6809610001");
        em.flush();
        em.clear();

        assertTrue(repository.findById("6809610001").isEmpty());
        assertTrue(repository.findById("6809610002").isPresent());
        assertTrue(repository.findById("6809610003").isPresent());
        assertEquals(2, repository.count());
    }
}
