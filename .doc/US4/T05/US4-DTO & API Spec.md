# US4 — DTO & API Spec: ออกจากระบบ (Log-out)

## ภาพรวม

US4 เพิ่มความสามารถให้นักศึกษาสามารถออกจากระบบช่วยวางแผนตารางเรียนเมื่อสิ้นสุดการใช้งาน เพื่อรักษาความปลอดภัยและความเป็นส่วนตัวของข้อมูลแผนการเรียน

US4 ใช้ Authentication/Session ที่ออกแบบไว้ใน US3 โดยไม่สร้างระบบ Authentication หรือ Session ใหม่

US3 มี `POST /api/auth/login` สำหรับเข้าสู่ระบบ และเมื่อเข้าสู่ระบบสำเร็จจะตอบ `LoginResponse` ที่มี JWT Token สำหรับใช้ยืนยันตัวตนของผู้ใช้ในการเรียก API ต่อไป 

US3 ระบุว่า API ที่ใช้ข้อมูลของผู้ใช้ปัจจุบัน เช่น `GET /api/users/me` จะรับ JWT ผ่าน `Authorization: Bearer <token>` 

ดังนั้น US4 จึงเพิ่มเฉพาะ API สำหรับ Logout และ reuse Authentication/Session จาก US3

## Scope

US4 ครอบคลุม:

- การออกจากระบบด้วยปุ่ม Logout
- API สำหรับ Logout
- การใช้ Authentication/Session จาก US3
- การกลับไปหน้า Login หลัง Logout สำเร็จ
- การแจ้งข้อความเมื่อ Session หมดอายุและผู้ใช้ถูก Logout อัตโนมัติ

---

## Endpoints

| Method | Path | ใช้กับส่วนไหนของหน้า |
| --- | --- | --- |
| POST | `/api/auth/logout` | ปุ่ม "ออกจากระบบ" ในหน้าเมนูหลัก |

US4 เพิ่ม Endpoint ใหม่ภายใต้ `/api/auth` ซึ่งเป็น package เดียวกับ `POST /api/auth/login` ของ US3

---

## API Spec

### 1. POST /api/auth/logout — ออกจากระบบ

ใช้สำหรับออกจากระบบของผู้ใช้ที่ Authentication อยู่ในปัจจุบัน

### Request Header

| Param | ชนิด | บังคับ | ตัวอย่าง | มาจาก UI |
| --- | --- | --- | --- | --- |
| `Authorization` | string | ใช่ | `Bearer eyJhbGciOiJIUzI1NiIsInR...` | Authentication ของ Session ปัจจุบัน |

### Request Body

ไม่มี
