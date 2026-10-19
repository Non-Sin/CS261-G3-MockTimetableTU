package th.ac.tu.cs261.group3.backend.user;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import th.ac.tu.cs261.group3.backend.common.exception.ResourceNotFoundException;
import th.ac.tu.cs261.group3.backend.user.dto.UserProfileResponse;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void getProfile_existingUser_returnsProfile() {
        when(userRepository.findById("6609000001")).thenReturn(Optional.of(
                new User("6609000001", "สมชาย", "ใจดี", "ภาควิชาวิทยาการคอมพิวเตอร์", "ภาคปกติ")));

        assertThat(userService.getProfile("6609000001"))
                .isEqualTo(new UserProfileResponse("6609000001", "สมชาย", "ใจดี"));
    }

    @Test
    void getProfile_unknownUser_throwsNotFound() {
        when(userRepository.findById("6609000009")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getProfile("6609000009"))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
