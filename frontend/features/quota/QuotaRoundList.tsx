import { formatThaiDate } from "./formatThaiDate";
import type { QuotaRound } from "./types";

type QuotaRoundListProps = { rounds: QuotaRound[] };

// startDate เป็น null = กำหนดส่งวันเดียว: ป้าย "กำหนดการ" และข้อความ "ยื่นคำร้องภายใน ..."
const describeRound = (round: QuotaRound) => {
  const time = round.endTime ? ` เวลา ${round.endTime} น.` : "";
  if (round.startDate === null) return `ยื่นคำร้องภายใน ${formatThaiDate(null, round.endDate)}${time}`;
  return `${formatThaiDate(round.startDate, round.endDate)}${time}`;
};

const QuotaRoundList = ({ rounds }: QuotaRoundListProps) => (
  <section aria-label="ช่วงเวลายื่นคำร้อง" className="rounded-xl border border-teal-200 bg-teal-50 p-4">
    <div className="flex items-center justify-between gap-2">
      <h4 className="text-[13px] font-bold text-teal-900">ช่วงเวลายื่นคำร้อง</h4>
      {rounds.length > 0 && (
        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-teal-800">
          เปิดรับทั้งหมด {rounds.length} รอบ
        </span>
      )}
    </div>

    {rounds.length === 0 ? (
      <p className="mt-3 rounded-lg bg-white px-3 py-2 text-[13px] text-teal-900">
        ยังไม่ประกาศช่วงเวลายื่นคำร้องของภาคนี้
      </p>
    ) : (
      <ul className="mt-3 space-y-2">
        {rounds.map((round) => (
          <li
            key={round.roundNo}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-[13px]"
          >
            <span className="flex items-center gap-2 text-teal-900">
              <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-semibold">
                {round.startDate === null ? "กำหนดการ" : `รอบที่ ${round.roundNo}`}
              </span>
              {round.startDate !== null && round.label && <span>{round.label}</span>}
            </span>
            <span className="font-bold text-[#14213b]">{describeRound(round)}</span>
          </li>
        ))}
      </ul>
    )}
  </section>
);

export default QuotaRoundList;
