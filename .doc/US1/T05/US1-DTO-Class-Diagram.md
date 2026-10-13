# DTO Class Diagram

&#91;embedded content: DTO class diagram · 8 class พร้อม attribute และ method\]

ทุก DTO เป็น Java record ตามแบบ `ItemResponse` ที่มีอยู่ field เป็น `private final` (-) ส่วน accessor แบบ `public` (+) ของทุก field และ constructor ครบทุก field record สร้างให้อัตโนมัติ แผนภาพจึงวาดเฉพาะ static method ที่ออกแบบเอง (ขีดเส้นใต้) ไม่มีสมาชิก `protected` (#) เพราะ record สืบทอดไม่ได้

| Static method | หน้าที่ |
| --- | --- |
| `CourseResponse.from(course)` | แปลง entity วิชาพร้อมกลุ่มเรียนทุกกลุ่ม |
| `SectionResponse.from(section)` | แปลงกลุ่มเรียนพร้อมคาบเรียน |
| `ScheduleSlotResponse.from(slot)` | แปลงคาบเรียน 1 คาบ |
| `TimetableEntryResponse.from(entry, conflictWith)` | แปลงวิชาในตาราง พร้อมรหัสวิชาที่ชนด้วย |
| `TimetableResponse.of(...)` | ประกอบตารางทั้งก้อน และคำนวณ `totalCredits` จากผลรวม `credits` ของ `entries` |

`TimeConflictResponse` และ `AddTimetableEntryRequest` สร้างผ่าน constructor ตรง ๆ ชื่อ entity (`Course`, `Section`, `ScheduleSlot`, `TimetableEntry`) เป็นชื่อชั่วคราว ให้ยืนยันใน US1-T06
