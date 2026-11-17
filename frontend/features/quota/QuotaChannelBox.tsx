import { CHANNEL_FALLBACK_LABELS, EXTERNAL_LINK_PROPS, hostnameOf, isSafeUrl } from "./labels";
import type { QuotaChannel } from "./types";

type QuotaChannelBoxProps = { channels: QuotaChannel[] };

// 1 วิชามีได้หลายช่องทาง: มี url -> ปุ่มลิงก์เปิดแท็บใหม่ "ไปยัง {hostname}"; ไม่มี url -> แสดง label และ note เท่านั้น
const QuotaChannelBox = ({ channels }: QuotaChannelBoxProps) => (
  <section aria-label="ช่องทางการขอโควตา" className="rounded-xl border border-rose-200 bg-rose-50 p-4">
    <h4 className="text-[13px] font-bold text-[#c91725]">ช่องทางการขอโควตา</h4>

    {channels.length === 0 ? (
      <p className="mt-3 rounded-lg bg-white px-3 py-2 text-[13px] text-[#14213b]">ยังไม่มีช่องทางการขอโควตา</p>
    ) : (
      <ul className="mt-3 space-y-2">
        {channels.map((channel, index) => (
          <li key={`${channel.channelType}-${index}`} className="rounded-lg bg-white p-3">
            <p className="text-[14px] font-bold text-[#14213b]">
              {channel.label || CHANNEL_FALLBACK_LABELS[channel.channelType]}
            </p>
            {channel.note && <p className="mt-1 text-[12px] text-[#687d9d]">{channel.note}</p>}
            {isSafeUrl(channel.url) && (
              <a
                href={channel.url}
                {...EXTERNAL_LINK_PROPS}
                className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-[#d4151e] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#b91018]"
              >
                <span>ไปยัง {hostnameOf(channel.url)}</span>
                <span aria-hidden="true">↗</span>
              </a>
            )}
          </li>
        ))}
      </ul>
    )}
  </section>
);

export default QuotaChannelBox;
