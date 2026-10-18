# US3-T06 — Extended API Class Diagram

ขยายจาก [API Class Diagram](../T05/US3-API-Class-Diagram.md) ของ US3-T05 โดยเพิ่มสถาปัตยกรรมชั้น Security / JWT (`SecurityConfig`, `JwtAuthenticationFilter`, `JwtService`, `SecurityContextHolder`), ความสัมพันธ์ระหว่างชั้น Service (`AuthService`, `UserService`, `LoginAttemptService`) กับชั้น Repository (`UserRepository`, `LoginAttemptRepository`), DTO จากระบบภายนอก (`TuAuthDto`), และการเชื่อมต่อ `SecurityContextStudentProvider` เข้ากับ `CurrentStudentProvider` เดิมของ US1

## แผนภาพ Extended API Class Diagram (Mermaid)

```mermaid
classDiagram
    direction TB

    class SecurityConfig {
        <<US3 Configuration>>
        -jwtAuthenticationFilter: JwtAuthenticationFilter
        +securityFilterChain(http: HttpSecurity) SecurityFilterChain
    }
    class JwtAuthenticationFilter {
        <<US3 Filter>>
        -jwtService: JwtService
        +doFilterInternal(request: HttpServletRequest, response: HttpServletResponse, filterChain: FilterChain) void
    }
    class SecurityContextHolder {
        <<Spring Security>>
        +getContext() SecurityContext
    }
    class AuthService {
        <<US3 Service>>
        -tuApiClient: TuApiClient
        -userRepository: UserRepository
        -loginAttemptService: LoginAttemptService
        -jwtService: JwtService
        +authenticate(request: LoginRequest) LoginResponse
        -verifyTuStudentStatus(tuResponse: TuAuthDto) void
        -upsertUser(tuResponse: TuAuthDto) User
    }
    class UserService {
        <<US3 Service>>
        -userRepository: UserRepository
        +getProfile(studentId: String) UserProfileResponse
    }
    class LoginAttemptService {
        <<US3 Service>>
        -MAX_ATTEMPTS: int
        -LOCK_TIME_DURATION: long
        -loginAttemptRepository: LoginAttemptRepository
        +loginSucceeded(key: String) void
        +loginFailed(key: String) void
        +isLocked(key: String) boolean
        +getWaitTime(key: String) long
    }
    class JwtService {
        <<US3 Service>>
        -secretKey: String
        -expirationMs: long
        +generateToken(studentId: String) String
        +extractStudentId(token: String) String
        +isTokenValid(token: String) boolean
    }
    class TuApiClient {
        <<US3 API External>>
        +verifyCredentials(username: String, password: String) TuAuthDto
    }
    class TuAuthDto {
        <<US3 External DTO>>
        -boolean active
        -String studentId
        -String firstName
        -String lastName
        -String department
        -String track
    }
    class CurrentStudentProvider {
        <<US1 interface>>
        +currentStudentId() String
    }
    class SecurityContextStudentProvider {
        <<US3 Component>>
        +currentStudentId() String
    }
    class UserRepository {
        <<interface>>
    }
    class LoginAttemptRepository {
        <<interface>>
    }
    class BusinessRuleException {
        <<มีอยู่แล้ว>>
        -status: HttpStatus
        -code: String
        -properties: Map
    }
    class ResourceNotFoundException {
        <<มีอยู่แล้ว>>
    }

    SecurityConfig --> JwtAuthenticationFilter : register in filter chain
    JwtAuthenticationFilter --> JwtService : validate & extract studentId
    JwtAuthenticationFilter ..> SecurityContextHolder : set Authentication
    SecurityContextStudentProvider ..> SecurityContextHolder : get Authentication (studentId)
    SecurityContextStudentProvider ..|> CurrentStudentProvider
    AuthService --> TuApiClient
    AuthService --> UserRepository
    AuthService --> LoginAttemptService
    AuthService --> JwtService : generateToken()
    TuApiClient ..> TuAuthDto : คืน
    UserService --> UserRepository
    LoginAttemptService --> LoginAttemptRepository
    AuthService ..> BusinessRuleException : throws 401, 403, 429
    UserService ..> ResourceNotFoundException : throws 404
```

**รายละเอียดเพิ่มเติม**

