-- ข้อมูลรายวิชาสำหรับ dev และทดสอบ US1 (Postman) ภาคเรียน 2568/1 มี 9 วิชา ตาม "พบ 9 รายวิชา" ใน Figma
--
-- 7 วิชาแรกตาม UI Prototype (ตารางที่มีวิชาชน 21 / 22 หน่วยกิต) ใช้ชื่อ รหัสกลุ่ม วัน เวลา และห้องตาม Prototype
-- CS180, MA211, CS111, LAS101, TU101, TU106, TU109
--
-- ข้อมูล seed                                  ใช้ทดสอบ
-- CS111 มี 2 กลุ่มเรียน (030001, 030002)        TC8 วิชาซ้ำคนละกลุ่ม → 409 COURSE_ALREADY_IN_TIMETABLE
-- MA211 อังคาร/พฤหัส 09:30–11:00                TC4 ต่อกับ CS111 030001 ที่เริ่ม 11:00 พอดี ไม่นับเป็นชน
-- TU109 และ LAS101 พุธ 09:30–12:30              TC5 เวลาชน (ยังเพิ่มได้ แต่มี conflicts)
-- 7 วิชาตาม Prototype รวม 21 หน่วยกิต           TC6 หลายวิชาแสดงถูกวันเวลา / TC7 เพิ่ม ST216 → 24 เกิน 22 → 409 CREDIT_LIMIT_EXCEEDED
-- JP171 หมวดเลือกเสรี                           ตัวกรองหมวดวิชามีครบทั้ง 3 หมวด
-- กลุ่มเรียนของ 2568/2 และ 2567/1               filter ปี/ภาคใน GET /api/courses (CS223 ต้องไม่โผล่ใน 2568/1)
-- ชื่ออาจารย์ภาษาไทย (ชื่อสมมติ)                 NVARCHAR
--
-- CS111 030002, ST216 และ JP171 ไม่อยู่ใน Prototype เพิ่มไว้ให้ครบเคสทดสอบ จัดเวลาไม่ให้ชนกับวิชาอื่น
-- นอกจาก TU109/LAS101 แล้ว คาบของกลุ่มเรียน 2568/1 ไม่ชนกัน

INSERT INTO course (course_code, course_name, category, credits) VALUES
    (N'CS180',  N'Introduction to User Interface and User Experience', 'MAJOR',             3),
    (N'MA211',  N'Calculus 1',                                         'MAJOR',             3),
    (N'CS111',  N'Object-Oriented Concepts',                           'MAJOR',             3),
    (N'LAS101', N'Critical Thinking, Reading, and Writing',            'GENERAL_EDUCATION', 3),
    (N'TU101',  N'Thailand, ASEAN, and the World',                     'GENERAL_EDUCATION', 3),
    (N'TU106',  N'Creativity and Communication',                       'GENERAL_EDUCATION', 3),
    (N'TU109',  N'Innovation and Entrepreneurial Mindset',             'GENERAL_EDUCATION', 3),
    (N'ST216',  N'Statistics for Social Science 1',                    'MAJOR',             3),
    (N'JP171',  N'Japanese 1',                                         'FREE_ELECTIVE',     3),
    -- เปิดเฉพาะ 2568/2 ใช้ตรวจว่า filter ภาคเรียนไม่ดึงวิชานี้มาใน 2568/1
    (N'CS223',  N'Computer Architecture',                              'MAJOR',             3);

