import { Injectable } from '@angular/core';

// ขอเส้นทางตามถนนจริงจาก OSRM (บริการหาเส้นทางฟรี ใช้ข้อมูลถนน OpenStreetMap)
// ใช้แค่ "วาดเส้น" บนแผนที่ ส่วนระยะ/ค่าส่งยังคิดตามสูตรใน optimizer เหมือนเดิม
@Injectable({ providedIn: 'root' })
export class RoadService {
  private url = 'https://router.project-osrm.org/route/v1/driving/';
  private cache = new Map<string, [number, number][]>(); // เส้นที่เคยขอแล้ว ไม่ต้องขอซ้ำ

  // points = [[lat,lng], ...] ตามลำดับที่วิ่ง → คืนพิกัดตามถนน หรือ null ถ้าขอไม่ได้ (ให้ใช้เส้นตรงแทน)
  async path(points: [number, number][]): Promise<[number, number][] | null> {
    const key = points.join(';');
    if (this.cache.has(key)) return this.cache.get(key)!;
    const coords = points.map(([lat, lng]) => `${lng},${lat}`).join(';'); // OSRM ใช้ลำดับ lng,lat
    try {
      const res = await fetch(`${this.url}${coords}?overview=full&geometries=geojson`);
      const data = await res.json();
      const road: [number, number][] | undefined = data.routes?.[0]?.geometry?.coordinates?.map(
        ([lng, lat]: [number, number]) => [lat, lng], // แปลงกลับเป็น lat,lng ให้ Leaflet
      );
      if (!road?.length || data.waypoints?.length !== points.length) return null;
      // OSRM ปักจุดไว้ที่ "ถนนที่ใกล้บ้านที่สุด" → ต่อเส้นสั้นๆ จากถนนเข้าไปถึงหมุดบ้านจริง
      const snapped = data.waypoints.map((w: { location: [number, number] }) => [w.location[1], w.location[0]]);
      const line = withDoorsteps(road, snapped, points);
      this.cache.set(key, line);
      return line;
    } catch {
      return null; // เน็ตหลุด / OSRM ล่ม → วาดเส้นตรงเหมือนเดิม
    }
  }
}

// แทรกหมุดจริงเข้าไปในเส้นถนน: ...ถนน → (จุดบนถนนที่ใกล้บ้าน) → บ้าน → กลับขึ้นถนน → ถนนต่อ...
function withDoorsteps(road: [number, number][], snapped: [number, number][], real: [number, number][]) {
  const d2 = (a: [number, number], b: [number, number]) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  const out: [number, number][] = [];
  let j = 0;
  real.forEach((p, i) => {
    // หาตำแหน่งบนเส้นถนน (ต่อจากจุดก่อนหน้า) ที่ตรงกับจุดที่ OSRM ปักไว้
    let k = road.findIndex((q, m) => m >= j && d2(q, snapped[i]) < 1e-8); // ห่างไม่เกิน ~10 เมตร
    if (k < 0) k = Math.min(j, road.length - 1);
    out.push(...road.slice(j, k + 1), p, road[k]);
    j = k + 1;
  });
  return [...out, ...road.slice(j)];
}