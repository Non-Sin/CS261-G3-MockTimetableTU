package th.ac.tu.cs261.group3.backend.quota;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface QuotaInfoRepository extends JpaRepository<CourseQuotaInfo, String> {

    default List<CourseQuotaInfo> findWithDetailsByCourseCodes(Collection<String> courseCodes) {
        if (courseCodes.isEmpty()) {
            return List.of();
        }
        return findWithDetails(courseCodes);
    }

    @Query("""
            select distinct q from CourseQuotaInfo q
            left join fetch q.conditions
            left join fetch q.channels
            left join fetch q.contacts
            where q.courseCode in :courseCodes
            order by q.courseCode""")
    List<CourseQuotaInfo> findWithDetails(@Param("courseCodes") Collection<String> courseCodes);
}
