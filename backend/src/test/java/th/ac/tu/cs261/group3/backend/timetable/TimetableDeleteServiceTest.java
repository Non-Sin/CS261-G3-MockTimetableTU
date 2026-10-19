package th.ac.tu.cs261.group3.backend.timetable;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import th.ac.tu.cs261.group3.backend.common.exception.ResourceNotFoundException;
import th.ac.tu.cs261.group3.backend.timetable.dto.TimetableResponse;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * ลำดับการตรวจใน TimetableDeleteService (mock repository และ TimetableService) ตาม US2-T05 DTO & API Spec
 */
@ExtendWith(MockitoExtension.class)
class TimetableDeleteServiceTest {

    private static final String STUDENT = "6609000000";
    private static final String OTHER = "6609999999";
    private static final OffsetDateTime OLD_UPDATED_AT = OffsetDateTime.parse("2026-10-13T11:20:05+07:00");

    @Mock
    private TimetableEntryRepository entryRepository;

    @Mock
    private TimetableService timetableService;

    @InjectMocks
    private TimetableDeleteService service;

    // ---------- test data ----------

    private static Timetable timetable(long id, String studentId, int academicYear, int semester) {
        Timetable timetable = new Timetable();
        timetable.setTimetableId(id);
        timetable.setStudentId(studentId);
        timetable.setAcademicYear(academicYear);
        timetable.setSemester(semester);
        timetable.setUpdatedAt(OLD_UPDATED_AT);
        return timetable;
    }

    private static TimetableEntry entry(long entryId, Timetable timetable) {
        TimetableEntry entry = new TimetableEntry();
        entry.setEntryId(entryId);
        entry.setTimetable(timetable);
        return entry;
    }

    private static TimetableResponse empty() {
        return TimetableResponse.of(2568, 1, List.of(), 22, List.of(), OLD_UPDATED_AT);
    }

    // ---------- สำเร็จ ----------

    @Test
    void removeEntry_ownEntry_deletesTouchesAndReturnsTimetable() {
        Timetable t = timetable(1L, STUDENT, 2568, 1);
        TimetableEntry e8 = entry(8L, t);
        when(entryRepository.findAllById(Set.of(8L))).thenReturn(List.of(e8));
        TimetableResponse expected = empty();
        when(timetableService.getTimetable(STUDENT, 2568, 1)).thenReturn(expected);

        TimetableResponse result = service.removeEntry(STUDENT, 8L);

        assertThat(result).isSameAs(expected);
        verify(entryRepository).deleteAll(List.of(e8));
        assertThat(t.getUpdatedAt()).isAfter(OLD_UPDATED_AT);
    }

    @Test
    void removeEntries_twoEntries_deletesBoth() {
        Timetable t = timetable(1L, STUDENT, 2568, 1);
        TimetableEntry e7 = entry(7L, t);
        TimetableEntry e8 = entry(8L, t);
        when(entryRepository.findAllById(Set.of(7L, 8L))).thenReturn(List.of(e7, e8));
        when(timetableService.getTimetable(STUDENT, 2568, 1)).thenReturn(empty());

        service.removeEntries(STUDENT, List.of(7L, 8L));

        verify(entryRepository).deleteAll(List.of(e7, e8));
    }

    @Test
    void removeEntries_duplicateIds_treatedAsOne() {
        Timetable t = timetable(1L, STUDENT, 2568, 1);
        TimetableEntry e7 = entry(7L, t);
        when(entryRepository.findAllById(Set.of(7L))).thenReturn(List.of(e7));
        when(timetableService.getTimetable(STUDENT, 2568, 1)).thenReturn(empty());

        service.removeEntries(STUDENT, List.of(7L, 7L));

        verify(entryRepository).deleteAll(List.of(e7));
    }

    @Test
    void removeEntries_usesTermOfEntryNotRequest() {
        Timetable t = timetable(2L, STUDENT, 2568, 2);
        when(entryRepository.findAllById(Set.of(9L))).thenReturn(List.of(entry(9L, t)));
        when(timetableService.getTimetable(STUDENT, 2568, 2)).thenReturn(empty());

        service.removeEntries(STUDENT, List.of(9L));

        verify(timetableService).getTimetable(STUDENT, 2568, 2);
    }

    // ---------- error ----------

    @Test
    void removeEntries_empty_throws400WithoutQuery() {
        ResponseStatusException ex = catchThrowableOfType(ResponseStatusException.class,
                () -> service.removeEntries(STUDENT, List.of()));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verify(entryRepository, never()).findAllById(any());
        verify(entryRepository, never()).deleteAll(any());
    }

    @Test
    void removeEntries_idNotFound_throws404ListingMissingIdsAndDeletesNothing() {
        Timetable t = timetable(1L, STUDENT, 2568, 1);
        when(entryRepository.findAllById(Set.of(7L, 9L))).thenReturn(List.of(entry(7L, t)));

        assertThatThrownBy(() -> service.removeEntries(STUDENT, List.of(7L, 9L)))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("ไม่พบวิชาในตารางเรียนของคุณ: entryId 9");

        verify(entryRepository, never()).deleteAll(any());
        assertThat(t.getUpdatedAt()).isEqualTo(OLD_UPDATED_AT);
    }

    @Test
    void removeEntry_otherStudentsEntry_throws404() {
        Timetable other = timetable(5L, OTHER, 2568, 1);
        when(entryRepository.findAllById(Set.of(20L))).thenReturn(List.of(entry(20L, other)));

        assertThatThrownBy(() -> service.removeEntry(STUDENT, 20L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("ไม่พบวิชาในตารางเรียนของคุณ: entryId 20");

        verify(entryRepository, never()).deleteAll(any());
        verify(timetableService, never()).getTimetable(anyString(), anyInt(), anyInt());
    }

    /** ตรวจความเป็นเจ้าของก่อนตรวจคนละตาราง id ของคนอื่นปนมาต้องได้ 404 ไม่ใช่ 400 */
    @Test
    void removeEntries_otherStudentsEntryInOtherTimetable_throws404Not400() {
        Timetable mine = timetable(1L, STUDENT, 2568, 1);
        Timetable other = timetable(5L, OTHER, 2568, 1);
        when(entryRepository.findAllById(Set.of(7L, 20L))).thenReturn(List.of(entry(7L, mine), entry(20L, other)));

        assertThatThrownBy(() -> service.removeEntries(STUDENT, List.of(7L, 20L)))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void removeEntries_differentTerms_throws400AndDeletesNothing() {
        Timetable term1 = timetable(1L, STUDENT, 2568, 1);
        Timetable term2 = timetable(2L, STUDENT, 2568, 2);
        when(entryRepository.findAllById(Set.of(7L, 9L))).thenReturn(List.of(entry(7L, term1), entry(9L, term2)));

        ResponseStatusException ex = catchThrowableOfType(ResponseStatusException.class,
                () -> service.removeEntries(STUDENT, List.of(7L, 9L)));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getReason()).isEqualTo("entryIds ต้องเป็นวิชาในตารางเดียวกัน (ปีการศึกษาและภาคเรียนเดียวกัน)");
        verify(entryRepository, never()).deleteAll(any());
        assertThat(term1.getUpdatedAt()).isEqualTo(OLD_UPDATED_AT);
    }
}
