-- ชื่อ-นามสกุลภาษาไทยจาก displayname_th ของ TU API แสดงใน dropdown ของ Navbar
-- first_name / last_name เดิมเก็บชื่อภาษาอังกฤษจาก displayname_en

-- NULL ได้ เพราะแถวเดิมยังไม่มีค่าจนกว่าจะ login ใหม่
ALTER TABLE users ADD
    first_name_th NVARCHAR(100) NULL,
    last_name_th  NVARCHAR(100) NULL;
