-- US8-T09 ข้อมูลแผนการเรียน (preset) และวิชาโทของหลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ (ฉบับปรับปรุง พ.ศ. 2566)
-- วิชาเอกวิทยาการคอมพิวเตอร์และสารสนเทศ
--
-- แหล่งข้อมูล (สร้างไฟล์นี้ด้วยสคริปต์จากไฟล์ต้นทาง ไม่ได้พิมพ์เอง)
--   Year1&Year2.xlsx  ตารางเรียนปี 1–2 (แผนเดียว)
--   Year3&Year4.xlsx  ตารางเรียนปี 3–4 แผนหัวข้อพิเศษ ไม่เรียนวิชาโท / เรียนวิชาโท 4 วิชาโท
--   COOP.xlsx         ตารางเรียนปี 3–4 แผนสหกิจ ไม่เรียนวิชาโท / เรียนวิชาโท 4 วิชาโท
--   วิทยาการคอมพิวเตอร์_หลักสูตร_2566-V4_Edit_22_ต.ค.68.pdf  ชื่อวิชาภาษาอังกฤษ หมวดวิชา และวิชาโทที่ Excel ไม่มีข้อมูล
--
-- กติกาที่ใช้
--   * กลุ่มเรียนและคาบเรียนตาม Excel ภาคเรียนที่ 1 ของทุกชั้นปี = 2568/1 และภาคที่ 2 = 2568/2 (ทีมเลือกให้ Excel ทับ seed ของ US1
--     ในกลุ่มที่ชนกัน: ST216 040001 2568/1 และ CS111 030001 2568/2 และเพิ่ม CS223 040001 ใน 2568/1)
--   * หมวด: ศึกษาทั่วไป = GENERAL_EDUCATION, วิชาแกน/เฉพาะด้าน/เอก/บังคับนอกสาขา (EL395) = MAJOR,
--     วิชาที่เป็นวิชาโทอย่างเดียวของวิชาเอกนี้ = MINOR (migration V20261114_1900)
--   * วิชาของวิชาโทเก็บแยกตามแผน (plan_type) เพราะแผนสหกิจเรียน CS440 / CS371 / CS355 / CS341 ในปี 3/1 แทนปี 4/1
--   * CS371 เปิดเฉพาะภาค 2 (ทีมยืนยัน) จึงไม่สร้างกลุ่มเรียน 020001 ภาค 1 ตาม COOP.xlsx และยังไม่มีข้อมูลกลุ่มของภาค 2
--   * CS287, CS355, CS385 ไม่มีข้อมูลกลุ่มเรียนใน Excel ใส่ในวิชาโทตามเล่มหลักสูตร จัดตารางแล้วได้ NO_SECTION_AVAILABLE
--   * ปี 4 ภาค 1 แผนหัวข้อพิเศษมีแค่ CS403 เพราะ "เลือกเสรี 2 ตัว" ไม่ระบุรหัส · ปี 4 ภาค 2 ไม่มีแผน (วิชาเลือกเสรีอย่างเดียว)
--   * CS304 สหกิจศึกษา 1 อยู่ภาคฤดูร้อน ไม่อยู่ในขอบเขต (CHECK semester IN (1, 2))
--   * department ต้องตรงกับ users.department จาก TU API ไม่อย่างนั้นได้ plans: []
--   * ไม่ลบกลุ่มเรียนของ US1 ที่ไม่ชนกับ Excel เพราะ timetable_entry ในฐานข้อมูล dev อาจอ้างถึงอยู่

