import { Order } from '../models/order.model';
import { RouteRequest, StopRequest } from '../models/plan.model';
import { ROUTE_COLORS, SHOP, Setting } from '../models/setting.model';

// ต้องถึงทุกจุดภายใน 60 นาทีหลังออกจากร้าน (11:30 → 12:30)
export const LIMIT_MIN = 60;
type Pt = { lat: number; lng: number };

// ระยะทาง (กม.) = ระยะเส้นตรง (สูตร Haversine) × ตัวคูณถนน
export function distKm(a: Pt, b: Pt, road = 1): number {
    const r = Math.PI / 180;
    const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 +
        Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h)) * road;
}

// ค่าส่งไรเดอร์ 1 คน = 15 + 2 × กล่อง × กม.
export const riderFee = (boxes: number, km: number) =>
    SHOP.riderBaseFee + SHOP.riderRatePerKmBox * boxes * km;

// เรียงลำดับทุกแบบที่เป็นไปได้ เช่น [A,B,C] → ABC, ACB, BAC, BCA, CAB, CBA
// ไรเดอร์มีไม่เกิน 3 จุด → สูงสุดแค่ 6 แบบ ลองครบทุกแบบได้สบาย
const perms = <T>(a: T[]): T[][] =>
    a.length < 2 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p]));

// ผลการประเมินไรเดอร์ 1 คน
interface Leg {
    ord: Order[];   // ลำดับจุดส่งที่ดีที่สุด
    km: number;     // ระยะทางรวม
    fee: number;    // ค่าส่ง
    at: number[];   // นาทีที่ถึงแต่ละจุด (นับจากออกร้าน)
    cum: number[];  // ระยะสะสมจากร้านถึงแต่ละจุด
    score: number;  // คะแนน ยิ่งน้อยยิ่งดี = ค่าส่ง + โทษถ้าถึงช้า
}

// ลองทุกลำดับจุดส่งของไรเดอร์ 1 คน แล้วเลือกลำดับที่ score ต่ำสุด
function evalGroup(group: Order[], s: Setting): Leg {
    let best!: Leg;
    const boxes = group.reduce((a, o) => a + o.boxes, 0);
    for (const ord of perms(group)) {
        let t = 0, d = 0, late = 0, prev: Pt = SHOP; // เริ่มที่ร้าน เวลา 0 ระยะ 0
        const at: number[] = [], cum: number[] = [];
        for (const o of ord) {
            const k = distKm(prev, o, s.road);
            d += k;
            t += (k / s.speed) * 60;                    // เวลาเดินทาง (นาที) = ระยะ ÷ ความเร็ว × 60
            at.push(t); cum.push(d);
            late += Math.max(0, t - LIMIT_MIN);         // ถึงเกิน 60 นาทีกี่นาที
            t += s.stopMin;                             // จอดส่งของ
            prev = o;
        }
        if (s.back) d += distKm(prev, SHOP, s.road);  // ถ้าตั้งให้นับขากลับร้าน
        const fee = riderFee(boxes, d);
        const leg: Leg = { ord, km: d, fee, at, cum, score: fee + (late ? 2000 + late * 500 : 0) };
        if (!best || leg.score < best.score) best = leg;
    }
    return best;
}

// ตัวสุ่มที่กำหนด seed ได้ (seed เดิม = ผลเดิมทุกครั้ง, กด "คำนวณใหม่" = เปลี่ยน seed → ได้คำตอบอื่น)
function rng(seed: number) {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // เลขสุ่ม 0 ถึง 1
    };
}

// ชื่อกลุ่มจาก id ออเดอร์ เช่น [5,2,9] → "2-5-9" ใช้จำผลที่เคยคำนวณแล้ว (cache)
const keyOf = (g: Order[]) => g.map((o) => o.id).sort((a, b) => a - b).join('-');

// Simulated Annealing: แบ่งออเดอร์ทั้งหมดเป็นกลุ่มละ ≤ 3 ให้ score รวมต่ำสุด
function anneal(orders: Order[], s: Setting, seed: number, cache: Map<string, Leg>): Order[][] {
    const r = rng(seed), MAX = SHOP.maxOrdersPerRider, N = 3000;
    const cost = (g: Order[]) => {
        if (!g.length) return 0;
        const k = keyOf(g);
        if (!cache.has(k)) cache.set(k, evalGroup(g, s));
        return cache.get(k)!.score;
    };

    // 1) คำตอบเริ่มต้น: เรียงออเดอร์ตามมุมรอบร้าน (เหมือนเข็มนาฬิกากวาด) แล้วตัดทีละ 3
    const off = r() * 2 * Math.PI;
    const ang = (o: Order) => (Math.atan2(o.lat - SHOP.lat, o.lng - SHOP.lng) + off + 4 * Math.PI) % (2 * Math.PI);
    const sorted = [...orders].sort((a, b) => ang(a) - ang(b));
    let G: Order[][] = [];
    for (let i = 0; i < sorted.length; i += MAX) G.push(sorted.slice(i, i + MAX));

    // 2) สุ่มแก้ทีละนิด N รอบ
    let cur = G.reduce((a, g) => a + cost(g), 0), bestCost = cur, best = G.map((g) => [...g]);
    for (let n = 0; n < N; n++) {
        const T = 40 * Math.pow(0.0005, n / N);       // อุณหภูมิ: เริ่มสูงแล้วค่อยๆ ลด
        const a = Math.floor(r() * G.length);         // กลุ่มต้นทาง
        const i = Math.floor(r() * G[a].length);      // ออเดอร์ที่จะขยับ
        const b = Math.floor(r() * (G.length + 1));   // กลุ่มปลายทาง (= G.length คือเพิ่มไรเดอร์ใหม่)
        if (a === b) continue;
        const o = G[a][i];
        let na: Order[], nb: Order[];
        if (b < G.length && (G[b].length >= MAX || r() < 0.4)) {
            const j = Math.floor(r() * G[b].length);    // แบบสลับ: แลกออเดอร์กัน 1 ต่อ 1
            na = [...G[a]]; na[i] = G[b][j];
            nb = [...G[b]]; nb[j] = o;
        } else {
            na = G[a].filter((_, k) => k !== i);        // แบบย้าย: ย้ายออเดอร์ไปอีกกลุ่ม
            nb = b < G.length ? [...G[b], o] : [o];
        }
        const delta = cost(na) + cost(nb) - cost(G[a]) - (b < G.length ? cost(G[b]) : 0);
        // ดีขึ้น (delta < 0) → รับเสมอ, แย่ลง → รับบ้างตามโอกาส (ช่วงต้นรับง่าย ช่วงท้ายแทบไม่รับ)
        if (delta < 0 || r() < Math.exp(-delta / T)) {
            G = [...G]; G[a] = na;
            if (b < G.length) G[b] = nb; else G.push(nb);
            G = G.filter((g) => g.length);              // กลุ่มที่ว่าง = ไม่ต้องใช้ไรเดอร์คนนั้น
            cur += delta;
            if (cur < bestCost - 1e-9) { bestCost = cur; best = G.map((g) => [...g]); }
        }
    }
    return best;
}

