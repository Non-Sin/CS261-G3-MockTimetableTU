package th.ac.tu.cs261.group3.backend.studyplan;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Immutable;
import th.ac.tu.cs261.group3.backend.course.Course;

/**
 * วิชา 1 วิชาในวิชาโท พร้อมชั้นปี/ภาคที่แนะนำให้เรียน (ปี 3–4 เท่านั้น) ของแผนหนึ่ง
 * วิชาเดียวกันมีได้ 1 แถวต่อแผน ({@code plan_type} อยู่ใน PK)
 */
@Entity
@Immutable
@Table(name = "study_minor_course")
@Getter
@Setter
@NoArgsConstructor
public class StudyMinorCourse {

    /** ต้องสร้าง object ไว้ก่อน ไม่อย่างนั้น {@code @MapsId} เติมค่าไม่ได้ตอน persist */
    @EmbeddedId
    private StudyMinorCourseId id = new StudyMinorCourseId();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("minorId")
    @JoinColumn(name = "minor_id")
    private StudyMinor minor;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("courseCode")
    @JoinColumn(name = "course_code")
    private Course course;

    /** ชั้นปี 3–4 */
    @Column(name = "study_year", nullable = false)
    private int studyYear;

    @Column(nullable = false)
    private int semester;

    /** ลำดับในภาคนั้น (unique ต่อ minor + แผน + ชั้นปี + ภาค) */
    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    /** แผนที่แถวนี้ใช้ (ค่าอยู่ใน {@link #id}) */
    public PlanType getPlanType() {
        return id.getPlanType();
    }
}
