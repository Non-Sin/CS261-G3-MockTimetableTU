package th.ac.tu.cs261.group3.backend.auth.tu;

import org.junit.jupiter.api.Test;
import th.ac.tu.cs261.group3.backend.common.exception.BusinessRuleException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** บัญชีของ stub ตรงกับประเภทบัญชีใน US3-T16 ที่ Postman ใช้ */
class StubTuApiClientTest {

    private final StubTuApiClient stub = new StubTuApiClient();

    @Test
    void csStudent_correctPassword_success() {
        TuAuthDto result = stub.verifyCredentials("6609000001", StubTuApiClient.PASSWORD);

        assertThat(result.status()).isTrue();
        assertThat(result.type()).isEqualTo("student");
        assertThat(result.tuStatus()).isEqualTo("ปกติ");
        assertThat(result.department()).isEqualTo("ภาควิชาวิทยาการคอมพิวเตอร์");
    }

    @Test
    void otherAccounts_matchTheirTestCase() {
        assertThat(stub.verifyCredentials("6609000002", StubTuApiClient.PASSWORD).department())
                .isNotEqualTo("ภาควิชาวิทยาการคอมพิวเตอร์");
        assertThat(stub.verifyCredentials("6609000003", StubTuApiClient.PASSWORD).tuStatus())
                .isEqualTo("พักการศึกษา");
        assertThat(stub.verifyCredentials("staff01", StubTuApiClient.PASSWORD).type())
                .isEqualTo("employee");
    }

    @Test
    void wrongPasswordOrUnknownUser_statusFalseLikeRealApi() {
        TuAuthDto wrong = stub.verifyCredentials("6609000001", "wrong-pass");
        TuAuthDto unknown = stub.verifyCredentials("0000000000", StubTuApiClient.PASSWORD);

        assertThat(wrong.status()).isFalse();
        assertThat(wrong.message()).isEqualTo("Users or Password Invalid!");
        assertThat(unknown).isEqualTo(wrong);
    }

    @Test
    void unavailableUsername_throws503() {
        assertThatThrownBy(() -> stub.verifyCredentials(StubTuApiClient.UNAVAILABLE_USERNAME, StubTuApiClient.PASSWORD))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code").isEqualTo("TU_API_UNAVAILABLE");
    }
}
