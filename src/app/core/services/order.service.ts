import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WriteResult } from '../models/api.model';
import { Order, OrderRequest } from '../models/order.model';

// เรียก Web API /orders — ไม่ส่ง date = server ใช้วันนี้ตามเวลาไทย
@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/orders`;

  private dateParams(date?: string): HttpParams {
    return date ? new HttpParams().set('date', date) : new HttpParams();
  }

  getByDate(date?: string): Observable<Order[]> {
    return this.http.get<Order[]>(this.url, { params: this.dateParams(date) });
  }

  getById(id: number): Observable<Order> {
    return this.http.get<Order>(`${this.url}/${id}`);
  }

  create(body: OrderRequest): Observable<WriteResult> {
    return this.http.post<WriteResult>(this.url, body);
  }

  // แก้ได้เฉพาะจำนวนกล่อง (1-3)
  updateBoxes(id: number, boxes: number): Observable<WriteResult> {
    return this.http.put<WriteResult>(`${this.url}/${id}`, { boxes });
  }

  delete(id: number): Observable<WriteResult> {
    return this.http.delete<WriteResult>(`${this.url}/${id}`);
  }

  // ล้างออเดอร์ทั้งหมดของวันนั้น
  clear(date?: string): Observable<WriteResult> {
    return this.http.delete<WriteResult>(this.url, { params: this.dateParams(date) });
  }

  // ล้างออเดอร์วันนี้แล้วสุ่มใหม่ n ออเดอร์ (ไม่ใส่ n = สุ่ม 20-30)
  simulate(n?: number): Observable<WriteResult> {
    return this.http.post<WriteResult>(`${this.url}/simulate`, n ? { n } : {});
  }
}
