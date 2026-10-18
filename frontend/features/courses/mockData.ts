import type { Course } from "./types";

// ข้อมูลตัวอย่างของภาคเรียน 1/2568 ให้ตรงกับ seed ของ backend
// ใช้ sectionId จำลองที่ไม่ซ้ำกันระหว่างรอโหลด ID จริงจาก API
export const mockCourses: Course[] = [
  {
    courseCode: "CS180",
    courseName: "INTRODUCTION TO USER INTERFACE AND USER EXPERIENCE",
    category: "MAJOR",
    credits: 3,
    sections: [
      {
        sectionId: 101,
        sectionNo: "820001",
        instructor: "อ.ดร.ปวีณา เลิศวิไล",
        schedules: [
          {
            dayOfWeek: "MONDAY",
            startTime: "13:30",
            endTime: "16:30",
            room: "LC5-S202",
          },
        ],
      },
    ],
  },
  {
    courseCode: "MA211",
    courseName: "CALCULUS 1",
    category: "MAJOR",
    credits: 3,
    sections: [
      {
        sectionId: 102,
        sectionNo: "020001",
        instructor: "รศ.ดร.ประเสริฐ มั่นคง",
        schedules: [
          {
            dayOfWeek: "TUESDAY",
            startTime: "09:30",
            endTime: "11:00",
            room: "SC-3015",
          },
          {
            dayOfWeek: "THURSDAY",
            startTime: "09:30",
            endTime: "11:00",
            room: "SC-3015",
          },
        ],
      },
    ],
  },
  {
    courseCode: "CS111",
    courseName: "OBJECT-ORIENTED CONCEPTS",
    category: "MAJOR",
    credits: 3,
    sections: [
      {
        sectionId: 103,
        sectionNo: "030001",
        instructor: "ผศ.ดร.สมชาย ใจดี",
        schedules: [
          {
            dayOfWeek: "TUESDAY",
            startTime: "11:00",
            endTime: "12:30",
            room: "LC3-121",
          },
          {
            dayOfWeek: "THURSDAY",
            startTime: "11:00",
            endTime: "12:30",
            room: "LC3-121",
          },
        ],
      },
    ],
  },
  {
    courseCode: "LAS101",
    courseName: "CRITICAL THINKING, READING, AND WRITING",
    category: "GENERAL_EDUCATION",
    credits: 3,
    sections: [
      {
        sectionId: 104,
        sectionNo: "780004",
        instructor: "อ.พิมพ์ชนก บุญมา",
        schedules: [
          {
            dayOfWeek: "WEDNESDAY",
            startTime: "09:30",
            endTime: "12:30",
            room: "SC-1026",
          },
        ],
      },
    ],
  },
  {
    courseCode: "TU101",
    courseName: "THAILAND, ASEAN, AND THE WORLD",
    category: "GENERAL_EDUCATION",
    credits: 3,
    sections: [
      {
        sectionId: 105,
        sectionNo: "900001",
        instructor: "อ.สุภาพร ทองดี",
        schedules: [
          {
            dayOfWeek: "WEDNESDAY",
            startTime: "13:30",
            endTime: "16:30",
            room: "SC-1058",
          },
        ],
      },
    ],
  },
  {
    courseCode: "TU106",
    courseName: "CREATIVITY AND COMMUNICATION",
    category: "GENERAL_EDUCATION",
    credits: 3,
    sections: [
      {
        sectionId: 106,
        sectionNo: "540001",
        instructor: "อ.ดร.กมลชนก ศิลปชัย",
        schedules: [
          {
            dayOfWeek: "THURSDAY",
            startTime: "13:30",
            endTime: "16:30",
            room: "LC2-203",
          },
        ],
      },
    ],
  },
  {
    courseCode: "TU109",
    courseName: "INNOVATION AND ENTREPRENEURIAL MINDSET",
    category: "GENERAL_EDUCATION",
    credits: 3,
    sections: [
      {
        sectionId: 107,
        sectionNo: "780001",
        instructor: "อ.ดร.ธนวัฒน์ รุ่งเรือง",
        schedules: [
          {
            dayOfWeek: "WEDNESDAY",
            startTime: "09:30",
            endTime: "12:30",
            room: "SC3-413",
          },
        ],
      },
    ],
  },
  {
    courseCode: "ST216",
    courseName: "STATISTICS FOR SOCIAL SCIENCE 1",
    category: "MAJOR",
    credits: 3,
    sections: [
      {
        sectionId: 108,
        sectionNo: "040001",
        instructor: "ผศ.ณัฐธิดา พรหมวงศ์",
        schedules: [
          {
            dayOfWeek: "TUESDAY",
            startTime: "13:30",
            endTime: "16:30",
            room: "SC2-105",
          },
        ],
      },
    ],
  },
  {
    courseCode: "JP171",
    courseName: "JAPANESE 1",
    category: "FREE_ELECTIVE",
    credits: 3,
    sections: [
      {
        sectionId: 109,
        sectionNo: "920001",
        instructor: "อ.ยูกิ ทานากะ",
        schedules: [
          {
            dayOfWeek: "FRIDAY",
            startTime: "13:30",
            endTime: "16:30",
            room: "LC2-204",
          },
        ],
      },
    ],
  },
];
