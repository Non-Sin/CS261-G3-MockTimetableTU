package th.ac.tu.cs261.group3.backend.auth;

import org.springframework.data.jpa.repository.JpaRepository;

/** ค้นหาด้วย PK {@code username} ใช้ findById / save / deleteById ของ JpaRepository ไม่มี query เพิ่ม */
public interface LoginAttemptRepository extends JpaRepository<LoginAttempt, String> {
}
