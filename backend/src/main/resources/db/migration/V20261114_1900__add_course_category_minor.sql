-- เพิ่มหมวด MINOR (วิชาโท) ให้ course.category ตามที่ทีมตกลงใน US8-T09
-- วิชาที่เป็นวิชาโทอย่างเดียวของวิชาเอกวิทยาการคอมพิวเตอร์และสารสนเทศ เช่น CS345, CS373, CS224
-- ต้องตรงกับ enum CourseCategory (backend) และ type CourseCategory (frontend)

ALTER TABLE course DROP CONSTRAINT ck_course_category;

ALTER TABLE course ADD CONSTRAINT ck_course_category
    CHECK (category IN ('MAJOR', 'GENERAL_EDUCATION', 'FREE_ELECTIVE', 'MINOR'));
