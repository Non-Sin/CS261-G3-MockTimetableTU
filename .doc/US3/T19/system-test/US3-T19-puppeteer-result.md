# ผลรัน System Test US3 ด้วย Puppeteer

- วันที่รัน: 2026-11-01T10:18:14.860Z
- หน้าเว็บ: http://localhost:3000
- ST-10 และส่วน API ของ ST-06 ข้อ 1 ดูผลจาก newman (Postman collection)

| Test Case | เรื่อง | ผล | ตรวจผ่าน |
| --- | --- | --- | --- |
| ST-01 | Login ครั้งแรก → INSERT users + GET /api/users/me + Navbar | Pass | 7/7 |
| ST-02 | Login ครั้งถัดไป → UPDATE users แถวเดิม ไม่สร้างซ้ำ | Pass | 6/6 |
| ST-03 | รหัสผิดครั้งที่ 1–4 → 401 และนับ failed_attempts | Pass | 10/10 |
| ST-04 | รหัสถูกหลังเคยผิด → ล้าง login_attempt (deleteById) | Pass | 5/5 |
| ST-05 | รหัสผิดครบ 5 ครั้ง → 429 ACCOUNT_LOCKED 900 วินาที | Pass | 9/9 |
| ST-06 | Login ขณะถูกระงับ → 429 ทันที แล้วปลดเมื่อครบ 15 นาที | Pass | 11/11 |
| ST-07 | บัญชีไม่ Active → 403 ACCOUNT_INACTIVE | Pass | 4/4 |
| ST-08 | นักศึกษาต่างสาขา → 403 NOT_CS_STUDENT ไม่บันทึก users และไม่ Rollback การล้าง attempt | Pass | 7/7 |
| ST-09 | นักศึกษา CS ภาคพิเศษ → 403 NOT_CS_STUDENT ไม่บันทึก users และไม่ Rollback การล้าง attempt | Pass | 7/7 |
| ST-11 | TU Login API ใช้งานไม่ได้ → 503 ไม่นับ attempt | Pass | 10/10 |

## ST-01 Login ครั้งแรก → INSERT users + GET /api/users/me + Navbar

| ชั้น | สิ่งที่ตรวจ | ผล | ค่าที่ได้ (กรณีไม่ผ่าน) |
| --- | --- | --- | --- |
| DB | ก่อนเริ่ม ไม่มีแถว 6609000001 ใน users | ✔ |  |
| API | POST /api/auth/login ตอบ 200 { token } เป็น JWT | ✔ |  |
| API | GET /api/users/me ตอบ 200 ข้อมูลตรง | ✔ |  |
| UI | เปลี่ยนไปหน้าเมนูหลัก (/) | ✔ |  |
| UI | Navbar แสดง "Somchai Jaidee" และ "6609000001" | ✔ |  |
| DB | users มี 1 แถว Somchai Jaidee, ชื่อไทย, CS, ภาคปกติ, updated_at ไม่ NULL | ✔ |  |
| DB | login_attempt ไม่มีแถว 6609000001 | ✔ |  |

## ST-02 Login ครั้งถัดไป → UPDATE users แถวเดิม ไม่สร้างซ้ำ

| ชั้น | สิ่งที่ตรวจ | ผล | ค่าที่ได้ (กรณีไม่ผ่าน) |
| --- | --- | --- | --- |
| API | POST /api/auth/login ตอบ 200 ได้ JWT ใหม่ | ✔ |  |
| API | GET /api/users/me ตอบ 200 | ✔ |  |
| UI | เปลี่ยนไปหน้าเมนูหลัก (/) | ✔ |  |
| UI | Navbar แสดง "Somchai Jaidee" และ "6609000001" | ✔ |  |
| DB | users ยังมี 6609000001 เพียง 1 แถว | ✔ |  |
| DB | updated_at ใหม่กว่าค่าใน ST-01 | ✔ |  |

## ST-03 รหัสผิดครั้งที่ 1–4 → 401 และนับ failed_attempts

