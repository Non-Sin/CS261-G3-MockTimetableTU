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
 * ยกเว้นบัญชี F ({@link #CHANGED_PASSWORD_USERNAME}) ที่ใช้ {@link #CHANGED_PASSWORD}
 */
@Component
@Profile("stub-tu")
public class StubTuApiClient implements TuApiClient {

    static final String PASSWORD = "Passw0rd!";
    /** ใช้ทดสอบกรณี TU API ใช้งานไม่ได้ (503) */
    static final String UNAVAILABLE_USERNAME = "6609000099";
    /** บัญชี F: จำลองว่าเปลี่ยนรหัสผ่านที่ TU แล้ว รหัสใหม่คือ {@link #CHANGED_PASSWORD} รหัสเดิม {@link #PASSWORD} ใช้ไม่ได้ */
    static final String CHANGED_PASSWORD_USERNAME = "6609000008";
    static final String CHANGED_PASSWORD = "NewPassw0rd!";

    private static final String CS = "ภาควิชาวิทยาการคอมพิวเตอร์";
    private static final String SCI_TECH = "คณะวิทยาศาสตร์และเทคโนโลยี";

    private static final Map<String, TuAuthDto> ACCOUNTS = Map.of(
            // demo: active, CS ภาคปกติ รหัสเดียวกับนักศึกษา demo ของ US1 (ตารางเรียนใน DaoFixture / System Test)
            "6609000000", student("6609000000", "ปกติ", "10", "สมพร ตัวอย่าง", "somporn tuayang", CS),
            // A: active, CS ภาคปกติ (TC1a, 3, 4, 5, 7)
            "6609000001", student("6609000001", "ปกติ", "10", "สมชาย ใจดี", "somchai jaidee", CS),
            // B: สาขาอื่น (TC2)
            "6609000002", student("6609000002", "ปกติ", "10", "สมหญิง รักเรียน", "somying rakrian",
                    "ภาควิชาคณิตศาสตร์และสถิติ"),
            // C: ไม่ active (TC1b)
            "6609000003", student("6609000003", "พักการศึกษา", null, "สมศักดิ์ พักก่อน", "somsak pakkon", CS),
            // D: active, CS ภาคปกติ สำรองไว้ทดสอบการล็อก (TC6)
            "6609000004", student("6609000004", "ปกติ", "10", "สมใจ ลองดู", "somjai longdoo", CS),
            // C2: ไม่ active และไม่ใช่ CS ต้องได้ ACCOUNT_INACTIVE เพราะตรวจ active ก่อนสาขา (US3-T13 IT-13)
            "6609000007", student("6609000007", "พ้นสภาพ", null, "สมหมาย ย้ายไป", "sommai yaipai",
                    "ภาควิชาคณิตศาสตร์และสถิติ"),
            // F: active, CS ภาคปกติ เปลี่ยนรหัสผ่านแล้ว (US3-T13 IT-03, IT-04)
            CHANGED_PASSWORD_USERNAME, student(CHANGED_PASSWORD_USERNAME, "ปกติ", "10", "สมคิด เปลี่ยนรหัส",
                    "somkid pleanrahat", CS),
            // B2: active, CS ภาคพิเศษ หลักที่ 5–6 ของรหัสเป็น 65 (TC2)
            "6609650001", student("6609650001", "ปกติ", "10", "สมปอง พิเศษ", "sompong piset", CS),
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
        if (account == null || !passwordOf(username).equals(password)) {
            return new TuAuthDto(false, HttpTuApiClient.INVALID_CREDENTIALS_MESSAGE, null,
                    null, null, null, null, null, null, null, null, null);
        }
        return account;
    }

    private static String passwordOf(String username) {
        return CHANGED_PASSWORD_USERNAME.equals(username) ? CHANGED_PASSWORD : PASSWORD;
    }
}
