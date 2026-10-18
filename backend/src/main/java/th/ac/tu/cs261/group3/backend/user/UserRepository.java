package th.ac.tu.cs261.group3.backend.user;

import org.springframework.data.jpa.repository.JpaRepository;

/** ค้นหาด้วย PK {@code studentId} ใช้ findById / save ของ JpaRepository ไม่มี query เพิ่ม */
public interface UserRepository extends JpaRepository<User, String> {
}