// แปลงกลุ่มออเดอร์เป็นใบงาน (รูปแบบ RouteRequest ที่ POST /plan ต้องการ)
// เลขไรเดอร์และสีไล่ตามทิศรอบร้าน → บนแผนที่สีจะเรียงกันสวย ไม่กระโดด
function toRoutes(groups: Order[][], s: Setting): RouteRequest[] {
    const ang = (o: Pt) => Math.atan2(o.lat - SHOP.lat, o.lng - SHOP.lng);
    return groups
        .map((g) => evalGroup(g, s))
        .sort((x, y) => ang(x.ord[0]) - ang(y.ord[0]))
        .map((e, i) => {
            const stops: StopRequest[] = e.ord.map((o, j) => ({
                id: o.id, name: o.name, phone: o.phone, address: o.address, lat: o.lat, lng: o.lng,
                boxes: o.boxes,
                km: +e.cum[j].toFixed(2),   // ระยะสะสมจากร้าน (ปัด 2 ตำแหน่ง)
                at: Math.round(e.at[j]),    // นาทีที่ถึง (ปัดเป็นนาทีเต็ม)
            }));
            return {
                rider: i + 1,
                color: ROUTE_COLORS[i % ROUTE_COLORS.length],
                boxes: stops.reduce((a, x) => a + x.boxes, 0),
                km: +e.km.toFixed(2),
                fee: +e.fee.toFixed(2),
                end: Math.round(e.at[e.at.length - 1]), // นาทีที่ถึงจุดสุดท้าย
                stops,
            };
        });
}

// คำตอบ 1 แบบ: sig = ลายเซ็นของการแบ่งกลุ่ม (ส่งไปเก็บใน plan.sig), routes = ใบงานทุกคน
export interface Solution { sig: string; routes: RouteRequest[] }

// ★ ฟังก์ชันหลักที่หน้า dispatch เรียกใช้
// รัน anneal หลายรอบ (seed ต่างกัน) → คืนคำตอบที่ไม่ซ้ำกัน เรียงจากดีที่สุด ([0] = ดีที่สุด)
export function optimize(orders: Order[], s: Setting, seed = Date.now(), tries = 12): Solution[] {
    if (!orders.length) return [];
    const cache = new Map<string, Leg>();
    const seen = new Map<string, { groups: Order[][]; score: number }>();
    for (let k = 0; k < tries; k++) {
        const groups = anneal(orders, s, seed + k * 7919, cache);
        const sig = groups.map(keyOf).sort().join('|');   // เช่น "1-4-7|2-3|5-6-9"
        const score = groups.reduce((a, g) => a + cache.get(keyOf(g))!.score, 0);
        seen.set(sig, { groups, score });                 // sig ซ้ำ = คำตอบเดิม เก็บแค่ครั้งเดียว
    }
    return [...seen]
        .sort((a, b) => a[1].score - b[1].score)
        .map(([sig, v]) => ({ sig, routes: toRoutes(v.groups, s) }));
}

// สรุปตัวเลขของแผน: รายได้ − ค่าอาหาร − ค่าส่ง = กำไร
export function summarize(routes: RouteRequest[]) {
    const boxes = routes.reduce((a, r) => a + r.boxes, 0);
    const revenue = boxes * SHOP.boxPrice;   // ×65
    const food = boxes * SHOP.boxCost;       // ×40
    const fee = routes.reduce((a, r) => a + r.fee, 0);
    return {
        riders: routes.length,
        orders: routes.reduce((a, r) => a + r.stops.length, 0),
        boxes,
        km: routes.reduce((a, r) => a + r.km, 0),
        revenue, food, fee,
        profit: revenue - food - fee,
        end: Math.max(0, ...routes.map((r) => r.end)),                                     // ไรเดอร์ที่ถึงช้าสุด
        late: routes.reduce((a, r) => a + r.stops.filter((x) => x.at > LIMIT_MIN).length, 0),
    };
}

// แปลงนาทีหลังออกร้านเป็นเวลา เช่น clock('11:30', 12) → "11:42"
export function clock(depart: string, min: number): string {
    const [h, m] = depart.split(':').map(Number);
    const t = h * 60 + m + Math.round(min);
    return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}