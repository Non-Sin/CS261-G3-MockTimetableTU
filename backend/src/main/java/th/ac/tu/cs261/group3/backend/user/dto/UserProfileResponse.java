package th.ac.tu.cs261.group3.backend.user.dto;

import th.ac.tu.cs261.group3.backend.user.User;

/**
 * ข้อมูลที่ Navbar แสดงมุมขวาบน ตอบจาก GET /api/users/me
 * firstName/lastName เป็นภาษาอังกฤษ ส่วน firstNameTh/lastNameTh เป็นภาษาไทยแสดงใน dropdown (null ได้)
 */
public record UserProfileResponse(
        String studentId,
        String firstName,
        String lastName,
        String firstNameTh,
        String lastNameTh
) {
    public static UserProfileResponse from(User user) {
        return new UserProfileResponse(user.getStudentId(), user.getFirstName(), user.getLastName(),
                user.getFirstNameTh(), user.getLastNameTh());
    }
}
