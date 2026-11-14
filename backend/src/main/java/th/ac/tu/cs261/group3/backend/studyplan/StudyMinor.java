package th.ac.tu.cs261.group3.backend.studyplan;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Immutable;
import th.ac.tu.cs261.group3.backend.course.Course;

import java.util.ArrayList;
import java.util.List;

/**
 * วิชาโท 1 วิชาโทของหลักสูตร รายวิชากระจายหลายชั้นปี/ภาค (เก็บที่ {@link StudyMinorCourse})
 * <p>
 * ไม่มีความสัมพันธ์กับ {@link StudyPlan} ความเข้ากันได้ตรวจใน ApplyPlanService ด้วย {@code department} + {@code curriculumName}
 */
@Entity
@Immutable
@Table(name = "study_minor")
@Getter
@Setter
@NoArgsConstructor
public class StudyMinor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "minor_id")
    private Long minorId;

    /** ตรงกับ users.department (ไม่มี FK) */
    @Column(nullable = false, length = 100)
    private String department;

    /** ตรงกับ study_plan.curriculum_name ของ preset ที่ใช้คู่กัน */
    @Column(name = "curriculum_name", nullable = false, length = 200)
    private String curriculumName;

    @Column(name = "minor_name", nullable = false, length = 100)
    private String minorName;

    /** ลำดับปุ่มวิชาโท */
    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    /** StudyMinor "1" *-- "1..*" StudyMinorCourse ไม่มี cascade เพราะ seed ผ่าน migration */
    @OneToMany(mappedBy = "minor")
    @OrderBy("studyYear, semester, sortOrder")
    private List<StudyMinorCourse> courses = new ArrayList<>();

    /**
     * วิชาของภาคที่ระบุ เรียงตาม {@code sortOrder} กรองใน Java จาก {@link #courses} ที่ fetch มาครบแล้ว
     * ต้องเรียกหลัง query ที่ {@code join fetch} courses (open-in-view ปิดอยู่)
     */
    public List<Course> coursesOf(int studyYear, int semester) {
        return courses.stream()
                .filter(mc -> mc.getStudyYear() == studyYear && mc.getSemester() == semester)
                .map(StudyMinorCourse::getCourse)
                .toList();
    }
}
