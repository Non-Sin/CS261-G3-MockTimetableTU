package th.ac.tu.cs261.group3.backend.studyplan;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

/** composite PK ({@code minor_id, course_code}) ของ {@code study_minor_course} ค่าถูกเติมผ่าน {@code @MapsId} */
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
}
