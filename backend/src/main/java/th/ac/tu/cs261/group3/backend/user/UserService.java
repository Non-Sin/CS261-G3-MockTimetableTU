package th.ac.tu.cs261.group3.backend.user;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import th.ac.tu.cs261.group3.backend.common.exception.ResourceNotFoundException;
import th.ac.tu.cs261.group3.backend.user.dto.UserProfileResponse;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    /** ไม่พบได้เฉพาะ token ที่ออกก่อนแถวใน users ถูกลบ เพราะ login upsert ผู้ใช้ก่อนออก token เสมอ */
    public UserProfileResponse getProfile(String studentId) {
        return userRepository.findById(studentId)
                .map(UserProfileResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("ไม่พบผู้ใช้ " + studentId));
    }
}