- **ชั้น Security & JWT Architecture (Spring Security Filter Chain):**
  - **`SecurityConfig`:** กำหนด Bean `SecurityFilterChain` แบบ Stateless (`SessionCreationPolicy.STATELESS`), ปิด CSRF (เนื่องจากใช้ Bearer Token), กำหนด White-list สำหรับ Public Endpoint เช่น `POST /api/auth/**`, `/v3/api-docs/**`, `/swagger-ui/**` และบังคับ Authenticate ทุก Request อื่นๆ (รวมถึง `GET /api/users/me` และ `/api/timetables/**`) โดยแทรก `JwtAuthenticationFilter` ก่อน `UsernamePasswordAuthenticationFilter`
  - **`JwtAuthenticationFilter`:** สืบทอดจาก `OncePerRequestFilter` ทำหน้าที่ดึง Header `Authorization: Bearer <token>` หากมี Token จะเรียก `jwtService.extractStudentId(token)` และ `jwtService.isTokenValid(token)` หากถูกต้องจะสร้าง `UsernamePasswordAuthenticationToken` ใส่ลงใน `SecurityContextHolder.getContext().setAuthentication(...)` ก่อนส่งต่อ Request ตาม Filter Chain
  - **`JwtService`:** รับผิดชอบสร้าง Token (`generateToken`), ถอดรหัสอ่านรหัสนักศึกษา (`extractStudentId`), และตรวจสอบความถูกต้องและวันหมดอายุของ Token (`isTokenValid`)
  - **`SecurityContextStudentProvider`:** Implement `CurrentStudentProvider` ของ US1 โดยดึง `studentId` จาก `SecurityContextHolder.getContext().getAuthentication().getName()` ทำให้ทั้ง `TimetableController` (US1), `TimetableDeleteController` (US2) และ `UserController` (US3) ใช้ interface เดียวกันได้อย่างสมบูรณ์โดยไม่ต้องแก้โค้ดของ US1/US2
- **`AuthService`:**
  - `upsertUser(tuResponse)` ค้นหา `User` จาก `userRepository.findById(studentId)` ถ้ามีแล้วให้อัปเดตชื่อ-นามสกุล สาขา และภาค (`updateProfile`) ถ้ายังไม่มีให้สร้าง `User` ใหม่ แล้ว `save` ลงตาราง `users`
  - เรียก `jwtService.generateToken(studentId)` เพื่อออก JWT Token ห่อด้วย `LoginResponse.of(token)`
- **`UserService`:**
  - รับ `studentId` ที่ `UserController` อ่านมาจาก `CurrentStudentProvider.currentStudentId()` แล้วเรียก `userRepository.findById(studentId)` แปลงเป็น `UserProfileResponse.from(user)` หากไม่พบโยน `ResourceNotFoundException` (404)
- **`LoginAttemptService` (Transaction Isolation):**
  - `MAX_ATTEMPTS = 5` และ `LOCK_TIME_DURATION = 900` วินาที (15 นาที) อ่านจาก configuration
  - เมธอด `loginSucceeded` และ `loginFailed` กำหนด `@Transactional(propagation = Propagation.REQUIRES_NEW)` เพื่อแยก Transaction อิสระจาก `AuthService` เมื่อ `AuthService` ตรวจสอบสถานะแล้วโยน `BusinessRuleException` (401/403/429) การล้างประวัติ (`deleteById`) หรือการนับจำนวนครั้งที่ผิด (`save`) จะไม่ถูก Rollback
- Method ของแต่ละ Repository และ Entity อยู่ใน [DAO Class Diagram](./US3-T06-DAO-Class-Diagram.md) ส่วน field ทุกตัวเป็น `private final` ฉีดผ่าน constructor ด้วย `@RequiredArgsConstructor` ตามมาตรฐานของโปรเจกต์

## เอกสารที่เกี่ยวข้อง

- [Sequence Diagram](./US3-T06-Sequence-Diagram.md)
- [DAO Class Diagram](./US3-T06-DAO-Class-Diagram.md)
- [Extended API Class Diagram](./US3-T06-Extended-API-Class-Diagram.md)
- [ER Diagram (DB)](./US3-T06-ER-Diagram.md)
- [DTO & API Spec](../T05/US3-DTO-API-Spec.md) (US3-T05)
- [API Class Diagram](../T05/US3-API-Class-Diagram.md) (US3-T05)
- [DTO Class Diagram](../T05/US3-DTO-Class-Diagram.md) (US3-T05)
