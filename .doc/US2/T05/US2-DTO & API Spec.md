# US2 — DTO & API Spec: ลบวิชาจากตารางเรียนจำลอง

Oct 14, 2026 · @Termtem

## ภาพรวม

US2 ใช้ DTO ตารางเรียนจาก US1 ต่อ โดยไม่สร้าง `TimetableResponse` ใหม่

DTO ที่ใช้:
- `TimetableResponse`
- `TimetableEntryResponse`
- `TimeConflictResponse`
- `ScheduleSlotResponse`

หลังการลบทุก endpoint จะตอบ `TimetableResponse` ของตารางเรียนล่าสุด เพื่อให้ frontend อัปเดตตารางและจำนวนหน่วยกิตได้จากข้อมูลชุดเดียวกัน

## DTO ที่เพิ่มใน US2

### `DeleteTimetableEntriesRequest`

| Field | Type |
|---|---|
| entryIds | List<Long> |

ใช้รับ `entryId` ของวิชาที่ผู้ใช้เลือกสำหรับการลบหลายรายการ

## API Endpoints

| Method | Path | หน้าที่ |
|---|---|---|
| DELETE | `/api/timetable/entries/{entryId}` | ลบวิชา 1 รายการ |
| DELETE | `/api/timetable/entries` | ลบวิชาที่เลือกหลายรายการ |
| DELETE | `/api/timetable/entries/all` | ลบวิชาทั้งหมด |

## API Spec

### 1. ลบ 1 รายการ

`DELETE /api/timetable/entries/{entryId}`

- `entryId` — รหัสรายการวิชาที่ต้องการลบ
- เมื่อลบสำเร็จ ระบบส่งข้อมูลตารางเรียนล่าสุดกลับมา
- หากไม่พบรายการที่ต้องการลบ ให้แจ้งว่าไม่พบรายการดังกล่าว

### 2. ลบหลายรายการ

`DELETE /api/timetable/entries`

Request body:

```json
{
  "entryIds": [7, 8, 9]
}
```

- เมื่อลบสำเร็จ ระบบส่งข้อมูลตารางเรียนล่าสุดกลับมา
- หากมี `entryId` ใดไม่พบ ระบบจะไม่ลบรายการใดและแจ้งว่าไม่พบรายการดังกล่าว

### 3. ลบทั้งหมด

`DELETE /api/timetable/entries/all`

- ไม่ต้องส่งข้อมูลเพิ่มเติม
- เมื่อลบสำเร็จ ระบบส่งข้อมูลตารางเรียนล่าสุดกลับมา
