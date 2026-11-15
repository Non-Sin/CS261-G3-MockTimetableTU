package th.ac.tu.cs261.group3.backend.studyplan;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Immutable;

import java.util.ArrayList;
import java.util.List;

/**
 * preset แผนการเรียน 1 หลักสูตร + ชั้นปี + ภาคเรียน (+ แผนของปี 3–4)
 * <p>
 * ไม่ผูกกับปีการศึกษา (พ.ศ.) ตอน apply ค่อยแปลงรหัสวิชาเป็น section ของปีที่ขอมา
 * ข้อมูล seed ผ่าน Flyway ไม่มี flow เขียน จึงใส่ {@code @Immutable}
 */
@Entity
@Immutable
@Table(name = "study_plan")
@Getter
@Setter
@NoArgsConstructor
public class StudyPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "plan_id")
    private Long planId;

    /** ตรงกับ users.department (ไม่มี FK) */
    @Column(nullable = false, length = 100)
    private String department;

    @Column(name = "curriculum_name", nullable = false, length = 200)
    private String curriculumName;

    /** ชั้นปี 1–4 */
    @Column(name = "study_year", nullable = false)
    private int studyYear;

    @Column(nullable = false)
    private int semester;

    /** null เมื่อชั้นปี 1–2 */
    @Enumerated(EnumType.STRING)
    @Column(name = "plan_type", length = 20)
    private PlanType planType;

    /** StudyPlan "1" *-- "1..*" StudyPlanCourse ไม่มี cascade เพราะ seed ผ่าน migration */
    @OneToMany(mappedBy = "plan")
    @OrderBy("sortOrder")
    private List<StudyPlanCourse> courses = new ArrayList<>();
}
