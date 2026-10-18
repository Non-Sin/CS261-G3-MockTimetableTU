// รับเวลา HH:mm จาก ScheduleSlot แล้วแปลงเป็นนาทีตั้งแต่ 00:00
// ผลตัวเลขใช้เปรียบเทียบจุดเริ่ม/จบคาบและหาความกว้างตำแหน่งบน Grid ได้ตรงไปตรงมา
export const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};