-- 1. รายวิชา (ชื่อตามเล่มหลักสูตร หน่วยกิตตาม Excel) เพิ่มเฉพาะวิชาที่ยังไม่มีใน seed ของ US1
INSERT INTO course (course_code, course_name, category, credits)
SELECT v.course_code, v.course_name, v.category, v.credits
FROM (VALUES
    (N'CS100', N'Basic Web Development', 'MAJOR', 3),
    (N'CS101', N'Discrete Structures', 'MAJOR', 3),
    (N'CS102', N'Problem Solving Basics and Computer Programming', 'MAJOR', 3),
    (N'CS111', N'Object-Oriented Concepts', 'MAJOR', 3),
    (N'CS180', N'Introduction to User Interface and User Experience', 'MAJOR', 3),
    (N'CS213', N'Data Structures', 'MAJOR', 3),
    (N'CS217', N'Design and Analysis of Algorithms', 'MAJOR', 3),
    (N'CS221', N'Introduction to Computer System and Organization', 'MAJOR', 3),
    (N'CS222', N'Operating Systems', 'MAJOR', 3),
    (N'CS223', N'Virtualization Technology', 'MAJOR', 3),
    (N'CS224', N'Linux Administration and Performance Monitoring', 'MINOR', 3),
    (N'CS232', N'Introduction to Cloud Computing Technology', 'MAJOR', 3),
    (N'CS240', N'Principles of Data Science', 'MAJOR', 3),
    (N'CS241', N'Programming Languages and Paradigms', 'MAJOR', 3),
    (N'CS242', N'Python Programming and Applications', 'MAJOR', 3),
    (N'CS246', N'Data Visualization', 'MINOR', 3),
    (N'CS251', N'Database Systems 1', 'MAJOR', 3),
    (N'CS261', N'Introduction to Software Engineering', 'MAJOR', 3),
    (N'CS271', N'Artificial Intelligence Fundamentals', 'MAJOR', 3),
    (N'CS287', N'Visual Design', 'MINOR', 3),
    (N'CS301', N'Preparation for Senior Projects and Co-operative Education', 'MAJOR', 3),
    (N'CS303', N'Special Projects 1', 'MAJOR', 2),
    (N'CS305', N'Social and Professional Ethics', 'MAJOR', 3),
    (N'CS314', N'Automata Theory', 'MAJOR', 3),
    (N'CS331', N'Net-Centric Computing', 'MAJOR', 3),
    (N'CS332', N'Computer System Security', 'MAJOR', 3),
    (N'CS341', N'Big Data Engineering', 'MINOR', 3),
    (N'CS342', N'Digital Marketing Technology and Analytics', 'MINOR', 3),
    (N'CS343', N'Applied Deep Learning', 'MINOR', 3),
    (N'CS345', N'Practical Machine Learning', 'MINOR', 3),
    (N'CS346', N'Big Data Applications and Analytics', 'MINOR', 3),
    (N'CS355', N'Digital Strategy and Transformation', 'MINOR', 3),
    (N'CS361', N'Cloud-Based Software Architecting', 'MINOR', 3),
    (N'CS365', N'DevOps Pipelines and Processes', 'MINOR', 3),
    (N'CS366', N'Microservices and Serverless Architectures', 'MINOR', 3),
    (N'CS370', N'Selected Topics in Artificial Intelligent Systems', 'MINOR', 3),
    (N'CS371', N'Artificial Intelligence in Practice', 'MINOR', 3),
    (N'CS372', N'Machine Learning', 'MAJOR', 3),
    (N'CS373', N'Advanced Search Strategies', 'MINOR', 3),
    (N'CS374', N'Natural Language Processing', 'MINOR', 3),
    (N'CS384', N'Human - Computer Interaction', 'MINOR', 3),
    (N'CS385', N'Digital Product and Service Design Project', 'MINOR', 3),
    (N'CS403', N'Special Projects 2', 'MAJOR', 4),
    (N'CS404', N'Co-operative Education 2', 'MAJOR', 4),
    (N'CS440', N'Selected Topics in Data Science', 'MINOR', 3),
    (N'EL105', N'English Communication Skills', 'GENERAL_EDUCATION', 3),
    (N'EL295', N'Academic English and Study Skills 1', 'GENERAL_EDUCATION', 3),
    (N'EL395', N'Academic English and Study Skills 2', 'MAJOR', 3),
    (N'LAS101', N'Critical Thinking, Reading, and Writing', 'GENERAL_EDUCATION', 3),
    (N'MA211', N'Calculus 1', 'MAJOR', 3),
    (N'ST216', N'Statistics for Social Science 1', 'MAJOR', 3),
    (N'ST329', N'Applied Probability and Statistical Models', 'MAJOR', 3),
    (N'TU100', N'Civic Engagement', 'GENERAL_EDUCATION', 3),
    (N'TU101', N'Thailand, ASEAN, and the World', 'GENERAL_EDUCATION', 3),
    (N'TU106', N'Creativity and Communication', 'GENERAL_EDUCATION', 3),
    (N'TU107', N'Digital Skill and Problem Solving', 'GENERAL_EDUCATION', 3),
    (N'TU108', N'Self-Development and Management', 'GENERAL_EDUCATION', 3),
    (N'TU109', N'Innovation and Entrepreneurial Mindset', 'GENERAL_EDUCATION', 3)
) AS v (course_code, course_name, category, credits)
WHERE NOT EXISTS (SELECT 1 FROM course c WHERE c.course_code = v.course_code);

