package th.ac.tu.cs261.group3.backend.user;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

/**
 * นักศึกษาและประวัติส่วนตัวที่ได้จาก TU Login API (upsert ทุกครั้งที่ login สำเร็จ)
 * ชื่อตาราง {@code users} เพราะ {@code USER} เป็นคำสงวนของ SQL Server
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {

    /** รหัสนักศึกษา ตรงกับ {@code timetable.student_id} ของ US1 */
    @Id
    @Column(name = "student_id", length = 20)
    private String studentId;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    /** สาขาวิชา เช่น วิทยาการคอมพิวเตอร์ */
    @Column(nullable = false, length = 100)
    private String department;

    /** โครงการ/ภาค เช่น ภาคปกติ */
    @Column(nullable = false, length = 50)
    private String track;

    /** เวลาซิงก์ข้อมูลจาก TU API ล่าสุด ตั้งค่าใน {@link #updateProfile} (column เป็น NOT NULL) */
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    /** ผู้ใช้ใหม่ที่ login สำเร็จครั้งแรก ตั้ง updatedAt ผ่าน {@link #updateProfile} ให้ด้วย save ได้ทันที */
    public User(String studentId, String firstName, String lastName, String department, String track) {
        this.studentId = studentId;
        updateProfile(firstName, lastName, department, track);
    }

    /** อัปเดตข้อมูลล่าสุดจาก TU API ใช้ทั้งตอนสร้างผู้ใช้ใหม่และตอน login ซ้ำ */
    public void updateProfile(String firstName, String lastName, String department, String track) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.department = department;
        this.track = track;
        // ตัดเหลือวินาทีเหมือน Timetable.touch()
        this.updatedAt = OffsetDateTime.now(ZoneId.of("Asia/Bangkok")).truncatedTo(ChronoUnit.SECONDS);
    }
}
