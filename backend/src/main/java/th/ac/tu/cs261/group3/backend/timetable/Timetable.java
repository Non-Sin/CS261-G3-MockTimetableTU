package th.ac.tu.cs261.group3.backend.timetable;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;

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
     * Hibernate ตั้งค่าเองตอน insert และตอนที่ field ของ Timetable เปลี่ยน
     * การเพิ่มหรือลบ TimetableEntry ไม่ได้แก้แถวนี้ service จึงต้องเรียก {@link #touch()} เอง
     */
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    /** ทำให้ entity dirty เพื่อให้ {@code updatedAt} อัปเดตตอน flush */
    public void touch() {
        this.updatedAt = OffsetDateTime.now();
    }
}