-- seed ของ US1 ตั้งชื่อ CS223 เป็น Computer Architecture แต่เล่มหลักสูตร 2566 คือ Virtualization Technology
UPDATE course SET course_name = N'Virtualization Technology' WHERE course_code = N'CS223';

-- 2. กลุ่มเรียนตาม Excel: ภาคเรียนที่ 1 ของทุกชั้นปี = 2568/1, ภาคที่ 2 = 2568/2 (ข้อมูลต้นทางไม่มีชื่ออาจารย์)
INSERT INTO section (course_code, section_no, instructor, academic_year, semester)
SELECT v.course_code, v.section_no, NULL, v.academic_year, v.semester
FROM (VALUES
    (N'CS100', N'010001', 2568, 1),
    (N'CS101', N'020001', 2568, 1),
    (N'CS102', N'030001', 2568, 1),
    (N'CS213', N'050001', 2568, 1),
    (N'CS221', N'040001', 2568, 1),
    (N'CS223', N'040001', 2568, 1),
    (N'CS224', N'030001', 2568, 1),
    (N'CS240', N'870001', 2568, 1),
    (N'CS241', N'050001', 2568, 1),
    (N'CS261', N'100001', 2568, 1),
    (N'CS301', N'810001', 2568, 1),
    (N'CS331', N'070001', 2568, 1),
    (N'CS341', N'060001', 2568, 1),
    (N'CS345', N'030001', 2568, 1),
    (N'CS346', N'080001', 2568, 1),
    (N'CS361', N'900001', 2568, 1),
    (N'CS373', N'060001', 2568, 1),
    (N'CS374', N'030001', 2568, 1),
    (N'CS384', N'080001', 2568, 1),
    (N'CS403', N'000001', 2568, 1),
    (N'CS404', N'000001', 2568, 1),
    (N'CS440', N'810001', 2568, 1),
    (N'EL105', N'780001', 2568, 1),
    (N'EL295', N'780001', 2568, 1),
    (N'ST216', N'040001', 2568, 1),
    (N'ST329', N'090001', 2568, 1),
    (N'TU100', N'820001', 2568, 1),
    (N'TU107', N'000002', 2568, 1),
    (N'TU108', N'230001', 2568, 1),
    (N'TU108', N'910001', 2568, 1),
    (N'CS111', N'030001', 2568, 2),
    (N'CS180', N'820001', 2568, 2),
    (N'CS217', N'120001', 2568, 2),
    (N'CS222', N'100001', 2568, 2),
    (N'CS232', N'450001', 2568, 2),
    (N'CS242', N'060001', 2568, 2),
    (N'CS246', N'070001', 2568, 2),
    (N'CS251', N'090001', 2568, 2),
    (N'CS271', N'210001', 2568, 2),
    (N'CS301', N'810001', 2568, 2),
    (N'CS303', N'000001', 2568, 2),
    (N'CS305', N'090001', 2568, 2),
    (N'CS314', N'760001', 2568, 2),
    (N'CS332', N'670001', 2568, 2),
    (N'CS342', N'030001', 2568, 2),
    (N'CS343', N'080001', 2568, 2),
    (N'CS365', N'080001', 2568, 2),
    (N'CS366', N'100001', 2568, 2),
    (N'CS370', N'050001', 2568, 2),
    (N'CS372', N'040001', 2568, 2),
    (N'EL395', N'540001', 2568, 2),
    (N'LAS101', N'450001', 2568, 2),
    (N'MA211', N'020001', 2568, 2),
    (N'TU101', N'900001', 2568, 2),
    (N'TU106', N'540001', 2568, 2),
    (N'TU109', N'780001', 2568, 2)
) AS v (course_code, section_no, academic_year, semester)
WHERE NOT EXISTS (SELECT 1 FROM section s
                  WHERE s.course_code = v.course_code AND s.section_no = v.section_no
                    AND s.academic_year = v.academic_year AND s.semester = v.semester);

