package th.ac.tu.cs261.group3.backend.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import th.ac.tu.cs261.group3.backend.auth.dto.LoginRequest;
import th.ac.tu.cs261.group3.backend.auth.dto.LoginResponse;
import th.ac.tu.cs261.group3.backend.auth.tu.TuApiClient;
import th.ac.tu.cs261.group3.backend.auth.tu.TuAuthDto;
import th.ac.tu.cs261.group3.backend.common.exception.BusinessRuleException;
import th.ac.tu.cs261.group3.backend.user.User;
import th.ac.tu.cs261.group3.backend.user.UserRepository;

import java.util.Map;

/**
 * กฎการ login ของ US3 ลำดับตาม US3-T06 Sequence Diagram:
 * ล็อกอยู่ (429) → ตรวจกับ TU API → รหัสผิด นับ attempt (401 หรือ 429) → รหัสถูก ล้าง attempt
 * → บัญชีไม่ active (403) → ไม่ใช่นักศึกษา CS (403) → upsert users → ออก JWT
 */
@Service
@Transactional
@RequiredArgsConstructor
public class AuthService {

    static final String ACCOUNT_LOCKED = "ACCOUNT_LOCKED";
    static final String INVALID_CREDENTIALS = "INVALID_CREDENTIALS";
    static final String ACCOUNT_INACTIVE = "ACCOUNT_INACTIVE";
    static final String NOT_CS_STUDENT = "NOT_CS_STUDENT";

    /** ค่าที่สะกดตาม response จริงของ TU API */
    static final String ACTIVE_TU_STATUS = "ปกติ";
    static final String STUDENT_TYPE = "student";
    static final String CS_DEPARTMENT = "ภาควิชาวิทยาการคอมพิวเตอร์";
    /** TU API ไม่บอกภาค ผู้ที่ผ่านการตรวจทั้งหมดถือเป็นภาคปกติ */
    static final String REGULAR_TRACK = "ภาคปกติ";

    private final TuApiClient tuApiClient;
    private final UserRepository userRepository;
    private final LoginAttemptService loginAttemptService;
    private final JwtService jwtService;

    public LoginResponse authenticate(LoginRequest request) {
        String username = request.username().trim();
        if (loginAttemptService.isLocked(username)) {
            throw accountLocked(username);
        }

        TuAuthDto tuResponse = tuApiClient.verifyCredentials(username, request.password());
        if (!tuResponse.status()) {
            loginAttemptService.loginFailed(username);
            if (loginAttemptService.isLocked(username)) {
                throw accountLocked(username);
            }
            throw new BusinessRuleException(HttpStatus.UNAUTHORIZED, INVALID_CREDENTIALS,
                    "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง", null);
        }
        // รหัสถูกแล้ว ล้างก่อนตรวจสาขา นักศึกษาต่างสาขาจึงไม่ถูกนับว่าเดารหัส
        loginAttemptService.loginSucceeded(username);

        verifyTuStudentStatus(tuResponse);
        User user = upsertUser(tuResponse);
        return LoginResponse.of(jwtService.generateToken(user.getStudentId()));
    }

    private BusinessRuleException accountLocked(String username) {
        long retryAfterSeconds = loginAttemptService.getWaitTime(username);
        long minutes = Math.max(1, (retryAfterSeconds + 59) / 60);
        return new BusinessRuleException(HttpStatus.TOO_MANY_REQUESTS, ACCOUNT_LOCKED,
                "ระงับการเข้าสู่ระบบชั่วคราว เนื่องจากเข้าสู่ระบบผิดพลาดติดต่อกันหลายครั้ง กรุณาลองใหม่ในอีก "
                        + minutes + " นาที",
                Map.of("retryAfterSeconds", retryAfterSeconds));
    }

    /** ตรวจ active ก่อนสาขา บัญชีที่พ้นสภาพแล้วได้ ACCOUNT_INACTIVE แม้เป็นนักศึกษาสาขาอื่น */
    private void verifyTuStudentStatus(TuAuthDto tuResponse) {
        if (!ACTIVE_TU_STATUS.equals(tuResponse.tuStatus())) {
            throw new BusinessRuleException(HttpStatus.FORBIDDEN, ACCOUNT_INACTIVE,
                    "บัญชีของท่านไม่อยู่ในสถานะใช้งานปกติ", null);
        }
        if (!STUDENT_TYPE.equals(tuResponse.type()) || !CS_DEPARTMENT.equals(tuResponse.department())) {
            throw new BusinessRuleException(HttpStatus.FORBIDDEN, NOT_CS_STUDENT,
                    "ระบบนี้เปิดให้ใช้งานเฉพาะนักศึกษาสาขาวิทยาการคอมพิวเตอร์ ภาคปกติ", null);
        }
    }

    /** {@code displayname_th} เป็น "ชื่อ นามสกุล" ตัดที่ช่องว่างแรก นามสกุลที่มีหลายคำจึงอยู่ครบ */
    private User upsertUser(TuAuthDto tuResponse) {
        String[] name = tuResponse.displaynameTh().trim().split("\s+", 2);
        String firstName = name[0];
        String lastName = name.length > 1 ? name[1] : "";

        User user = userRepository.findById(tuResponse.username())
                .map(existing -> {
                    existing.updateProfile(firstName, lastName, tuResponse.department(), REGULAR_TRACK);
                    return existing;
                })
                .orElseGet(() -> new User(tuResponse.username(), firstName, lastName,
                        tuResponse.department(), REGULAR_TRACK));
        return userRepository.save(user);
    }
}
