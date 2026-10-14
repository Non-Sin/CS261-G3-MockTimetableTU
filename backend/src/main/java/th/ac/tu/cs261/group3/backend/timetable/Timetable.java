package th.ac.tu.cs261.group3.backend.timetable;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;

/**
 * ตารางเรียนจำลองของนักศึกษา 1 คนต่อ 1 ภาคเรียน
 * (unique {@code student_id, academic_year, semester} ใน DB)
 */
@Entity
@Table(name = "timetable")
@Getter
@Setter
@NoArgsConstructor
public class Timetable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "timetable_id")
    private Long timetableId;

    /** ยังไม่มีตารางนักศึกษา (รอ US3) ค่ามาจาก CurrentStudentProvider */
    @Column(name = "student_id", nullable = false, length = 20)
    private String studentId;

    /** ปีการศึกษา (พ.ศ.) */
    @Column(name = "academic_year", nullable = false)
    private int academicYear;

    @Column(nullable = false)
    private int semester;

    /**
     * service เป็นคนตั้งค่า ไม่ใช้ {@code @UpdateTimestamp} เพราะจะเขียนทับค่าที่ตั้งเอง
     * และไม่ทำงานตอนเพิ่ม/ลบ TimetableEntry อยู่แล้ว ให้เรียก {@link #touch()} ทุกครั้งที่ตารางเปลี่ยน
     * รวมถึงตอนสร้างตารางใหม่ (column เป็น NOT NULL)
     */
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    /** ตัดเหลือวินาที ให้ JSON เป็น "2026-10-13T11:20:05+07:00" ตาม Spec ไม่มีเศษวินาที 7 หลัก */
    public void touch() {
        this.updatedAt = OffsetDateTime.now().truncatedTo(ChronoUnit.SECONDS);
    }
}
