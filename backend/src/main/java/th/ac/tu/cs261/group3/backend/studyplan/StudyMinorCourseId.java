package th.ac.tu.cs261.group3.backend.studyplan;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

/**
 * composite PK ({@code minor_id, course_code, plan_type}) ของ {@code study_minor_course}
 * <p>
 * {@code minorId}, {@code courseCode} ถูกเติมผ่าน {@code @MapsId} ส่วน {@code planType} ตั้งเอง
 * เพราะวิชาเดียวกันในวิชาโทเดียวกันเรียนคนละภาคได้ตามแผน (หัวข้อพิเศษ / สหกิจ)
 */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class StudyMinorCourseId implements Serializable {

    @Column(name = "minor_id")
    private Long minorId;

    @Column(name = "course_code", length = 10)
    private String courseCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "plan_type", length = 20)
    private PlanType planType;
}
