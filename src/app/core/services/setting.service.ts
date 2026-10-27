import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WriteResult } from '../models/api.model';
import { DEFAULT_SHOP, ShopSetting } from '../models/setting.model';

// ค่าตั้งของร้าน (/settings) — เก็บค่าล่าสุดไว้ใน signal `shop` ให้ทุกหน้าใช้ร่วมกัน
@Injectable({ providedIn: 'root' })
export class SettingService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/settings`;

  // ค่าตั้งปัจจุบัน (ก่อนโหลดเสร็จ = ค่าเริ่มต้น)
  readonly shop = signal<ShopSetting>(DEFAULT_SHOP);

  get(): Observable<ShopSetting> {
    return this.http.get<ShopSetting>(this.url).pipe(tap((s) => this.shop.set(s)));
  }

  // ส่งเฉพาะฟิลด์ที่แก้ก็ได้ (server merge กับค่าเดิม)
  update(body: Partial<ShopSetting>): Observable<WriteResult> {
    return this.http
      .put<WriteResult>(this.url, body)
      .pipe(tap(() => this.shop.update((s) => ({ ...s, ...body }))));
  }
}
