# US4-T13 — Integration Test Cases: UI ↔ API (Logout)

Branch: `docs/US4-T13-design-it-ui-api`
Artefact: Test cases specification
อ้างอิง: US4 DTO & API Spec, US4 API Class Diagram, US4 DTO Class Diagram, US3 DTO & API Spec

## 1. ขอบเขต

ทดสอบการทำงานร่วมกันระหว่างหน้าเว็บกับ API สำหรับการออกจากระบบ ตั้งแต่ผู้ใช้กด Logout การเรียก Logout API การล้าง Session ฝั่ง Client และการปฏิเสธ API ที่ต้อง Authentication หลัง Logout

| Endpoint | Path | ใช้กับ |
| --- | --- | --- |
| 1 | `POST /api/auth/logout` | ปุ่ม "ออกจากระบบ" |
| 2 | `GET /api/users/me` | ตรวจสอบ Authentication หลัง Logout |

สิ่งที่ตรวจในทุก case:
(ก) request ที่ UI ส่งออกไป
(ข) response จาก API
(ค) Session / Authentication
(ง) การตอบสนองของ UI

นอกขอบเขต: การทดสอบ Login, การสร้าง JWT และ Authentication ภายนอก

## 2. Precondition และข้อมูลทดสอบ

- US3 Authentication/Session และ `POST /api/auth/login` พร้อมใช้งาน
- US4 `POST /api/auth/logout` พร้อมใช้งาน
- หน้าเว็บมีปุ่ม "ออกจากระบบ"
- ใช้นักศึกษา demo ที่ Login สำเร็จ
- ใช้ JWT Token ที่ได้รับจาก Login
- `GET /api/users/me` เป็น API ที่ต้อง Authentication

## 3. Test cases: Logout สำเร็จ (UI ↔ API)

| ID | Scenario | ขั้นตอน | ผลที่คาดหวัง |
| --- | --- | --- | --- |
| IT-01 | Logout ผ่านปุ่ม | Login สำเร็จ → กด "ออกจากระบบ" | UI ส่ง `POST /api/auth/logout` 1 ครั้ง พร้อม `Authorization: Bearer <token>` และไม่มี body |
| IT-02 | Logout API สำเร็จ | ทำตาม IT-01 → ตรวจ Network | API ตอบกลับสำเร็จตาม status ที่กำหนดใน US4 |
| IT-03 | ล้าง Session | Login → Logout สำเร็จ → ตรวจ Client Session | `SessionProvider.clearSession()` ถูกเรียก และ Session ฝั่ง Client ถูกล้าง |
| IT-04 | กลับหน้า Login | Login → Logout สำเร็จ | UI กลับหน้า Login และไม่แสดงข้อมูลผู้ใช้เดิม |
| IT-05 | เรียก Logout ผ่าน auth layer | Login → กด Logout → ตรวจ Network/Code flow | UI เรียก `authApi.logout()` และส่ง request ผ่าน `apiFetch()` |

## 4. Test cases: หลัง Logout API ที่ต้อง Authentication ถูกปฏิเสธ

| ID | Scenario | ขั้นตอน | ผลที่คาดหวัง |
| --- | --- | --- | --- |
| IT-06 | API ใช้งานได้ก่อน Logout | Login → เรียก `GET /api/users/me` | API ตอบสำเร็จและแสดงข้อมูลผู้ใช้ปัจจุบัน |
| IT-07 | API ถูกปฏิเสธหลัง Logout | Login → Logout → เรียก `GET /api/users/me` | API ปฏิเสธ Request เนื่องจากไม่มี Authentication ที่ใช้งานได้ |
| IT-08 | ใช้ Token เดิมหลัง Logout | Login → เก็บ Token → Logout → ใช้ Token เดิมเรียก `GET /api/users/me` | API ปฏิเสธ Request และไม่สามารถใช้ Session เดิมต่อได้ |
| IT-09 | UI ไม่แสดงข้อมูลเดิม | Login → Logout → เข้าหน้าหรือเรียก API ที่ต้อง Login | UI ไม่สามารถใช้งานข้อมูลของผู้ใช้เดิม และกลับสู่สถานะที่ต้อง Login |

## 5. Test cases: Error

| ID | Scenario | วิธีสร้างสถานการณ์ | ผลที่คาดหวัง |
| --- | --- | --- | --- |
| IT-10 | Logout API error | Mock `POST /api/auth/logout` ให้ตอบ HTTP Error | UI แสดง Error ตาม UI Spec และไม่ค้างอยู่ในสถานะกำลัง Logout |
| IT-11 | Network error | ตัด Network หรือทำให้ Request timeout | UI จัดการ Network Error ได้ และไม่แสดงสถานะ Logout สำเร็จโดยไม่ถูกต้อง |

## 6. Test cases: Session หมดอายุ

| ID | Scenario | วิธีสร้างสถานการณ์ | ผลที่คาดหวัง |
| --- | --- | --- | --- |
| IT-12 | Session หมดอายุระหว่างใช้งาน | Login → ทำให้ Session หมดอายุ → เรียก API ที่ต้อง Authentication | API ปฏิเสธ Request และ UI จัดการตาม flow ของ Session หมดอายุ |

## 7. Integration Flow

### Flow A — Logout ปกติ


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
POST /api/auth/logout
    ↓
Logout สำเร็จ
    ↓
SessionProvider.clearSession()
    ↓
UI กลับหน้า Login


### Flow B — ตรวจสอบหลัง Logout

Login
    ↓
GET /api/users/me → สำเร็จ
    ↓
Logout
    ↓
POST /api/auth/logout → สำเร็จ
    ↓
GET /api/users/me ด้วย Session/Token เดิม
    ↓
ถูกปฏิเสธ


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
| API ถูกปฏิเสธหลัง Logout | IT-07, IT-08 |
| ไม่แสดงข้อมูลผู้ใช้เดิม | IT-09 |
| Logout Error / Network Error | IT-10, IT-11 |
| Session หมดอายุ | IT-12 |