-- กลุ่มที่มีอยู่แล้วใน seed ของ US1 แต่เวลาไม่ตรง Excel: ลบคาบเดิมแล้วใส่ตาม Excel ในข้อ 3
-- ST216 040001 2568/1 (เดิม อ. 13:30–16:30) และ CS111 030001 2568/2 (เดิม จ./พ. 09:30–11:00 ชนกับ TU109 ของแผนปี 1/2)
DELETE ss FROM schedule_slot ss
JOIN section s ON s.section_id = ss.section_id
WHERE (s.course_code = N'ST216' AND s.section_no = N'040001' AND s.academic_year = 2568 AND s.semester = 1)
   OR (s.course_code = N'CS111' AND s.section_no = N'030001' AND s.academic_year = 2568 AND s.semester = 2);

-- 3. คาบเรียน (ข้อมูลต้นทางไม่มีห้อง) กลุ่มที่ไม่มีคาบ: TU107 000002 (e-learning), CS303, CS403, CS404 000001
INSERT INTO schedule_slot (section_id, day_of_week, start_time, end_time, room)
SELECT s.section_id, v.day_of_week, v.start_time, v.end_time, NULL
FROM (VALUES
    (N'CS100', N'010001', 1, 'TUESDAY', '08:00', '09:30'),
    (N'CS100', N'010001', 1, 'THURSDAY', '08:00', '09:30'),
    (N'CS101', N'020001', 1, 'TUESDAY', '09:30', '11:00'),
    (N'CS101', N'020001', 1, 'THURSDAY', '09:30', '11:00'),
    (N'CS102', N'030001', 1, 'TUESDAY', '11:00', '12:30'),
    (N'CS102', N'030001', 1, 'THURSDAY', '11:00', '12:30'),
    (N'CS213', N'050001', 1, 'TUESDAY', '15:00', '16:30'),
    (N'CS213', N'050001', 1, 'THURSDAY', '15:00', '16:30'),
    (N'CS221', N'040001', 1, 'TUESDAY', '13:30', '15:00'),
    (N'CS221', N'040001', 1, 'THURSDAY', '13:30', '15:00'),
    (N'CS223', N'040001', 1, 'TUESDAY', '13:30', '15:00'),
    (N'CS223', N'040001', 1, 'THURSDAY', '13:30', '15:00'),
    (N'CS224', N'030001', 1, 'TUESDAY', '11:00', '12:30'),
    (N'CS224', N'030001', 1, 'THURSDAY', '11:00', '12:30'),
    (N'CS240', N'870001', 1, 'FRIDAY', '09:30', '12:30'),
    (N'CS241', N'050001', 1, 'TUESDAY', '15:00', '16:30'),
    (N'CS241', N'050001', 1, 'THURSDAY', '15:00', '16:30'),
    (N'CS261', N'100001', 1, 'WEDNESDAY', '15:00', '16:30'),
    (N'CS261', N'100001', 1, 'FRIDAY', '15:00', '16:30'),
    (N'CS301', N'810001', 1, 'MONDAY', '09:30', '12:30'),
    (N'CS331', N'070001', 1, 'WEDNESDAY', '09:30', '11:00'),
    (N'CS331', N'070001', 1, 'FRIDAY', '09:30', '11:00'),
    (N'CS341', N'060001', 1, 'WEDNESDAY', '08:00', '09:30'),
    (N'CS341', N'060001', 1, 'FRIDAY', '08:00', '09:30'),
    (N'CS345', N'030001', 1, 'TUESDAY', '11:00', '12:30'),
    (N'CS345', N'030001', 1, 'THURSDAY', '11:00', '12:30'),
    (N'CS346', N'080001', 1, 'WEDNESDAY', '11:00', '12:30'),
    (N'CS346', N'080001', 1, 'FRIDAY', '11:00', '12:30'),
    (N'CS361', N'900001', 1, 'WEDNESDAY', '13:30', '16:30'),
    (N'CS373', N'060001', 1, 'WEDNESDAY', '08:00', '09:30'),
    (N'CS373', N'060001', 1, 'FRIDAY', '08:00', '09:30'),
    (N'CS374', N'030001', 1, 'TUESDAY', '11:00', '12:30'),
    (N'CS374', N'030001', 1, 'THURSDAY', '11:00', '12:30'),
    (N'CS384', N'080001', 1, 'WEDNESDAY', '11:00', '12:30'),
    (N'CS384', N'080001', 1, 'FRIDAY', '11:00', '12:30'),
    (N'CS440', N'810001', 1, 'MONDAY', '09:30', '12:30'),
    (N'EL105', N'780001', 1, 'WEDNESDAY', '09:30', '12:30'),
    (N'EL295', N'780001', 1, 'WEDNESDAY', '09:30', '12:30'),
    (N'ST216', N'040001', 1, 'TUESDAY', '13:30', '15:00'),
    (N'ST216', N'040001', 1, 'THURSDAY', '13:30', '15:00'),
    (N'ST329', N'090001', 1, 'WEDNESDAY', '13:30', '15:00'),
    (N'ST329', N'090001', 1, 'FRIDAY', '13:30', '15:00'),
    (N'TU100', N'820001', 1, 'MONDAY', '13:30', '16:30'),
    (N'TU108', N'230001', 1, 'TUESDAY', '09:30', '12:30'),
    (N'TU108', N'910001', 1, 'FRIDAY', '13:30', '16:30'),
    (N'CS111', N'030001', 2, 'TUESDAY', '11:00', '12:30'),
    (N'CS111', N'030001', 2, 'THURSDAY', '11:00', '12:30'),
    (N'CS180', N'820001', 2, 'MONDAY', '13:30', '16:30'),
    (N'CS217', N'120001', 2, 'MONDAY', '08:00', '11:00'),
    (N'CS222', N'100001', 2, 'WEDNESDAY', '15:00', '16:30'),
    (N'CS222', N'100001', 2, 'FRIDAY', '15:00', '16:30'),
    (N'CS232', N'450001', 2, 'TUESDAY', '13:30', '16:30'),
    (N'CS242', N'060001', 2, 'WEDNESDAY', '08:00', '09:30'),
    (N'CS242', N'060001', 2, 'FRIDAY', '08:00', '09:30'),
    (N'CS246', N'070001', 2, 'WEDNESDAY', '09:30', '11:00'),
    (N'CS246', N'070001', 2, 'FRIDAY', '09:30', '11:00'),
    (N'CS251', N'090001', 2, 'WEDNESDAY', '13:30', '15:00'),
    (N'CS251', N'090001', 2, 'FRIDAY', '13:30', '15:00'),
    (N'CS271', N'210001', 2, 'THURSDAY', '08:00', '11:00'),
    (N'CS301', N'810001', 2, 'MONDAY', '09:30', '12:30'),
    (N'CS305', N'090001', 2, 'WEDNESDAY', '13:30', '15:00'),
    (N'CS305', N'090001', 2, 'FRIDAY', '13:30', '15:00'),
    (N'CS314', N'760001', 2, 'FRIDAY', '08:00', '11:00'),
    (N'CS332', N'670001', 2, 'WEDNESDAY', '08:00', '11:00'),
    (N'CS342', N'030001', 2, 'TUESDAY', '11:00', '12:30'),
    (N'CS342', N'030001', 2, 'THURSDAY', '11:00', '12:30'),
    (N'CS343', N'080001', 2, 'WEDNESDAY', '11:00', '12:30'),
    (N'CS343', N'080001', 2, 'FRIDAY', '11:00', '12:30'),
    (N'CS365', N'080001', 2, 'WEDNESDAY', '11:00', '12:30'),
    (N'CS365', N'080001', 2, 'FRIDAY', '11:00', '12:30'),
    (N'CS366', N'100001', 2, 'WEDNESDAY', '15:00', '16:30'),
    (N'CS366', N'100001', 2, 'FRIDAY', '15:00', '16:30'),
    (N'CS370', N'050001', 2, 'TUESDAY', '15:00', '16:30'),
    (N'CS370', N'050001', 2, 'THURSDAY', '15:00', '16:30'),
    (N'CS372', N'040001', 2, 'TUESDAY', '13:30', '15:00'),
    (N'CS372', N'040001', 2, 'THURSDAY', '13:30', '15:00'),
    (N'EL395', N'540001', 2, 'THURSDAY', '13:30', '16:30'),
    (N'LAS101', N'450001', 2, 'TUESDAY', '13:30', '16:30'),
    (N'MA211', N'020001', 2, 'TUESDAY', '09:30', '11:00'),
    (N'MA211', N'020001', 2, 'THURSDAY', '09:30', '11:00'),
    (N'TU101', N'900001', 2, 'WEDNESDAY', '13:30', '16:30'),
    (N'TU106', N'540001', 2, 'THURSDAY', '13:30', '16:30'),
    (N'TU109', N'780001', 2, 'WEDNESDAY', '09:30', '12:30')
) AS v (course_code, section_no, semester, day_of_week, start_time, end_time)
JOIN section s ON s.course_code = v.course_code AND s.section_no = v.section_no
               AND s.academic_year = 2568 AND s.semester = v.semester
