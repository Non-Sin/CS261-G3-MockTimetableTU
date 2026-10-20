# US3 — DTO & API Spec: เข้าสู่ระบบ (Log-in)

Oct 15, 2026 · @Elle

> แก้ไข Oct 19, 2026 (US3-T08) ตาม response จริงของ TU Login API: เพิ่ม error `TU_API_UNAVAILABLE` (503), เงื่อนไข `NOT_CS_STUDENT` ตาม field ที่ TU API มีจริง (ตรวจภาคพิเศษจากหลักที่ 5–6 ของรหัสนักศึกษา) และ 401 ของ `GET /api/users/me`

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
POST /api/auth/login ปฏิเสธได้ 5 แบบ ตอบเป็น ProblemDetail ตาม README พร้อม property code เพิ่มเติม เพื่อให้ UI ดึงไปสลับ View State ตามการออกแบบหน้าจอ (body ไม่ครบตอบ 400 พร้อม `errors` เหมือน endpoint อื่น)
| code | HTTP | เกิดเมื่อ | property ที่เพิ่ม |
| --- | --- | --- | --- |
| ACCOUNT_LOCKED | 429 | ใส่รหัสผิด 5 ครั้ง โดนระงับบัญชี (กันตั้งแต่เริ่มฟังก์ชัน ไม่ต้องยิง TU API) | retryAfterSeconds |
| INVALID_CREDENTIALS | 401 | TU Login API แจ้งว่า Username หรือ Password ไม่ถูกต้อง (หรือไม่มีบัญชีนี้) | - |
| NOT_CS_STUDENT | 403 | ข้อมูลจาก TU Login API มี `type` ไม่ใช่ `student` หรือ `department` ไม่ใช่ `ภาควิชาวิทยาการคอมพิวเตอร์` หรือเป็นภาคพิเศษ (TU API ไม่มี field บอกภาค จึงดูจากหลักที่ 5–6 ของรหัสนักศึกษา `65` = ภาคพิเศษ เช่น `680965xxxx` เป็นทางแก้ชั่วคราว) | - |
| ACCOUNT_INACTIVE | 403 | `tu_status` ของบัญชี มธ. ไม่ใช่ `ปกติ` เช่น พักการศึกษา, ลาออก (TC1) | - |
| TU_API_UNAVAILABLE | 503 | เรียก TU Login API ไม่สำเร็จ (Application-Key ผิด, timeout, 5xx) ไม่นับเป็นการใส่รหัสผิด | - |

### TU Login API ที่ backend เรียก

`POST https://restapi.tu.ac.th/api/v1/auth/Ad/verify` header `Application-Key` (env `TU_API_APPLICATION_KEY`) body `{"UserName": "...", "PassWord": "..."}`

| TU API ตอบ | ระบบเราถือว่า |
| --- | --- |
| 200 + `status: true` (มี `type`, `username`, `tu_status`, `displayname_th`, `displayname_en`, `department`, `faculty`) | รหัสถูก ตรวจสถานะต่อ |
| 400 + `status: false` + `message: "Users or Password Invalid!"` | รหัสผิดหรือไม่มีบัญชี → นับ attempt |
| `status: false` + `error` (Application-Key ผิด), 5xx, timeout | `503 TU_API_UNAVAILABLE` |

ตอน dev/Postman รัน backend ด้วย profile `stub-tu` จะใช้ TU API ปลอมที่ไม่ต้องมี Application-Key

## ลำดับการตรวจสอบใน AuthService.authenticate:

1. เช็คว่าบัญชีโดนแบนอยู่หรือไม่ด้วย loginAttemptService.isLocked(username) → ถ้าใช่ โยน 429 ACCOUNT_LOCKED
2. ยิง HTTP Request ตรวจสอบรหัสผ่านกับ TuApiClient → ถ้า TU API ใช้งานไม่ได้ โยน 503 TU_API_UNAVAILABLE (ไม่นับ Attempt)
3. ถ้ารหัสผิด: สั่งบวก Attempt ด้วย loginFailed() (เช็คต่อว่าถ้าบวกแล้วครบ 5 ให้โยน 429 พร้อมเวลาที่ต้องรอ ถ้าไม่ถึงโยน 401 INVALID_CREDENTIALS)
4. ถ้ารหัสถูก: เคลียร์ Attempt ด้วย loginSucceeded()
5. เช็คสถานะบัญชีและสาขาด้วย verifyTuStudentStatus(tuResponse) → ถ้าบัญชีไม่ Active โยน 403 ACCOUNT_INACTIVE (TC1) แต่ถ้าไม่ใช่นักศึกษา CS หรือเป็นภาคพิเศษ (หลักที่ 5–6 ของรหัสเป็น `65`) โยน 403 NOT_CS_STUDENT (TC2)
6. Database Upsert: บันทึกรหัสนักศึกษา ชื่อ-นามสกุล (แยกจาก `displayname_en` ที่ช่องว่างแรก) และสาขาลง Table `users`
7. สร้าง JWT Token และตอบ 200

ตัวอย่าง Error Response 429 (ACCOUNT_LOCKED):
```json
{
  "type": "about:blank",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "ระงับการเข้าสู่ระบบชั่วคราว เนื่องจากเข้าสู่ระบบผิดพลาดติดต่อกันหลายครั้ง กรุณาลองใหม่ในอีก 15 นาที",
  "instance": "/api/auth/login",
  "code": "ACCOUNT_LOCKED",
  "retryAfterSeconds": 900
}
```

(UI ต้องอ่านค่า retryAfterSeconds ไปทำ Countdown Timer นาทีและวินาที ถ้าล็อกอยู่แล้วตั้งแต่ก่อน request ค่าจะเป็นเวลาที่เหลือจริง เช่น 600 และ detail บอกนาทีที่เหลือ)

## GET /api/users/me — ดึงข้อมูลผู้ใช้ปัจจุบัน
รับ JWT Token ผ่าน Header Authorization: Bearer <token>
ตอบ 200 OK เป็น UserProfileResponse
```json
{
  "studentId": "6809610000",
  "firstName": "Somchai",
  "lastName": "Jaidee",
  "firstNameTh": "สมชาย",
  "lastNameTh": "ใจดี"
}
```

`firstName`, `lastName` เป็นภาษาอังกฤษจาก `displayname_en` ของ TU API (ทำตัวแรกของแต่ละคำเป็นตัวใหญ่) ถ้าไม่มี `displayname_en` ใช้ `displayname_th` แทน ส่วน `firstNameTh`, `lastNameTh` เป็นภาษาไทยจาก `displayname_th` แสดงใน dropdown ของ Navbar เป็น `null` ได้ถ้ายังไม่มีข้อมูล

ไม่มี token, token ผิด หรือหมดอายุ (อายุ 3 ชั่วโมง) ตอบ `401` ทั้ง endpoint นี้และ `/api/**` อื่นทุกตัว ยกเว้น `POST /api/auth/login` (UI ควรพากลับหน้า Login)
```json
{
  "type": "about:blank",
  "title": "Unauthorized",
  "status": 401,
  "detail": "กรุณาเข้าสู่ระบบก่อนใช้งาน"
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
  | "ACCOUNT_LOCKED"
  | "TU_API_UNAVAILABLE";

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
  firstNameTh?: string | null;
  lastNameTh?: string | null;
};
```