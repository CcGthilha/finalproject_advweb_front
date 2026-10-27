import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WriteResult } from '../models/api.model';
import { Order, OrderRequest, OrderStatus, OrderUpdate } from '../models/order.model';

// เรียก Web API /orders — ไม่ส่ง date = server ใช้วันนี้ตามเวลาไทย
@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/orders`;

  // status ไม่ใส่ = ทุกสถานะยกเว้น CANCELLED, 'ALL' = ทั้งหมด
  getByDate(date?: string, status?: OrderStatus | 'ALL'): Observable<Order[]> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    if (status) params = params.set('status', status);
    return this.http.get<Order[]>(this.url, { params });
  }

  getById(id: number): Observable<Order> {
    return this.http.get<Order>(`${this.url}/${id}`);
  }

  create(body: OrderRequest): Observable<WriteResult> {
    return this.http.post<WriteResult>(this.url, body);
  }

  // แก้จำนวนกล่อง/หมายเหตุ ได้เฉพาะออเดอร์ PENDING
  update(id: number, body: OrderUpdate): Observable<WriteResult> {
    return this.http.put<WriteResult>(`${this.url}/${id}`, body);
  }

  // ลบได้เฉพาะ PENDING (ถ้าอยู่ในแผนร่าง server จะตั้งเป็น CANCELLED แทน)
  delete(id: number): Observable<WriteResult> {
    return this.http.delete<WriteResult>(`${this.url}/${id}`);
  }

  // ล้างออเดอร์ทั้งหมดของวันนั้น (ไรเดอร์เริ่มส่งแล้วจะล้างไม่ได้)
  clear(date?: string): Observable<WriteResult> {
    const params = date ? new HttpParams().set('date', date) : new HttpParams();
    return this.http.delete<WriteResult>(this.url, { params });
  }

  // ล้างออเดอร์วันนี้แล้วสุ่มใหม่ n ออเดอร์ (ไม่ใส่ n = สุ่ม 20-30)
  simulate(n?: number): Observable<WriteResult> {
    return this.http.post<WriteResult>(`${this.url}/simulate`, n ? { n } : {});
  }
}
