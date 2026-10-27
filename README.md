# final_project — Frontend ระบบจัดเส้นทางไรเดอร์ (ส่งด่วนมื้อเที่ยง)

Angular 19 (standalone + signals) + Leaflet/OpenStreetMap
Backend: https://github.com/CcGthilha/avdweb_backend · API: https://finalproject-advweb.onrender.com

## รัน

```bash
npm install
npm start        # http://localhost:4200 (เรียก API ผ่าน proxy.conf.json → Render)
npm run build    # เรียก Render ตรง ๆ (ต้องเพิ่ม URL ของเว็บใน CORS_ORIGINS ของ backend)
```

## หน้าจอ

| path | หน้า |
|---|---|
| `/customers` | จัดการลูกค้า เพิ่ม/แก้/ลบ/ค้นหา ปักหมุดบนแผนที่ |
| `/orders` | จัดการออเดอร์ เพิ่ม/แก้จำนวนกล่อง/ลบ/ล้าง/จำลอง แสดงสถานะ |
| `/dispatch` | จัดเส้นทาง แผนที่แยกสี สรุปกำไร บันทึกเวอร์ชัน เทียบแผน เลือกใช้ ออกเลขใบงาน |
| `/rider` | ไรเดอร์กรอกเลขใบงาน ดูลำดับจุดส่ง นำทาง โทร กดส่งแล้ว |

อธิบายโค้ดทั้งหมด: [docs/CODE_EXPLANATION.md](docs/CODE_EXPLANATION.md)
