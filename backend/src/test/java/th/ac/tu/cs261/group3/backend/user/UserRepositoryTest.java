package th.ac.tu.cs261.group3.backend.user;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import th.ac.tu.cs261.group3.backend.support.DaoTest;

import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * US3-T12 UT-DAO-US3-01 – 04: UserRepository และ User
 * <p>
 * ไม่ใช้ DaoFixture ของ US1 เพื่อไม่ให้กระทบจำนวนแถวของ test เดิม
 */
@DaoTest
class UserRepositoryTest {

    private static final OffsetDateTime BASE_TIME = OffsetDateTime.parse("2026-10-18T10:00:00+07:00");
    private static final String CS = "วิทยาการคอมพิวเตอร์";
    private static final String REGULAR = "ภาคปกติ";

    @Autowired
    private TestEntityManager em;

    @Autowired
    private UserRepository repository;

    @BeforeEach
    void setUp() {
        em.persist(user("6809610001", "Alysa", "Liu", "อลิษา", "หลิว"));
        em.persist(user("6809610002", "Sailor", "Moon", "เซเลอร์", "มูน"));
        em.flush();
        em.clear();
    }

    /** updateProfile ใน constructor ตั้ง updatedAt เป็นเวลาปัจจุบัน จึงตั้งทับเป็น BASE_TIME */
    private static User user(String studentId, String firstName, String lastName,
                             String firstNameTh, String lastNameTh) {
        User user = new User(studentId, firstName, lastName, firstNameTh, lastNameTh, CS, REGULAR);
        user.setUpdatedAt(BASE_TIME);
        return user;
    }

    /** UT-DAO-US3-01 */
    @Test
    void findById_existingStudent_returnsUserWithThaiProfile() {
        User u1 = repository.findById("6809610001").orElseThrow();

        assertEquals("6809610001", u1.getStudentId());
        assertEquals("Alysa", u1.getFirstName());
        assertEquals("Liu", u1.getLastName());
        assertEquals("อลิษา", u1.getFirstNameTh());
        assertEquals("หลิว", u1.getLastNameTh());
        assertEquals(CS, u1.getDepartment());
        assertEquals(REGULAR, u1.getTrack());
        assertEquals(BASE_TIME.toInstant(), u1.getUpdatedAt().toInstant());
    }

    /** UT-DAO-US3-02 */
    @Test
    void findById_nonExistingStudent_returnsEmpty() {
        assertTrue(repository.findById("6809619999").isEmpty());
    }

    /** UT-DAO-US3-03 */
    @Test
    void save_newUser_insertsRowAndPersistsAllFields() {
        repository.save(user("6809619999", "Dolly", "Bear", "ดลลี่", "แบร่"));
        em.flush();
        em.clear();

        assertEquals(3, repository.count());
        User reloaded = repository.findById("6809619999").orElseThrow();
        assertEquals("Dolly", reloaded.getFirstName());
        assertEquals("Bear", reloaded.getLastName());
        assertEquals("ดลลี่", reloaded.getFirstNameTh());
        assertEquals("แบร่", reloaded.getLastNameTh());
        assertEquals(CS, reloaded.getDepartment());
        assertEquals(REGULAR, reloaded.getTrack());
        assertEquals(BASE_TIME.toInstant(), reloaded.getUpdatedAt().toInstant());
    }

    /** UT-DAO-US3-04 */
    @Test
    void save_existingUserAfterUpdateProfile_updatesRowWithoutCreatingDuplicate() {
        OffsetDateTime newUpdatedAt = BASE_TIME.plusHours(1);
        User u1 = repository.findById("6809610001").orElseThrow();
        u1.updateProfile("Alysa", "Liuliu", "อลิษา", "หลิวหลิว", CS, REGULAR);
        u1.setUpdatedAt(newUpdatedAt);

        repository.save(u1);
        em.flush();
        em.clear();

        assertEquals(2, repository.count());
        User reloaded = repository.findById("6809610001").orElseThrow();
        assertEquals("Alysa", reloaded.getFirstName());
        assertEquals("Liuliu", reloaded.getLastName());
        assertEquals("หลิวหลิว", reloaded.getLastNameTh());
        assertEquals(newUpdatedAt.toInstant(), reloaded.getUpdatedAt().toInstant());

        User u2 = repository.findById("6809610002").orElseThrow();
        assertEquals("Sailor", u2.getFirstName());
        assertEquals("Moon", u2.getLastName());
        assertEquals(BASE_TIME.toInstant(), u2.getUpdatedAt().toInstant());
    }
}
