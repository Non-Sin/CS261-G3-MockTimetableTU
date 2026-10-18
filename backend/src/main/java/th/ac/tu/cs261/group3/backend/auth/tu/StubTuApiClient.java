package th.ac.tu.cs261.group3.backend.auth.tu;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * TU Login API ปลอมสำหรับ Postman และ dev เปิดด้วย profile {@code stub-tu}
 * ({@code ./mvnw spring-boot:run -Dspring-boot.run.profiles=stub-tu})
 * <p>
 * ค่าของ {@code type}, {@code tu_status}, {@code department}, {@code faculty} สะกดตาม response จริง
 * ส่วนรหัสนักศึกษาและชื่อเป็นค่าสมมติ ทุกบัญชีใช้รหัสผ่าน {@link #PASSWORD} ตามประเภทบัญชีใน US3-T16
 */
@Component
@Profile("stub-tu")
public class StubTuApiClient implements TuApiClient {

    static final String PASSWORD = "Passw0rd!";
    /** ใช้ทดสอบกรณี TU API ใช้งานไม่ได้ (503) */
    static final String UNAVAILABLE_USERNAME = "6609000099";

    private static final String CS = "ภาควิชาวิทยาการคอมพิวเตอร์";
    private static final String SCI_TECH = "คณะวิทยาศาสตร์และเทคโนโลยี";

    private static final Map<String, TuAuthDto> ACCOUNTS = Map.of(
            // A: active, CS ภาคปกติ (TC1a, 3, 4, 5, 7)
            "6609000001", student("6609000001", "ปกติ", "10", "สมชาย ใจดี", "somchai jaidee", CS),
            // B: สาขาอื่น (TC2)
            "6609000002", student("6609000002", "ปกติ", "10", "สมหญิง รักเรียน", "somying rakrian",
                    "ภาควิชาคณิตศาสตร์และสถิติ"),
            // C: ไม่ active (TC1b)
            "6609000003", student("6609000003", "พักการศึกษา", null, "สมศักดิ์ พักก่อน", "somsak pakkon", CS),
            // D: active, CS ภาคปกติ สำรองไว้ทดสอบการล็อก (TC6)
            "6609000004", student("6609000004", "ปกติ", "10", "สมใจ ลองดู", "somjai longdoo", CS),
            // บุคลากร ไม่ใช่นักศึกษา
            "staff01", new TuAuthDto(true, "Success", null, "employee", "staff01", "ปกติ", "10",
                    "บุคลากร ทดสอบ", "staff test", "staff01@tu.ac.th", "สำนักทะเบียนและประมวลผล", null)
    );

    private static TuAuthDto student(String username, String tuStatus, String statusid,
                                     String nameTh, String nameEn, String department) {
        return new TuAuthDto(true, "Success", null, "student", username, tuStatus, statusid,
                nameTh, nameEn, username + "@dome.tu.ac.th", department, SCI_TECH);
    }

    @Override
    public TuAuthDto verifyCredentials(String username, String password) {
        if (UNAVAILABLE_USERNAME.equals(username)) {
            throw TuApiClient.unavailable();
        }
        TuAuthDto account = ACCOUNTS.get(username);
        if (account == null || !PASSWORD.equals(password)) {
            return new TuAuthDto(false, HttpTuApiClient.INVALID_CREDENTIALS_MESSAGE, null,
                    null, null, null, null, null, null, null, null, null);
        }
        return account;
    }
}
