package th.ac.tu.cs261.group3.backend.timetable;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import th.ac.tu.cs261.group3.backend.course.Section;

/**
 * กลุ่มเรียนที่นักศึกษาเลือกไว้ในตาราง
 * (unique {@code timetable_id, section_id} ใน DB กันเพิ่มกลุ่มเดียวกันซ้ำ)
 */
@Entity
@Table(name = "timetable_entry")
@Getter
@Setter
@NoArgsConstructor
public class TimetableEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "entry_id")
    private Long entryId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "timetable_id", nullable = false)
    private Timetable timetable;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "section_id", nullable = false)
    private Section section;
}
