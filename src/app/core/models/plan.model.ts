// แผนจัดส่ง — route_plans / trips / trip_stops (lunch_route.sql)
// ฝั่ง API ใช้ชื่อ plan / route / stop (GET /plan/latest, POST /plan, GET /route/:code)

// จุดส่ง 1 จุดในใบงาน (trip_stops)
export interface Stop {
  id: number | null; // id ออเดอร์ (null ถ้าออเดอร์ถูกล้างไปแล้ว)
  seq: number; // ลำดับจุด เริ่มที่ 1 (stop_seq)
  name: string;
  phone: string;
  address: string;
  lat: number;
  lng: number;
  boxes: number;
  km: number; // ระยะสะสมจากร้าน (cum_distance_km)
  at: number; // นาทีหลังออกจากร้าน (ใช้คำนวณ eta)
  done: boolean; // ไรเดอร์กดส่งสำเร็จแล้ว (delivered_at)
}

// ใบงานไรเดอร์ 1 คน (trips)
export interface Route {
  id?: number;
  rider: number; // ไรเดอร์คันที่
  code: string; // รหัสใบงาน 4 หลัก (job_code)
  color: string; // route_color
  boxes: number; // box_count
  km: number; // distance_km
  fee: number; // delivery_fee = 15 + 2 × boxes × km
  end: number; // นาทีที่ถึงจุดสุดท้าย (est_finish_time)
  stops: Stop[];
}

// แผนของวัน (route_plans)
export interface Plan {
  id: number;
  planDate: string;
  depart: string;
  sig: string;
  routes: Route[];
}

// body ของ POST /plan (server ออกรหัสใบงานเอง)
export interface PlanRequest {
  sig: string;
  depart: string;
  routes: RouteRequest[];
}

export interface RouteRequest extends Omit<Route, 'id' | 'code' | 'stops'> {
  stops: StopRequest[];
}

export interface StopRequest extends Omit<Stop, 'id' | 'seq' | 'done'> {
  id: number;
}
