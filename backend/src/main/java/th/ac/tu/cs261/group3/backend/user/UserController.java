package th.ac.tu.cs261.group3.backend.user;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import th.ac.tu.cs261.group3.backend.common.student.CurrentStudentProvider;
import th.ac.tu.cs261.group3.backend.user.dto.UserProfileResponse;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final CurrentStudentProvider currentStudentProvider;

    /** ข้อมูลของ Navbar ไม่มี token หรือ token ไม่ถูกต้องตอบ 401 จาก SecurityConfig */
    @GetMapping("/me")
    public UserProfileResponse getCurrentUser() {
        return userService.getProfile(currentStudentProvider.currentStudentId());
    }
}
