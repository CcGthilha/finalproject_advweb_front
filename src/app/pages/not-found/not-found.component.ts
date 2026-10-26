import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <div class="card">
      <h1>ไม่พบหน้านี้</h1>
      <a routerLink="/">กลับหน้าแรก</a>
    </div>
  `,
})
export class NotFoundComponent {}
