package th.ac.tu.cs261.group3.backend.elective.dto;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.time.LocalTime;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;

/** ช่วงเวลา [from, to) ตาม TimeSlot ใน US6-T05 API Spec: เวลาเริ่มแต่ละค่าตกได้ไม่เกิน 1 ช่วง */
class TimeSlotTest {

    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource({
            "07:59, NONE",
            "08:00, MORNING",
            "09:30, MORNING",
            "12:29, MORNING",
            "12:30, AFTERNOON",   // ขอบ to ของ MORNING ไม่รวม
            "13:30, AFTERNOON",
            "16:29, AFTERNOON",
            "16:30, EVENING",     // FR205 16:30-18:00 เป็นเย็น
            "19:30, EVENING",
            "20:59, EVENING",
            "21:00, NONE"
    })
    void contains_startTimeFallsInAtMostOneSlot(String start, String expected) {
        LocalTime time = LocalTime.parse(start);

        var matched = Arrays.stream(TimeSlot.values()).filter(slot -> slot.contains(time)).toList();

        if (expected.equals("NONE")) {
            assertThat(matched).isEmpty();
        } else {
            assertThat(matched).containsExactly(TimeSlot.valueOf(expected));
        }
    }
}
