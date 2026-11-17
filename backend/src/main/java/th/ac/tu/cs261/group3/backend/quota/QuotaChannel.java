package th.ac.tu.cs261.group3.backend.quota;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "quota_channel")
@Getter
@Setter
@NoArgsConstructor
public class QuotaChannel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "channel_id")
    private Long channelId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_code", nullable = false)
    private CourseQuotaInfo quotaInfo;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel_type", nullable = false, length = 20)
    private QuotaChannelType channelType;

    @Column(nullable = false, length = 200)
    private String label;

    @Column(length = 500)
    private String url;

    @Column(length = 300)
    private String note;
}
