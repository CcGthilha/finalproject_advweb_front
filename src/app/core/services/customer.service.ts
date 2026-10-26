import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WriteResult } from '../models/api.model';
import { Customer, CustomerRequest, NearbyCustomer } from '../models/customer.model';

// เรียก Web API /customers ทั้งหมดผ่าน service นี้ที่เดียว
@Injectable({ providedIn: 'root' })
export class CustomerService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/customers`;

  getAll(): Observable<Customer[]> {
    return this.http.get<Customer[]>(this.url);
  }

  getById(id: number): Observable<Customer> {
    return this.http.get<Customer>(`${this.url}/${id}`);
  }

  // ค้นจากส่วนหนึ่งของชื่อหรือนามสกุล
  search(q: string): Observable<Customer[]> {
    return this.http.get<Customer[]>(`${this.url}/search`, { params: { q } });
  }

  findByPhone(phone: string): Observable<Customer[]> {
    return this.http.get<Customer[]>(this.url, { params: { phone } });
  }

  // ลูกค้าในรัศมี km จากจุด lat,lng
  nearby(lat: number, lng: number, km = 1): Observable<NearbyCustomer[]> {
    const params = new HttpParams().set('lat', lat).set('lng', lng).set('km', km);
    return this.http.get<NearbyCustomer[]>(`${this.url}/nearby`, { params });
  }

  create(body: CustomerRequest): Observable<WriteResult> {
    return this.http.post<WriteResult>(this.url, body);
  }

  update(id: number, body: Partial<CustomerRequest>): Observable<WriteResult> {
    return this.http.put<WriteResult>(`${this.url}/${id}`, body);
  }

  // ออเดอร์ของลูกค้าคนนี้จะถูกลบตาม (ON DELETE CASCADE)
  delete(id: number): Observable<WriteResult> {
    return this.http.delete<WriteResult>(`${this.url}/${id}`);
  }
}
