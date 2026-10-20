export type UserProfileResponse = {
  studentId: string;
  firstName: string;
  lastName: string;
  // ชื่อภาษาไทย แสดงใน dropdown ของ Navbar backend ส่ง null ได้ถ้ายังไม่มีข้อมูล
  firstNameTh?: string | null;
  lastNameTh?: string | null;
};
