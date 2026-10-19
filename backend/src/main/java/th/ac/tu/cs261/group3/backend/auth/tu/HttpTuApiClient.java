package th.ac.tu.cs261.group3.backend.auth.tu;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.util.Map;

/**
 * เรียก TU Login API จริง ({@code POST /api/v1/auth/Ad/verify})
 * <p>
 * ถือว่ารหัสผิดเฉพาะ 400 + {@code status=false} + {@code message} ของรหัสผิด
 * เพราะตอน Application-Key ผิดก็ได้ {@code status=false} เหมือนกัน (มี {@code error} แทน {@code message})
 * กรณีนั้นถ้านับเป็นรหัสผิด ผู้ใช้ทุกคนจะโดนล็อกเพราะ config ของเรา จึงตอบ 503 และไม่นับ attempt
 */
@Component
@Profile("!stub-tu")
public class HttpTuApiClient implements TuApiClient {

    static final String VERIFY_PATH = "/api/v1/auth/Ad/verify";
    static final String INVALID_CREDENTIALS_MESSAGE = "Users or Password Invalid!";

    private static final Logger log = LoggerFactory.getLogger(HttpTuApiClient.class);

    private final RestClient restClient;
    private final String applicationKey;

    @Autowired
    public HttpTuApiClient(@Value("${app.tu-api.base-url}") String baseUrl,
                           @Value("${app.tu-api.application-key}") String applicationKey,
                           @Value("${app.tu-api.timeout-ms}") long timeoutMs) {
        this(RestClient.builder().baseUrl(baseUrl).requestFactory(requestFactory(timeoutMs)), applicationKey);
    }

    /** test ผูก MockRestServiceServer กับ builder ได้ */
    HttpTuApiClient(RestClient.Builder builder, String applicationKey) {
        this.restClient = builder.build();
        this.applicationKey = applicationKey;
    }

    private static SimpleClientHttpRequestFactory requestFactory(long timeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(timeoutMs));
        factory.setReadTimeout(Duration.ofMillis(timeoutMs));
        return factory;
    }

    @Override
    public TuAuthDto verifyCredentials(String username, String password) {
        try {
            return restClient.post()
                    .uri(VERIFY_PATH)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Application-Key", applicationKey)
                    .body(Map.of("UserName", username, "PassWord", password))
                    .exchange((request, response) -> {
                        TuAuthDto body = response.bodyTo(TuAuthDto.class);
                        if (response.getStatusCode().is2xxSuccessful() && body != null && body.status()) {
                            return body;
                        }
                        if (response.getStatusCode().isSameCodeAs(HttpStatus.BAD_REQUEST) && body != null
                                && !body.status() && INVALID_CREDENTIALS_MESSAGE.equals(body.message())) {
                            return body;
                        }
                        log.error("TU API ตอบผิดรูปแบบ: HTTP {} error={} message={}", response.getStatusCode(),
                                body == null ? null : body.error(), body == null ? null : body.message());
                        throw TuApiClient.unavailable();
                    });
        } catch (RestClientException ex) {
            // timeout, เชื่อมต่อไม่ได้ หรือ body ไม่ใช่ JSON
            log.error("เรียก TU API ไม่สำเร็จ", ex);
            throw TuApiClient.unavailable();
        }
    }
}
