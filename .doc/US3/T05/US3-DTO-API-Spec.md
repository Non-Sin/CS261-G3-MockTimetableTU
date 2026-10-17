# US3 — DTO & API Spec: เข้าสู่ระบบ (Log-in)

Oct 15, 2026 · @Elle

## ภาพรวม

US3 ใช้ 2 endpoint เพื่อจัดการ Authentication และ Session โดยผูกการตรวจสอบสิทธิ์กับ **TU Login API ของมหาวิทยาลัยธรรมศาสตร์** ออกแบบตาม Test Case ในการ์ด US3 โดยมี Business Rules ที่บังคับใช้ฝั่ง Backend:

- **จำกัดสิทธิ์ผู้ใช้งาน:** ให้เข้าใช้งานได้เฉพาะ "นักศึกษาสาขาวิทยาการคอมพิวเตอร์ ภาคปกติ" เท่านั้น (TC2)
- **ระบบป้องกัน:** หากล็อกอินผิดพลาดติดต่อกันครบ 5 ครั้ง จะระงับบัญชีเป็นเวลา 15 นาที เพื่อป้องกัน Brute-force Attack (TC6)
- **การแสดงผลหลัก:** หน้าเมนูหลักต้องดึงข้อมูล ชื่อ-นามสกุล และรหัสนักศึกษา ไปแสดงที่ Navbar มุมขวาบน (TC7)

## Endpoints

| Method | Path | ใช้กับส่วนไหนของหน้า |
| --- | --- | --- | 
| POST | `/api/auth/login` | ฟอร์มหน้า Login กดปุ่ม "เข้าสู่ระบบ (Login)" |
| GET | `/api/users/me` | ดึงข้อมูลแสดง Navbar มุมขวาบน (ชื่อ-นามสกุล, รหัสนักศึกษา) |

## API Spec

### 1. POST /api/auth/login — เข้าสู่ระบบ

| Param | ชนิด | บังคับ | ตัวอย่าง | มาจาก UI |
| --- | --- | --- | --- | --- |
| `username` | string | ใช่ | "6809610000" | ช่องชื่อผู้ใช้งาน |
| `password` | string | ใช่ | "my_secure_pass" | ช่องรหัสผ่าน |

ตอบ `200 OK` เป็น `LoginResponse` เมื่อระบบตรวจสอบกับ TU Login API สำเร็จ และผ่านเงื่อนไขเป็นนักศึกษา CS ภาคปกติ
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR..."
}
```

## Error และลำดับการตรวจ
POST /api/auth/login ปฏิเสธได้ 4 แบบ ตอบเป็น ProblemDetail ตาม README พร้อม property code เพิ่มเติม เพื่อให้ UI ดึงไปสลับ View State ตามการออกแบบหน้าจอ
| code | HTTP | เกิดเมื่อ | property ที่เพิ่ม |
| --- | --- | --- | --- |
| ACCOUNT_LOCKED | 429 | ใส่รหัสผิด 5 ครั้ง โดนระงับบัญชี (กันตั้งแต่เริ่มฟังก์ชัน ไม่ต้องยิง TU API) | retryAfterSeconds |
| INVALID_CREDENTIALS | 401 | TU Login API แจ้งว่า Username หรือ Password ไม่ถูกต้อง | - |
| NOT_CS_STUDENT | 403 | ตรวจสอบข้อมูลที่ได้รับจาก TU Login API แล้วพบว่า department ไม่ใช่ CS หรือ track ไม่ใช่ภาคปกติ | - |
| ACCOUNT_INACTIVE | 403 | บัญชี มธ. ไม่ได้อยู่ในสถานะ Active (TC1) | - |

## ลำดับการตรวจสอบใน AuthService.authenticate:

1. เช็คว่าบัญชีโดนแบนอยู่หรือไม่ด้วย loginAttemptService.isLocked(username) → ถ้าใช่ โยน 429 ACCOUNT_LOCKED
2. ยิง HTTP Request ตรวจสอบรหัสผ่านกับ TuApiClient
3. ถ้ารหัสผิด: สั่งบวก Attempt ด้วย loginFailed() (เช็คต่อว่าถ้าบวกแล้วครบ 5 ให้โยน 429 พร้อมเวลาที่ต้องรอ ถ้าไม่ถึงโยน 401 INVALID_CREDENTIALS)
4. ถ้ารหัสถูก: เคลียร์ Attempt ด้วย loginSucceeded()
5. เช็คสถานะบัญชีและสาขาด้วย verifyTuStudentStatus(tuResponse) → ถ้าบัญชีไม่ Active โยน 403 ACCOUNT_INACTIVE (TC1) แต่ถ้าไม่ใช่ CS ภาคปกติ โยน 403 NOT_CS_STUDENT (TC2)
6. Database Upsert: ตรวจสอบและบันทึกรหัสนักศึกษาลง Table User
7. สร้าง JWT Token และตอบ 200

ตัวอย่าง Error Response 429 (ACCOUNT_LOCKED):
```json
{
  "type": "about:blank",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "ระงับการเข้าสู่ระบบชั่วคราวเป็นเวลา 15 นาที เนื่องจากตรวจพบความพยายามเข้าสู่ระบบผิดพลาด 5 ครั้ง",
  "instance": "/api/auth/login",
  "code": "ACCOUNT_LOCKED",
  "retryAfterSeconds": 900
}
```

(UI ต้องอ่านค่า retryAfterSeconds ไปทำ Countdown Timer นาทีและวินาที)

## GET /api/users/me — ดึงข้อมูลผู้ใช้ปัจจุบัน
รับ JWT Token ผ่าน Header Authorization: Bearer <token>
ตอบ 200 OK เป็น UserProfileResponse
```json
{
  "studentId": "6809610000",
  "firstName": "Alysa",
  "lastName": "Liu"
}
```

## TypeScript types (frontend)
แยกไฟล์คู่กับ package ฝั่ง backend โครงสร้างคล้าย US1 เพื่อความเป็นระเบียบ

```ts
// frontend/features/auth/types.ts
export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  token: string;
};

// ใช้ Union type ป้องกันการพิมพ์ Code ผิดฝั่ง Frontend
export type AuthErrorCode = 
  | "INVALID_CREDENTIALS" 
  | "ACCOUNT_INACTIVE"
  | "NOT_CS_STUDENT" 
  | "ACCOUNT_LOCKED";

export type AuthErrorDetail = {
  title: string;
  status: number;
  detail: string;
  code: AuthErrorCode;
  retryAfterSeconds?: number;
};

// frontend/features/users/types.ts
export type UserProfileResponse = {
  studentId: string;
  firstName: string;
  lastName: string;
};
```