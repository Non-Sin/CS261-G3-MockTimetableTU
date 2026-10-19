package th.ac.tu.cs261.group3.backend.common.student;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * อ่านรหัสนักศึกษาจาก Authentication ที่ JwtAuthenticationFilter ตั้งไว้ (subject ของ JWT)
 * แทน DemoStudentProvider เดิม controller ของ US1/US2 ไม่ต้องแก้
 */
@Component
public class SecurityContextStudentProvider implements CurrentStudentProvider {

    /** path ที่เรียกมาถึงนี่ต้อง login แล้ว (SecurityConfig) ถ้าไม่มีแปลว่าตั้งค่า security ผิด */
    @Override
    public String currentStudentId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication instanceof AnonymousAuthenticationToken
                || !authentication.isAuthenticated()) {
            throw new IllegalStateException("ไม่มีผู้ใช้ที่เข้าสู่ระบบใน SecurityContext");
        }
        return authentication.getName();
    }
}
