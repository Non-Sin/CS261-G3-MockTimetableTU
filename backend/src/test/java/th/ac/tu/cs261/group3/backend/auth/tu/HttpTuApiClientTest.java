package th.ac.tu.cs261.group3.backend.auth.tu;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import th.ac.tu.cs261.group3.backend.common.exception.BusinessRuleException;

import java.net.SocketTimeoutException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * response ที่ใช้คือรูปแบบจริงของ TU API (เปลี่ยนรหัส ชื่อ email เป็นค่าสมมติ)
 */
class HttpTuApiClientTest {

    private static final String BASE_URL = "https://restapi.tu.ac.th";
    private static final String URL = BASE_URL + HttpTuApiClient.VERIFY_PATH;

    private MockRestServiceServer server;
    private HttpTuApiClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        server = MockRestServiceServer.bindTo(builder).build();
        client = new HttpTuApiClient(builder, "test-app-key");
    }

    @Test
    void verifyCredentials_success_sendsKeyAndBodyAndParsesResponse() {
        server.expect(requestTo(URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Application-Key", "test-app-key"))
                .andExpect(content().json("""
                        {"UserName": "6609000001", "PassWord": "Passw0rd!"}
                        """))
                .andRespond(withSuccess("""
                        {
                            "status": true,
                            "message": "Success",
                            "type": "student",
                            "username": "6609000001",
                            "tu_status": "ปกติ",
                            "statusid": "10",
                            "displayname_th": "สมชาย ใจดี",
                            "displayname_en": "somchai jaidee",
                            "email": "somchai.jai@dome.tu.ac.th",
                            "department": "ภาควิชาวิทยาการคอมพิวเตอร์",
                            "faculty": "คณะวิทยาศาสตร์และเทคโนโลยี"
                        }
                        """, MediaType.APPLICATION_JSON));

        TuAuthDto result = client.verifyCredentials("6609000001", "Passw0rd!");

        server.verify();
        assertThat(result.status()).isTrue();
        assertThat(result.type()).isEqualTo("student");
        assertThat(result.username()).isEqualTo("6609000001");
        assertThat(result.tuStatus()).isEqualTo("ปกติ");
        assertThat(result.displaynameTh()).isEqualTo("สมชาย ใจดี");
        assertThat(result.department()).isEqualTo("ภาควิชาวิทยาการคอมพิวเตอร์");
        assertThat(result.faculty()).isEqualTo("คณะวิทยาศาสตร์และเทคโนโลยี");
    }

    @Test
    void verifyCredentials_wrongPassword400_returnsStatusFalse() {
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.BAD_REQUEST)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {
                            "status": false,
                            "message": "Users or Password Invalid!",
                            "Description": "ไม่พบข้อมูล Users or Password ของท่าน กรณีนักศึกษากรุณาติดต่อสำนักทะเบียน"
                        }
                        """));

        TuAuthDto result = client.verifyCredentials("6609000001", "wrong-pass");

        assertThat(result.status()).isFalse();
        assertThat(result.message()).isEqualTo("Users or Password Invalid!");
    }

    @Test
    void verifyCredentials_invalidApplicationKey_throws503NotWrongPassword() {
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.UNAUTHORIZED)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"status": false, "error": "Authentication failed due to the following reason: invalid token."}
                        """));

        assertUnavailable();
    }

    @Test
    void verifyCredentials_invalidApplicationKeyAs400_stillThrows503() {
        // ไม่รู้ว่า TU ตอบ key ผิดด้วย HTTP อะไร ต่อให้เป็น 400 ก็ต้องไม่นับเป็นรหัสผิด
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.BAD_REQUEST)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"status": false, "error": "Authentication failed due to the following reason: invalid token."}
                        """));

        assertUnavailable();
    }

    @Test
    void verifyCredentials_serverError_throws503() {
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));

        assertUnavailable();
    }

    @Test
    void verifyCredentials_nonJsonBody_throws503() {
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.BAD_GATEWAY)
                .contentType(MediaType.TEXT_HTML).body("<html>Bad Gateway</html>"));

        assertUnavailable();
    }

    @Test
    void verifyCredentials_timeout_throws503() {
        server.expect(requestTo(URL)).andRespond(withException(new SocketTimeoutException("Read timed out")));

        assertUnavailable();
    }

    private void assertUnavailable() {
        BusinessRuleException ex = catchThrowableOfType(BusinessRuleException.class,
                () -> client.verifyCredentials("6609000001", "Passw0rd!"));

        assertThat(ex.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(ex.getCode()).isEqualTo("TU_API_UNAVAILABLE");
    }
}
