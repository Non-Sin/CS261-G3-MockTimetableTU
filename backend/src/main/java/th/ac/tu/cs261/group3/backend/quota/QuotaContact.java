package th.ac.tu.cs261.group3.backend.quota;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "quota_contact")
@Getter
@Setter
@NoArgsConstructor
public class QuotaContact {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "contact_id")
    private Long contactId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_code", nullable = false)
    private CourseQuotaInfo quotaInfo;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "organization_name", nullable = false, length = 200)
    private String organizationName;

    @Column(nullable = false, length = 200)
    private String label;

    @Column(length = 500)
    private String url;
}
