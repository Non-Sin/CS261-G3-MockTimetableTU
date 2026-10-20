import AuthIcon from "./AuthIcon";

export const APP_SECTIONS = [
  { id: "timetable", label: "จัดตารางเรียนจำลอง", icon: "calendar", description: "เพิ่มและลบวิชาเพื่อวางแผนตารางเรียนของคุณ" },
  { id: "electives", label: "ดูวิชาเสรีแนะนำ", icon: "sparkle", description: "สำรวจวิชาเลือกเสรีสำหรับแผนการเรียนของคุณ" },
  { id: "quota", label: "ค้นหาช่องทางขอโควตา", icon: "search", description: "ค้นหาช่องทางติดต่อเพื่อขอโควตารายวิชา" },
] as const;

export type AppSection = typeof APP_SECTIONS[number]["id"];

type AppNavigationProps = {
  activeSection: AppSection;
  onSelect: (section: AppSection) => void;
  disabled?: boolean;
};

export default function AppNavigation({ activeSection, onSelect, disabled = false }: AppNavigationProps) {
  return (
    <nav aria-label="เมนูหลัก" className="flex gap-1 overflow-x-auto pb-1 xl:justify-center xl:pb-0">
      {APP_SECTIONS.map((section) => (
        <button
          key={section.id}
          type="button"
          disabled={disabled}
          aria-current={activeSection === section.id ? "page" : undefined}
          onClick={() => onSelect(section.id)}
          className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${activeSection === section.id ? "bg-[#fff0f1] text-[#c91725]" : "text-[#64748b] hover:bg-[#f7f9fc] hover:text-[#14213b]"}`}
        >
          <AuthIcon name={section.icon} width={18} height={18} className="shrink-0" />
          {section.label}
        </button>
      ))}
    </nav>
  );
}
