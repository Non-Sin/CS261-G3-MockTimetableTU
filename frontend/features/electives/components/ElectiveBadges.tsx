import { TAG_LABELS, TAG_STYLES } from "../labels";
import type { ElectiveSummary } from "../types";

export default function ElectiveBadges({
  course,
}: {
  course: ElectiveSummary;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 text-xs">
      {course.requiresQuota && (
        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">
          รายวิชาที่ต้องขอโควตา
        </span>
      )}
      {course.tags.map((tag) => (
        <span
          key={tag}
          className={`rounded-md border px-2 py-1 ${TAG_STYLES[tag]}`}
        >
          {TAG_LABELS[tag]}
        </span>
      ))}
    </div>
  );
}
