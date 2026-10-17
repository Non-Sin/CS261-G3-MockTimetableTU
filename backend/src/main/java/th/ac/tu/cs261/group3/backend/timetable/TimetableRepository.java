package th.ac.tu.cs261.group3.backend.timetable;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TimetableRepository extends JpaRepository<Timetable, Long> {

    /** 1 นักศึกษามีได้ 1 ตารางต่อภาคเรียน (unique ใน DB) */
    Optional<Timetable> findByStudentIdAndAcademicYearAndSemester(String studentId, int academicYear, int semester);
}
