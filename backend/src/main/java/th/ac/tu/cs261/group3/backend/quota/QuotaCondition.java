package th.ac.tu.cs261.group3.backend.quota;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "quota_condition")
@Getter
@Setter
@NoArgsConstructor
public class QuotaCondition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "condition_id")
    private Long conditionId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_code", nullable = false)
    private CourseQuotaInfo quotaInfo;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "condition_text", nullable = false, length = 500)
    private String conditionText;

    @Column(name = "related_course_code", length = 10)
    private String relatedCourseCode;
}
