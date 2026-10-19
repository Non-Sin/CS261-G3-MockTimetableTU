package th.ac.tu.cs261.group3.backend.auth.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LoginRequestTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void validRequest_hasNoViolations() {
        assertThat(validator.validate(new LoginRequest("6609000001", "Passw0rd!"))).isEmpty();
    }

    @Test
    void blankOrMissingFields_areRejected() {
        assertThat(validator.validate(new LoginRequest(" ", "Passw0rd!")))
                .extracting(v -> v.getPropertyPath().toString()).containsExactly("username");
        assertThat(validator.validate(new LoginRequest("6609000001", null)))
                .extracting(v -> v.getPropertyPath().toString()).containsExactly("password");
    }

    @Test
    void toString_hidesPassword() {
        String text = new LoginRequest("6609000001", "Passw0rd!").toString();

        assertThat(text).contains("6609000001").doesNotContain("Passw0rd!");
    }

    @Test
    void loginResponse_of_wrapsToken() {
        assertThat(LoginResponse.of("abc.def.ghi").token()).isEqualTo("abc.def.ghi");
    }
}
