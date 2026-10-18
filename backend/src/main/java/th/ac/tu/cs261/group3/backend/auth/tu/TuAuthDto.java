package th.ac.tu.cs261.group3.backend.auth.tu;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * response ของ TU Login API ({@code POST /api/v1/auth/Ad/verify}) ตามที่ API คืนมา
 * <p>
 * รหัสผิดได้แค่ {@code status=false} กับ {@code message} ส่วน key ผิดได้ {@code status=false} กับ {@code error}
 * field อื่นจึงเป็น {@code null} ได้ การตีความค่า (active, สาขา) ทำใน AuthService
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record TuAuthDto(
        boolean status,
        String message,
        /** มีเฉพาะตอน Application-Key ผิด ใช้ log เท่านั้น */
        String error,
        String type,
        String username,
        /** เช่น ปกติ, พักการศึกษา, ลาออก */
        @JsonProperty("tu_status") String tuStatus,
        String statusid,
        @JsonProperty("displayname_th") String displaynameTh,
        @JsonProperty("displayname_en") String displaynameEn,
        String email,
        String department,
        String faculty
) {
}
