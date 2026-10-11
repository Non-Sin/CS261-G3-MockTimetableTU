import { apiFetch } from "@/lib/api";
import type { Item, ItemRequest } from "./types";

export const itemsApi = {
  list: () => apiFetch<Item[]>("/api/items"),
  get: (id: number) => apiFetch<Item>(`/api/items/${id}`),
  create: (data: ItemRequest) =>
    apiFetch<Item>("/api/items", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: ItemRequest) =>
    apiFetch<Item>(`/api/items/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: number) => apiFetch<void>(`/api/items/${id}`, { method: "DELETE" }),
};
