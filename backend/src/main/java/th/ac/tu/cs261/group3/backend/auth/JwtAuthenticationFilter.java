package th.ac.tu.cs261.group3.backend.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * อ่าน {@code Authorization: Bearer <token>} ถ้า token ถูกต้องตั้ง Authentication ที่ชื่อเป็นรหัสนักศึกษา
 * <p>
 * ไม่ตอบ 401 เอง ปล่อยให้ SecurityConfig ตัดสินว่า path นั้นต้อง login หรือไม่
 * ไม่ใส่ {@code @Component} เพราะ Spring Boot จะลงทะเบียน filter เป็น servlet filter ซ้ำอีกชั้น
 * และ {@code @WebMvcTest} จะดึง filter มาโดยไม่มี JwtService (SecurityConfig สร้างให้แทน)
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            String token = header.substring(BEARER_PREFIX.length());
            if (jwtService.isTokenValid(token)) {
                String studentId = jwtService.extractStudentId(token);
                SecurityContextHolder.getContext().setAuthentication(
                        UsernamePasswordAuthenticationToken.authenticated(studentId, null, List.of()));
            }
        }
        filterChain.doFilter(request, response);
    }
}