INSERT INTO section (course_code, section_no, instructor, academic_year, semester) VALUES
    -- 2568/1 ตาม UI Prototype
    (N'CS180',  N'820001', N'อ.ดร.ปวีณา เลิศวิไล',        2568, 1),
    (N'MA211',  N'020001', N'รศ.ดร.ประเสริฐ มั่นคง',       2568, 1),
    (N'CS111',  N'030001', N'ผศ.ดร.สมชาย ใจดี',          2568, 1),
    (N'LAS101', N'780004', N'อ.พิมพ์ชนก บุญมา',            2568, 1),
    (N'TU101',  N'900001', N'อ.สุภาพร ทองดี',              2568, 1),
    (N'TU106',  N'540001', N'อ.ดร.กมลชนก ศิลปชัย',        2568, 1),
    (N'TU109',  N'780001', N'อ.ดร.ธนวัฒน์ รุ่งเรือง',       2568, 1),
    -- 2568/1 เพิ่มสำหรับทดสอบ
    (N'CS111',  N'030002', N'อ.ดร.วิไลวรรณ ศรีสุข',       2568, 1),
    (N'ST216',  N'040001', N'ผศ.ณัฐธิดา พรหมวงศ์',         2568, 1),
    (N'JP171',  N'920001', N'อ.ยูกิ ทานากะ',               2568, 1),
    -- ภาคเรียนอื่น: section_no 030001 ของ CS111 ซ้ำกับ 2568/1 ได้เพราะคนละภาค
    (N'CS111',  N'030001', N'ผศ.ดร.สมชาย ใจดี',          2568, 2),
    (N'CS223',  N'030001', N'อ.ดร.วิไลวรรณ ศรีสุข',       2568, 2),
    (N'MA211',  N'020001', N'รศ.ดร.ประเสริฐ มั่นคง',       2567, 1);

INSERT INTO schedule_slot (section_id, day_of_week, start_time, end_time, room)
SELECT s.section_id, v.day_of_week, v.start_time, v.end_time, v.room
FROM (VALUES
    -- 2568/1 ตาม UI Prototype
    (N'CS180',  N'820001', 2568, 1, 'MONDAY',    '13:30', '16:30', N'LC5-S202'),
    (N'MA211',  N'020001', 2568, 1, 'TUESDAY',   '09:30', '11:00', N'SC-3015'),
    (N'MA211',  N'020001', 2568, 1, 'THURSDAY',  '09:30', '11:00', N'SC-3015'),
    (N'CS111',  N'030001', 2568, 1, 'TUESDAY',   '11:00', '12:30', N'LC3-121'),
    (N'CS111',  N'030001', 2568, 1, 'THURSDAY',  '11:00', '12:30', N'LC3-121'),
    (N'LAS101', N'780004', 2568, 1, 'WEDNESDAY', '09:30', '12:30', N'SC-1026'),
    (N'TU101',  N'900001', 2568, 1, 'WEDNESDAY', '13:30', '16:30', N'SC-1058'),
    (N'TU106',  N'540001', 2568, 1, 'THURSDAY',  '13:30', '16:30', N'LC2-203'),
    (N'TU109',  N'780001', 2568, 1, 'WEDNESDAY', '09:30', '12:30', N'SC3-413'),
    -- 2568/1 เพิ่มสำหรับทดสอบ
    (N'CS111',  N'030002', 2568, 1, 'MONDAY',    '09:30', '11:00', N'LC3-122'),
    (N'CS111',  N'030002', 2568, 1, 'FRIDAY',    '09:30', '11:00', N'LC3-122'),
    (N'ST216',  N'040001', 2568, 1, 'TUESDAY',   '13:30', '16:30', N'SC2-105'),
    (N'JP171',  N'920001', 2568, 1, 'FRIDAY',    '13:30', '16:30', N'LC2-204'),
    -- ภาคเรียนอื่น
    (N'CS111',  N'030001', 2568, 2, 'MONDAY',    '09:30', '11:00', N'LC3-121'),
    (N'CS111',  N'030001', 2568, 2, 'WEDNESDAY', '09:30', '11:00', N'LC3-121'),
    (N'CS223',  N'030001', 2568, 2, 'TUESDAY',   '13:30', '16:30', N'SC3-216'),
    (N'MA211',  N'020001', 2567, 1, 'TUESDAY',   '09:30', '11:00', N'SC-3015'),
    (N'MA211',  N'020001', 2567, 1, 'THURSDAY',  '09:30', '11:00', N'SC-3015')
) AS v (course_code, section_no, academic_year, semester, day_of_week, start_time, end_time, room)
JOIN section s
    ON  s.course_code   = v.course_code
    AND s.section_no    = v.section_no
    AND s.academic_year = v.academic_year
    AND s.semester      = v.semester;
