package th.ac.tu.cs261.group3.backend.timetable;

import th.ac.tu.cs261.group3.backend.course.ScheduleSlot;
import th.ac.tu.cs261.group3.backend.course.Section;

/**
 * สูตรตรวจเวลาชนที่ US1 ({@link TimetableService}) และ US8 (PlanScheduler) ใช้ร่วมกัน
 * <p>
 * วันเดียวกันและ {@code a.startTime < b.endTime && b.startTime < a.endTime} คาบต่อกันพอดีไม่นับว่าชน
 */
public final class ScheduleOverlap {

    private ScheduleOverlap() {
    }

    public static boolean overlaps(ScheduleSlot a, ScheduleSlot b) {
        return a.getDayOfWeek() == b.getDayOfWeek()
                && a.getStartTime().isBefore(b.getEndTime())
                && b.getStartTime().isBefore(a.getEndTime());
    }

    /** มีคาบใดคาบหนึ่งของ 2 section ชนกัน section ที่ไม่มีคาบเรียนไม่ชนกับอะไรเลย */
    public static boolean conflicts(Section a, Section b) {
        for (ScheduleSlot x : a.getSlots()) {
            for (ScheduleSlot y : b.getSlots()) {
                if (overlaps(x, y)) {
                    return true;
                }
            }
        }
        return false;
    }
}