| ชั้น | สิ่งที่ตรวจ | ผล | ค่าที่ได้ (กรณีไม่ผ่าน) |
| --- | --- | --- | --- |
| API | POST /api/auth/login ตอบ 401 INVALID_CREDENTIALS | ✔ |  |
| UI | อยู่หน้า /login และแสดง "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาตร…" | ✔ |  |
| DB | หลังผิดครั้งที่ 1: failed_attempts = 1, locked_until = NULL | ✔ |  |
| API | POST /api/auth/login ตอบ 401 INVALID_CREDENTIALS | ✔ |  |
| UI | อยู่หน้า /login และแสดง "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาตร…" | ✔ |  |
| API | POST /api/auth/login ตอบ 401 INVALID_CREDENTIALS | ✔ |  |
| UI | อยู่หน้า /login และแสดง "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาตร…" | ✔ |  |
| API | POST /api/auth/login ตอบ 401 INVALID_CREDENTIALS | ✔ |  |
| UI | อยู่หน้า /login และแสดง "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาตร…" | ✔ |  |
| DB | หลังผิดครั้งที่ 4: failed_attempts = 4, locked_until = NULL | ✔ |  |

## ST-04 รหัสถูกหลังเคยผิด → ล้าง login_attempt (deleteById)

| ชั้น | สิ่งที่ตรวจ | ผล | ค่าที่ได้ (กรณีไม่ผ่าน) |
| --- | --- | --- | --- |
| DB | ก่อนเริ่ม failed_attempts = 4 (ต่อจาก ST-03) | ✔ |  |
| API | POST /api/auth/login ตอบ 200 | ✔ |  |
| UI | เปลี่ยนไปหน้าเมนูหลัก (/) | ✔ |  |
| UI | Navbar แสดง "Somchai Jaidee" และ "6609000001" | ✔ |  |
| DB | แถว 6609000001 ใน login_attempt ถูกลบ | ✔ |  |

## ST-05 รหัสผิดครบ 5 ครั้ง → 429 ACCOUNT_LOCKED 900 วินาที

| ชั้น | สิ่งที่ตรวจ | ผล | ค่าที่ได้ (กรณีไม่ผ่าน) |
| --- | --- | --- | --- |
| DB | ก่อนเริ่ม ไม่มีแถว 6609000004 ใน login_attempt | ✔ |  |
| API | POST /api/auth/login ตอบ 401 INVALID_CREDENTIALS | ✔ |  |
| API | POST /api/auth/login ตอบ 401 INVALID_CREDENTIALS | ✔ |  |
| API | POST /api/auth/login ตอบ 401 INVALID_CREDENTIALS | ✔ |  |
| API | POST /api/auth/login ตอบ 401 INVALID_CREDENTIALS | ✔ |  |
| API | POST /api/auth/login ตอบ 429 ACCOUNT_LOCKED | ✔ |  |
| API | retryAfterSeconds อยู่ระหว่าง 899–900 | ✔ |  |
| UI | แสดงหน้าระงับชั่วคราว พร้อม Countdown เริ่มที่ 15:00 / 14:5x | ✔ |  |
| DB | failed_attempts = 5 และ locked_until = updated_at + 15 นาที | ✔ |  |

## ST-06 Login ขณะถูกระงับ → 429 ทันที แล้วปลดเมื่อครบ 15 นาที

| ชั้น | สิ่งที่ตรวจ | ผล | ค่าที่ได้ (กรณีไม่ผ่าน) |
| --- | --- | --- | --- |
| API | POST /api/auth/login ตอบ 429 ACCOUNT_LOCKED | ✔ |  |
| API | retryAfterSeconds ลดลงตามเวลา (≤ 890) | ✔ |  |
| UI | แสดงหน้าระงับชั่วคราว | ✔ |  |
| DB | login_attempt ยังเป็น failed_attempts = 5 (ไม่เรียก TuApiClient) | ✔ |  |
| DB | ยังไม่มีแถว 6609000004 ใน users | ✔ |  |
| API | POST /api/auth/login ตอบ 200 { token } | ✔ |  |
| API | GET /api/users/me ตอบ 200 ข้อมูล Somjai Longdoo | ✔ |  |
| UI | เปลี่ยนไปหน้าเมนูหลัก (/) | ✔ |  |
| UI | Navbar แสดง "Somjai Longdoo" และ "6609000004" | ✔ |  |
| DB | แถว 6609000004 ใน login_attempt ถูกลบ | ✔ |  |
| DB | users มีแถว 6609000004 Somjai Longdoo | ✔ |  |

