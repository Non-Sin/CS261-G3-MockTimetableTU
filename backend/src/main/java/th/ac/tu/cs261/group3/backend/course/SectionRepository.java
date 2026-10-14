package th.ac.tu.cs261.group3.backend.course;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SectionRepository extends JpaRepository<Section, Long> {

    /**
     * โหลดวิชาและคาบเรียนมาพร้อม section (TimetableService.addEntry)
     * เพราะ service ใช้รหัสวิชาและหน่วยกิตต่อหลังจบ query และ {@code open-in-view: false}
     */
    @Override
    @EntityGraph(attributePaths = {"course", "slots"})
    Optional<Section> findById(Long sectionId);
}
