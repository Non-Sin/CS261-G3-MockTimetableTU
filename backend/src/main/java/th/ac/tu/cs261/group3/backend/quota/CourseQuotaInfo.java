package th.ac.tu.cs261.group3.backend.quota;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import th.ac.tu.cs261.group3.backend.course.Course;

import java.util.LinkedHashSet;
import java.util.Set;

/** ไม่มีแถว = ยังไม่มีข้อมูล; แถวที่ quotaRequired=false = ไม่ต้องขอโควตา */
@Entity
@Table(name = "course_quota_info")
@Getter
@Setter
@NoArgsConstructor
public class CourseQuotaInfo {

    @Id
    @Column(name = "course_code", length = 10)
    private String courseCode;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "course_code")
    private Course course;

    @Column(name = "quota_required", nullable = false)
    private boolean quotaRequired;

    // Set ป้องกันแถวซ้ำและ MultipleBagFetchException เมื่อ fetch ทั้งสาม collection
    @OneToMany(mappedBy = "quotaInfo")
    @OrderBy("sortOrder ASC")
    private Set<QuotaCondition> conditions = new LinkedHashSet<>();

    @OneToMany(mappedBy = "quotaInfo")
    @OrderBy("sortOrder ASC")
    private Set<QuotaChannel> channels = new LinkedHashSet<>();

    @OneToMany(mappedBy = "quotaInfo")
    @OrderBy("sortOrder ASC")
    private Set<QuotaContact> contacts = new LinkedHashSet<>();
}
