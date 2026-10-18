import type { Course } from "./types";

// ฟังก์ชันค้นหาแบบ pure รับ Course กับคำค้น แล้วคืน true/false ให้ CourseSearchPanel กรอง
// trim/lowercase ทำให้ช่องว่างหัวท้ายและตัวพิมพ์ไม่ทำให้ผลค้นต่างกัน
export const matchesCourseQuery = (course: Course, query: string) => {
  const search = query.trim().toLowerCase();

  if (!search) return true;

  const courseCode = course.courseCode.toLowerCase();
  // แยกชื่อด้วยช่องว่างหรือขีด เพื่อค้นคำขึ้นต้นได้ เช่น "object" ในชื่อมีขีดคั่น
  const courseNameWords = course.courseName.toLowerCase().split(/[\s-]+/);

  return (
    courseCode.startsWith(search) ||
    courseNameWords.some((word) => word.startsWith(search))
  );
};