WHERE NOT EXISTS (SELECT 1 FROM schedule_slot x
                  WHERE x.section_id = s.section_id AND x.day_of_week = v.day_of_week AND x.start_time = v.start_time);

-- 4. แผนการเรียน: ปี 1–2 plan_type = NULL · ปี 4 ภาค 2 มีแต่วิชาเลือกเสรี (ไม่ระบุรหัส) จึงไม่มีแผน
INSERT INTO study_plan (department, curriculum_name, study_year, semester, plan_type) VALUES
    (N'ภาควิชาวิทยาการคอมพิวเตอร์', N'หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ (ฉบับปรับปรุง พ.ศ. 2566)', 1, 1, NULL),
    (N'ภาควิชาวิทยาการคอมพิวเตอร์', N'หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ (ฉบับปรับปรุง พ.ศ. 2566)', 1, 2, NULL),
    (N'ภาควิชาวิทยาการคอมพิวเตอร์', N'หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ (ฉบับปรับปรุง พ.ศ. 2566)', 2, 1, NULL),
    (N'ภาควิชาวิทยาการคอมพิวเตอร์', N'หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ (ฉบับปรับปรุง พ.ศ. 2566)', 2, 2, NULL),
    (N'ภาควิชาวิทยาการคอมพิวเตอร์', N'หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ (ฉบับปรับปรุง พ.ศ. 2566)', 3, 1, 'CO_OP'),
    (N'ภาควิชาวิทยาการคอมพิวเตอร์', N'หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ (ฉบับปรับปรุง พ.ศ. 2566)', 3, 1, 'SPECIAL_PROJECT'),
    (N'ภาควิชาวิทยาการคอมพิวเตอร์', N'หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ (ฉบับปรับปรุง พ.ศ. 2566)', 3, 2, 'CO_OP'),
    (N'ภาควิชาวิทยาการคอมพิวเตอร์', N'หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ (ฉบับปรับปรุง พ.ศ. 2566)', 3, 2, 'SPECIAL_PROJECT'),
    (N'ภาควิชาวิทยาการคอมพิวเตอร์', N'หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ (ฉบับปรับปรุง พ.ศ. 2566)', 4, 1, 'CO_OP'),
    (N'ภาควิชาวิทยาการคอมพิวเตอร์', N'หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ (ฉบับปรับปรุง พ.ศ. 2566)', 4, 1, 'SPECIAL_PROJECT');

