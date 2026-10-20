package th.ac.tu.cs261.group3.backend.user.dto;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.json.JsonTest;
import org.springframework.boot.test.json.JacksonTester;
import org.springframework.boot.test.json.JsonContent;
import th.ac.tu.cs261.group3.backend.user.User;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * แปลง entity เป็น DTO และรูปแบบ JSON ตามตัวอย่าง GET /api/users/me ใน US3-T05 DTO & API Spec
 */
@JsonTest
class UserProfileResponseTest {

    @Autowired
    private JacksonTester<UserProfileResponse> json;

    @Test
    void from_mapsNameAndStudentIdOnly() throws Exception {
        User user = new User("6609000001", "Somchai", "Jaidee", "สมชาย", "ใจดี",
                "ภาควิชาวิทยาการคอมพิวเตอร์", "ภาคปกติ");

        JsonContent<UserProfileResponse> content = json.write(UserProfileResponse.from(user));

        assertThat(content).isEqualToJson("""
                {"studentId": "6609000001", "firstName": "Somchai", "lastName": "Jaidee",
                 "firstNameTh": "สมชาย", "lastNameTh": "ใจดี"}
                """);
        assertThat(content).doesNotHaveJsonPath("$.department");
        assertThat(content).doesNotHaveJsonPath("$.track");
    }
}
