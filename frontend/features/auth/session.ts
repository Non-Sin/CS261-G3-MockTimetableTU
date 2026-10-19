export const AUTH_TOKEN_KEY = "mocktimetable.auth.token";

// เรียกจาก event หรือ effect ฝั่ง browser เท่านั้น จึงไม่อ่าน storage ระหว่าง server render
// เก็บเฉพาะ token: refresh ในแท็บเดิมได้ และไม่มี username/password อยู่ใน storage
export const authSession = {
  getToken: () => window.sessionStorage.getItem(AUTH_TOKEN_KEY),
  saveToken: (token: string) => window.sessionStorage.setItem(AUTH_TOKEN_KEY, token),
  clear: () => window.sessionStorage.removeItem(AUTH_TOKEN_KEY),
};