-- วิชาในแผน sort_order ตามลำดับที่อ่านจาก Excel (วิชาที่ไม่มีคาบก่อน แล้วไล่วันจันทร์ → ศุกร์ ซ้าย → ขวา)
INSERT INTO study_plan_course (plan_id, course_code, sort_order)
SELECT p.plan_id, v.course_code, v.sort_order
FROM (VALUES
    (1, 1, NULL, N'TU107', 1),
    (1, 1, NULL, N'TU100', 2),
    (1, 1, NULL, N'CS100', 3),
    (1, 1, NULL, N'CS101', 4),
    (1, 1, NULL, N'CS102', 5),
    (1, 1, NULL, N'ST216', 6),
    (1, 1, NULL, N'EL105', 7),
    (1, 2, NULL, N'CS180', 1),
    (1, 2, NULL, N'MA211', 2),
    (1, 2, NULL, N'CS111', 3),
    (1, 2, NULL, N'LAS101', 4),
    (1, 2, NULL, N'TU109', 5),
    (1, 2, NULL, N'TU101', 6),
    (1, 2, NULL, N'TU106', 7),
    (2, 1, NULL, N'CS221', 1),
    (2, 1, NULL, N'CS213', 2),
    (2, 1, NULL, N'EL295', 3),
    (2, 1, NULL, N'ST329', 4),
    (2, 1, NULL, N'CS261', 5),
    (2, 1, NULL, N'CS240', 6),
    (2, 2, NULL, N'CS217', 1),
    (2, 2, NULL, N'CS232', 2),
    (2, 2, NULL, N'CS242', 3),
    (2, 2, NULL, N'CS251', 4),
    (2, 2, NULL, N'CS222', 5),
    (2, 2, NULL, N'CS271', 6),
    (2, 2, NULL, N'EL395', 7),
    (3, 1, 'CO_OP', N'TU108', 1),
    (3, 1, 'CO_OP', N'CS223', 2),
    (3, 1, 'CO_OP', N'CS241', 3),
    (3, 1, 'CO_OP', N'CS331', 4),
    (3, 1, 'SPECIAL_PROJECT', N'CS301', 1),
    (3, 1, 'SPECIAL_PROJECT', N'TU108', 2),
    (3, 1, 'SPECIAL_PROJECT', N'CS223', 3),
    (3, 1, 'SPECIAL_PROJECT', N'CS241', 4),
    (3, 1, 'SPECIAL_PROJECT', N'CS331', 5),
    (3, 2, 'CO_OP', N'CS301', 1),
    (3, 2, 'CO_OP', N'CS372', 2),
    (3, 2, 'CO_OP', N'CS332', 3),
    (3, 2, 'CO_OP', N'CS305', 4),
    (3, 2, 'CO_OP', N'CS314', 5),
    (3, 2, 'SPECIAL_PROJECT', N'CS303', 1),
    (3, 2, 'SPECIAL_PROJECT', N'CS372', 2),
    (3, 2, 'SPECIAL_PROJECT', N'CS332', 3),
    (3, 2, 'SPECIAL_PROJECT', N'CS305', 4),
    (3, 2, 'SPECIAL_PROJECT', N'CS314', 5),
    (4, 1, 'CO_OP', N'CS404', 1),
    (4, 1, 'SPECIAL_PROJECT', N'CS403', 1)
) AS v (study_year, semester, plan_type, course_code, sort_order)
JOIN study_plan p ON p.department = N'ภาควิชาวิทยาการคอมพิวเตอร์' AND p.curriculum_name = N'หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ (ฉบับปรับปรุง พ.ศ. 2566)'
                 AND p.study_year = v.study_year AND p.semester = v.semester
                 AND (p.plan_type = v.plan_type OR (p.plan_type IS NULL AND v.plan_type IS NULL));

