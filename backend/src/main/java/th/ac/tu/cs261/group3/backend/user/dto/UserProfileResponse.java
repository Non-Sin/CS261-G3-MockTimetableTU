package th.ac.tu.cs261.group3.backend.user.dto;

import th.ac.tu.cs261.group3.backend.user.User;

/** ข้อมูลที่ Navbar แสดงมุมขวาบน ตอบจาก GET /api/users/me */
public record UserProfileResponse(
        String studentId,
        String firstName,
        String lastName
) {
    public static UserProfileResponse from(User user) {
        return new UserProfileResponse(user.getStudentId(), user.getFirstName(), user.getLastName());
    }
}
