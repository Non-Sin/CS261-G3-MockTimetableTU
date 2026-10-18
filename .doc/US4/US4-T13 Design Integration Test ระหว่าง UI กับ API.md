# US4-T13 — Integration Test Cases: UI ↔ API (Logout)

Branch: `docs/US4-T13-design-it-ui-api`
Artefact: Test cases specification
อ้างอิง: US4 DTO & API Spec, US4 API Class Diagram, US4 DTO Class Diagram, US3 DTO & API Spec

## 1. ขอบเขต

ทดสอบการทำงานร่วมกันระหว่างหน้าเว็บกับ API สำหรับการออกจากระบบ ตั้งแต่ผู้ใช้กด Logout การเรียก Logout API การล้าง Session ฝั่ง Client และพฤติกรรมของ API ที่ต้อง Authentication หลัง Logout

| Endpoint | Path | ใช้กับ |
| --- | --- | --- |
| 1 | `POST /api/auth/logout` | ปุ่ม "ออกจากระบบ" |
| 2 | `GET /api/users/me` | ตรวจสอบ Authentication หลัง Logout |

สิ่งที่ตรวจในทุก case:
(ก) request ที่ UI ส่งออกไป
(ข) response จาก API (ระบุ HTTP Status)
(ค) Session / Authentication
(ง) การตอบสนองของ UI

นอกขอบเขต: การทดสอบ Login, การสร้าง JWT และ Authentication ภายนอก

## 2. Precondition และข้อมูลทดสอบ

- US3 Authentication/Session และ `POST /api/auth/login` พร้อมใช้งาน
- US4 `POST /api/auth/logout` พร้อมใช้งาน
- หน้าเว็บมีปุ่ม "ออกจากระบบ"
- ใช้นักศึกษา demo ที่ Login สำเร็จ
- ใช้ JWT Token ที่ได้รับจาก Login (ยังไม่หมดอายุ ยกเว้น IT-12)
- `GET /api/users/me` เป็น API ที่ต้อง Authentication

## 3. Test cases: Logout สำเร็จ (UI ↔ API)

| ID | Scenario | ขั้นตอน | ผลที่คาดหวัง |
| --- | --- | --- | --- |
| IT-01 | Logout ผ่านปุ่ม | Login สำเร็จ → กด "ออกจากระบบ" | UI ส่ง `POST /api/auth/logout` 1 ครั้ง พร้อม `Authorization: Bearer <token>` และไม่มี body |
| IT-02 | Logout API สำเร็จ | ทำตาม IT-01 → ตรวจ Network | API ตอบ `204 No Content` และไม่มี Response Body |
| IT-03 | ล้าง Session | Login → Logout สำเร็จ (`204`) → ตรวจ Client Session | `SessionProvider.clearSession()` ถูกเรียก และ Session ฝั่ง Client ถูกล้าง |
| IT-04 | กลับหน้า Login | Login → Logout สำเร็จ (`204`) | UI กลับหน้า Login และไม่แสดงข้อมูลผู้ใช้เดิม |
| IT-05 | เรียก Logout ผ่าน auth layer | Login → กด Logout → ตรวจ Network/Code flow | UI เรียก `authApi.logout()` และส่ง request ผ่าน `apiFetch()` |

## 4. Test cases: หลัง Logout

