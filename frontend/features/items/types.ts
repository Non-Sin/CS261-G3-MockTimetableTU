// ต้องตรงกับ ItemResponse / ItemRequest ฝั่ง backend (th.ac.tu.cs261.group3.backend.item.dto)

export type Item = {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ItemRequest = {
  name: string;
  description?: string;
};
