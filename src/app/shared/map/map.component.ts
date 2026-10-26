import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { SHOP } from '../../core/models/setting.model';

// หมุด 1 จุดบนแผนที่
export interface MapPin {
  lat: number;
  lng: number;
  label: string; // ข้อความในหมุด เช่น ลำดับจุด
  color?: string;
  tooltip?: string;
  draft?: boolean; // หมุดชั่วคราวตอนกำลังเลือกตำแหน่ง
}

// เส้นทาง 1 เส้น (ใช้ในหน้า dispatch)
export interface MapLine {
  color: string;
  points: [number, number][];
}

// แผนที่ Leaflet + OpenStreetMap ใช้ซ้ำได้ทุกหน้า
// <app-map [pins]="..." [lines]="..." (pick)="..."></app-map>
@Component({
  selector: 'app-map',
  template: '<div #mapEl class="map"></div>',
  styles: [':host{display:block;height:100%;min-height:300px}.map{height:100%;border-radius:inherit}'],
})
export class MapComponent implements AfterViewInit, OnDestroy {
  pins = input<MapPin[]>([]);
  lines = input<MapLine[]>([]);
  fitBounds = input(true); // ซูมให้เห็นทุกหมุดอัตโนมัติ
  pick = output<{ lat: number; lng: number }>(); // คลิกบนแผนที่

  private mapEl = viewChild.required<ElementRef<HTMLDivElement>>('mapEl');
  private map?: L.Map;
  private layer = L.layerGroup();
  private resizeObserver?: ResizeObserver;

  constructor() {
    // วาดใหม่ทุกครั้งที่ input เปลี่ยน
    effect(() => {
      const pins = this.pins();
      const lines = this.lines();
      const fit = this.fitBounds();
      if (this.map) this.draw(pins, lines, fit);
    });
  }

  ngAfterViewInit(): void {
    this.map = L.map(this.mapEl().nativeElement).setView([SHOP.lat, SHOP.lng], 15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(this.map);
    this.layer.addTo(this.map);
    this.map.on('click', (e) => this.pick.emit({ lat: e.latlng.lat, lng: e.latlng.lng }));

    // แผนที่อยู่ในกล่องที่เปลี่ยนขนาดได้ ต้องบอก Leaflet ให้คำนวณขนาดใหม่
    this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
    this.resizeObserver.observe(this.mapEl().nativeElement);

    this.draw(this.pins(), this.lines(), this.fitBounds());
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }

  private icon(html: string, size: number): L.DivIcon {
    return L.divIcon({ className: '', html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
  }

  private draw(pins: MapPin[], lines: MapLine[], fit: boolean): void {
    this.layer.clearLayers();
    const bounds: L.LatLngTuple[] = [[SHOP.lat, SHOP.lng]];

    for (const line of lines) {
      L.polyline(line.points, { color: line.color, weight: 5, opacity: 0.85 }).addTo(this.layer);
    }

    for (const p of pins) {
      bounds.push([p.lat, p.lng]);
      const cls = p.draft ? 'pin draft' : 'pin';
      const style = p.color ? ` style="--c:${p.color}"` : ''; // ไม่ใส่สี = ใช้สีหลัก
      const marker = L.marker([p.lat, p.lng], {
        icon: this.icon(`<div class="${cls}"${style}>${escapeHtml(p.label)}</div>`, 26),
      }).addTo(this.layer);
      if (p.tooltip) marker.bindTooltip(escapeHtml(p.tooltip));
    }

    // หมุดร้าน = จุดเริ่มต้นของทุกเส้นทาง
    L.marker([SHOP.lat, SHOP.lng], { icon: this.icon('<div class="pin shop">ร้าน</div>', 40), zIndexOffset: 1000 })
      .bindTooltip(SHOP.name)
      .addTo(this.layer);

    if (fit && bounds.length > 1) this.map!.fitBounds(bounds, { padding: [32, 32], maxZoom: 16 });
  }
}

// กันชื่อลูกค้าที่มี < > ไปเป็น HTML บนแผนที่
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
