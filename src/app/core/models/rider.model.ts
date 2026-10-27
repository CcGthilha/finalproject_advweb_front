// ไรเดอร์ — ตาราง riders / GET /riders
export interface Rider {
  riderId: number;
  fullName: string;
  phone: string;
  plateNo: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface RiderRequest {
  fullName: string;
  phone: string;
  plateNo?: string | null;
}
