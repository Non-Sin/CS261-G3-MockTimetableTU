# US2 — DTO & API Spec: ลบวิชาจากตารางเรียนจำลอง

Oct 15, 2026 · @Non

## ภาพรวม

US2 ใช้ 2 endpoint ใน path เดียวกับ US1 และ**ไม่มี DTO ใหม่** ทั้งสอง endpoint คืน `TimetableResponse` ของ [US1-T05](../../US1/T05/US1-DTO%20&%20API%20Spec.md) ทั้งก้อน เหมือนที่ `POST /api/timetable/entries` ทำ UI จึงวาด grid ตัวนับหน่วยกิต และแถบเวลาชนใหม่ได้ทันทีโดยไม่ต้อง GET ซ้ำ ออกแบบตาม checkbox กับปุ่มลบใน Figma [frame 1:256](https://www.figma.com/design/U0Ot2xwePE9ooeQV2CZC5V/CS261?node-id=1-256) และ [frame 1:1810](https://www.figma.com/design/U0Ot2xwePE9ooeQV2CZC5V/CS261?node-id=1-1810) กับ test case ใน [UAT ของ US2 (US2-T16)](../US2-T16-UAT.md)

- **ไม่ต้องส่งปีการศึกษาหรือภาคเรียน:** entry ทุกแถวอยู่ใน `timetable` ที่ผูกกับ (`student_id`, `academic_year`, `semester`) ตาม [ER Diagram ของ US1-T06](../../US1/T06/US1-T06-ER-Diagram.md) backend จึงรู้ภาคจาก entry เอง แบบเดียวกับที่ POST อ่านภาคจาก section
- **ลบทุกวิชา = ส่ง entryId ทุกตัวในตาราง** ไม่มี endpoint แยก (TC3)
- **all-or-nothing:** ลบหลายวิชาใน transaction เดียว ถ้ามี id ไหนใช้ไม่ได้จะไม่ลบเลยสักตัว
- **DELETE ไม่มี body:** id อยู่ใน path หรือ query เพราะมาตรฐาน HTTP ไม่กำหนดความหมายของ body ใน DELETE บาง client หรือ proxy จึงตัดทิ้งได้
- **นอกขอบเขต:** เปลี่ยนกลุ่มเรียน, ยกเลิกการลบ (undo) และกล่องยืนยันก่อนลบ ถ้า UI มีกล่องยืนยัน ให้ทำฝั่ง frontend ล้วน ไม่กระทบ API

## Endpoints

| Method | Path | ใช้กับส่วนไหนของหน้า | Test case |
| --- | --- | --- | --- |
| DELETE | `/api/timetable/entries/{entryId}` | ปุ่มหรือไอคอนลบของวิชาเดียว | TC1 |
| DELETE | `/api/timetable/entries?entryIds=7,8` | ปุ่มลบวิชาที่ติ๊ก checkbox และการลบทุกวิชา | TC2, TC3 |

TC4 (ตารางว่างกดลบไม่ได้) จัดการที่ UI จาก `entries.length === 0` ไม่ต้องมี API

ถ้า UI มีแค่ checkbox กับปุ่มลบปุ่มเดียว ให้เรียก endpoint 2 เสมอแม้ติ๊กวิชาเดียว ส่วน endpoint 1 คงไว้ตามที่ US1 spec และ ER Diagram ของ US1-T06 อ้างถึง และใช้กับไอคอนลบบนการ์ดวิชาถ้ามี

ทุก endpoint ทำงานกับตารางของนักศึกษาที่ login อยู่ผ่าน `CurrentStudentProvider` เหมือน US1 ระหว่างที่ US3 ยังไม่เสร็จจึงเป็นรหัส demo จาก `app.timetable.demo-student-id` และ path ไม่เปลี่ยนหลังมี login

## API Spec

### 1. DELETE /api/timetable/entries/{entryId} — ลบ 1 วิชา

| Param | อยู่ที่ | ชนิด | บังคับ | ตัวอย่าง | มาจาก UI |
| --- | --- | --- | --- | --- | --- |
| `entryId` | path | long | ใช่ | 8 | `entries[].entryId` ของวิชาที่กดลบ |

สำเร็จตอบ `200` เป็น `TimetableResponse` ของตารางที่ entry นั้นอยู่ หลังลบแล้ว

ตัวอย่าง: ลบ LAS101 (`entryId` 8) จากสถานะใน frame 1:1057 ของ US1 (21 หน่วยกิต เวลาชน 1 คู่) TU109 จึงไม่ชนกับวิชาใดแล้ว `conflictWith` และ `conflicts` ว่าง (ตัด `entries` เหลือ 1 จาก 6 วิชา):

```json
{
  "academicYear": 2568,
  "semester": 1,
  "totalCredits": 18,
  "maxCredits": 22,
  "updatedAt": "2026-10-15T20:30:12+07:00",
  "entries": [
    {
      "entryId": 7,
      "courseCode": "TU109",
      "courseName": "INNOVATION AND ENTREPRENEURIAL MINDSET",
      "category": "GENERAL_EDUCATION",
      "credits": 3,
      "sectionId": 305,
      "sectionNo": "780001",
      "schedules": [
        { "dayOfWeek": "WEDNESDAY", "startTime": "09:30", "endTime": "12:30", "room": "SC3-413" }
      ],
      "conflictWith": []
    }
  ],
  "conflicts": []
}
```

### 2. DELETE /api/timetable/entries?entryIds= — ลบหลายวิชา / ลบทุกวิชา

| Param | อยู่ที่ | ชนิด | บังคับ | ตัวอย่าง | มาจาก UI |
| --- | --- | --- | --- | --- | --- |
| `entryIds` | query | list ของ long | ใช่ | `7,8` | `entryId` ของวิชาที่ติ๊ก หรือของทุกวิชาเมื่อลบทั้งหมด |

- ส่งแบบคั่นด้วย comma (`?entryIds=7,8`) หรือใส่ key ซ้ำ (`?entryIds=7&entryIds=8`) ก็ได้ Spring รับเป็น `List<Long>` ทั้งสองแบบ
- id ซ้ำ เช่น `7,7` นับเป็นตัวเดียว
- ทุก id ต้องอยู่ในตารางเดียวกัน (ปีการศึกษาและภาคเรียนเดียวกัน) เพราะ response คืนได้ตารางเดียว
- ห้ามมี `/` ก่อน `?` Spring Boot 4 ไม่ถือว่า `/entries/` กับ `/entries` เป็น path เดียวกัน จึงได้ `404`

สำเร็จตอบ `200` เป็น `TimetableResponse` ของตารางนั้นหลังลบ เช่น ลบ TU109 กับ LAS101 (`?entryIds=7,8`) จาก frame 1:1057 จะได้ `totalCredits: 15`, `conflicts: []` และ `entries` เหลือ 5 วิชา

**ลบทุกวิชา** ให้ส่ง entryId ทุกตัวที่แสดงอยู่ (`entries.map((e) => e.entryId)`) เช่น `?entryIds=7,8,…` ได้ตารางว่างแบบนี้:

```json
{
  "academicYear": 2568,
  "semester": 1,
  "totalCredits": 0,
  "maxCredits": 22,
  "updatedAt": "2026-10-15T20:31:40+07:00",
  "entries": [],
  "conflicts": []
}
```

**ความยาว URL ไม่เป็นปัญหา:** เพดาน 22 หน่วยกิตทำให้ตารางหนึ่งมีไม่เกิน 22 entry ถ้า id ยาว 7 หลัก URL ทั้งเส้นจะราว 210 ตัวอักษร ขณะที่ Tomcat ใน Spring Boot รับ request line และ header ได้ราว 8KB

### ปีการศึกษาและภาคเรียนของ response

backend อ่านจาก `TimetableEntry.timetable` ไม่ได้อ่านจาก request และเพราะ `timetable` unique บน (`student_id`, `academic_year`, `semester`) คำว่า "ตารางเดียวกัน" จึงหมายถึง `timetable_id` เดียวกัน ไม่ต้องเทียบปีกับภาคเอง

### `updatedAt` หลังลบ

ลบสำเร็จทุกครั้งต้องเรียก `Timetable.touch()` ตามที่ entity กำหนดไว้ "บันทึกตารางร่างล่าสุดเมื่อสักครู่" จึงขยับตามการลบ แถว `timetable` **ไม่ถูกลบ** แม้ entry หมดแล้ว ตารางที่ลบจนว่างจึงต่างจากตารางที่ไม่เคยใช้:

| สถานะ | `entries` | `updatedAt` |
| --- | --- | --- |
| ไม่เคยเพิ่มวิชาในภาคนี้ (US1 · frame 1:2) | `[]` | `null` |
| ลบจนหมด (US2) | `[]` | เวลาที่ลบ |

UI ใช้ `entries.length === 0` ตัดสินว่าตารางว่าง ไม่ใช้ `updatedAt`

## Error และลำดับการตรวจ

ตอบเป็น ProblemDetail ตาม README และ**ไม่มี `code` ใหม่** เพราะแต่ละกรณีแยกกันได้ด้วย HTTP status และ UI ปกติจะไม่ส่งคำขอที่ผิด กรณีเหล่านี้เกิดตอนยิง API ตรงหรือตอนข้อมูลบนหน้าจอเก่า

| HTTP | เกิดเมื่อ | ใครตอบ | Endpoint |
| --- | --- | --- | --- |
| 400 | `entryId` หรือ `entryIds` ไม่ใช่ตัวเลข เช่น `/entries/abc` | `ResponseEntityExceptionHandler` (มีอยู่แล้ว) | 1, 2 |
| 400 | ไม่ส่ง `entryIds` | `ResponseEntityExceptionHandler` (มีอยู่แล้ว) | 2 |
| 400 | ส่ง `entryIds` แต่ว่าง (`?entryIds=`) | service โยน `ResponseStatusException` | 2 |
| 404 | ไม่พบ entry หรือ entry เป็นของนักศึกษาคนอื่น และไม่ลบเลยสักตัว | service โยน `ResourceNotFoundException` เดิม | 1, 2 |
| 400 | entry อยู่คนละตาราง (คนละปีหรือคนละภาค) | service โยน `ResponseStatusException` | 2 |

ลำดับใน `TimetableDeleteService.removeEntries`:

1. `entryIds` ว่าง → 400
2. ตัด id ซ้ำ
3. หา entry ที่เป็นของนักศึกษาคนนี้ ได้ไม่ครบ → 404
4. entry อยู่คนละตาราง → 400
5. ลบ entry, `touch()` ตาราง แล้วคืนตาราง → 200

ตรวจความเป็นเจ้าของก่อนตรวจคนละตาราง เพราะถ้าสลับกัน คนที่ส่ง id ของคนอื่นปนมาจะได้ `400` แทน `404` ซึ่งบอกเป็นนัยว่า id นั้นมีอยู่จริง และตอบ `404` แทน `403` สำหรับ entry ของคนอื่นด้วยเหตุผลเดียวกัน ซึ่ง RFC 9110 อนุญาตไว้

```json
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "ไม่พบวิชาในตารางเรียนของคุณ: entryId 9",
  "instance": "/api/timetable/entries"
}
```

```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "entryIds ต้องเป็นวิชาในตารางเดียวกัน (ปีการศึกษาและภาคเรียนเดียวกัน)",
  "instance": "/api/timetable/entries"
}
```

การแสดงผลใน UI: `404` ส่วนใหญ่แปลว่าข้อมูลบนหน้าจอเก่า เช่น ลบวิชาเดียวกันจากอีกแท็บไปแล้ว ให้แจ้งว่าตารางมีการเปลี่ยนแปลง แล้วเรียก `GET /api/timetable` ใหม่และล้าง checkbox ส่วน `400` เป็น bug ของ frontend แสดงข้อความทั่วไปพอ

## DTO

US2 **ไม่มี DTO ใหม่** แบบเดียวกับ US5

- **Response:** `TimetableResponse` ของ US1 พร้อม `TimetableEntryResponse`, `ScheduleSlotResponse` และ `TimeConflictResponse` ที่อยู่ข้างใน
- **Request:** ไม่มี เพราะไม่มี body ค่ามาจาก `@PathVariable Long entryId` และ `@RequestParam List<Long> entryIds`

| ส่วนในหน้า | Field |
| --- | --- |
| checkbox ของแต่ละวิชา | `entries[].entryId` (ค่าที่ส่งใน `entryIds`) |
| ชื่อวิชาที่จะลบ (ถ้ามีข้อความยืนยัน) | `entries[].courseCode`, `courseName`, `sectionNo` |
| ปุ่มลบกดไม่ได้ (TC4) | `entries.length === 0` หรือยังไม่ได้ติ๊ก |
| ลบทุกวิชา | `entries.map((e) => e.entryId)` |
| grid, หน่วยกิต, แถบเวลาชน, แถบสรุป และ "บันทึก…เมื่อสักครู่" หลังลบ | ทั้งก้อนตามตาราง field ใน US1 spec |

ตำแหน่งจริงของ checkbox และปุ่มลบให้ยึดตาม frame 1:256 และ 1:1810 ตอน US2-T07

## ฝั่ง backend

US2 เพิ่ม class ใหม่ใน package `timetable` และ**ไม่แก้** `TimetableController` หรือ `TimetableService` ของ US1 ตามหลัก "1 ฟีเจอร์แยกไฟล์" แบบที่ US5 ทำ Spring ให้ controller สองตัวใช้ path ขึ้นต้นเดียวกันได้ ตราบที่ method กับ path ไม่ซ้ำกัน

| Class | หน้าที่ |
| --- | --- |
| `TimetableDeleteController` | `@RequestMapping("/api/timetable/entries")` มี 2 `@DeleteMapping` และขอ `studentId` จาก `CurrentStudentProvider` |
| `TimetableDeleteService` | `removeEntry`, `removeEntries` ใช้ `TimetableEntryRepository.findAllById` เดิม และเรียก `TimetableService.getTimetable(...)` ของ US1 สร้าง response |

```java
// TimetableDeleteController
@DeleteMapping("/{entryId}")
public TimetableResponse removeEntry(@PathVariable Long entryId) {
    return deleteService.removeEntry(currentStudentProvider.currentStudentId(), entryId);
}

@DeleteMapping
public TimetableResponse removeEntries(@RequestParam List<Long> entryIds) {
    return deleteService.removeEntries(currentStudentProvider.currentStudentId(), entryIds);
}
```

```java
// TimetableDeleteService — @Transactional ที่ระดับ class
public TimetableResponse removeEntry(String studentId, Long entryId) {
    return removeEntries(studentId, List.of(entryId));
}

public TimetableResponse removeEntries(String studentId, List<Long> entryIds) {
    if (entryIds.isEmpty()) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ต้องระบุ entryIds อย่างน้อย 1 ตัว");
    }
    Set<Long> ids = new LinkedHashSet<>(entryIds);                          // ตัด id ซ้ำ

    List<TimetableEntry> entries = timetableEntryRepository.findAllById(ids).stream()
            .filter(e -> e.getTimetable().getStudentId().equals(studentId))  // ของคนอื่น = ไม่พบ
            .toList();
    if (entries.size() != ids.size()) {
        entries.forEach(e -> ids.remove(e.getEntryId()));                   // เหลือแต่ id ที่ไม่พบ
        throw new ResourceNotFoundException("ไม่พบวิชาในตารางเรียนของคุณ: entryId "
                + ids.stream().map(String::valueOf).collect(Collectors.joining(", ")));
    }

    long timetableCount = entries.stream()
            .map(e -> e.getTimetable().getTimetableId())
            .distinct()
            .count();
    if (timetableCount > 1) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "entryIds ต้องเป็นวิชาในตารางเดียวกัน (ปีการศึกษาและภาคเรียนเดียวกัน)");
    }

    Timetable timetable = entries.get(0).getTimetable();
    timetableEntryRepository.deleteAll(entries);
    timetable.touch();
    return timetableService.getTimetable(studentId, timetable.getAcademicYear(), timetable.getSemester());
}
```

หมายเหตุสำหรับคน implement:

- **ต้องใส่ `@Transactional` ที่ระดับ class** ไม่ใช่แค่ `removeEntries` เพราะ `removeEntry` เรียก `removeEntries` ภายใน class เดียวกัน ซึ่งไม่ผ่าน proxy ของ Spring ถ้าไม่มี transaction ครอบ การอ่าน `e.getTimetable()` แบบ LAZY จะ error เพราะ `open-in-view: false` และ `touch()` จะไม่ถูกบันทึก
- **`findAllById` ไม่ต้องแก้ repository ของ US1** การโหลด `timetable` ทีละ entry ไม่เป็นภาระ เพราะตารางหนึ่งมีไม่เกิน 22 entry
- **ลบแล้วเรียก `getTimetable` ใน transaction เดียวกันได้** query ของ `findByTimetableId` ทำให้ Hibernate flush การลบก่อนอ่าน entry ที่ถูกลบจึงไม่ติดมาใน response และ `Timetable` ที่ `touch()` แล้วเป็น instance เดียวกับที่ `getTimetable` อ่าน `updatedAt` จึงเป็นเวลาใหม่

## ฝั่ง frontend

โค้ดอยู่ใน `frontend/features/timetable-delete/` แยกจาก `features/timetable/` ของ US1 แบบเดียวกับ `timetable-export/` ของ US5 ใช้ type `Timetable` ของ US1 ตรง ๆ

```ts
// frontend/features/timetable-delete/api.ts
import { apiFetch } from "@/lib/api";
import type { Timetable } from "@/features/timetable/types";

export const timetableDeleteApi = {
  removeEntry: (entryId: number) =>
    apiFetch<Timetable>(`/api/timetable/entries/${entryId}`, { method: "DELETE" }),
  removeEntries: (entryIds: number[]) =>
    apiFetch<Timetable>(`/api/timetable/entries?entryIds=${entryIds.join(",")}`, {
      method: "DELETE",
    }),
};
```

```ts
// frontend/features/timetable-delete/types.ts — state ของหน้าจอ ไม่ได้ส่งผ่าน API
export type DeleteStatus = "idle" | "deleting" | "error";
```

| สถานะ | ปุ่มลบ |
| --- | --- |
| ตารางว่าง (`entries.length === 0`) | กดไม่ได้ (TC4) |
| ยังไม่ติ๊กวิชาใด | กดไม่ได้ |
| ติ๊กแล้ว | กดได้ ส่ง `entryIds` ที่ติ๊ก |
| `deleting` | กดไม่ได้ กันกดซ้ำ |

ลบสำเร็จให้แทน `Timetable` เดิมด้วย response แล้วล้าง checkbox ห้ามใส่ id ใน body ตามความเคยชินจาก POST ให้ต่อเข้า URL ตามโค้ดด้านบน

## เหตุผลการออกแบบ

**ข้อดี**

- endpoint 2 ตัวครอบคลุม TC1–TC3 และไม่มี DTO ใหม่
- ไม่ต้องส่งปี/ภาค และไม่มีปัญหา body ของ DELETE
- คืนตารางทั้งก้อนเหมือน POST UI อัปเดตได้ใน request เดียว
- all-or-nothing ไม่มีกรณีลบไปครึ่งเดียว
- ลบตรงกับที่ผู้ใช้เห็น ไม่เผลอลบวิชาที่ยังไม่แสดงบนหน้าจอ
- ไม่แก้ไฟล์ของ US1 ฝั่ง backend และใช้ exception ที่มีอยู่แล้ว

**ข้อเสีย**

- ต้องตรวจว่า entry อยู่ตารางเดียวกัน เป็นราคาของการคืนตารางเดียว
- ลบทุกวิชาขึ้นกับ state ของ frontend ถ้าอีกแท็บเพิ่มวิชาเข้ามา วิชานั้นจะไม่ถูกลบ แต่ response คืนตารางจริง UI จึงแสดงถูก
- id เก่าตัวเดียวทำให้ทั้งคำขอได้ `404` ผู้ใช้ต้องโหลดตารางใหม่ก่อนลบอีกครั้ง
- ลบ 1 วิชาได้สองทาง (`/entries/7` กับ `?entryIds=7`) ต้องทดสอบทั้งสอง endpoint

**ทางเลือกที่ไม่ได้ใช้**

| ทางเลือก | เหตุผลที่ไม่ใช้ |
| --- | --- |
| `DELETE /entries` ส่ง `{ "entryIds": [...] }` เป็น body | body ของ DELETE ไม่มีความหมายในมาตรฐาน บาง client หรือ proxy ตัดทิ้ง |
| `POST /entries/bulk-delete` | ใช้ POST ทำงานลบ ผิดความหมายของ method ทั้งที่ query ทำได้อยู่แล้ว |
| `DELETE /entries?academicYear=&semester=` สำหรับลบทั้งภาค | เพิ่ม endpoint อีกตัว และลบวิชาที่ผู้ใช้อาจยังไม่เห็น เพิ่มภายหลังได้ถ้าทีมเห็นว่าจำเป็น |
| `DELETE /entries/all` | `all` อยู่ตำแหน่งเดียวกับ `{entryId}` อ่านแล้วเหมือน id และไม่บอกว่าลบภาคไหน |
| frontend เรียก endpoint 1 ทีละตัว | หลายคำขอ และถ้าบางตัวพังจะได้ผลครึ่งเดียว |

## จุดเชื่อมกับ US1

1. ต้องมี `TimetableService.getTimetable(studentId, academicYear, semester)` แบบ public ตาม Extended API Class Diagram ของ US1-T06 ก่อน US2-T08 จะทดสอบได้
2. component ตารางของ US1 ต้องแสดง checkbox และปุ่มลบ และรับ `Timetable` ใหม่จาก US2 ไปแสดง เป็นไฟล์ของ US1 ต้องคุยกับเจ้าของ US1-T07 ก่อนแก้
3. US1 spec เขียนไว้ว่า "US2 จะเพิ่ม `DELETE /api/timetable/entries/{entryId}`" ยังถูกต้อง แต่ตอนนี้มี endpoint 2 เพิ่มด้วย ควรเพิ่มลิงก์มาที่เอกสารนี้

## สิ่งที่ US2 ควรทดสอบ (ข้อเสนอ)

ใช้กับ unit test ฝั่ง API และ Postman ใน US2-T08 ให้เก็บ `entryId` จาก response ของ `POST /api/timetable/entries` ลง collection variable เพราะ IDENTITY ให้เลขใหม่ทุกครั้งที่เพิ่ม

- ลบ 1 วิชา → `200` วิชาอื่นยังอยู่ วัน เวลา และกลุ่มเดิม (TC1)
- ลบ 2 วิชาพร้อมกัน → `200` เหลือวิชาที่ไม่ได้ลบ (TC2)
- ส่ง entryId ทุกตัว → `200` ได้ `entries: []`, `totalCredits: 0` และ `updatedAt` ไม่เป็น `null` (TC3)
- ลบวิชาที่เวลาชน → อีกวิชา `conflictWith` ว่าง และ `conflicts` ว่าง
- id ซ้ำ `7,7` → `200` เหมือนส่ง `7`
- entryId ของนักศึกษาคนอื่น → `404` และ entry นั้นยังอยู่
- id ที่มีจริงปนกับ id ที่ไม่มี → `404` และ id ที่มีจริงยังไม่ถูกลบ
- id จากสองภาคของนักศึกษาคนเดียว → `400` และไม่มีอะไรถูกลบ
- ไม่ส่ง `entryIds`, ส่งว่าง หรือส่งตัวอักษร → `400`
- ลบ id เดิมซ้ำครั้งที่สอง → `404`

## เอกสารที่เกี่ยวข้อง

- [US1 — DTO & API Spec](../../US1/T05/US1-DTO%20&%20API%20Spec.md)
- [US1-T06 — ER Diagram](../../US1/T06/US1-T06-ER-Diagram.md)
- [US1-T06 — Sequence Diagram](../../US1/T06/US1-T06-Sequence-Diagram.md)
- [US1-T06 — Extended API Class Diagram](../../US1/T06/US1-T06-Extended-API-Class-Diagram.md)
- [US5 — DTO & API Spec](../../US5/T05/US5-DTO%20&%20API%20Spec.md) (แบบอย่างของ US ที่ไม่มี DTO ใหม่)
- [User Acceptance Test (US2-T16)](../US2-T16-UAT.md)
