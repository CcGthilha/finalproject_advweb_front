# final_project — Frontend ระบบจัดเส้นทางไรเดอร์ (ส่งด่วนมื้อเที่ยง)

Angular 19 (standalone + signals) + Leaflet/OpenStreetMap
เรียก Web API จาก backend (`server/` ของ FinalProject_AdvWeb) ที่ `http://localhost:3000`

## รัน

```bash
npm install
npm start        # http://localhost:4200  (ต้องเปิด backend ที่ port 3000 ก่อน)
npm run build
```

## หน้าจอ

| path | หน้า | สถานะ |
|---|---|---|
| `/customers` | จัดการลูกค้า เพิ่ม/แก้/ลบ/ค้นหา ปักหมุดบนแผนที่ | ✅ เสร็จ |
| `/orders` | จัดการออเดอร์ เพิ่ม/แก้จำนวนกล่อง/ลบ/ล้าง/จำลอง | ✅ เสร็จ |
| `/dispatch` | จัดเส้นทาง แผนที่แยกสี สรุปกำไร ยืนยันออกใบงาน | ⬜ รอทำ |
| `/rider` | ไรเดอร์กรอกรหัสใบงาน ดูลำดับจุดส่ง นำทาง | ⬜ รอทำ |

อธิบายโค้ดทั้งหมด + สิ่งที่เหลือให้ทำต่อ: [docs/CODE_EXPLANATION.md](docs/CODE_EXPLANATION.md)
