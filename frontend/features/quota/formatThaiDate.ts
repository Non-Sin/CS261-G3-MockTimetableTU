const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

type DateParts = { day: number; month: number; buddhistYear: number };

// แยกสตริง yyyy-MM-dd ด้วยตัวเอง ไม่ผ่าน new Date("2025-08-04") เพราะจะถูกตีความเป็น UTC
// แล้ววันเลื่อนถอยหลังในเครื่องที่ timezone ติดลบ (Timezone Shift)
const parseIsoDate = (value: string): DateParts => {
  const [year, month, day] = value.split("-").map(Number);
  return { day, month, buddhistYear: year + 543 };
};

// "2025-08-20" -> "20 สิงหาคม 2568"
export function formatThaiSingleDate(dateStr: string): string {
  const { day, month, buddhistYear } = parseIsoDate(dateStr);
  return `${day} ${THAI_MONTHS[month - 1]} ${buddhistYear}`;
}

// startDate เป็น null = กำหนดส่งวันเดียว; มีทั้งสองค่า = ช่วงวันที่
// เดือนและปีเดียวกันรวมเป็น "4 - 8 สิงหาคม 2568" คนละเดือนหรือข้ามปีเขียนเดือน/ปีของแต่ละฝั่ง
export function formatThaiDate(startDate: string | null, endDate: string): string {
  if (!startDate || startDate === endDate) return formatThaiSingleDate(endDate);

  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);

  if (start.buddhistYear !== end.buddhistYear) {
    return `${formatThaiSingleDate(startDate)} - ${formatThaiSingleDate(endDate)}`;
  }
  if (start.month !== end.month) {
    return `${start.day} ${THAI_MONTHS[start.month - 1]} - ${end.day} ${THAI_MONTHS[end.month - 1]} ${end.buddhistYear}`;
  }
  return `${start.day} - ${end.day} ${THAI_MONTHS[end.month - 1]} ${end.buddhistYear}`;
}
