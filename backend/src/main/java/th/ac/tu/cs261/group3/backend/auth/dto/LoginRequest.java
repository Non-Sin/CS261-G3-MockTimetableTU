package th.ac.tu.cs261.group3.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;

/** body ของ POST /api/auth/login ใช้บัญชีเดียวกับ TU Login API */
public record LoginRequest(
        @NotBlank String username,
        @NotBlank String password
) {
    /** ไม่ให้รหัสผ่านหลุดไปใน log */
    @Override
    public String toString() {
        return "LoginRequest[username=" + username + ", password=***]";
    }
}
