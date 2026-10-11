# CS261 Group 3

Web application: **Next.js** (frontend) + **Spring Boot** (backend) + **SQL Server** (database)

## โครงสร้างโปรเจค

```
.
├── compose.yaml              # SQL Server + สร้างฐานข้อมูล appdb อัตโนมัติ
├── .env.example              # ตัวอย่างค่าลับ → copy เป็น .env
├── .doc                      # โฟลเดอร์สำหรับเก็บไฟล์เอกสาร
├── backend/                  # Spring Boot 4 / Java 21 / Maven
│   └── src/main/java/th/ac/tu/cs261/group3/backend/
│       ├── common/           # โค้ดที่ใช้ร่วมกัน (exception handler ฯลฯ)
│       ├── config/           # การตั้งค่า (CORS ฯลฯ)
│       └── item/             # ⬅ 1 ฟีเจอร์ = 1 package
│           ├── dto/          #    request / response records
│           ├── Item.java     #    entity
│           ├── ItemRepository.java
│           ├── ItemService.java
│           └── ItemController.java
│   └── src/main/resources/db/migration/   # Flyway SQL migrations
└── frontend/                 # Next.js 16 / React 19 / Tailwind 4
    ├── app/                  # routes (page.tsx บาง ๆ เรียก component จาก features/)
    ├── features/
    │   └── items/            # ⬅ 1 ฟีเจอร์ = 1 โฟลเดอร์ (คู่กับ backend package)
    │       ├── api.ts        #    ฟังก์ชันเรียก REST API
    │       ├── types.ts      #    type ที่ตรงกับ DTO ฝั่ง backend
    │       └── components/   #    React components ของฟีเจอร์
    └── lib/                  # โค้ดที่ใช้ร่วมกัน (apiFetch, ApiError)
```

**หลักการ:** แบ่งโค้ดตาม *ฟีเจอร์* ไม่ใช่ตามชนิดไฟล์ — แต่ละคนรับผิดชอบฟีเจอร์ของตัวเอง
ทั้ง `backend/.../<feature>/` และ `frontend/features/<feature>/` ทำให้ไม่ต้องแก้ไฟล์เดียวกันบ่อย → merge conflict น้อย

## เริ่มต้นใช้งาน (ครั้งแรก)

สิ่งที่ต้องมี: **Java 21**, **Node.js 20+**, **Docker Desktop**

```bash
# 1) ตั้งค่า secrets
cp .env.example .env

# 2) เปิดฐานข้อมูล (ครั้งแรกรอ ~30 วินาที db-init จะสร้าง appdb ให้)
docker compose up -d

# 3) รัน backend → http://localhost:8080
cd backend
./mvnw spring-boot:run          # Windows: mvnw.cmd spring-boot:run

# 4) รัน frontend → http://localhost:3000   (เปิด terminal ใหม่)
cd frontend
npm install
npm run dev
```

Frontend เรียก `/api/*` แล้ว Next.js จะ rewrite ไปที่ backend ให้ (ดู `frontend/next.config.ts`)

## คำสั่งที่ใช้บ่อย

| งาน | คำสั่ง |
|---|---|
| รันเทสต์ backend (ไม่ต้องมี DB) | `cd backend && ./mvnw test -Dtest='!BackendApplicationTests'` |
| รันเทสต์ backend ทั้งหมด (ต้องเปิด DB) | `cd backend && ./mvnw test` |
| ตรวจ lint / type frontend | `cd frontend && npm run lint && npx tsc --noEmit` |
| build frontend | `cd frontend && npm run build` |
| ปิดฐานข้อมูล | `docker compose down` |
| ล้างฐานข้อมูลทิ้งทั้งหมด | `docker compose down -v` |

## API

| Method | Path | คำอธิบาย |
|---|---|---|
| GET | `/api/items` | รายการทั้งหมด |
| GET | `/api/items/{id}` | ดึง 1 รายการ |
| POST | `/api/items` | สร้าง (`{ "name": "...", "description": "..." }`) |
| PUT | `/api/items/{id}` | แก้ไข |
| DELETE | `/api/items/{id}` | ลบ |

Error ทุกตัวตอบกลับเป็น [ProblemDetail (RFC 9457)](https://www.rfc-editor.org/rfc/rfc9457) เช่น
`{ "status": 400, "title": "Bad Request", "detail": "Validation failed", "errors": { "name": "must not be blank" } }`

## การทำงานร่วมกัน

อ่าน [CONTRIBUTING.md](CONTRIBUTING.md) ก่อนเริ่มเขียนโค้ด
