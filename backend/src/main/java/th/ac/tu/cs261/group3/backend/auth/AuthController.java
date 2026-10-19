package th.ac.tu.cs261.group3.backend.auth;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import th.ac.tu.cs261.group3.backend.auth.dto.LoginRequest;
import th.ac.tu.cs261.group3.backend.auth.dto.LoginResponse;

/** endpoint เดียวที่เรียกได้โดยไม่มี token (SecurityConfig) */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /** 401/403/429/503 มาจาก BusinessRuleException ของ AuthService ส่วน body ไม่ครบตอบ 400 */
    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.authenticate(request);
    }
}
