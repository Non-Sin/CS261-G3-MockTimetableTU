"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { itemsApi } from "../api";
import type { Item } from "../types";
import { ItemForm } from "./ItemForm";
import { ItemList } from "./ItemList";

export function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleError(e: unknown) {
    if (e instanceof ApiError) {
      setError(e.message);
      setFieldErrors(e.fieldErrors);
    } else {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  }

  useEffect(() => {
    itemsApi.list().then(setItems).catch(handleError);
  }, []);

  async function addItem(formData: FormData) {
    setError(null);
    setFieldErrors({});
    try {
      const created = await itemsApi.create({
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? "") || undefined,
      });
      setItems((prev) => [...prev, created]);
    } catch (e) {
      handleError(e);
    }
  }

  async function removeItem(id: number) {
    setError(null);
    try {
      await itemsApi.remove(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      handleError(e);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md p-8">
      <h1 className="mb-4 text-2xl font-bold">Items</h1>

      <ItemForm onSubmit={addItem} fieldErrors={fieldErrors} />

      {error && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-red-700">{error}</p>
      )}

      <ItemList items={items} onRemove={removeItem} />
    </main>
  );
}
