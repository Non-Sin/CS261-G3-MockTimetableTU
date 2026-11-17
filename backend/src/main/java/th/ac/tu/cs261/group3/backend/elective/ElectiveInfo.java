package th.ac.tu.cs261.group3.backend.elective;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import th.ac.tu.cs261.group3.backend.course.Course;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * ข้อมูลแนะนำวิชาเลือกเสรี 0..1 ต่อ {@link Course} (shared primary key {@code course_code}) ตาม US6-T06
 * <p>
 * tags และ bullet รีวิวเป็น value collection ไม่มี entity/repository แยก
 * ทั้งสองเป็น LAZY: query ของ {@link ElectiveRepository} fetch เฉพาะ {@link #tags}
 * ส่วน {@link #description} ให้ service initialize ภายใน transaction ของหน้ารายละเอียด
 * (ไม่ fetch ทั้งสอง collection พร้อมกันเพื่อไม่ให้แถวคูณกัน)
 */
@Entity
@Table(name = "elective_info")
@Getter
@Setter
@NoArgsConstructor
public class ElectiveInfo {

    @Id
    @Column(name = "course_code", length = 10)
    private String courseCode;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "course_code")
    private Course course;

    @Column(name = "course_name_th", nullable = false, length = 200)
    private String courseNameTh;

    @Enumerated(EnumType.STRING)
    @Column(name = "interest_group", nullable = false, length = 20)
    private InterestGroup interestGroup;

    /** ใช้แสดงป้ายและลิงก์ขอโควตา ไม่ใช่สถานะอนุมัติลงทะเบียน */
    @Column(name = "requires_quota", nullable = false)
    private boolean requiresQuota;

    /** ลำดับใน Set ไม่มีความหมาย service เรียงตาม enum {@link ElectiveTag} ก่อนคืน DTO */
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "elective_tag", joinColumns = @JoinColumn(name = "course_code"))
    @Enumerated(EnumType.STRING)
    @Column(name = "tag", nullable = false, length = 20)
    private Set<ElectiveTag> tags = new HashSet<>();

    /** bullet รีวิวเรียงตาม {@code sort_order} (เริ่ม 0) */
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "elective_review_point", joinColumns = @JoinColumn(name = "course_code"))
    @OrderColumn(name = "sort_order")
    @Column(name = "review_text", nullable = false, length = 1000)
    private List<String> description = new ArrayList<>();
}
