# US4 — DTO & API Spec: ออกจากระบบ (Log-out)

## ภาพรวม

US4 เพิ่มความสามารถให้นักศึกษาสามารถออกจากระบบช่วยวางแผนตารางเรียนเมื่อสิ้นสุดการใช้งาน เพื่อรักษาความปลอดภัยและความเป็นส่วนตัวของข้อมูลแผนการเรียน

US4 ใช้ Authentication/Session ที่ออกแบบไว้ใน US3 โดยไม่สร้างระบบ Authentication หรือ Session ใหม่

US3 มี `POST /api/auth/login` สำหรับเข้าสู่ระบบ และเมื่อเข้าสู่ระบบสำเร็จจะตอบ `LoginResponse` ที่มี JWT Token สำหรับใช้ยืนยันตัวตนของผู้ใช้ในการเรียก API ต่อไป

US3 ระบุว่า API ที่ใช้ข้อมูลของผู้ใช้ปัจจุบัน เช่น `GET /api/users/me` จะรับ JWT ผ่าน `Authorization: Bearer <token>`

ดังนั้น US4 จึงเพิ่มเฉพาะ API สำหรับ Logout และ reuse Authentication/Session จาก US3

**แนวทางที่เลือก: stateless** backend ไม่เก็บและไม่ยกเลิก (invalidate) token ฝั่ง server การออกจากระบบทำโดย Frontend ล้าง token และ authentication state ทิ้ง token เดิมจึงยังใช้ได้ทางเทคนิคจนกว่าจะหมดอายุเอง

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

### Response

| HTTP | เกิดเมื่อ | Response Body |
| --- | --- | --- |
| `204 No Content` | token ถูกต้อง และ backend ดำเนินการ Logout เสร็จ | ไม่มี |
| `401 Unauthorized` | ไม่มี token, token ไม่ถูกต้อง หรือหมดอายุ | `ProblemDetail` ตาม README |

- backend **ไม่ยกเลิก token** เมื่อตอบ `204` การออกจากระบบเกิดจาก Frontend ล้าง token
- ไม่มี `LoginResponse` หรือ DTO ใดๆ ใน Response ของ Logout

ตัวอย่าง Error Response 401:
```json
{
  "type": "about:blank",
  "title": "Unauthorized",
  "status": 401,
  "detail": "...",
  "instance": "/api/auth/logout"
}
```

> `detail` และโครงสร้างจริงของ `401` ขึ้นกับ Authentication ของ US3 ให้ตรวจกับ implementation อีกครั้ง

## พฤติกรรมฝั่ง Frontend

| สถานการณ์ | สิ่งที่ Frontend ทำ |
| --- | --- |
| Logout ได้ `204` | ล้าง token และ authentication state แล้วกลับหน้า Login |
| Logout ได้ `401` (token หมดอายุไปแล้ว) | ล้าง token และ authentication state แล้วกลับหน้า Login เหมือนกรณีสำเร็จ |
| API ใดๆ ได้ `401` ระหว่างใช้งาน (Session หมดอายุ) | ล้าง Session แล้วกลับหน้า Login พร้อมข้อความแจ้งว่า Session หมดอายุ ไม่เรียก Logout API |

## Authentication / Session

- US4 ไม่สร้าง Session หรือตารางใหม่ ไม่มี token blacklist
- ถ้าต้องการให้ token ใช้ไม่ได้ทันทีหลัง Logout ต้องเพิ่มกลไกฝั่ง server (เช่น denylist) ซึ่งอยู่นอกขอบเขตของ US4 นี้