-- 5. วิชาโท (ลำดับปุ่มตามลำดับใน Excel)
INSERT INTO study_minor (department, curriculum_name, minor_name, sort_order) VALUES
    (N'ภาควิชาวิทยาการคอมพิวเตอร์', N'หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ (ฉบับปรับปรุง พ.ศ. 2566)', N'วิทยาการข้อมูล', 1),
    (N'ภาควิชาวิทยาการคอมพิวเตอร์', N'หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ (ฉบับปรับปรุง พ.ศ. 2566)', N'ปัญญาประดิษฐ์', 2),
    (N'ภาควิชาวิทยาการคอมพิวเตอร์', N'หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ (ฉบับปรับปรุง พ.ศ. 2566)', N'การออกแบบและพัฒนาผลิตภัณฑ์ดิจิทัล', 3),
    (N'ภาควิชาวิทยาการคอมพิวเตอร์', N'หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ (ฉบับปรับปรุง พ.ศ. 2566)', N'เดฟออปส์', 4);

-- วิชาของวิชาโท = วิชาในตาราง "เรียนวิชาโท" ที่ไม่อยู่ในตาราง "ไม่เรียนวิชาโท" ของแผนและภาคเดียวกัน
-- บวกวิชาที่ Excel ระบุว่าไม่มีข้อมูล (CS287, CS355, CS385) และ CS371 (เปิดเฉพาะภาค 2) ตามเล่มหลักสูตร
INSERT INTO study_minor_course (minor_id, course_code, plan_type, study_year, semester, sort_order)
SELECT m.minor_id, v.course_code, v.plan_type, v.study_year, v.semester, v.sort_order
FROM (VALUES
    (N'วิทยาการข้อมูล', 'SPECIAL_PROJECT', 3, 1, N'CS345', 1),
    (N'วิทยาการข้อมูล', 'SPECIAL_PROJECT', 3, 1, N'CS346', 2),
    (N'วิทยาการข้อมูล', 'SPECIAL_PROJECT', 3, 2, N'CS246', 1),
    (N'วิทยาการข้อมูล', 'SPECIAL_PROJECT', 3, 2, N'CS343', 2),
    (N'วิทยาการข้อมูล', 'SPECIAL_PROJECT', 4, 1, N'CS440', 1),
    (N'วิทยาการข้อมูล', 'CO_OP', 3, 1, N'CS440', 1),
    (N'วิทยาการข้อมูล', 'CO_OP', 3, 1, N'CS345', 2),
    (N'วิทยาการข้อมูล', 'CO_OP', 3, 1, N'CS346', 3),
    (N'วิทยาการข้อมูล', 'CO_OP', 3, 2, N'CS246', 1),
    (N'วิทยาการข้อมูล', 'CO_OP', 3, 2, N'CS343', 2),
    (N'ปัญญาประดิษฐ์', 'SPECIAL_PROJECT', 3, 1, N'CS374', 1),
    (N'ปัญญาประดิษฐ์', 'SPECIAL_PROJECT', 3, 1, N'CS373', 2),
    (N'ปัญญาประดิษฐ์', 'SPECIAL_PROJECT', 3, 2, N'CS370', 1),
    (N'ปัญญาประดิษฐ์', 'SPECIAL_PROJECT', 3, 2, N'CS343', 2),
    (N'ปัญญาประดิษฐ์', 'SPECIAL_PROJECT', 4, 1, N'CS371', 1),
    (N'ปัญญาประดิษฐ์', 'CO_OP', 3, 1, N'CS371', 1),
    (N'ปัญญาประดิษฐ์', 'CO_OP', 3, 1, N'CS374', 2),
    (N'ปัญญาประดิษฐ์', 'CO_OP', 3, 1, N'CS373', 3),
    (N'ปัญญาประดิษฐ์', 'CO_OP', 3, 2, N'CS370', 1),
    (N'ปัญญาประดิษฐ์', 'CO_OP', 3, 2, N'CS343', 2),
    (N'การออกแบบและพัฒนาผลิตภัณฑ์ดิจิทัล', 'SPECIAL_PROJECT', 3, 1, N'CS384', 1),
    (N'การออกแบบและพัฒนาผลิตภัณฑ์ดิจิทัล', 'SPECIAL_PROJECT', 3, 1, N'CS287', 2),
    (N'การออกแบบและพัฒนาผลิตภัณฑ์ดิจิทัล', 'SPECIAL_PROJECT', 3, 2, N'CS342', 1),
    (N'การออกแบบและพัฒนาผลิตภัณฑ์ดิจิทัล', 'SPECIAL_PROJECT', 3, 2, N'CS385', 2),
    (N'การออกแบบและพัฒนาผลิตภัณฑ์ดิจิทัล', 'SPECIAL_PROJECT', 4, 1, N'CS355', 1),
    (N'การออกแบบและพัฒนาผลิตภัณฑ์ดิจิทัล', 'CO_OP', 3, 1, N'CS384', 1),
    (N'การออกแบบและพัฒนาผลิตภัณฑ์ดิจิทัล', 'CO_OP', 3, 1, N'CS287', 2),
    (N'การออกแบบและพัฒนาผลิตภัณฑ์ดิจิทัล', 'CO_OP', 3, 1, N'CS355', 3),
    (N'การออกแบบและพัฒนาผลิตภัณฑ์ดิจิทัล', 'CO_OP', 3, 2, N'CS342', 1),
    (N'การออกแบบและพัฒนาผลิตภัณฑ์ดิจิทัล', 'CO_OP', 3, 2, N'CS385', 2),
    (N'เดฟออปส์', 'SPECIAL_PROJECT', 3, 1, N'CS224', 1),
    (N'เดฟออปส์', 'SPECIAL_PROJECT', 3, 1, N'CS361', 2),
    (N'เดฟออปส์', 'SPECIAL_PROJECT', 3, 2, N'CS365', 1),
    (N'เดฟออปส์', 'SPECIAL_PROJECT', 3, 2, N'CS366', 2),
    (N'เดฟออปส์', 'SPECIAL_PROJECT', 4, 1, N'CS341', 1),
    (N'เดฟออปส์', 'CO_OP', 3, 1, N'CS224', 1),
    (N'เดฟออปส์', 'CO_OP', 3, 1, N'CS341', 2),
    (N'เดฟออปส์', 'CO_OP', 3, 1, N'CS361', 3),
    (N'เดฟออปส์', 'CO_OP', 3, 2, N'CS365', 1),
    (N'เดฟออปส์', 'CO_OP', 3, 2, N'CS366', 2)
) AS v (minor_name, plan_type, study_year, semester, course_code, sort_order)
JOIN study_minor m ON m.department = N'ภาควิชาวิทยาการคอมพิวเตอร์' AND m.curriculum_name = N'หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ (ฉบับปรับปรุง พ.ศ. 2566)' AND m.minor_name = v.minor_name;
