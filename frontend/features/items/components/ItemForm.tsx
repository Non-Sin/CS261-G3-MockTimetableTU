"use client";

type Props = {
  onSubmit: (formData: FormData) => Promise<void>;
  fieldErrors: Record<string, string>;
};

export function ItemForm({ onSubmit, fieldErrors }: Props) {
  return (
    <form action={onSubmit} className="mb-6 space-y-2">
      <div>
        <input
          name="name"
          placeholder="ชื่อรายการ"
          className="w-full rounded border border-slate-300 px-3 py-2"
        />
        {fieldErrors.name && (
          <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
        )}
      </div>
      <div>
        <textarea
          name="description"
          placeholder="รายละเอียด (ไม่บังคับ)"
          className="w-full rounded border border-slate-300 px-3 py-2"
        />
        {fieldErrors.description && (
          <p className="mt-1 text-sm text-red-600">{fieldErrors.description}</p>
        )}
      </div>
      <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
        เพิ่ม
      </button>
    </form>
  );
}