| ID | Scenario | ขั้นตอน | ผลที่คาดหวัง |
| --- | --- | --- | --- |
| IT-06 | API ใช้งานได้ก่อน Logout | Login → เรียก `GET /api/users/me` | API ตอบ `200 OK` พร้อมข้อมูลผู้ใช้ปัจจุบัน |
| IT-07 | API ถูกปฏิเสธหลัง Logout (ผ่านแอป) | Login → Logout → เรียก `GET /api/users/me` ผ่านแอป (Client ล้าง token แล้ว จึงไม่ส่ง `Authorization`) | API ตอบ `401 Unauthorized` เนื่องจากไม่มี Authentication ที่ใช้งานได้ |
| IT-08 | ใช้ Token เดิมหลัง Logout | Login → เก็บ Token → Logout → ใช้ Token เดิมที่ยังไม่หมดอายุเรียก `GET /api/users/me` โดยตรง | API ตอบ `200 OK` เพราะระบบเป็น stateless JWT ไม่มี Token Blacklist (Logout ไม่ invalidate token ฝั่ง server) ถือเป็นข้อจำกัดตามการออกแบบ ไม่ใช่ข้อบกพร่อง ถ้าภายหลังเพิ่ม denylist ผลที่คาดหวังต้องเปลี่ยนเป็น `401 Unauthorized` |
| IT-09 | UI ไม่แสดงข้อมูลเดิม | Login → Logout → เข้าหน้าหรือเรียก API ที่ต้อง Login | UI ไม่แสดงข้อมูลของผู้ใช้เดิม และกลับสู่หน้า Login (ไม่มี token จึงได้ `401 Unauthorized` จาก API) |

## 5. Test cases: Error

| ID | Scenario | วิธีสร้างสถานการณ์ | ผลที่คาดหวัง |
| --- | --- | --- | --- |
| IT-10 | Logout API error | Mock `POST /api/auth/logout` ให้ตอบ `500 Internal Server Error` | UI แสดง Error ตาม UI Spec และไม่ค้างอยู่ในสถานะกำลัง Logout |
| IT-11 | Network error | ตัด Network หรือทำให้ Request timeout (ไม่มี HTTP Status เพราะไม่มี response) | UI จัดการ Network Error ได้ และไม่แสดงสถานะ Logout สำเร็จโดยไม่ถูกต้อง |

## 6. Test cases: Session หมดอายุ

| ID | Scenario | วิธีสร้างสถานการณ์ | ผลที่คาดหวัง |
| --- | --- | --- | --- |
| IT-12 | Session หมดอายุระหว่างใช้งาน | Login → ทำให้ Session หมดอายุ → เรียก API ที่ต้อง Authentication | API ตอบ `401 Unauthorized` และ UI จัดการตาม flow ของ Session หมดอายุ |

## 7. Integration Flow

### Flow A — Logout ปกติ

```text
Login สำเร็จ
    ↓
มี Authentication / JWT Session
    ↓
ผู้ใช้กด "ออกจากระบบ"
    ↓
authApi.logout()
    ↓
apiFetch()
    ↓
POST /api/auth/logout → 204 No Content
    ↓
SessionProvider.clearSession()
    ↓
UI กลับหน้า Login
```

### Flow B — ตรวจสอบหลัง Logout

```text
Login
    ↓
GET /api/users/me → 200 OK
    ↓
Logout
    ↓
POST /api/auth/logout → 204 No Content
    ↓
GET /api/users/me ผ่านแอป ไม่ส่ง token → 401 Unauthorized
GET /api/users/me ใช้ Token เดิมโดยตรง → 200 OK (stateless JWT ยังไม่หมดอายุ)
```

## 8. ความครอบคลุม

| Requirement | Test case |
| --- | --- |
| กด Logout จาก UI | IT-01 |
| เรียก `POST /api/auth/logout` | IT-01, IT-02 |
| ส่ง Authorization | IT-01 |
| ไม่มี Request Body | IT-01 |
| ล้าง Session | IT-03 |
| กลับหน้า Login | IT-04 |
| API ใช้งานได้ก่อน Logout | IT-06 |
| API ถูกปฏิเสธหลัง Logout ผ่านแอป (`401`) | IT-07 |
| Token เดิมหลัง Logout (`200` ตามข้อจำกัด stateless) | IT-08 |
| ไม่แสดงข้อมูลผู้ใช้เดิม | IT-09 |
| Logout Error / Network Error | IT-10, IT-11 |
| Session หมดอายุ | IT-12 |
