package th.ac.tu.cs261.group3.backend.studyplan;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

/** composite PK ({@code plan_id, course_code}) ของ {@code study_plan_course} ค่าถูกเติมผ่าน {@code @MapsId} */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class StudyPlanCourseId implements Serializable {

    @Column(name = "plan_id")
    private Long planId;

    @Column(name = "course_code", length = 10)
    private String courseCode;
}
