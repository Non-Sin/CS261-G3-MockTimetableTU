package th.ac.tu.cs261.group3.backend.quota;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface QuotaRoundRepository extends JpaRepository<QuotaRound, Long> {

    default List<QuotaRound> findByCourseCodesAndTerm(Collection<String> courseCodes, int academicYear, int semester) {
        if (courseCodes.isEmpty()) {
            return List.of();
        }
        return findRounds(courseCodes, academicYear, semester);
    }

    @Query("""
            select r from QuotaRound r
            where r.quotaInfo.courseCode in :courseCodes
              and r.academicYear = :academicYear and r.semester = :semester
            order by r.quotaInfo.courseCode, r.roundNo""")
    List<QuotaRound> findRounds(@Param("courseCodes") Collection<String> courseCodes,
                               @Param("academicYear") int academicYear,
                               @Param("semester") int semester);
}
