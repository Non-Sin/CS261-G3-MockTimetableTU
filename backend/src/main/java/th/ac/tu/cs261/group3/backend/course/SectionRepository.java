package th.ac.tu.cs261.group3.backend.course;

import org.springframework.data.jpa.repository.JpaRepository;

/** ใช้ {@code findById} จาก JpaRepository (TimetableService.addEntry) */
public interface SectionRepository extends JpaRepository<Section, Long> {
}
