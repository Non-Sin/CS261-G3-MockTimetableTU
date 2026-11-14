package th.ac.tu.cs261.group3.backend.studyplan;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Immutable;
import th.ac.tu.cs261.group3.backend.course.Course;

/** วิชา 1 วิชาในแผนการเรียน (join table ที่มี {@code sort_order} จึงไม่ใช้ {@code @ManyToMany}) */
@Entity
@Immutable
@Table(name = "study_plan_course")
@Getter
@Setter
@NoArgsConstructor
public class StudyPlanCourse {

    /** ต้องสร้าง object ไว้ก่อน ไม่อย่างนั้น {@code @MapsId} เติมค่าไม่ได้ตอน persist */
    @EmbeddedId
    private StudyPlanCourseId id = new StudyPlanCourseId();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("planId")
    @JoinColumn(name = "plan_id")
    private StudyPlan plan;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("courseCode")
    @JoinColumn(name = "course_code")
    private Course course;

    /** ลำดับในแผน (unique ต่อ plan) ใช้ tie-break ของ PlanScheduler */
    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
