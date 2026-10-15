import type { Course } from "./types";

// รายวิชาและกลุ่มเรียนตัวอย่างสำหรับพัฒนาหน้า frontend ระหว่างรอเชื่อม API
export const mockCourses: Course[] = [
  {
    courseCode: "CS111",
    courseName: "OBJECT-ORIENTED CONCEPTS",
    category: "MAJOR",
    credits: 3,
    sections: [
      {
        sectionId: 101,
        sectionNo: "030001",
        instructor: "ผศ.ดร.ทรงศักดิ์ รองวิริยะพานิช",
        schedules: [
          {
            dayOfWeek: "TUESDAY",
            startTime: "11:00",
            endTime: "12:30",
            room: "LC3-121"
          },
          {
            dayOfWeek: "THURSDAY",
            startTime: "11:00",
            endTime: "12:30",
            room: "LC3-121"
          },
        ],
      },
    ],
  },
  {
    courseCode: "CS180",
    courseName: "INTRODUCTION TO USER INTERFACE AND USER EXPERIENCE",
    category: "MAJOR",
    credits: 3,
    sections: [
      {
        sectionId: 102,
        sectionNo: "820001",
        instructor: "ผศ.ดร.ลัมพาพรรณ พันธ์ชูจิตร์",
        schedules: [
          {
            dayOfWeek: "MONDAY",
            startTime: "13:30",
            endTime: "16:30",
            room: "LC5-S202"
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
        sectionId: 103,
        sectionNo: "070001",
        instructor: "ผศ.ดร.วิชัยรัตน์ จันที",
        schedules: [
          {
            dayOfWeek: "TUESDAY",
            startTime: "09:30",
            endTime: "11:00",
            room: "SC-3015"
          },
          {
            dayOfWeek: "THURSDAY",
            startTime: "09:30",
            endTime: "11:00",
            room: "SC-3015"
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
        instructor: "ผศ.ดร.วรางคณา ศรีกำเหนิด",
        schedules: [
          {
            dayOfWeek: "WEDNESDAY",
            startTime: "09:30",
            endTime: "12:30",
            room: "SC-1026"
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
      sectionId: 105,
      sectionNo: "540001",
      instructor: "อ.สมศักดิ์ กัณหา",
      schedules: [
        {
          dayOfWeek: "THURSDAY",
          startTime: "13:30",
          endTime: "16:30",
          room: "LC2-203"
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
        sectionId: 106,
        sectionNo: "900001",
        instructor: "ผศ.อดิศร หมวกพิมาย",
        schedules: [
          {
            dayOfWeek: "WEDNESDAY",
            startTime: "13:30",
            endTime: "16:30",
            room: "SC-1058"
          },
        ],
      },
    ],
  },
  {
    courseCode: "CS102",
    courseName: "PROBLEM SOLVING BASICS AND COMPUTER PROGRAMMING",
    category: "MAJOR",
    credits: 3,
    sections: [
      {
        sectionId: 107,
        sectionNo: "030001",
        instructor: "ผศ.ดร.เสาวลักษณ์ วรรธนาภา",
        schedules: [
          {
            dayOfWeek: "TUESDAY",
            startTime: "11:00",
            endTime: "12:30",
            room: "LC3-121"
          },
          {
            dayOfWeek: "THURSDAY",
            startTime: "11:00",
            endTime: "12:30",
            room: "LC3-121"
          }
        ]
      },
      {
        sectionId: 108,
        sectionNo: "030002",
        instructor: "ผศ.ดร.ฐาปนา บุญชู",
        schedules: [
          {
            dayOfWeek: "TUESDAY",
            startTime: "11:00",
            endTime: "12:30",
            room: "LC3-122"
          },
          {
            dayOfWeek: "THURSDAY",
            startTime: "11:00",
            endTime: "12:30",
            room: "LC3-122"
          },
        ],
      },
    ],
  },
  {
    courseCode: "CS101",
    courseName: "DISCRETE STRUCTURES",
    category: "MAJOR",
    credits: 3,
    sections: [
      {
        sectionId: 109,
        sectionNo: "020001",
        instructor: "ผศ.ดร.ศาตนาฏ กิจศิรานุวัตร",
        schedules: [
          {
            dayOfWeek: "TUESDAY",
            startTime: "09:30",
            endTime: "11:00",
            room: "LC3-122"
          },
          {
            dayOfWeek: "THURSDAY",
            startTime: "09:30",
            endTime: "11:00",
            room: "LC3-122"
          },
        ],
      },
    ],
  },
];
