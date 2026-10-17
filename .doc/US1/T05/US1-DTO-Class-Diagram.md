# DTO Class Diagram

&#91;embedded content: DTO class diagram · 8 class พร้อม attribute และ method\]

ทุก DTO เป็น Java record ตามแบบ `ItemResponse` ที่มีอยู่ field เป็น `private final` (-) ส่วน accessor แบบ `public` (+) ของทุก field และ constructor ครบทุก field record สร้างให้อัตโนมัติ แผนภาพจึงวาดเฉพาะ static method ที่ออกแบบเอง (ขีดเส้นใต้) ไม่มีสมาชิก `protected` (#) เพราะ record สืบทอดไม่ได้

| Static method | หน้าที่ |
| --- | --- |
| `CourseResponse.from(course, sections)` | แปลง entity วิชาพร้อมกลุ่มเรียนของภาคที่ค้น |
| `SectionResponse.from(section)` | แปลงกลุ่มเรียนพร้อมคาบเรียน |
| `ScheduleSlotResponse.from(slot)` | แปลงคาบเรียน 1 คาบ |
| `ScheduleSlotResponse.fromAll(slots)` | แปลงคาบเรียนทั้งหมด เรียงตามวันในสัปดาห์แล้วเวลาเริ่ม |
| `TimetableEntryResponse.from(entry, conflictWith)` | แปลงวิชาในตาราง พร้อมรหัสวิชาที่ชนด้วย |
| `TimetableResponse.of(...)` | ประกอบตารางทั้งก้อน และคำนวณ `totalCredits` จากผลรวม `credits` ของ `entries` |

`TimeConflictResponse` และ `AddTimetableEntryRequest` สร้างผ่าน constructor ตรง ๆ ชื่อ entity (`Course`, `Section`, `ScheduleSlot`, `TimetableEntry`) ยืนยันแล้วใน US1-T06

**ต่างจากแผนภาพ (ปรับตอนทำ US1-T09):**

- `CourseResponse.from` รับ `sections` เพิ่ม เพราะ entity `Course` ไม่มี collection กลุ่มเรียน `CourseService` ส่งกลุ่มเรียนของภาคที่ค้นจาก `SectionRepository.findByCourseCodesAndTerm` มาให้ (ดู [DAO Class Diagram](../T06/US1-T06-DAO-Class-Diagram.md))
- เพิ่ม `ScheduleSlotResponse.fromAll` ให้ `SectionResponse` และ `TimetableEntryResponse` ใช้ร่วมกัน DB เก็บ `day_of_week` เป็นข้อความ ถ้าเรียงใน query จะได้ THURSDAY ก่อน TUESDAY
- `@JsonFormat(pattern = "HH:mm")` ใส่ทั้งเวลาใน `ScheduleSlotResponse` และ `overlapStart` / `overlapEnd` ของ `TimeConflictResponse` ตามตัวอย่าง JSON ใน DTO & API Spec
