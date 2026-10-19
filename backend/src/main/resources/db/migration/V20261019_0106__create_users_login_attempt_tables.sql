-- ตารางนักศึกษาและการนับครั้งที่เข้าสู่ระบบผิดพลาด ตาม US3-T06 ER Diagram

-- ใช้ชื่อ users เพราะ USER เป็นคำสงวนของ SQL Server
CREATE TABLE users (
    student_id NVARCHAR(20)   NOT NULL,
    first_name NVARCHAR(100)  NOT NULL,
    last_name  NVARCHAR(100)  NOT NULL,
    department NVARCHAR(100)  NOT NULL,
    track      NVARCHAR(50)   NOT NULL,
    updated_at DATETIMEOFFSET NOT NULL,   -- เวลาซิงก์ข้อมูลจาก TU API ล่าสุด
    CONSTRAINT pk_users PRIMARY KEY (student_id)
);

-- ไม่ผูก FK กับ users เพราะ username ที่กรอกผิดอาจยังไม่เคย login สำเร็จ
-- และไม่เพิ่ม FK บน timetable.student_id ของ US1 เพื่อไม่ให้กระทบ test เดิม
CREATE TABLE login_attempt (
    username        NVARCHAR(50)   NOT NULL,
    failed_attempts INT            NOT NULL,
    locked_until    DATETIMEOFFSET NULL,       -- NULL = ไม่ถูกล็อก
    updated_at      DATETIMEOFFSET NOT NULL,
    CONSTRAINT pk_login_attempt PRIMARY KEY (username),
    CONSTRAINT ck_login_attempt_count CHECK (failed_attempts >= 0)
);
