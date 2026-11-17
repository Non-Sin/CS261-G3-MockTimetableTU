const STEPS = [
  { title: "เช็คคุณสมบัติ & วันเวลา", description: "ตรวจสอบเงื่อนไขของวิชาเรียน เช่น กลุ่มเรียน, วิชาบังคับก่อน, และวันปิดรับ ให้ถูกต้องเพื่อไม่ให้ตกหล่น" },
  { title: "ยื่นคำร้องผ่านระบบ/ฟอร์ม", description: "กรอกข้อมูลใน Google Forms, MS Forms หรือระบบคณะให้ครบถ้วน" },
  { title: "ติดตามผลการอนุมัติ", description: "รอประกาศรายชื่อผ่านทาง Facebook คณะ เว็บไซต์ขอโควตาคณะ หรือทาง REG-TU" },
  { title: "ลงทะเบียนใน REG-TU", description: "เมื่อได้รับอนุมัติโควตาแล้ว ให้ลงทะเบียนเรียนใน REG-TU ในเวลาที่กำหนด" },
];

// หน้าแรกก่อนมีการค้นหา: ข้อความคงที่ 4 ขั้นตอนการขอโควตา
const QuotaGuide = () => (
  <section
    aria-labelledby="quota-guide-title"
    className="rounded-2xl border border-[#e3ebf5] bg-white px-5 py-8 shadow-sm sm:px-8"
  >
    <div className="text-center">
      <p className="text-[12px] font-bold text-[#c91725]">GUIDE & PROCESS</p>
      <h2 id="quota-guide-title" className="mt-1 text-[22px] font-extrabold text-[#14213b]">
        4 ขั้นตอนการขอโควตาสำหรับนักศึกษา มธ.
      </h2>
      <p className="mt-1 text-[13px] text-[#687d9d]">
        ทำตามขั้นตอนนี้เพื่อไม่ให้พลาดสิทธิ์ในการเข้าเรียนวิชาที่ต้องการ และป้องกันข้อผิดพลาดในการลงทะเบียน
      </p>
    </div>

    <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((step, index) => (
        <li key={step.title} className="rounded-xl border border-[#e3ebf5] bg-[#f7f9fc] p-4">
          <span className="grid size-8 place-items-center rounded-lg bg-[#fff0f1] text-[13px] font-bold text-[#c91725]">
            {index + 1}
          </span>
          <h3 className="mt-3 text-[14px] font-bold text-[#14213b]">{step.title}</h3>
          <p className="mt-1 text-[12px] leading-relaxed text-[#687d9d]">{step.description}</p>
        </li>
      ))}
    </ol>
  </section>
);

export default QuotaGuide;
