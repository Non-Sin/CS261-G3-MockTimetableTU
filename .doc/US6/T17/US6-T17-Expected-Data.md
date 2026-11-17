# US6-T17 — Expected data ตาม seed ปัจจุบัน

T13 ระบุเองในหัวข้อ 3.1 ว่า seed มี 18 วิชาและอาจมีวิชาอื่นปน ตัวอย่างหลายแถวใช้ FR205/TH291/PY250 เพียง 3 วิชา รอบ T17 จึงใช้ T05 + seed จริงเป็นแหล่ง expected จำนวน/รายชื่อ แต่คงเงื่อนไขพฤติกรรมและ HTTP status ของ T13

แหล่งข้อมูล: `V20261116_1734__seed_electives.sql` และ sections/schedule_slot ของ migration/seed เดิม (รวม study plans) ของ source `79df2b8`; สำเนาข้อมูลอ่านจาก DB อยู่ใน [source-data.json](./evidence/source-data.json)

กติกา oracle: code prefix, English word prefix ที่คั่นด้วย space/hyphen, Thai substring; group ที่ระดับ course; semester/day/timeSlot/excludeConflicts ต้องผ่านใน Sec เดียว และ day/timeSlot ในคาบเดียว; เวลาใช้ startTime ใน [from,to); คาบต่อกันพอดีไม่ชน; excludeConflicts ตัดวิชาที่อยู่ในตารางและดูเฉพาะ currentSemester

| เคส / ขั้นตอน | Fixture | Params | Expected codes |
|---|---|---|---|
| 01 / 01-02-list.ax.txt | empty | `{}` | EG214, FR205, TH291, PY200, PY250, PY252, PY320, AN242, AN347, AS201, GE225, PB317, AT326, FD216, IS313, PC280, JC217, RE468 |
| 03 / 03-code-prefix.ax.txt | empty | `{"q": "py2"}` | PY200, PY250, PY252 |
| 04 / 04a-thai.ax.txt | empty | `{"q": "ฝรั่งเศส"}` | FR205 |
| 04 / 04b-english.ax.txt | empty | `{"q": "everyday"}` | FR205, FD216 |
| 04 / 04c-word-boundary.ax.txt | empty | `{"q": "DAY"}` | [] |
| 05 / 05-empty.ax.txt | empty | `{"q": "SA240"}` | [] |
| 06 / 06-reset-all.ax.txt | empty | `{}` | EG214, FR205, TH291, PY200, PY250, PY252, PY320, AN242, AN347, AS201, GE225, PB317, AT326, FD216, IS313, PC280, JC217, RE468 |
| 07 / 07-group.ax.txt | empty | `{"group": "PSYCHOLOGY"}` | PY200, PY250, PY252, PY320 |
| 08 / 08-semester.ax.txt | empty | `{"semester": 2}` | EG214, TH291, PY200, PY250, PY252, PY320, AN242, AN347, AS201, PB317, FD216, IS313, PC280 |
| 09 / 09a-evening.ax.txt | empty | `{"day": "TUESDAY", "timeSlot": "EVENING"}` | FR205 |
| 09 / 09b-afternoon.ax.txt | empty | `{"day": "THURSDAY", "timeSlot": "AFTERNOON"}` | EG214, TH291, PB317 |
| 10 / 10a-same-section.ax.txt | empty | `{"day": "TUESDAY", "timeSlot": "MORNING"}` | EG214, PY250, AT326, IS313 |
| 10 / 10b-combined.ax.txt | empty | `{"day": "TUESDAY", "timeSlot": "MORNING", "semester": 1}` | EG214, AT326, IS313 |
| 11 / 11-same-slot.ax.txt | empty | `{"day": "MONDAY", "timeSlot": "MORNING"}` | PY200, FD216, RE468 |
| 12 / 12-empty-timetable-filter.ax.txt | empty | `{"excludeConflicts": true}` | EG214, FR205, TH291, PY200, PY250, PY252, PY320, AS201, GE225, PB317, AT326, FD216, IS313, JC217, RE468 |
| 13 / 13-other-term.ax.txt | empty | `{"excludeConflicts": true, "semester": 2}` | [] |
| 14 / 14-after-delayed-response.ax.txt | empty | `{"q": "PY250", "excludeConflicts": true}` | PY250 |
| 15 / 15-tu100-conflict-filter.ax.txt | TU100 | `{"excludeConflicts": true}` | EG214, FR205, TH291, PY200, PY252, PY320, AS201, GE225, PB317, AT326, FD216, IS313, JC217, RE468 |
| 16 / 16-adjacent-slot-not-conflict.ax.txt | CS213 | `{"excludeConflicts": true}` | EG214, FR205, PY200, PY250, PY252, AS201, GE225, AT326, FD216, IS313, RE468 |
| 17 / 17-existing-course-filter.ax.txt | FR205 | `{"excludeConflicts": true}` | EG214, TH291, PY200, PY250, PY252, PY320, AS201, GE225, PB317, AT326, FD216, IS313, JC217, RE468 |

จุดต่างที่สำคัญจากตัวอย่าง T13: baseline 18 (ไม่ใช่ 3); py2 พบ 3 วิชา; everyday พบ FR205 และ FD216; PSYCHOLOGY มี 4 วิชา; semester=2 มี 13 วิชา; เปิด excludeConflicts กับตารางว่างได้ 15 (ไม่รวม AN242/AN347/PC280 ที่มีเฉพาะภาค 2)

UI ใช้ข้อความจำนวน `แสดงทั้งหมด N วิชาแนะนำ` ทั้งตอนค้นและไม่ค้น รอบนี้ตรวจ N และรายชื่อเทียบ T05/seed ไม่อ้างข้อความตัวอย่าง `แสดงผลลัพธ์ 1 วิชา` ที่ผูกกับ fixture 3 วิชาใน T13 เป็นข้อมูลปัจจุบัน

ผลต่างเชิงพฤติกรรม IT-22/26 และข้อความตามข้อตกลงทีม IT-33/36 ยังคงบันทึก FAIL ไม่ปรับ expected ให้ตาม implementation
