# API Class Diagram

&#91;embedded content: API class diagram · controller, service, provider และ exception พร้อม field และ method\]

แผนภาพนี้วาด field และ method ที่ออกแบบเอง ไม่ได้วาด getter และ repository เพราะ repository เป็นงาน US1-T06 field ทุกตัวเป็น `private final` (-) ฉีดผ่าน constructor ด้วย `@RequiredArgsConstructor` ตามแบบ `ItemController` ส่วน private method 3 ตัวใน `TimetableService` คือกฎที่ `addEntry` เรียกตามลำดับ

`GlobalExceptionHandler` มีอยู่แล้ว `handleMethodArgumentNotValid` เป็น `protected` (#) เพราะ override จาก `ResponseEntityExceptionHandler` ส่วนที่ต้องเพิ่มใหม่คือ `handleBusinessRule` และ `BusinessRuleException` `DemoStudentProvider` คืนรหัสนักศึกษาจาก config ระหว่างที่ US3 ยังไม่เสร็จ พอมี login ค่อยเพิ่ม implementation ที่อ่านจาก session แทน
