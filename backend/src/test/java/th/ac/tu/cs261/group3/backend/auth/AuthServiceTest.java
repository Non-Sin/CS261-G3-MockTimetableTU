package th.ac.tu.cs261.group3.backend.auth;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import th.ac.tu.cs261.group3.backend.auth.dto.LoginRequest;
import th.ac.tu.cs261.group3.backend.auth.dto.LoginResponse;
import th.ac.tu.cs261.group3.backend.auth.tu.TuApiClient;
import th.ac.tu.cs261.group3.backend.auth.tu.TuAuthDto;
import th.ac.tu.cs261.group3.backend.common.exception.BusinessRuleException;
import th.ac.tu.cs261.group3.backend.user.User;
import th.ac.tu.cs261.group3.backend.user.UserRepository;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * ลำดับการตรวจของ AuthService.authenticate ตาม US3-T06 Sequence Diagram และ TC ของ US3
 * ค่า type/tu_status/department สะกดตาม response จริงของ TU API
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    private static final String USER = "6609000001";
    private static final String PASSWORD = "Passw0rd!";
    private static final String CS = "ภาควิชาวิทยาการคอมพิวเตอร์";

    @Mock
    private TuApiClient tuApiClient;
    @Mock
    private UserRepository userRepository;
    @Mock
    private LoginAttemptService loginAttemptService;
    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthService authService;

    private static TuAuthDto tu(String type, String tuStatus, String department, String displaynameEn) {
        return new TuAuthDto(true, "Success", null, type, USER, tuStatus, "10", "สมชาย ใจดี",
                displaynameEn, USER + "@dome.tu.ac.th", department, "คณะวิทยาศาสตร์และเทคโนโลยี");
    }

    private static TuAuthDto csStudent() {
        return tu("student", "ปกติ", CS, "somchai jaidee");
    }

    private static TuAuthDto invalidCredentials() {
        return new TuAuthDto(false, "Users or Password Invalid!", null,
                null, null, null, null, null, null, null, null, null);
    }

    private static LoginRequest request() {
        return new LoginRequest(USER, PASSWORD);
    }

    private User savedUser() {
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        return captor.getValue();
    }

    // ---------- สำเร็จ (TC1a, TC3) ----------

    @Test
    void authenticate_csStudent_newUser_savesUserAndReturnsToken() {
        when(tuApiClient.verifyCredentials(USER, PASSWORD)).thenReturn(csStudent());
        when(userRepository.findById(USER)).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtService.generateToken(USER)).thenReturn("jwt-token");

        LoginResponse response = authService.authenticate(request());

        assertThat(response.token()).isEqualTo("jwt-token");
        User saved = savedUser();
        assertThat(saved.getStudentId()).isEqualTo(USER);
        assertThat(saved.getFirstName()).isEqualTo("Somchai");
        assertThat(saved.getLastName()).isEqualTo("Jaidee");
        assertThat(saved.getFirstNameTh()).isEqualTo("สมชาย");
        assertThat(saved.getLastNameTh()).isEqualTo("ใจดี");
        assertThat(saved.getDepartment()).isEqualTo(CS);
        assertThat(saved.getTrack()).isEqualTo("ภาคปกติ");
        verify(loginAttemptService).loginSucceeded(USER);
        verify(loginAttemptService, never()).loginFailed(anyString());
    }

    @Test
    void authenticate_existingUser_updatesProfile() {
        User existing = new User(USER, "Old", "Name", "ชื่อเก่า", "นามสกุลเก่า", CS, "ภาคปกติ");
        when(tuApiClient.verifyCredentials(USER, PASSWORD)).thenReturn(csStudent());
        when(userRepository.findById(USER)).thenReturn(Optional.of(existing));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtService.generateToken(USER)).thenReturn("jwt-token");

        authService.authenticate(request());

        User saved = savedUser();
        assertThat(saved).isSameAs(existing);
        assertThat(saved.getFirstName()).isEqualTo("Somchai");
        assertThat(saved.getLastName()).isEqualTo("Jaidee");
        assertThat(saved.getFirstNameTh()).isEqualTo("สมชาย");
        assertThat(saved.getLastNameTh()).isEqualTo("ใจดี");
    }

    @Test
    void authenticate_multiWordLastName_keepsRestAsLastName() {
        when(tuApiClient.verifyCredentials(USER, PASSWORD))
                .thenReturn(tu("student", "ปกติ", CS, " somchai  na ayutthaya "));
        when(userRepository.findById(USER)).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        authService.authenticate(request());

        User saved = savedUser();
        assertThat(saved.getFirstName()).isEqualTo("Somchai");
        assertThat(saved.getLastName()).isEqualTo("Na Ayutthaya");
    }

    @Test
    void authenticate_missingEnglishName_fallsBackToThaiName() {
        when(tuApiClient.verifyCredentials(USER, PASSWORD)).thenReturn(tu("student", "ปกติ", CS, null));
        when(userRepository.findById(USER)).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        authService.authenticate(request());

        User saved = savedUser();
        assertThat(saved.getFirstName()).isEqualTo("สมชาย");
        assertThat(saved.getLastName()).isEqualTo("ใจดี");
        assertThat(saved.getFirstNameTh()).isEqualTo("สมชาย");
    }

    @Test
    void authenticate_missingThaiName_savesNullThaiName() {
        when(tuApiClient.verifyCredentials(USER, PASSWORD)).thenReturn(
                new TuAuthDto(true, "Success", null, "student", USER, "ปกติ", "10", null,
                        "somchai jaidee", USER + "@dome.tu.ac.th", CS, "คณะวิทยาศาสตร์และเทคโนโลยี"));
        when(userRepository.findById(USER)).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        authService.authenticate(request());

        User saved = savedUser();
        assertThat(saved.getFirstName()).isEqualTo("Somchai");
        assertThat(saved.getFirstNameTh()).isNull();
        assertThat(saved.getLastNameTh()).isNull();
    }

    @Test
    void capitalizeWords_upperCasesFirstLetterOfEachWordOnly() {
        assertThat(AuthService.capitalizeWords("somchai na ayutthaya")).isEqualTo("Somchai Na Ayutthaya");
        assertThat(AuthService.capitalizeWords("McDonald o'neil")).isEqualTo("McDonald O'neil");
    }

    @Test
    void authenticate_trimsUsernameBeforeCheckingLockAndTu() {
        when(tuApiClient.verifyCredentials(USER, PASSWORD)).thenReturn(csStudent());
        when(userRepository.findById(USER)).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        authService.authenticate(new LoginRequest("  " + USER + " ", PASSWORD));

        verify(loginAttemptService).isLocked(USER);
        verify(loginAttemptService).loginSucceeded(USER);
    }

    // ---------- ล็อกอยู่ (TC6) ----------

    @Test
    void authenticate_locked_throws429WithoutCallingTuApi() {
        when(loginAttemptService.isLocked(USER)).thenReturn(true);
        when(loginAttemptService.getWaitTime(USER)).thenReturn(600L);

        BusinessRuleException ex = catchThrowableOfType(BusinessRuleException.class,
                () -> authService.authenticate(request()));

        assertThat(ex.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(ex.getCode()).isEqualTo("ACCOUNT_LOCKED");
        assertThat(ex.getProperties()).isEqualTo(Map.of("retryAfterSeconds", 600L));
        assertThat(ex.getMessage()).contains("10 นาที");
        verify(tuApiClient, never()).verifyCredentials(anyString(), anyString());
        verify(loginAttemptService, never()).loginFailed(anyString());
    }

    // ---------- รหัสผิด (TC4, TC5, TC6) ----------

    @Test
    void authenticate_wrongPassword_countsAttemptAndThrows401() {
        when(tuApiClient.verifyCredentials(USER, PASSWORD)).thenReturn(invalidCredentials());

        BusinessRuleException ex = catchThrowableOfType(BusinessRuleException.class,
                () -> authService.authenticate(request()));

        assertThat(ex.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(ex.getCode()).isEqualTo("INVALID_CREDENTIALS");
        assertThat(ex.getProperties()).isEmpty();
        verify(loginAttemptService).loginFailed(USER);
        verify(loginAttemptService, never()).loginSucceeded(anyString());
        verify(userRepository, never()).save(any());
    }

    @Test
    void authenticate_fifthWrongPassword_throws429With900Seconds() {
        when(tuApiClient.verifyCredentials(USER, PASSWORD)).thenReturn(invalidCredentials());
        // ครั้งแรกยังไม่ล็อก หลัง loginFailed ครั้งที่ 5 ล็อกแล้ว
        when(loginAttemptService.isLocked(USER)).thenReturn(false, true);
        when(loginAttemptService.getWaitTime(USER)).thenReturn(900L);

        BusinessRuleException ex = catchThrowableOfType(BusinessRuleException.class,
                () -> authService.authenticate(request()));

        assertThat(ex.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(ex.getCode()).isEqualTo("ACCOUNT_LOCKED");
        assertThat(ex.getProperties()).isEqualTo(Map.of("retryAfterSeconds", 900L));
        assertThat(ex.getMessage()).contains("15 นาที");
        InOrder order = inOrder(loginAttemptService);
        order.verify(loginAttemptService).isLocked(USER);
        order.verify(loginAttemptService).loginFailed(USER);
        order.verify(loginAttemptService).isLocked(USER);
    }

    // ---------- บัญชีไม่ active (TC1b) และไม่ใช่ CS (TC2) ----------

    @Test
    void authenticate_inactiveAccount_throws403AfterClearingAttempts() {
        when(tuApiClient.verifyCredentials(USER, PASSWORD)).thenReturn(tu("student", "พักการศึกษา", CS, "somchai jaidee"));

        BusinessRuleException ex = catchThrowableOfType(BusinessRuleException.class,
                () -> authService.authenticate(request()));

        assertThat(ex.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(ex.getCode()).isEqualTo("ACCOUNT_INACTIVE");
        verify(loginAttemptService).loginSucceeded(USER);
        verify(userRepository, never()).save(any());
        verify(jwtService, never()).generateToken(anyString());
    }

    @Test
    void authenticate_inactiveOtherDepartment_reportsInactiveFirst() {
        when(tuApiClient.verifyCredentials(USER, PASSWORD))
                .thenReturn(tu("student", "ลาออก", "ภาควิชาคณิตศาสตร์และสถิติ", "somchai jaidee"));

        assertThatThrownBy(() -> authService.authenticate(request()))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code").isEqualTo("ACCOUNT_INACTIVE");
    }

    @Test
    void authenticate_otherDepartment_throws403NotCsStudent() {
        when(tuApiClient.verifyCredentials(USER, PASSWORD))
                .thenReturn(tu("student", "ปกติ", "ภาควิชาคณิตศาสตร์และสถิติ", "somchai jaidee"));

        BusinessRuleException ex = catchThrowableOfType(BusinessRuleException.class,
                () -> authService.authenticate(request()));

        assertThat(ex.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(ex.getCode()).isEqualTo("NOT_CS_STUDENT");
        verify(loginAttemptService).loginSucceeded(USER);
        verify(userRepository, never()).save(any());
    }

    @Test
    void authenticate_employee_throws403NotCsStudent() {
        when(tuApiClient.verifyCredentials(USER, PASSWORD)).thenReturn(tu("employee", "ปกติ", CS, "somchai jaidee"));

        assertThatThrownBy(() -> authService.authenticate(request()))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code").isEqualTo("NOT_CS_STUDENT");
    }

    // ---------- ภาคพิเศษ (หลักที่ 5–6 ของรหัสนักศึกษาเป็น 65) ----------

    @Test
    void authenticate_specialTrackCsStudent_throws403NotCsStudent() {
        String special = "6809650001";
        when(tuApiClient.verifyCredentials(special, PASSWORD)).thenReturn(
                new TuAuthDto(true, "Success", null, "student", special, "ปกติ", "10", "สมชาย ใจดี",
                        "somchai jaidee", special + "@dome.tu.ac.th", CS, "คณะวิทยาศาสตร์และเทคโนโลยี"));

        BusinessRuleException ex = catchThrowableOfType(BusinessRuleException.class,
                () -> authService.authenticate(new LoginRequest(special, PASSWORD)));

        assertThat(ex.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(ex.getCode()).isEqualTo("NOT_CS_STUDENT");
        verify(loginAttemptService).loginSucceeded(special);
        verify(userRepository, never()).save(any());
    }

    @Test
    void isSpecialTrack_code65AtPosition5to6_isTrue() {
        assertThat(AuthService.isSpecialTrack("6809650001")).isTrue();
        assertThat(AuthService.isSpecialTrack("6709650001")).isTrue();
    }

    @Test
    void isSpecialTrack_otherCodeOr65ElsewhereOrNull_isFalse() {
        assertThat(AuthService.isSpecialTrack("6809610001")).isFalse();
        assertThat(AuthService.isSpecialTrack("6509610001")).isFalse();
        assertThat(AuthService.isSpecialTrack("6809616501")).isFalse();
        assertThat(AuthService.isSpecialTrack("staff01")).isFalse();
        assertThat(AuthService.isSpecialTrack(null)).isFalse();
    }

    // ---------- TU API ใช้งานไม่ได้ ----------

    @Test
    void authenticate_tuApiUnavailable_doesNotCountAttempt() {
        when(tuApiClient.verifyCredentials(USER, PASSWORD)).thenThrow(TuApiClient.unavailable());

        BusinessRuleException ex = catchThrowableOfType(BusinessRuleException.class,
                () -> authService.authenticate(request()));

        assertThat(ex.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(ex.getCode()).isEqualTo("TU_API_UNAVAILABLE");
        verify(loginAttemptService, never()).loginFailed(anyString());
        verify(loginAttemptService, never()).loginSucceeded(anyString());
    }

    // ---------- logout (US4 แบบ stateless) ----------

    @Test
    void logout_doesNotTouchAnyDependency() {
        authService.logout();

        // ไม่ invalidate token ไม่เรียก DAO และไม่เรียก TU API
        verifyNoInteractions(tuApiClient, userRepository, loginAttemptService, jwtService);
    }
}
