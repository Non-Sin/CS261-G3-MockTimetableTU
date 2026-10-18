package th.ac.tu.cs261.group3.backend.config;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import th.ac.tu.cs261.group3.backend.auth.JwtAuthenticationFilter;
import th.ac.tu.cs261.group3.backend.auth.JwtService;

import java.nio.charset.StandardCharsets;

/**
 * Security แบบ stateless ใช้ JWT ใน header แทน session จึงปิด CSRF
 * <p>
 * เรียกได้โดยไม่มี token เฉพาะ {@code POST /api/auth/login} ส่วน {@code /api/**} อื่นทั้งหมด
 * (users/me, timetable, courses) ต้องมี token ไม่มีหรือไม่ถูกต้องตอบ 401 ProblemDetail
 */
@Configuration
public class SecurityConfig {

    /** เขียน body เอง เพราะ GlobalExceptionHandler จับ exception ที่เกิดใน filter ไม่ได้ */
    private static final String UNAUTHORIZED_BODY = """
            {"type":"about:blank","title":"Unauthorized","status":401,"detail":"กรุณาเข้าสู่ระบบก่อนใช้งาน"}""";

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtService jwtService) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())   // ใช้ค่าจาก CorsConfig
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll())
                .exceptionHandling(e -> e.authenticationEntryPoint(unauthorizedEntryPoint()))
                .addFilterBefore(new JwtAuthenticationFilter(jwtService), UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    private static AuthenticationEntryPoint unauthorizedEntryPoint() {
        return (request, response, ex) -> {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.getWriter().write(UNAUTHORIZED_BODY);
        };
    }
}
