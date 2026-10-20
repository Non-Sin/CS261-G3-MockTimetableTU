export const AUTH_TOKEN_KEY = "mocktimetable.auth.token";

// ใช้ร่วมกันระหว่าง auth และ API ของ feature อื่น เรียกเฉพาะใน browser
export const authSession = {
  getToken: () => window.sessionStorage.getItem(AUTH_TOKEN_KEY),
  saveToken: (token: string) => window.sessionStorage.setItem(AUTH_TOKEN_KEY, token),
  clear: () => window.sessionStorage.removeItem(AUTH_TOKEN_KEY),
};
