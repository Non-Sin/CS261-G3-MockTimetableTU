package th.ac.tu.cs261.group3.backend.timetable;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TimetableEntryRepository extends JpaRepository<TimetableEntry, Long> {

    /**
     * entry ทั้งหมดในตาราง พร้อม section, course และคาบเรียนในคิวรีเดียว
     * ให้ service ใช้ตรวจวิชาซ้ำ รวมหน่วยกิต และหาเวลาชน
     * <p>
     * เขียน @Query เอง เพราะ TimetableEntry ไม่มี field ชื่อ timetableId ตรง ๆ
     * การ fetch join collection คาบเรียนไม่ทำให้ entry ซ้ำ เพราะ Hibernate 6+ ตัดแถวซ้ำของ root ให้เอง
     */
    @Query("""
            select e from TimetableEntry e
            join fetch e.section s
            join fetch s.course
            left join fetch s.slots
            where e.timetable.timetableId = :timetableId
            order by e.entryId""")
    List<TimetableEntry> findByTimetableId(@Param("timetableId") Long timetableId);
}
