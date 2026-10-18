package th.ac.tu.cs261.group3.backend.auth.dto;

/** ตอบ 200 เมื่อ login ผ่านทุกเงื่อนไข UI ส่ง token นี้ใน {@code Authorization: Bearer} ทุก request ถัดไป */
public record LoginResponse(
        String token
) {
    public static LoginResponse of(String token) {
        return new LoginResponse(token);
    }
}
