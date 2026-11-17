package th.ac.tu.cs261.group3.backend.elective.dto;

import java.time.LocalTime;

/**
 * ช่วงเวลาเรียนของ dropdown "กรองตามช่วงเวลาเรียน" (US6-T05)
 * <p>
 * คาบอยู่ในช่วงเมื่อเวลาเริ่มอยู่ใน [from, to) จึงไม่มีคาบไหนตกสองช่วง
 * ขอบ {@code to} ของ AFTERNOON และ EVENING กว้างกว่าป้ายใน UI ให้คาบที่เริ่ม 12:30–13:29 หรือหลัง 19:30 มีช่วงให้ตก
 */
public enum TimeSlot {
    /** เช้า (08:00 - 12:30) */
    MORNING(LocalTime.of(8, 0), LocalTime.of(12, 30)),
    /** บ่าย (13:30 - 16:30) */
    AFTERNOON(LocalTime.of(12, 30), LocalTime.of(16, 30)),
    /** เย็น (16:30 - 19:30) */
    EVENING(LocalTime.of(16, 30), LocalTime.of(21, 0));

    private final LocalTime from;
    private final LocalTime to;

    TimeSlot(LocalTime from, LocalTime to) {
        this.from = from;
        this.to = to;
    }

    public LocalTime getFrom() {
        return from;
    }

    public LocalTime getTo() {
        return to;
    }

    /** ดูเฉพาะเวลาเริ่มคาบ ไม่ตรวจว่าทั้งคาบอยู่ในช่วง */
    public boolean contains(LocalTime startTime) {
        return !startTime.isBefore(from) && startTime.isBefore(to);
    }
}
