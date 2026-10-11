"use client";

import type { Item } from "../types";

type Props = {
  items: Item[];
  onRemove: (id: number) => void;
};

export function ItemList({ items, onRemove }: Props) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">ยังไม่มีรายการ</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-start justify-between gap-2 rounded bg-slate-100 px-3 py-2"
        >
          <div>
            <p className="font-medium">{item.name}</p>
            {item.description && (
              <p className="text-sm text-slate-600">{item.description}</p>
            )}
          </div>
          <button
            onClick={() => onRemove(item.id)}
            className="text-sm text-red-600 hover:underline"
          >
            ลบ
          </button>
        </li>
      ))}
    </ul>
  );
}