## ST-07 บัญชีไม่ Active → 403 ACCOUNT_INACTIVE

| ชั้น | สิ่งที่ตรวจ | ผล | ค่าที่ได้ (กรณีไม่ผ่าน) |
| --- | --- | --- | --- |
| API | POST /api/auth/login ตอบ 403 ACCOUNT_INACTIVE | ✔ |  |
| UI | อยู่หน้า /login และแสดง "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาตร…" | ✔ |  |
| DB | ไม่มีแถว 6609000003 ใน users | ✔ |  |
| DB | ไม่มีแถว 6609000003 ใน login_attempt | ✔ |  |

## ST-08 นักศึกษาต่างสาขา → 403 NOT_CS_STUDENT ไม่บันทึก users และไม่ Rollback การล้าง attempt

| ชั้น | สิ่งที่ตรวจ | ผล | ค่าที่ได้ (กรณีไม่ผ่าน) |
| --- | --- | --- | --- |
| API | POST /api/auth/login ตอบ 401 INVALID_CREDENTIALS | ✔ |  |
| DB | เตรียม: login_attempt ของ 6609000002 มี failed_attempts = 1 | ✔ |  |
| DB | เตรียม: ไม่มีแถว 6609000002 ใน users | ✔ |  |
| API | POST /api/auth/login ตอบ 403 NOT_CS_STUDENT | ✔ |  |
| UI | แสดงหน้า Access Denied เฉพาะนักศึกษา CS ภาคปกติ | ✔ |  |
| DB | ไม่มีแถว 6609000002 ใน users | ✔ |  |
| DB | แถว 6609000002 ใน login_attempt ถูกลบ (ไม่ Rollback) | ✔ |  |

## ST-09 นักศึกษา CS ภาคพิเศษ → 403 NOT_CS_STUDENT ไม่บันทึก users และไม่ Rollback การล้าง attempt

| ชั้น | สิ่งที่ตรวจ | ผล | ค่าที่ได้ (กรณีไม่ผ่าน) |
| --- | --- | --- | --- |
| API | POST /api/auth/login ตอบ 401 INVALID_CREDENTIALS | ✔ |  |
| DB | เตรียม: login_attempt ของ 6609650001 มี failed_attempts = 1 | ✔ |  |
| DB | เตรียม: ไม่มีแถว 6609650001 ใน users | ✔ |  |
| API | POST /api/auth/login ตอบ 403 NOT_CS_STUDENT | ✔ |  |
| UI | แสดงหน้า Access Denied เฉพาะนักศึกษา CS ภาคปกติ | ✔ |  |
| DB | ไม่มีแถว 6609650001 ใน users | ✔ |  |
| DB | แถว 6609650001 ใน login_attempt ถูกลบ (ไม่ Rollback) | ✔ |  |

## ST-11 TU Login API ใช้งานไม่ได้ → 503 ไม่นับ attempt

| ชั้น | สิ่งที่ตรวจ | ผล | ค่าที่ได้ (กรณีไม่ผ่าน) |
| --- | --- | --- | --- |
| API | POST /api/auth/login ตอบ 503 TU_API_UNAVAILABLE | ✔ |  |
| UI | อยู่หน้า /login และแสดง "ไม่สามารถเชื่อมต่อระบบของมหาวิทยาลัยได้ใ…" | ✔ |  |
| UI | ช่อง username ยังเก็บค่าที่กรอกไว้ | ✔ |  |
| DB | หลังครั้งที่ 1: ไม่มีแถว 6609000099 ใน login_attempt | ✔ |  |
| API | POST /api/auth/login ตอบ 503 TU_API_UNAVAILABLE | ✔ |  |
| API | POST /api/auth/login ตอบ 503 TU_API_UNAVAILABLE | ✔ |  |
| API | POST /api/auth/login ตอบ 503 TU_API_UNAVAILABLE | ✔ |  |
| API | POST /api/auth/login ตอบ 503 TU_API_UNAVAILABLE | ✔ |  |
| DB | หลังครั้งที่ 5: ไม่มีแถว 6609000099 ใน login_attempt | ✔ |  |
| DB | ไม่มีแถว 6609000099 ใน users | ✔ |  |
