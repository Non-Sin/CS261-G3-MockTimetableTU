package th.ac.tu.cs261.group3.backend.timetable;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TimetableEntryRepository extends JpaRepository<TimetableEntry, Long> {

    /**
     * entry ทั้งหมดในตาราง พร้อม section และ course ในคิวรีเดียว
     * เพราะ getTimetable ต้องใช้ทั้ง courseCode, credits และ sectionNo ของทุก entry
     * <p>
     * เขียน @Query เอง เพราะ TimetableEntry ไม่มี field ชื่อ timetableId ตรง ๆ
     */
    @Query("""
            select e from TimetableEntry e
            join fetch e.section s
            join fetch s.course
            where e.timetable.timetableId = :timetableId
            order by e.entryId""")
    List<TimetableEntry> findByTimetableId(@Param("timetableId") Long timetableId);
}
