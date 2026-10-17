package th.ac.tu.cs261.group3.backend.course;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "section")
@Getter
@Setter
@NoArgsConstructor
public class Section {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "section_id")
    private Long sectionId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_code", nullable = false)
    private Course course;

    @Column(name = "section_no", nullable = false, length = 10)
    private String sectionNo;

    @Column(length = 100)
    private String instructor;

    /** ปีการศึกษา (พ.ศ.) */
    @Column(name = "academic_year", nullable = false)
    private int academicYear;

    @Column(nullable = false)
    private int semester;

<<<<<<< HEAD
    /** Section "1" *-- "1..*" ScheduleSlot ใน DAO Class Diagram */
=======
    /** Section "1" *-- "0..*" ScheduleSlot ใน DAO Class Diagram (กลุ่มเรียน e-learning ไม่มีคาบ) */
>>>>>>> fd86cedd0ffad13cf9368433c71a1cc2ce15e4a9
    @OneToMany(mappedBy = "section")
    private List<ScheduleSlot> slots = new ArrayList<>();
}
