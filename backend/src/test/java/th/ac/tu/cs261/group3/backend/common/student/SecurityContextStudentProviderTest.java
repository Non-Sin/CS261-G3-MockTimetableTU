package th.ac.tu.cs261.group3.backend.common.student;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SecurityContextStudentProviderTest {

    private final CurrentStudentProvider provider = new SecurityContextStudentProvider();

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void currentStudentId_returnsNameOfAuthentication() {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated("6609000001", null, List.of()));

        assertThat(provider.currentStudentId()).isEqualTo("6609000001");
    }

    @Test
    void currentStudentId_noAuthentication_throws() {
        assertThatThrownBy(provider::currentStudentId).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void currentStudentId_anonymous_throws() {
        SecurityContextHolder.getContext().setAuthentication(new AnonymousAuthenticationToken(
                "key", "anonymousUser", AuthorityUtils.createAuthorityList("ROLE_ANONYMOUS")));

        assertThatThrownBy(provider::currentStudentId).isInstanceOf(IllegalStateException.class);
    }
}
